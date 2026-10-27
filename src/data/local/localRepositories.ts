import {
  summarizeProject,
  toProjectSummary,
  type ProjectData,
  type ProjectDetail,
  type ProjectSummary,
} from '@/domain/progress';
import {
  applyOcrOutcome,
  applySourceEdit,
  type OcrOutcome,
  type SourceTextPatch,
} from '@/domain/images';
import { DEFAULT_CATEGORIES, validateCategoryName } from '@/domain/glossary';
import { addableTargetLanguages } from '@/domain/languages';
import {
  checkCategoryChange,
  checkRemoval,
  validateInvites,
  type InviteRow,
} from '@/domain/members';
import { planMove } from '@/domain/moveItems';
import {
  addedPeople,
  commentNotifications,
  notify,
  type NotificationDraft,
} from '@/domain/notifications';
import { isProjectDeleted, validateProjectIdentity } from '@/domain/workspaceProjects';
import {
  createWorkspaceOwner,
  parseWorkspaceSettings,
  type WorkspaceData,
  type WorkspaceFile,
  type WorkspaceSettings,
} from '@/domain/workspace';
import type { NewContentItemInput, NewImageFile } from '@/domain/newContentItem';
import type { NewProjectInput } from '@/domain/newProject';
import { generateProjectCode } from '@/domain/projectCode';
import { checkProjectDetails, type ProjectDetailsPatch } from '@/domain/projectDetails';
import { nextOrder, type SectionInput } from '@/domain/sections';
import {
  approve,
  editTranslation,
  requestChanges,
  setReady,
  submitForReview,
} from '@/domain/translationWorkflow';
import type {
  Assignment,
  Comment,
  CommentThread,
  ContentItem,
  Entity,
  GlossaryCategory,
  GlossaryContent,
  GlossaryEntry,
  GlossaryVersion,
  Id,
  LanguageCode,
  Member,
  MemberCategory,
  Project,
  SceneImage,
  Section,
  Translation,
} from '@/domain/types';
import type {
  CommentRepository,
  ContentItemRepository,
  GlossaryRepository,
  ImageRepository,
  ItemImages,
  MemberRepository,
  ProjectRepository,
  Repositories,
  PendingOcr,
  ReviewDecision,
  SectionRepository,
  AssignmentInboxEntry,
  AssignmentRepository,
  CommentInboxEntry,
  ItemContext,
  NotificationInboxEntry,
  NotificationRepository,
  ReviewQueueEntry,
  ThreadWithComments,
  TranslationRepository,
  WorkspaceRepository,
} from '../repositories/types';
import { META_INITIALIZED_AT, META_SETTINGS, TranslatorDb, type StoredFile } from './db';

const nameCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

function newEntity(by: Id | null): Entity {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, createdBy: by, updatedBy: by };
}

function touched(by: Id | null): Pick<Entity, 'updatedAt' | 'updatedBy'> {
  return { updatedAt: new Date().toISOString(), updatedBy: by };
}

/** Stores notifications drafted by src/domain/notifications.ts (DECISIONS D45). */
async function addNotifications(
  db: TranslatorDb,
  drafts: NotificationDraft[],
  by: Id | null,
): Promise<void> {
  if (drafts.length === 0) return;
  await db.notifications.bulkAdd(
    drafts.map((draft) => ({
      ...newEntity(by),
      sectionId: null,
      contentItemId: null,
      imageId: null,
      threadId: null,
      commentId: null,
      language: null,
      count: null,
      readAt: null,
      ...draft,
    })),
  );
}

/** The people of a project, who can be @mentioned. */
async function projectPeople(db: TranslatorDb, projectId: Id): Promise<Member[]> {
  const project = await db.projects.get(projectId);
  if (!project) return [];
  const ids = [...project.managerIds, ...project.memberIds];
  return (await db.members.bulkGet(ids)).filter((m): m is Member => Boolean(m));
}

async function mustGet<T>(record: Promise<T | undefined>, what: string, id: Id): Promise<T> {
  const found = await record;
  if (!found) throw new Error(`${what} ${id} not found`);
  return found;
}

class LocalMemberRepository implements MemberRepository {
  constructor(private readonly db: TranslatorDb) {}

  async list(): Promise<Member[]> {
    const members = await this.db.members.filter((m) => m.removedAt === null).toArray();
    return members.sort((a, b) => nameCollator.compare(a.name, b.name));
  }

  get(id: Id): Promise<Member | undefined> {
    return this.db.members.get(id);
  }

  async invite(rows: InviteRow[], by: Id | null): Promise<Member[]> {
    const db = this.db;
    return db.transaction('rw', db.members, async () => {
      const existing = await db.members.filter((m) => m.removedAt === null).toArray();
      const valid = validateInvites(rows, existing);
      if (!valid.ok) throw new Error('Invalid invitations');
      const invited: Member[] = valid.rows.map((row) => ({
        ...newEntity(by),
        ...row,
        status: 'invited',
        removedAt: null,
      }));
      await db.members.bulkAdd(invited);
      return invited;
    });
  }

  async setCategory(ids: Id[], category: MemberCategory, by: Id | null): Promise<void> {
    const db = this.db;
    await db.transaction('rw', db.members, async () => {
      const members = await db.members.filter((m) => m.removedAt === null).toArray();
      const error = checkCategoryChange(members, ids, category);
      if (error) throw new Error(`Cannot change category: ${error}`);
      await db.members
        .where('id')
        .anyOf(ids)
        .modify({ category, ...touched(by) });
    });
  }

