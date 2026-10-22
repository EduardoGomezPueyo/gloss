import {
  summarizeProject,
  toProjectSummary,
  type ProjectData,
  type ProjectDetail,
  type ProjectSummary,
} from '@/domain/progress';
import { applyOcrOutcome, type OcrOutcome } from '@/domain/images';
import { addableTargetLanguages } from '@/domain/languages';
import { planMove } from '@/domain/moveItems';
import type { NewContentItemInput, NewImageFile } from '@/domain/newContentItem';
import type { NewProjectInput } from '@/domain/newProject';
import { generateProjectCode } from '@/domain/projectCode';
import { nextOrder, type SectionInput } from '@/domain/sections';
import type {
  ContentItem,
  Entity,
  Id,
  LanguageCode,
  Member,
  Project,
  SceneImage,
  Section,
} from '@/domain/types';
import type {
  ContentItemRepository,
  DemoRepository,
  ImageRepository,
  MemberRepository,
  ProjectRepository,
  Repositories,
  PendingOcr,
  SectionRepository,
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
    return db.transaction('rw', db.projects, async () => {
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
    demo: new LocalDemoRepository(db, seedOptions),
  };
}
