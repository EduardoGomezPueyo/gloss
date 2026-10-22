import type {
  Comment,
  CommentThread,
  ContentItem,
  Entity,
  Id,
  LanguageCode,
  Member,
  MemberCategory,
  MemberStatus,
  Platform,
  Priority,
  Project,
  SceneImage,
  Section,
  Status,
  Translation,
} from '@/domain/types';
import { createRandom, type Random } from './random';

/*
 * Demo data: neutral placeholder content (DECISIONS D19) until the demo world is
 * chosen (SPEC open decision 9). Never use text or art from commercial games.
 *
 * Pure and deterministic for a given `now`: statuses, authors and dates come from
 * a seeded PRNG, so every screen shows the same, consistent data.
 */

export interface DemoData {
  members: Member[];
  projects: Project[];
  sections: Section[];
  items: ContentItem[];
  images: SceneImage[];
  translations: Translation[];
  commentThreads: CommentThread[];
  comments: Comment[];
}

export interface DemoSeedOptions {
  now?: Date;
  randomId?: () => Id;
}

/** How far translation work has advanced in a section. */
type Profile = 'fresh' | 'early' | 'mid' | 'review' | 'done';

const PROFILE_WEIGHTS: Record<Exclude<Profile, 'fresh' | 'done'>, Record<Status, number>> = {
  early: { 'not-started': 5, 'in-progress': 3, 'under-review': 0, completed: 2 },
  mid: { 'not-started': 2, 'in-progress': 3, 'under-review': 2, completed: 3 },
  review: { 'not-started': 0, 'in-progress': 0, 'under-review': 5, completed: 5 },
};

const MEMBERS: ReadonlyArray<[name: string, category: MemberCategory, status: MemberStatus]> = [
  ['Ana Torres', 'manager', 'active'],
  ['Ben Carter', 'manager', 'active'],
  ['Chloé Martin', 'worker', 'active'],
  ['Daniel Kim', 'worker', 'active'],
  ['Eva Novak', 'worker', 'active'],
  ['Farah Haddad', 'worker', 'active'],
  ['Gabriel Rossi', 'worker', 'active'],
  ['Hana Ito', 'worker', 'invited'],
];

interface ProjectPlan {
  name: string;
  code: string;
  releaseDate: string | null;
  platforms: Platform[];
  priority: Priority;
  targetLanguages: LanguageCode[];
  /** Indexes into MEMBERS. */
  managers: number[];
  workers: number[];
  /** One profile per section. */
  sections: Profile[];
  itemsPerSection: number;
}

const SECTION_NAMES = [
  'Act 1 - Opening',
  'Act 2 - The journey',
  'Act 3 - Turning point',
  'Act 4 - Ending',
];