  async remove(ids: Id[], by: Id | null): Promise<void> {
    const db = this.db;
    await db.transaction('rw', db.members, async () => {
      const members = await db.members.filter((m) => m.removedAt === null).toArray();
      const error = checkRemoval(members, ids, by);
      if (error) throw new Error(`Cannot remove: ${error}`);
      const now = new Date().toISOString();
      await db.members
        .where('id')
        .anyOf(ids)
        .modify({ removedAt: now, ...touched(by) });
    });
  }
}

class LocalProjectRepository implements ProjectRepository {
  constructor(private readonly db: TranslatorDb) {}

  async listSummaries(): Promise<ProjectSummary[]> {
    const db = this.db;
    const [projects, sections, items, images, translations] = await db.transaction(
      'r',
      [db.projects, db.sections, db.contentItems, db.images, db.translations],
      () =>
        Promise.all([
          db.projects.toArray(),
          db.sections.toArray(),
          db.contentItems.toArray(),
          db.images.toArray(),
          db.translations.toArray(),
        ]),
    );

    return projects
      .filter((project) => !isProjectDeleted(project))
      .map((project) =>
        toProjectSummary(
          summarizeProject({
            project,
            sections: sections.filter((s) => s.projectId === project.id),
            items: items.filter((i) => i.projectId === project.id),
            images: images.filter((i) => i.projectId === project.id),
            translations: translations.filter((t) => t.projectId === project.id),
          }),
        ),
      );
  }

  getData(id: Id): Promise<ProjectData | undefined> {
    return this.loadProject(id);
  }

  async getDetail(id: Id): Promise<ProjectDetail | undefined> {
    const data = await this.loadProject(id);
    return data && summarizeProject(data);
  }

  async create(input: NewProjectInput, by: Id | null): Promise<Project> {
    const db = this.db;
    return db.transaction(
      'rw',
      [db.projects, db.glossaryCategories, db.notifications],
      async () => {
        const now = new Date();
        const existingCodes = (await db.projects.toArray()).map((p) => p.code);
        const project: Project = {
          id: crypto.randomUUID(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          createdBy: by,
          updatedBy: by,
          ...input,
          code: generateProjectCode(input.name, now.getFullYear(), existingCodes),
          releaseDate: null,
        };
        await db.projects.add(project);
        await db.glossaryCategories.bulkAdd(
          DEFAULT_CATEGORIES.map((name, order) => ({
            ...newEntity(by),
            projectId: project.id,
            name,
            order,
          })),
        );
        await addNotifications(
          db,
          notify(addedPeople(null, project), by, 'addedToProject', { projectId: project.id }),
          by,
        );
        return project;
      },
    );
  }

  async addLanguage(projectId: Id, language: LanguageCode, by: Id | null): Promise<Project> {
    const db = this.db;
    return db.transaction('rw', db.projects, async () => {
      const project = await mustGet(db.projects.get(projectId), 'Project', projectId);
      const addable = addableTargetLanguages(project.sourceLanguage, project.targetLanguages);
      if (!addable.includes(language)) {
        throw new Error(`Language ${language} cannot be added to project ${projectId}`);
      }
      const updated: Project = {
        ...project,
        ...touched(by),
        targetLanguages: [...project.targetLanguages, language],
      };
      await db.projects.put(updated);
      return updated;
    });
  }

  async updateDetails(projectId: Id, patch: ProjectDetailsPatch, by: Id | null): Promise<Project> {
    const db = this.db;
    return db.transaction('rw', [db.projects, db.notifications], async () => {
      const project = await mustGet(db.projects.get(projectId), 'Project', projectId);
      const error = checkProjectDetails(project, patch);
      if (error) throw new Error(`Invalid project details (${error}) for project ${projectId}`);
      const updated: Project = { ...project, ...patch, ...touched(by) };
      await db.projects.put(updated);
      await addNotifications(
        db,
        notify(addedPeople(project, updated), by, 'addedToProject', { projectId }),
        by,
      );
      return updated;
    });
  }

  async rename(
    projectId: Id,
    input: { name: string; code: string },
    by: Id | null,
  ): Promise<Project> {
    const db = this.db;
    return db.transaction('rw', db.projects, async () => {
      const project = await mustGet(db.projects.get(projectId), 'Project', projectId);
      const otherCodes = (await db.projects.toArray())
        .filter((p) => p.id !== projectId)
        .map((p) => p.code);
      const valid = validateProjectIdentity(input, otherCodes);
      if (!valid.ok) throw new Error(`Invalid name or ID for project ${projectId}`);
      const updated: Project = { ...project, name: valid.name, code: valid.code, ...touched(by) };
      await db.projects.put(updated);
      return updated;
    });
  }

  async remove(projectIds: Id[], by: Id | null): Promise<void> {
    const db = this.db;
    await db.transaction('rw', db.projects, async () => {
      const now = new Date().toISOString();
      await db.projects
        .where('id')
        .anyOf(projectIds)
        .modify({ deletedAt: now, ...touched(by) });
    });
  }

  private loadProject(id: Id): Promise<ProjectData | undefined> {
    const db = this.db;
    return db.transaction(
      'r',
      [db.projects, db.sections, db.contentItems, db.images, db.translations],
      async () => {
        const project = await db.projects.get(id);
        if (!project || isProjectDeleted(project)) return undefined;
        const [sections, items, images, translations] = await Promise.all([
          db.sections.where({ projectId: id }).toArray(),
          db.contentItems.where({ projectId: id }).toArray(),
          db.images.where({ projectId: id }).toArray(),
          db.translations.where({ projectId: id }).toArray(),
        ]);
        return { project, sections, items, images, translations };
      },
    );
  }
}

class LocalSectionRepository implements SectionRepository {
  constructor(private readonly db: TranslatorDb) {}

