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
import { planMove } from '@/domain/moveItems';
import type { NewContentItemInput, NewImageFile } from '@/domain/newContentItem';
import type { NewProjectInput } from '@/domain/newProject';
import { generateProjectCode } from '@/domain/projectCode';
import { nextOrder, type SectionInput } from '@/domain/sections';
import {
  approve,
  editTranslation,
  requestChanges,
  setReady,
  submitForReview,
} from '@/domain/translationWorkflow';
import type {
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
  Project,
  SceneImage,
  Section,
  Translation,
} from '@/domain/types';
import type {
  CommentRepository,
  ContentItemRepository,
  DemoRepository,
  GlossaryRepository,
  ImageRepository,
  ItemImages,
  MemberRepository,
  ProjectRepository,
  Repositories,
  PendingOcr,
  ReviewDecision,
  SectionRepository,
  ThreadWithComments,
  TranslationRepository,
} from '../repositories/types';
import { createDemoData, type DemoSeedOptions } from '../seed/demoSeed';
import { META_SEEDED_AT, TranslatorDb, type StoredFile } from './db';

const nameCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

function newEntity(by: Id | null): Entity {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, createdBy: by, updatedBy: by };
}

function touched(by: Id | null): Pick<Entity, 'updatedAt' | 'updatedBy'> {
  return { updatedAt: new Date().toISOString(), updatedBy: by };
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

    return projects.map((project) =>
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

  async getDetail(id: Id): Promise<ProjectDetail | undefined> {
    const data = await this.loadProject(id);
    return data && summarizeProject(data);
  }

  async create(input: NewProjectInput, by: Id | null): Promise<Project> {
    const db = this.db;
    return db.transaction('rw', [db.projects, db.glossaryCategories], async () => {
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
      return project;
    });
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

  private loadProject(id: Id): Promise<ProjectData | undefined> {
    const db = this.db;
    return db.transaction(
      'r',
      [db.projects, db.sections, db.contentItems, db.images, db.translations],
      async () => {
        const project = await db.projects.get(id);
        if (!project) return undefined;
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
          contextNote: null,
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
    const reviewer = await this.db.members.get(by);
    if (reviewer?.category !== 'manager') throw new Error('Only managers can review');
    await this.change(imageId, language, (current) => {
      if (!current) return undefined;
      return decision === 'approve'
        ? approve(current, by, new Date())
        : requestChanges(current, by, new Date());
    });
  }

  async submitSectionForReview(sectionId: Id, by: Id | null): Promise<number> {
    const db = this.db;
    return db.transaction('rw', [db.contentItems, db.images, db.translations], async () => {
      const itemIds = (await db.contentItems.where({ sectionId }).toArray()).map((i) => i.id);
      const imageIds = (await db.images.where('contentItemId').anyOf(itemIds).toArray()).map(
        (i) => i.id,
      );
      const translations = await db.translations.where('imageId').anyOf(imageIds).toArray();
      const submitted = submitForReview(translations, by, new Date());
      await db.translations.bulkPut(submitted);
      return submitted.length;
    });
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

  async startThread(imageId: Id, language: LanguageCode | null, body: string, by: Id | null) {
    const db = this.db;
    await db.transaction('rw', [db.images, db.commentThreads, db.comments], async () => {
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
    });
  }

  async reply(threadId: Id, body: string, by: Id | null) {
    const db = this.db;
    await db.transaction('rw', [db.commentThreads, db.comments], async () => {
      const thread = await mustGet(db.commentThreads.get(threadId), 'Thread', threadId);
      await db.comments.add({
        ...newEntity(by),
        projectId: thread.projectId,
        threadId,
        authorId: by,
        body: body.trim(),
      });
      await db.commentThreads.update(threadId, touched(by));
    });
  }

  async resolve(threadId: Id, by: Id | null) {
    const now = new Date().toISOString();
    await this.db.commentThreads.update(threadId, {
      resolvedAt: now,
      resolvedBy: by,
      updatedAt: now,
      updatedBy: by,
    });
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

class LocalDemoRepository implements DemoRepository {
  constructor(
    private readonly db: TranslatorDb,
    private readonly seedOptions: DemoSeedOptions,
  ) {}

  async ensureSeeded(): Promise<void> {
    const db = this.db;
    await db.transaction('rw', [db.meta, ...db.dataTables], async () => {
      if (await db.meta.get(META_SEEDED_AT)) return;
      await this.seed();
    });
  }

  async reset(): Promise<void> {
    const db = this.db;
    await db.transaction('rw', [db.meta, ...db.dataTables], async () => {
      await Promise.all([db.meta.clear(), ...db.dataTables.map((table) => table.clear())]);
      await this.seed();
    });
  }

  /** Must run inside a read-write transaction over every table. */
  private async seed(): Promise<void> {
    const db = this.db;
    const data = createDemoData(this.seedOptions);
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
      db.meta.put({ key: META_SEEDED_AT, value: new Date().toISOString() }),
    ]);
  }
}

export function createLocalRepositories(
  db: TranslatorDb = new TranslatorDb(),
  seedOptions: DemoSeedOptions = {},
): Repositories {
  return {
    members: new LocalMemberRepository(db),
    projects: new LocalProjectRepository(db),
    sections: new LocalSectionRepository(db),
    contentItems: new LocalContentItemRepository(db),
    images: new LocalImageRepository(db),
    translations: new LocalTranslationRepository(db),
    comments: new LocalCommentRepository(db),
    glossary: new LocalGlossaryRepository(db),
    demo: new LocalDemoRepository(db, seedOptions),
  };
}