const PROJECTS: ProjectPlan[] = [
  {
    name: 'Sample Project Alpha',
    code: 'SMP-ALPHA-2026',
    releaseDate: 'Q3 2026',
    platforms: ['playstation', 'xbox', 'pc', 'switch'],
    priority: 'urgent',
    targetLanguages: ['es', 'fr', 'de', 'it', 'ja'],
    managers: [0, 1],
    workers: [2, 3, 4],
    sections: ['review', 'mid', 'early', 'fresh'],
    itemsPerSection: 4,
  },
  {
    name: 'Sample Project Beta',
    code: 'SMP-BETA-2026',
    releaseDate: 'Q4 2026',
    platforms: ['pc'],
    priority: 'high',
    targetLanguages: ['es', 'fr', 'pt'],
    managers: [1],
    workers: [3, 5, 6],
    sections: ['fresh', 'fresh'],
    itemsPerSection: 2,
  },
  {
    name: 'Sample Project Gamma',
    code: 'SMP-GAMMA-2027',
    releaseDate: 'Q1 2027',
    platforms: ['switch'],
    priority: 'low',
    targetLanguages: ['es', 'ja', 'zh'],
    managers: [0],
    workers: [2, 4, 6],
    sections: ['mid', 'early'],
    itemsPerSection: 3,
  },
  {
    name: 'Sample Project Delta',
    code: 'SMP-DELTA-2026',
    releaseDate: 'Q2 2026',
    platforms: ['playstation', 'xbox', 'pc', 'switch'],
    priority: 'low',
    targetLanguages: ['es', 'de'],
    managers: [1],
    workers: [4, 5],
    sections: ['review', 'review'],
    itemsPerSection: 2,
  },
  {
    name: 'Sample Project Epsilon',
    code: 'SMP-EPS-2026',
    releaseDate: null,
    platforms: ['playstation', 'xbox', 'pc'],
    priority: 'medium',
    targetLanguages: ['es', 'fr', 'it'],
    managers: [0],
    workers: [3, 6],
    sections: ['done', 'review'],
    itemsPerSection: 2,
  },
  {
    name: 'Sample Project Zeta',
    code: 'SMP-ZETA-2025',
    releaseDate: 'Q4 2025',
    platforms: ['playstation', 'xbox', 'pc', 'switch'],
    priority: 'medium',
    targetLanguages: ['es', 'fr', 'de', 'ja'],
    managers: [0],
    workers: [2, 5],
    sections: ['done', 'done'],
    itemsPerSection: 2,
  },
  {
    name: 'Sample Project Eta',
    code: 'SMP-ETA-2027',
    releaseDate: 'Q2 2027',
    platforms: ['xbox', 'pc'],
    priority: 'none',
    targetLanguages: ['es'],
    managers: [1],
    workers: [6],
    sections: ['fresh'],
    itemsPerSection: 2,
  },
  {
    name: 'Sample Project Theta',
    code: 'SMP-THETA-2026',
    releaseDate: 'Q3 2026',
    platforms: ['playstation', 'xbox'],
    priority: 'urgent',
    targetLanguages: ['es', 'fr', 'de', 'it', 'pt', 'ja'],
    managers: [0, 1],
    workers: [2, 3, 4, 5, 6],
    sections: ['early', 'mid'],
    itemsPerSection: 2,
  },
];

const ITEM_TYPES = ['Mission dialogue', 'Character dialogue'];
const SPEAKERS = ['Speaker A', 'Speaker B', 'Speaker C', 'Narrator'];
const LINE_TYPES = ['Dialogue', 'Narration', 'Tutorial'];
const MINUTES_PER_DAY = 24 * 60;