  async create(projectId: Id, input: SectionInput, by: Id | null): Promise<Section> {
    const db = this.db;
    return db.transaction('rw', [db.projects, db.sections], async () => {
      await mustGet(db.projects.get(projectId), 'Project', projectId);
      const siblings = await db.sections.where({ projectId }).toArray();
      const section: Section = {
        ...newEntity(by),
        projectId,
        ...input,
        order: nextOrder(siblings),
      };
      await db.sections.add(section);
      return section;
    });
  }

  async update(id: Id, input: SectionInput, by: Id | null): Promise<Section> {
    const db = this.db;
    return db.transaction('rw', db.sections, async () => {
      const section = await mustGet(db.sections.get(id), 'Section', id);
      const updated: Section = { ...section, ...input, ...touched(by) };
      await db.sections.put(updated);
      return updated;
    });
  }
}

class LocalContentItemRepository implements ContentItemRepository {
  constructor(private readonly db: TranslatorDb) {}

  async create(
    sectionId: Id,
    input: NewContentItemInput,
    images: NewImageFile[],
    by: Id | null,
  ): Promise<ContentItem> {
    // Read the files before the transaction: IndexedDB transactions close on foreign awaits.
    const files = await Promise.all(
      images.map(async ({ name, data }) => ({
        name,
        type: data.type,
        bytes: await data.arrayBuffer(),
      })),
    );
    const db = this.db;
    return db.transaction('rw', [db.sections, db.contentItems, db.images, db.files], async () => {
      const section = await mustGet(db.sections.get(sectionId), 'Section', sectionId);
      const siblings = await db.contentItems.where({ sectionId }).toArray();
      const item: ContentItem = {
        ...newEntity(by),
        projectId: section.projectId,
        sectionId,
        ...input,
        order: nextOrder(siblings),
        translatorNote: null,
      };
      const stored: StoredFile[] = files.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.bytes.byteLength,
        data: file.bytes,
        createdAt: item.createdAt,
      }));
      const sceneImages: SceneImage[] = stored.map((file, order) => ({
        ...newEntity(by),
        projectId: section.projectId,
        contentItemId: item.id,
        order,
        fileName: file.name,
        fileId: file.id,
        source: {
          text: '',
          speaker: null,
          type: null,
          ocrText: null,
          ocrBlocks: [],
        },
        ocrStatus: 'pending',
        ocrError: null,
      }));
      await db.contentItems.add(item);
      await db.files.bulkAdd(stored);
      await db.images.bulkAdd(sceneImages);
      return item;
    });
  }

  async moveToSection(itemIds: Id[], sectionId: Id, by: Id | null): Promise<void> {
    const db = this.db;
    await db.transaction('rw', [db.sections, db.contentItems], async () => {
      const section = await mustGet(db.sections.get(sectionId), 'Section', sectionId);
      const items = await db.contentItems.where({ projectId: section.projectId }).toArray();
      if (itemIds.some((id) => !items.some((item) => item.id === id))) {
        throw new Error(`Some items do not belong to project ${section.projectId}`);
      }
      const moves = planMove(items, itemIds, sectionId);
      await Promise.all(
        moves.map(({ id, ...move }) => db.contentItems.update(id, { ...move, ...touched(by) })),
      );
    });
  }

  async updateNote(itemId: Id, note: string | null, by: Id | null): Promise<void> {
    const db = this.db;
    await db.transaction('rw', db.contentItems, async () => {
      await mustGet(db.contentItems.get(itemId), 'Content item', itemId);
      await db.contentItems.update(itemId, {
        translatorNote: note?.trim() ? note.trim() : null,
        ...touched(by),
      });
    });
  }
}

class LocalImageRepository implements ImageRepository {
  constructor(private readonly db: TranslatorDb) {}

