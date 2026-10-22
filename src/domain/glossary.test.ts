import {
  cleanTags,
  glossaryMatches,
  groupByLetter,
  letterOf,
  mostViewed,
  searchEntries,
  validateGlossaryEntry,
} from './glossary';
import type { GlossaryEntry } from './types';
import { diffParagraphs, diffTags, diffText } from './versionDiff';
import { linkTargets, MISSING_ENTRY, resolveWikiLinks } from './wikiLinks';

let counter = 0;
function entry(title: string, overrides: Partial<GlossaryEntry> = {}): GlossaryEntry {
  const at = '2026-01-01T00:00:00.000Z';
  return {
    id: `e${++counter}`,
    createdAt: at,
    updatedAt: at,
    createdBy: null,
    updatedBy: null,
    projectId: 'p',
    categoryId: 'places',
    title,
    description: `About ${title}`,
    tags: [],
    imageFileIds: [],
    body: '',
    viewCount: 0,
    ...overrides,
  };
}

describe('validateGlossaryEntry', () => {
  const draft = {
    categoryId: 'c1' as string | null,
    title: ' North Gate ',
    description: ' The city gate. ',
    tags: [' Act 1', 'act 1', ''],
    imageFileIds: [],
    body: '',
  };

  it('requires title, description and category, and cleans the fields', () => {
    expect(
      validateGlossaryEntry({ ...draft, title: '', description: '', categoryId: null }),
    ).toEqual({ ok: false, errors: ['titleRequired', 'descriptionRequired', 'categoryRequired'] });
    expect(validateGlossaryEntry({ ...draft, description: 'x'.repeat(201) })).toMatchObject({
      ok: false,
      errors: ['descriptionTooLong'],
    });
    expect(validateGlossaryEntry(draft)).toMatchObject({
      ok: true,
      content: { title: 'North Gate', description: 'The city gate.', tags: ['Act 1'] },
    });
  });

  it('dedupes tags ignoring case', () => {
    expect(cleanTags(['Hero', 'hero', ' Guild ', ''])).toEqual(['Hero', 'Guild']);
  });
});

describe('search, overview and A–Z', () => {
  const entries = [
    entry('Éclair Tower', { tags: ['Landmark'], viewCount: 5 }),
    entry('ashbridge', { body: 'A collapsed span.', viewCount: 9 }),
    entry('Bridge of Ash', { categoryId: 'lore', viewCount: 9 }),
    entry('7th Lantern', { viewCount: 1 }),
  ];

  it('searches title, description, tags and body, with a category filter', () => {
    expect(searchEntries(entries, 'landmark', null).map((e) => e.title)).toEqual(['Éclair Tower']);
    expect(searchEntries(entries, 'COLLAPSED', null).map((e) => e.title)).toEqual(['ashbridge']);
    expect(searchEntries(entries, 'eclair', 'lore')).toEqual([]);
    expect(searchEntries(entries, '', 'lore').map((e) => e.title)).toEqual(['Bridge of Ash']);
  });

  it('picks the most viewed, ties by title', () => {
    expect(mostViewed(entries, 2).map((e) => e.title)).toEqual(['ashbridge', 'Bridge of Ash']);
  });

  it('groups A–Z ignoring accents, with other titles under #', () => {
    expect(letterOf('Éclair')).toBe('E');
    expect(groupByLetter(entries).map((g) => [g.letter, g.entries.map((e) => e.title)])).toEqual([
      ['A', ['ashbridge']],
      ['B', ['Bridge of Ash']],
      ['E', ['Éclair Tower']],
      ['#', ['7th Lantern']],
    ]);
  });
});

describe('glossaryMatches', () => {
  const entries = [entry('North Gate'), entry('Gate'), entry('Mira'), entry('Lantern')];

  it('matches whole words or phrases, ignoring case and accents', () => {
    const found = glossaryMatches(entries, ['Meet me at the north gate!', 'Trae la linterna']);
    expect(found.map((e) => e.title)).toEqual(['North Gate', 'Gate']);
    expect(glossaryMatches(entries, ['Admiral Mirabel'])).toEqual([]);
    expect(glossaryMatches([entry('Ciudad Ámbar')], ['la ciudad ambar'])).toHaveLength(1);
  });
});

describe('wiki links', () => {
  const entries = [{ id: 'e-gate', title: 'North Gate' }];
  const href = (id: string) => `/g/${id}`;

  it('resolves [[Title]] and [[Title|text]] by title, ignoring case', () => {
    expect(resolveWikiLinks('See [[north gate]] or [[North Gate|the gate]].', entries, href)).toBe(
      'See [north gate](/g/e-gate) or [the gate](/g/e-gate).',
    );
  });

  it('marks missing entries and leaves code untouched', () => {
    expect(resolveWikiLinks('[[Old Mill]] `[[North Gate]]`', entries, href)).toBe(
      `[Old Mill](${MISSING_ENTRY}Old%20Mill) \`[[North Gate]]\``,
    );
    expect(linkTargets('[[A]] and [[ B |b]]')).toEqual(['A', 'B']);
  });
});

describe('version diff', () => {
  it('marks added and removed words', () => {
    expect(diffText('the old gate', 'the new gate')).toEqual([
      { kind: 'same', text: 'the ' },
      { kind: 'removed', text: 'old' },
      { kind: 'added', text: 'new' },
      { kind: 'same', text: ' gate' },
    ]);
  });

  it('splits into paragraphs and flags the changed ones', () => {
    const paragraphs = diffParagraphs('One.\n\nTwo old.', 'One.\n\nTwo new.');
    expect(paragraphs.map((p) => p.changed)).toEqual([false, true]);
  });

  it('diffs tags', () => {
    expect(diffTags(['Hero', 'Guild'], ['Hero', 'Act 1'])).toEqual([
      { kind: 'same', text: 'Hero' },
      { kind: 'removed', text: 'Guild' },
      { kind: 'added', text: 'Act 1' },
    ]);
  });
});