export function createDemoData(options: DemoSeedOptions = {}): DemoData {
  const now = (options.now ?? new Date()).getTime();
  const randomId = options.randomId ?? (() => crypto.randomUUID());
  const random: Random = createRandom(20261018);

  /** A timestamp up to `maxDays` days before now. */
  const pastTimestamp = (maxDays: number) =>
    new Date(now - random.int(5, maxDays * MINUTES_PER_DAY) * 60_000).toISOString();

  const entity = (at: string, by: Id | null = null): Entity => ({
    id: randomId(),
    createdAt: at,
    updatedAt: at,
    createdBy: by,
    updatedBy: by,
  });

  const seededAt = pastTimestamp(60);
  const members: Member[] = MEMBERS.map(([name, category, status]) => ({
    ...entity(seededAt),
    name,
    email: `${name.split(' ')[0]!.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()}@example.com`,
    category,
    status,
    removedAt: null,
  }));
  const memberId = (index: number) => members[index]!.id;

  const data: DemoData = {
    members,
    projects: [],
    sections: [],
    items: [],
    images: [],
    translations: [],
    commentThreads: [],
    comments: [],
  };

  for (const plan of PROJECTS) {
    const managerIds = plan.managers.map(memberId);
    const workerIds = plan.workers.map(memberId);
    const project: Project = {
      ...entity(pastTimestamp(45), managerIds[0]),
      name: plan.name,
      code: plan.code,
      releaseDate: plan.releaseDate,
      sourceLanguage: 'en',
      targetLanguages: plan.targetLanguages,
      platforms: plan.platforms,
      managerIds,
      memberIds: workerIds,
      priority: plan.priority,
    };
    data.projects.push(project);

    plan.sections.forEach((profile, sectionIndex) => {
      const sectionName = SECTION_NAMES[sectionIndex]!;
      const section: Section = {
        ...entity(project.createdAt, managerIds[0]),
        projectId: project.id,
        name: sectionName,
        description: `Placeholder description for ${sectionName}.`,
        order: sectionIndex,
      };
      data.sections.push(section);

      for (let itemIndex = 0; itemIndex < plan.itemsPerSection; itemIndex++) {
        const itemName = `Scene ${sectionIndex + 1}.${itemIndex + 1}`;
        const item: ContentItem = {
          ...entity(project.createdAt, managerIds[0]),
          projectId: project.id,
          sectionId: section.id,
          name: itemName,
          type: random.pick(ITEM_TYPES),
          order: itemIndex,
          translatorNote: `Placeholder note for translators of ${itemName}.`,
        };
        data.items.push(item);

        const imageCount = random.int(1, 3);
        for (let imageIndex = 0; imageIndex < imageCount; imageIndex++) {
          const lineNumber = imageIndex + 1;
          const text = `Placeholder line ${lineNumber} for ${itemName}. This sentence stands in for the real dialogue.`;
          const image: SceneImage = {
            ...entity(project.createdAt, managerIds[0]),
            projectId: project.id,
            contentItemId: item.id,
            order: imageIndex,
            fileName: `scene_${sectionIndex + 1}_${itemIndex + 1}_${String(lineNumber).padStart(3, '0')}.png`,
            fileId: null,
            source: {
              text,
              speaker: random.pick(SPEAKERS),
              type: random.pick(LINE_TYPES),
              contextNote: null,
              ocrText: text,
              ocrBlocks: [],
            },
            ocrStatus: 'done',
            ocrError: null,
          };
          data.images.push(image);

          for (const language of plan.targetLanguages) {
            const status = statusFor(profile, random);
            if (status === 'not-started') continue;
            const authorId = random.pick(workerIds);
            const at = pastTimestamp(14);
            data.translations.push({
              ...entity(at, authorId),
              projectId: project.id,
              imageId: image.id,
              language,
              text: `[${language}] ${text}`,
              status,
              ready: false,
              authorId,
              reviewerId: status === 'completed' ? random.pick(managerIds) : null,
            });
          }
        }
      }
    });
  }

  seedComments(data, entity, pastTimestamp);
  return data;
}

/** Two threads on the first image of the first project, so the editor shows both tabs. */
function seedComments(
  data: DemoData,
  entity: (at: string, by?: Id | null) => Entity,
  pastTimestamp: (maxDays: number) => string,
) {
  const project = data.projects[0]!;
  const item = data.items.find((i) => i.projectId === project.id)!;
  const image = data.images.find((i) => i.contentItemId === item.id)!;
  const [manager] = project.managerIds;
  const [worker, otherWorker] = project.memberIds;
  const opened = pastTimestamp(2);
  const replied = new Date(new Date(opened).getTime() + 30 * 60_000).toISOString();

  const open: CommentThread = {
    ...entity(opened, worker),
    projectId: project.id,
    imageId: image.id,
    language: 'es',
    resolvedAt: null,
    resolvedBy: null,
  };
  const resolved: CommentThread = {
    ...entity(opened, otherWorker),
    projectId: project.id,
    imageId: image.id,
    language: 'fr',
    resolvedAt: replied,
    resolvedBy: manager!,
  };
  data.commentThreads.push(open, resolved);
  data.comments.push(
    {
      ...entity(opened, worker),
      projectId: project.id,
      threadId: open.id,
      authorId: worker!,
      body: 'Should the speaker sound more urgent here? The scene is a chase.',
    },
    {
      ...entity(replied, manager),
      projectId: project.id,
      threadId: open.id,
      authorId: manager!,
      body: 'Yes, keep it short and add exclamation marks to both lines.',
    },
    {
      ...entity(opened, otherWorker),
      projectId: project.id,
      threadId: resolved.id,
      authorId: otherWorker!,
      body: 'Confirmed the word for "gate" with the glossary.',
    },
  );
}

function statusFor(profile: Profile, random: Random): Status {
  if (profile === 'fresh') return 'not-started';
  if (profile === 'done') return 'completed';
  return random.weighted(PROFILE_WEIGHTS[profile]);
}