  async listPendingOcr(): Promise<PendingOcr[]> {
    const db = this.db;
    return db.transaction('r', [db.images, db.projects], async () => {
      const images = await db.images.where({ ocrStatus: 'pending' }).toArray();
      const projects = await db.projects.bulkGet([...new Set(images.map((i) => i.projectId))]);
      const languageOf = new Map(projects.flatMap((p) => (p ? [[p.id, p.sourceLanguage]] : [])));
      return images
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.order - b.order)
        .flatMap((image) => {
          const language = languageOf.get(image.projectId);
          return language ? [{ image, language }] : [];
        });
    });
  }

  async getFile(fileId: Id): Promise<Blob | undefined> {
    const file = await this.db.files.get(fileId);
    return file && new Blob([file.data], { type: file.type });
  }

  async saveOcrOutcome(imageId: Id, outcome: OcrOutcome): Promise<void> {
    const db = this.db;
    await db.transaction('rw', db.images, async () => {
      const image = await db.images.get(imageId);
      // The image may have been deleted while OCR was running.
      if (!image) return;
      await db.images.put({
        ...applyOcrOutcome(image, outcome),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  async listForItem(contentItemId: Id): Promise<ItemImages> {
    const db = this.db;
    return db.transaction('r', [db.images, db.translations], async () => {
      const images = (await db.images.where({ contentItemId }).toArray()).sort(
        (a, b) => a.order - b.order,
      );
      const translations = await db.translations
        .where('imageId')
        .anyOf(images.map((i) => i.id))
        .toArray();
      return { images, translations };
    });
  }

  async updateSource(imageId: Id, patch: SourceTextPatch, by: Id | null): Promise<void> {
    const db = this.db;
    await db.transaction('rw', db.images, async () => {
      const image = await mustGet(db.images.get(imageId), 'Image', imageId);
      await db.images.put({ ...applySourceEdit(image, patch), ...touched(by) });
    });
  }

  async retryOcr(contentItemId: Id): Promise<void> {
    const db = this.db;
    await db.transaction('rw', db.images, async () => {
      await db.images
        .where({ contentItemId })
        .filter((image) => image.ocrStatus === 'failed')
        .modify({ ocrStatus: 'pending', ocrError: null });
    });
  }
}

class LocalTranslationRepository implements TranslationRepository {
  constructor(private readonly db: TranslatorDb) {}

  async save(imageId: Id, language: LanguageCode, text: string, by: Id | null): Promise<void> {
    await this.change(imageId, language, (current, image) => {
      if (current) return editTranslation(current, text, by, new Date());
      if (text === '') return undefined;
      const created: Translation = {
        ...newEntity(by),
        projectId: image.projectId,
        imageId,
        language,
        text: '',
        status: 'not-started',
        ready: false,
        authorId: by,
        reviewerId: null,
      };
      return editTranslation(created, text, by, new Date());
    });
  }

  async setReady(imageId: Id, language: LanguageCode, ready: boolean, by: Id | null) {
    await this.change(imageId, language, (current) =>
      current ? setReady(current, ready, by, new Date()) : undefined,
    );
  }

  async review(imageId: Id, language: LanguageCode, decision: ReviewDecision, by: Id) {
    const db = this.db;
    await db.transaction(
      'rw',
      [db.members, db.images, db.translations, db.notifications],
      async () => {
        const reviewer = await db.members.get(by);
        if (reviewer?.category !== 'manager') throw new Error('Only managers can review');
        const image = await mustGet(db.images.get(imageId), 'Image', imageId);
        const current = await db.translations.where({ imageId, language }).first();
        if (!current) return;
        const next =
          decision === 'approve'
            ? approve(current, by, new Date())
            : requestChanges(current, by, new Date());
        if (next === current) return;
        await db.translations.put(next);
        await addNotifications(
          db,
          notify(
            [current.authorId ?? current.updatedBy],
            by,
            decision === 'approve' ? 'approved' : 'changesRequested',
            { projectId: image.projectId, contentItemId: image.contentItemId, imageId, language },
          ),
          by,
        );
      },
    );
  }

  async listReviewQueue(): Promise<ReviewQueueEntry[]> {
    const db = this.db;
    return db.transaction(
      'r',
      [db.translations, db.images, db.contentItems, db.sections, db.projects],
      async () => {
        const [waiting, images, contexts] = await Promise.all([
          db.translations.filter((t) => t.status === 'under-review').toArray(),
          db.images.toArray(),
          loadItemContexts(db),
        ]);
        return waiting.flatMap((translation) => {
          const image = images.find((i) => i.id === translation.imageId);
          const context = image && contexts.get(image.contentItemId);
          return image && context ? [{ ...context, translation, image }] : [];
        });
      },
    );
  }

  async submitSectionForReview(sectionId: Id, by: Id | null): Promise<number> {
    const db = this.db;
    return db.transaction(
      'rw',
      [db.sections, db.projects, db.contentItems, db.images, db.translations, db.notifications],
      async () => {
        const section = await mustGet(db.sections.get(sectionId), 'Section', sectionId);
        const project = await mustGet(
          db.projects.get(section.projectId),
          'Project',
          section.projectId,
        );
        const itemIds = (await db.contentItems.where({ sectionId }).toArray()).map((i) => i.id);
        const imageIds = (await db.images.where('contentItemId').anyOf(itemIds).toArray()).map(
          (i) => i.id,
        );
        const translations = await db.translations.where('imageId').anyOf(imageIds).toArray();
        const submitted = submitForReview(translations, by, new Date());
        await db.translations.bulkPut(submitted);
        if (submitted.length > 0) {
          await addNotifications(
            db,
            notify(project.managerIds, by, 'submitted', {
              projectId: project.id,
              sectionId,
              count: submitted.length,
            }),
            by,
          );
        }
        return submitted.length;
      },
    );
  }

  /** Reads the translation of (image, language), applies `update` and stores the result. */
  private async change(
    imageId: Id,
    language: LanguageCode,
    update: (current: Translation | undefined, image: SceneImage) => Translation | undefined,
  ): Promise<void> {
    const db = this.db;
    await db.transaction('rw', [db.images, db.translations], async () => {
      const image = await mustGet(db.images.get(imageId), 'Image', imageId);
      const current = await db.translations.where({ imageId, language }).first();
      const next = update(current, image);
      if (next && next !== current) await db.translations.put(next);
    });
  }
}

class LocalCommentRepository implements CommentRepository {
  constructor(private readonly db: TranslatorDb) {}

  async listForImage(imageId: Id): Promise<ThreadWithComments[]> {
    const db = this.db;
    return db.transaction('r', [db.commentThreads, db.comments], async () => {
      const threads = await db.commentThreads.where({ imageId }).toArray();
      const comments = await db.comments
        .where('threadId')
        .anyOf(threads.map((t) => t.id))
        .toArray();
      return threads
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((thread) => ({
          thread,
          comments: comments
            .filter((c) => c.threadId === thread.id)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        }));
    });
  }

  async listInbox(): Promise<CommentInboxEntry[]> {
    const db = this.db;
    return db.transaction(
      'r',
      [db.commentThreads, db.comments, db.images, db.contentItems, db.sections, db.projects],
      async () => {
        const [threads, comments, images, items, sections, projects] = await Promise.all([
          db.commentThreads.toArray(),
          db.comments.toArray(),
          db.images.toArray(),
          db.contentItems.toArray(),
          db.sections.toArray(),
          db.projects.toArray(),
        ]);
        const byId = <T extends { id: Id }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
        const [imageMap, itemMap, sectionMap, projectMap] = [
          byId(images),
          byId(items),
          byId(sections),
          byId(projects),
        ];
        return threads.flatMap((thread) => {
          const image = imageMap.get(thread.imageId);
          const item = image && itemMap.get(image.contentItemId);
          const section = item && sectionMap.get(item.sectionId);
          const project = projectMap.get(thread.projectId);
          if (!image || !item || !section || !project || isProjectDeleted(project)) return [];
          return [
            {
              thread,
              comments: comments
                .filter((c) => c.threadId === thread.id)
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
              image,
              item,
              section,
              project,
            },
          ];
        });
      },
    );
  }

  async startThread(imageId: Id, language: LanguageCode | null, body: string, by: Id | null) {
    const db = this.db;
    await db.transaction(
      'rw',
      [db.images, db.commentThreads, db.comments, db.projects, db.members, db.notifications],
      async () => {
        const image = await mustGet(db.images.get(imageId), 'Image', imageId);
        const thread: CommentThread = {
          ...newEntity(by),
          projectId: image.projectId,
          imageId,
          language,
          resolvedAt: null,
          resolvedBy: null,
        };
        const comment: Comment = {
          ...newEntity(by),
          projectId: image.projectId,
          threadId: thread.id,
          authorId: by,
          body: body.trim(),
        };
        await db.commentThreads.add(thread);
        await db.comments.add(comment);
        await addNotifications(
          db,
          commentNotifications({
            body: comment.body,
            by,
            people: await projectPeople(db, image.projectId),
            earlierAuthorIds: [],
            about: {
              projectId: image.projectId,
              contentItemId: image.contentItemId,
              imageId,
              threadId: thread.id,
              commentId: comment.id,
              language,
            },
          }),
          by,
        );
      },
    );
  }

  async reply(threadId: Id, body: string, by: Id | null) {
    const db = this.db;
    await db.transaction(
      'rw',
      [db.commentThreads, db.comments, db.images, db.projects, db.members, db.notifications],
      async () => {
        const thread = await mustGet(db.commentThreads.get(threadId), 'Thread', threadId);
        const earlier = await db.comments.where({ threadId }).toArray();
        const image = await db.images.get(thread.imageId);
        const comment: Comment = {
          ...newEntity(by),
          projectId: thread.projectId,
          threadId,
          authorId: by,
          body: body.trim(),
        };
        await db.comments.add(comment);
        await db.commentThreads.update(threadId, touched(by));
        await addNotifications(
          db,
          commentNotifications({
            body: comment.body,
            by,
            people: await projectPeople(db, thread.projectId),
            earlierAuthorIds: earlier.map((c) => c.authorId),
            about: {
              projectId: thread.projectId,
              contentItemId: image?.contentItemId ?? null,
              imageId: thread.imageId,
              threadId,
              commentId: comment.id,
              language: thread.language,
            },
          }),
          by,
        );
      },
    );
  }

  async resolve(threadId: Id, by: Id | null) {
    const db = this.db;
    await db.transaction(
      'rw',
      [db.commentThreads, db.comments, db.images, db.notifications],
      async () => {
        const thread = await mustGet(db.commentThreads.get(threadId), 'Thread', threadId);
        const now = new Date().toISOString();
        await db.commentThreads.update(threadId, {
          resolvedAt: now,
          resolvedBy: by,
          updatedAt: now,
          updatedBy: by,
        });
        const writers = (await db.comments.where({ threadId }).toArray()).map((c) => c.authorId);
        const image = await db.images.get(thread.imageId);
        await addNotifications(
          db,
          notify(writers, by, 'resolved', {
            projectId: thread.projectId,
            contentItemId: image?.contentItemId ?? null,
            imageId: thread.imageId,
            threadId,
            language: thread.language,
          }),
          by,
        );
      },
    );
  }

  async reopen(threadId: Id, by: Id | null) {
    await this.db.commentThreads.update(threadId, {
      resolvedAt: null,
      resolvedBy: null,
      ...touched(by),
    });
  }
}

const sameContent = (a: GlossaryContent, b: GlossaryContent) =>
  a.categoryId === b.categoryId &&
  a.title === b.title &&
  a.description === b.description &&
  a.body === b.body &&
  a.tags.join('\u0000') === b.tags.join('\u0000') &&
  a.imageFileIds.join() === b.imageFileIds.join();

const contentOf = (source: GlossaryContent): GlossaryContent => ({
  categoryId: source.categoryId,
  title: source.title,
  description: source.description,
  tags: [...source.tags],
  imageFileIds: [...source.imageFileIds],
  body: source.body,
});

class LocalGlossaryRepository implements GlossaryRepository {
  constructor(private readonly db: TranslatorDb) {}

  async listCategories(projectId: Id): Promise<GlossaryCategory[]> {
    const categories = await this.db.glossaryCategories.where({ projectId }).toArray();
    return categories.sort((a, b) => a.order - b.order);
  }

  async createCategory(projectId: Id, name: string, by: Id | null): Promise<GlossaryCategory> {
    const db = this.db;
    return db.transaction('rw', db.glossaryCategories, async () => {
      const existing = await db.glossaryCategories.where({ projectId }).toArray();
      const valid = validateCategoryName(name, existing);
      if (!valid.ok) throw new Error(`Invalid category name: ${valid.error}`);
      const category: GlossaryCategory = {
        ...newEntity(by),
        projectId,
        name: valid.name,
        order: nextOrder(existing),
      };
      await db.glossaryCategories.add(category);
      return category;
    });
  }

  listEntries(projectId: Id): Promise<GlossaryEntry[]> {
    return this.db.glossaryEntries.where({ projectId }).toArray();
  }

  getEntry(entryId: Id): Promise<GlossaryEntry | undefined> {
    return this.db.glossaryEntries.get(entryId);
  }

  async createEntry(projectId: Id, content: GlossaryContent, by: Id | null) {
    const db = this.db;
    return db.transaction('rw', [db.glossaryEntries, db.glossaryVersions], async () => {
      const entry: GlossaryEntry = {
        ...newEntity(by),
        ...contentOf(content),
        projectId,
        viewCount: 0,
      };
      await db.glossaryEntries.add(entry);
      await db.glossaryVersions.add({
        ...newEntity(by),
        ...contentOf(content),
        projectId,
        entryId: entry.id,
        number: 1,
      });
      return entry;
    });
  }

  async updateEntry(entryId: Id, content: GlossaryContent, by: Id | null) {
    const db = this.db;
    return db.transaction('rw', [db.glossaryEntries, db.glossaryVersions], async () => {
      const entry = await mustGet(db.glossaryEntries.get(entryId), 'Glossary entry', entryId);
      if (sameContent(entry, content)) return entry;
      const updated: GlossaryEntry = { ...entry, ...contentOf(content), ...touched(by) };
      await db.glossaryEntries.put(updated);
      const count = await db.glossaryVersions.where({ entryId }).count();
      await db.glossaryVersions.add({
        ...newEntity(by),
        ...contentOf(content),
        projectId: entry.projectId,
        entryId,
        number: count + 1,
      });
      return updated;
    });
  }

  async recordView(entryId: Id): Promise<void> {
    const db = this.db;
    await db.transaction('rw', db.glossaryEntries, async () => {
      const entry = await db.glossaryEntries.get(entryId);
      if (entry) await db.glossaryEntries.update(entryId, { viewCount: entry.viewCount + 1 });
    });
  }

  async listVersions(entryId: Id): Promise<GlossaryVersion[]> {
    const versions = await this.db.glossaryVersions.where({ entryId }).toArray();
    return versions.sort((a, b) => b.number - a.number);
  }

  async restoreVersion(entryId: Id, versionId: Id, by: Id | null) {
    const version = await mustGet(this.db.glossaryVersions.get(versionId), 'Version', versionId);
    if (version.entryId !== entryId) throw new Error('The version belongs to another entry');
    return this.updateEntry(entryId, contentOf(version), by);
  }

  async storeImage(file: NewImageFile): Promise<Id> {
    const data = await file.data.arrayBuffer();
    const id = crypto.randomUUID();
    await this.db.files.add({
      id,
      name: file.name,
      type: file.data.type,
      size: data.byteLength,
      data,
      createdAt: new Date().toISOString(),
    });
    return id;
  }
}

/**
 * Where each content item lives, for the inbox pages (DECISIONS D43, D44).
 * Items of deleted projects are left out.
 */
async function loadItemContexts(db: TranslatorDb): Promise<Map<Id, ItemContext>> {
  const [items, sections, projects] = await Promise.all([
    db.contentItems.toArray(),
    db.sections.toArray(),
    db.projects.toArray(),
  ]);
  const contexts = new Map<Id, ItemContext>();
  for (const item of items) {
    const section = sections.find((s) => s.id === item.sectionId);
    const project = projects.find((p) => p.id === item.projectId);
    if (section && project && !isProjectDeleted(project)) {
      contexts.set(item.id, { project, section, item });
    }
  }
  return contexts;
}

class LocalAssignmentRepository implements AssignmentRepository {
  constructor(private readonly db: TranslatorDb) {}

  listForProject(projectId: Id): Promise<Assignment[]> {
    return this.db.assignments.where({ projectId }).toArray();
  }

  async assign(itemId: Id, language: LanguageCode, assigneeId: Id | null, by: Id) {
    const db = this.db;
    await db.transaction(
      'rw',
      [db.members, db.projects, db.contentItems, db.assignments, db.notifications],
      async () => {
        const manager = await db.members.get(by);
        if (manager?.category !== 'manager') throw new Error('Only managers can assign');
        const item = await mustGet(db.contentItems.get(itemId), 'Content item', itemId);
        const project = await mustGet(db.projects.get(item.projectId), 'Project', item.projectId);
        if (!project.targetLanguages.includes(language)) {
          throw new Error(`${language} is not a target language of project ${project.id}`);
        }
        if (
          assigneeId !== null &&
          !project.managerIds.includes(assigneeId) &&
          !project.memberIds.includes(assigneeId)
        ) {
          throw new Error(`Member ${assigneeId} is not part of project ${project.id}`);
        }
        const existing = (await db.assignments.where({ contentItemId: itemId }).toArray()).find(
          (a) => a.language === language,
        );
        if (assigneeId === null) {
          if (existing) await db.assignments.delete(existing.id);
          return;
        }
        if (existing?.assigneeId === assigneeId) return;
        if (existing) {
          // A new assignment for someone else: it counts as new in their list.
          await db.assignments.put({
            ...existing,
            ...newEntity(by),
            id: existing.id,
            assigneeId,
          });
        } else {
          await db.assignments.add({
            ...newEntity(by),
            projectId: project.id,
            contentItemId: itemId,
            language,
            assigneeId,
          });
        }
        await addNotifications(
          db,
          notify([assigneeId], by, 'assigned', {
            projectId: project.id,
            sectionId: item.sectionId,
            contentItemId: itemId,
            language,
          }),
          by,
        );
      },
    );
  }

  async listInbox(): Promise<AssignmentInboxEntry[]> {
    const db = this.db;
    return db.transaction(
      'r',
      [db.assignments, db.contentItems, db.sections, db.projects, db.images, db.translations],
      async () => {
        const [assignments, contexts, images, translations] = await Promise.all([
          db.assignments.toArray(),
          loadItemContexts(db),
          db.images.toArray(),
          db.translations.toArray(),
        ]);
        return assignments.flatMap((assignment) => {
          const context = contexts.get(assignment.contentItemId);
          if (!context) return [];
          const itemImages = images
            .filter((i) => i.contentItemId === assignment.contentItemId)
            .sort((a, b) => a.order - b.order);
          const ids = new Set(itemImages.map((i) => i.id));
          return [
            {
              ...context,
              assignment,
              images: itemImages,
              translations: translations.filter(
                (t) => ids.has(t.imageId) && t.language === assignment.language,
              ),
            },
          ];
        });
      },
    );
  }
}

class LocalNotificationRepository implements NotificationRepository {
  constructor(private readonly db: TranslatorDb) {}

  async listFor(recipientId: Id): Promise<NotificationInboxEntry[]> {
    const db = this.db;
    return db.transaction(
      'r',
      [
        db.notifications,
        db.projects,
        db.sections,
        db.contentItems,
        db.images,
        db.commentThreads,
        db.comments,
        db.translations,
      ],
      async () => {
        const notifications = await db.notifications.where({ recipientId }).toArray();
        const entries = await Promise.all(
          notifications.map(async (notification): Promise<NotificationInboxEntry | null> => {
            const project = await db.projects.get(notification.projectId);
            if (!project || isProjectDeleted(project)) return null;
            const item = notification.contentItemId
              ? ((await db.contentItems.get(notification.contentItemId)) ?? null)
              : null;
            const sectionId = item?.sectionId ?? notification.sectionId;
            const section = sectionId ? ((await db.sections.get(sectionId)) ?? null) : null;
            const image = notification.imageId
              ? ((await db.images.get(notification.imageId)) ?? null)
              : null;
            const threadRecord = notification.threadId
              ? await db.commentThreads.get(notification.threadId)
              : undefined;
            const thread = threadRecord
              ? {
                  thread: threadRecord,
                  comments: (await db.comments.where({ threadId: threadRecord.id }).toArray()).sort(
                    (a, b) => a.createdAt.localeCompare(b.createdAt),
                  ),
                }
              : null;
            const translation =
              image && notification.language && !notification.threadId
                ? ((await db.translations
                    .where({ imageId: image.id, language: notification.language })
                    .first()) ?? null)
                : null;
            return { notification, project, section, item, image, thread, translation };
          }),
        );
        return entries.filter((e): e is NotificationInboxEntry => e !== null);
      },
    );
  }

  async markRead(ids: Id[]): Promise<void> {
    const now = new Date().toISOString();
    await this.db.notifications
      .where('id')
      .anyOf(ids)
      .modify((n) => {
        n.readAt ??= now;
      });
  }

  async markAllRead(recipientId: Id): Promise<void> {
    const now = new Date().toISOString();
    await this.db.notifications.where({ recipientId }).modify((n) => {
      n.readAt ??= now;
    });
  }
}

class LocalWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: TranslatorDb) {}

  async ensureInitialized(): Promise<void> {
    const db = this.db;
    await db.transaction('rw', [db.meta, ...db.dataTables], async () => {
      if (await db.meta.get(META_INITIALIZED_AT)) return;
      const now = new Date().toISOString();
      await db.members.add(createWorkspaceOwner(crypto.randomUUID(), now));
      await db.meta.put({ key: META_INITIALIZED_AT, value: now });
    });
  }

  async deleteUnusedFiles(before: Date): Promise<number> {
    const db = this.db;
    return db.transaction(
      'rw',
      [db.files, db.images, db.glossaryEntries, db.glossaryVersions],
      async () => {
        const [fileIds, images, entries, versions] = await Promise.all([
          db.files.toCollection().primaryKeys(),
          db.images.toArray(),
          db.glossaryEntries.toArray(),
          db.glossaryVersions.toArray(),
        ]);
        const used = new Set<Id>();
        for (const image of images) if (image.fileId) used.add(image.fileId);
        for (const content of [...entries, ...versions]) {
          for (const id of content.imageFileIds) used.add(id);
        }
        // Only the unreferenced files are read in full, to check their age.
        const candidates = await db.files.bulkGet(fileIds.filter((id) => !used.has(id)));
        const cutoff = before.toISOString();
        const unused = candidates
          .filter((file): file is StoredFile => !!file && file.createdAt < cutoff)
          .map((file) => file.id);
        await db.files.bulkDelete(unused);
        return unused.length;
      },
    );
  }

  async replace(
    data: WorkspaceData,
    files: WorkspaceFile[],
    settings?: WorkspaceSettings,
  ): Promise<void> {
    // Read the files before the transaction: awaiting anything but Dexie inside it would end it.
    const stored: StoredFile[] = await Promise.all(
      files.map(async (file) => ({
        id: file.id,
        name: file.name,
        type: file.data.type,
        size: file.data.size,
        data: await file.data.arrayBuffer(),
        createdAt: new Date().toISOString(),
      })),
    );
    const db = this.db;
    await db.transaction('rw', [db.meta, ...db.dataTables], async () => {
      await Promise.all([db.meta.clear(), ...db.dataTables.map((table) => table.clear())]);
      await Promise.all([
        db.members.bulkAdd(data.members),
        db.projects.bulkAdd(data.projects),
        db.sections.bulkAdd(data.sections),
        db.contentItems.bulkAdd(data.items),
        db.images.bulkAdd(data.images),
        db.translations.bulkAdd(data.translations),
        db.commentThreads.bulkAdd(data.commentThreads),
        db.comments.bulkAdd(data.comments),
        db.glossaryCategories.bulkAdd(data.glossaryCategories),
        db.glossaryEntries.bulkAdd(data.glossaryEntries),
        db.glossaryVersions.bulkAdd(data.glossaryVersions),
        db.assignments.bulkAdd(data.assignments ?? []),
        db.notifications.bulkAdd(data.notifications ?? []),
        db.files.bulkAdd(stored),
        db.meta.put({ key: META_INITIALIZED_AT, value: new Date().toISOString() }),
        settings && db.meta.put({ key: META_SETTINGS, value: JSON.stringify(settings) }),
      ]);
    });
  }

  async reset(): Promise<void> {
    const db = this.db;
    await db.transaction('rw', [db.meta, ...db.dataTables], async () => {
      await Promise.all([db.meta.clear(), ...db.dataTables.map((table) => table.clear())]);
    });
    await this.ensureInitialized();
  }

  async exportAll() {
    const db = this.db;
    return db.transaction('r', [db.meta, ...db.dataTables], async () => {
      const [
        members,
        projects,
        sections,
        items,
        images,
        translations,
        commentThreads,
        comments,
        glossaryCategories,
        glossaryEntries,
        glossaryVersions,
        assignments,
        notifications,
        stored,
      ] = await Promise.all([
        db.members.toArray(),
        db.projects.toArray(),
        db.sections.toArray(),
        db.contentItems.toArray(),
        db.images.toArray(),
        db.translations.toArray(),
        db.commentThreads.toArray(),
        db.comments.toArray(),
        db.glossaryCategories.toArray(),
        db.glossaryEntries.toArray(),
        db.glossaryVersions.toArray(),
        db.assignments.toArray(),
        db.notifications.toArray(),
        db.files.toArray(),
      ]);
      const data: WorkspaceData = {
        members,
        projects,
        sections,
        items,
        images,
        translations,
        commentThreads,
        comments,
        glossaryCategories,
        glossaryEntries,
        glossaryVersions,
        assignments,
        notifications,
      };
      const files: WorkspaceFile[] = stored.map((file) => ({
        id: file.id,
        name: file.name,
        data: new Blob([file.data], { type: file.type }),
      }));
      return { data, files, settings: await this.getSettings() };
    });
  }

  async getSettings(): Promise<WorkspaceSettings> {
    const record = await this.db.meta.get(META_SETTINGS);
    let stored: unknown;
    try {
      stored = record ? JSON.parse(record.value) : undefined;
    } catch {
      stored = undefined;
    }
    return parseWorkspaceSettings(stored);
  }

  async updateSettings(patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    const db = this.db;
    return db.transaction('rw', db.meta, async () => {
      const settings = { ...(await this.getSettings()), ...patch };
      await db.meta.put({ key: META_SETTINGS, value: JSON.stringify(settings) });
      return settings;
    });
  }
}

export function createLocalRepositories(db: TranslatorDb = new TranslatorDb()): Repositories {
  return {
    members: new LocalMemberRepository(db),
    projects: new LocalProjectRepository(db),
    sections: new LocalSectionRepository(db),
    contentItems: new LocalContentItemRepository(db),
    images: new LocalImageRepository(db),
    translations: new LocalTranslationRepository(db),
    comments: new LocalCommentRepository(db),
    glossary: new LocalGlossaryRepository(db),
    assignments: new LocalAssignmentRepository(db),
    notifications: new LocalNotificationRepository(db),
    workspace: new LocalWorkspaceRepository(db),
  };
}
