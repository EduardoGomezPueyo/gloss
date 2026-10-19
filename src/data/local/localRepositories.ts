import {
  summarizeProject,
  toProjectSummary,
  type ProjectData,
  type ProjectDetail,
  type ProjectSummary,
} from '@/domain/progress';
import type { Id, Member } from '@/domain/types';
import type {
  DemoRepository,
  MemberRepository,
  ProjectRepository,
  Repositories,
} from '../repositories/types';
import { createDemoData, type DemoSeedOptions } from '../seed/demoSeed';
import { META_SEEDED_AT, TranslatorDb } from './db';

const nameCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

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
    demo: new LocalDemoRepository(db, seedOptions),
  };
}
