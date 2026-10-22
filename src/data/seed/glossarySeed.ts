import { DEFAULT_CATEGORIES } from '@/domain/glossary';
import type {
  Entity,
  GlossaryCategory,
  GlossaryContent,
  GlossaryEntry,
  GlossaryVersion,
  Id,
  Project,
} from '@/domain/types';

/*
 * Demo glossary: original, fictional entries (CLAUDE.md: never content from
 * commercial games). The world is a placeholder until the demo world is chosen
 * (SPEC open 9). "North Gate" and "Lantern" let the editor show glossary matches.
 */

interface EntryPlan {
  category: (typeof DEFAULT_CATEGORIES)[number];
  title: string;
  description: string;
  tags: string[];
  body: string;
  views: number;
  /** Older bodies, oldest first, so Compare versions has something to show. */
  history?: string[];
}

const MIRA_BODY = `## Mira Vale

Mira is the courier who guides the party through the first act. She knows every street of [[Ashbridge]] and keeps a spare key to the [[North Gate]].

Quick-witted and impatient, she speaks in short sentences and rarely waits for an answer.[^1]

## Translation notes

- Keep her lines short; she never uses formal address.
- Her catchphrase, "Lanterns up", refers to the [[Lantern Guild]] signal.

[^1]: Writer's brief, act 1, scene notes.`;

const PLANS: EntryPlan[] = [
  {
    category: 'Characters',
    title: 'Mira Vale',
    description: 'Courier and guide of the first act. Impatient, quick-witted, always in a hurry.',
    tags: ['Main character', 'Guide', 'Act 1'],
    body: MIRA_BODY,
    views: 14,
    history: [
      `## Mira Vale

Mira is a courier from [[Ashbridge]].`,
      `## Mira Vale

Mira is the courier who guides the party through the first act. She knows every street of [[Ashbridge]].

She speaks formally to strangers.`,
    ],
  },
  {
    category: 'Characters',
    title: 'Tomas Reed',
    description: 'Ferryman who knows the river routes. Calm, slow-spoken, distrusts the Guild.',
    tags: ['Side character', 'Act 2'],
    body: `## Tomas Reed

Tomas runs the last ferry out of [[Ashbridge]]. When the bridge falls, he becomes the party's only way across.

He distrusts the [[Lantern Guild]] and says so.`,
    views: 6,
  },
  {
    category: 'Characters',
    title: 'The Old Sage',
    description: 'Keeper of the tower key. Speaks in riddles; never named in the script.',
    tags: ['NPC', 'Riddles'],
    body: `## The Old Sage

Always written in small capitals in the original script. Keep the riddles rhyming when possible.`,
    views: 3,
  },
  {
    category: 'Factions',
    title: 'Lantern Guild',
    description: 'Lamplighters who secretly run the city. Their signal is a raised lantern.',
    tags: ['Guild', 'Act 1'],
    body: `## Lantern Guild

The lamplighters of [[Ashbridge]]. Officially they keep the streets lit; in practice they decide who gets in through the [[North Gate]].`,
    views: 9,
  },
  {
    category: 'Factions',
    title: 'Harbor Watch',
    description: 'City guard of the docks. Formal, by-the-book, often comic relief.',
    tags: ['Guard'],
    body: `## Harbor Watch

Use a formal register for every Watch line.`,
    views: 2,
  },
  {
    category: 'Locations',
    title: 'North Gate',
    description: 'Main entrance to the city. Closed at night; the Guild holds the keys.',
    tags: ['Landmark', 'Act 1'],
    body: `## North Gate

The only way into [[Ashbridge]] after dark. Translate "gate" consistently; never "door".`,
    views: 11,
  },
  {
    category: 'Locations',
    title: 'Ashbridge',
    description: 'River city built around a stone bridge that collapses in act 2.',
    tags: ['City', 'Act 1', 'Act 2'],
    body: `## Ashbridge

The city of the first two acts. The name is a compound: keep it as one word in every language.`,
    views: 8,
  },
  {
    category: 'Locations',
    title: 'Sunken Library',
    description: 'Flooded archive under the old quarter. Optional area.',
    tags: ['Optional', 'Puzzles'],
    body: `## Sunken Library

Book titles found here are puzzle hints: translate their meaning, not their words.`,
    views: 4,
  },
  {
    category: 'Lore',
    title: 'The Long Night',
    description: 'The year without sunrise that the city still remembers.',
    tags: ['History'],
    body: `## The Long Night

Referred to with capital letters in every language.`,
    views: 5,
  },
  {
    category: 'Lore',
    title: 'Lantern',
    description: 'Both an object and the Guild signal. Check context before translating.',
    tags: ['Term', 'Ambiguous'],
    body: `## Lantern

When the line says "Lanterns up", it is the [[Lantern Guild]] signal: keep the capital letter.`,
    views: 7,
  },
];

export interface GlossarySeed {
  categories: GlossaryCategory[];
  entries: GlossaryEntry[];
  versions: GlossaryVersion[];
}

/** Default categories for every project; entries only for the first one. */
export function seedGlossary(
  projects: readonly Project[],
  entity: (at: string, by?: Id | null) => Entity,
  pastTimestamp: (maxDays: number) => string,
): GlossarySeed {
  const seed: GlossarySeed = { categories: [], entries: [], versions: [] };

  for (const project of projects) {
    DEFAULT_CATEGORIES.forEach((name, order) =>
      seed.categories.push({
        ...entity(project.createdAt, project.managerIds[0]),
        projectId: project.id,
        name,
        order,
      }),
    );
  }

  const project = projects[0]!;
  const people = [...project.managerIds, ...project.memberIds];
  PLANS.forEach((plan, index) => {
    const category = seed.categories.find(
      (c) => c.projectId === project.id && c.name === plan.category,
    )!;
    const bodies = [...(plan.history ?? []), plan.body];
    // Oldest first, spread over the last weeks, each by someone on the project.
    const times = bodies.map(() => pastTimestamp(30)).sort();
    const content = (body: string): GlossaryContent => ({
      categoryId: category.id,
      title: plan.title,
      description: plan.description,
      tags: plan.tags,
      imageFileIds: [],
      body,
    });
    const author = (step: number) => people[(index + step) % people.length]!;
    const entry: GlossaryEntry = {
      ...entity(times[0]!, author(0)),
      ...content(plan.body),
      projectId: project.id,
      viewCount: plan.views,
      updatedAt: times.at(-1)!,
      updatedBy: author(bodies.length - 1),
    };
    seed.entries.push(entry);
    bodies.forEach((body, step) =>
      seed.versions.push({
        ...entity(times[step]!, author(step)),
        ...content(body),
        projectId: project.id,
        entryId: entry.id,
        number: step + 1,
      }),
    );
  });

  return seed;
}
