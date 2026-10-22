import { normalizeForSearch } from './filters';
import type { GlossaryContent, GlossaryEntry, Id } from './types';

/*
 * Glossary rules (SPEC 5.5, DECISIONS D31): validation, tags, search, the
 * overview's most viewed entries and the A–Z list view.
 */

export const DEFAULT_CATEGORIES = ['Characters', 'Factions', 'Locations', 'Lore'] as const;
export const MAX_DESCRIPTION_LENGTH = 200;

export type GlossaryError =
  'titleRequired' | 'descriptionRequired' | 'descriptionTooLong' | 'categoryRequired';

export type GlossaryDraft = Omit<GlossaryContent, 'categoryId'> & { categoryId: Id | null };

export type GlossaryValidation =
  { ok: true; content: GlossaryContent } | { ok: false; errors: GlossaryError[] };

/** Title, short description and category are required; tags are cleaned. */
export function validateGlossaryEntry(draft: GlossaryDraft): GlossaryValidation {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const errors: GlossaryError[] = [];
  if (title === '') errors.push('titleRequired');
  if (description === '') errors.push('descriptionRequired');
  if (description.length > MAX_DESCRIPTION_LENGTH) errors.push('descriptionTooLong');
  if (!draft.categoryId) errors.push('categoryRequired');
  if (errors.length > 0 || !draft.categoryId) return { ok: false, errors };
  return {
    ok: true,
    content: {
      ...draft,
      categoryId: draft.categoryId,
      title,
      description,
      tags: cleanTags(draft.tags),
    },
  };
}

/** Trims tags and drops empty ones and duplicates (ignoring case), keeping the first spelling. */
export function cleanTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const value = tag.trim();
    const key = value.toLocaleLowerCase();
    if (value === '' || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

/** Search over title, description, tags and body, ignoring case and accents; optional category. */
export function searchEntries<T extends GlossaryEntry>(
  entries: readonly T[],
  query: string,
  categoryId: Id | null,
): T[] {
  const needle = normalizeForSearch(query.trim());
  return entries.filter(
    (entry) =>
      (categoryId === null || entry.categoryId === categoryId) &&
      (needle === '' ||
        [entry.title, entry.description, entry.body, ...entry.tags].some((text) =>
          normalizeForSearch(text).includes(needle),
        )),
  );
}

const titleCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function sortByTitle<T extends Pick<GlossaryEntry, 'title'>>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => titleCollator.compare(a.title, b.title));
}

/** The overview's row per category: the most viewed entries, ties by title. */
export function mostViewed<T extends GlossaryEntry>(entries: readonly T[], count = 3): T[] {
  return sortByTitle(entries)
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, count);
}

export const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
/** Group for titles that do not start with a Latin letter (numbers, other scripts). */
export const OTHER_LETTER = '#';

/** First letter for the A–Z view, ignoring accents ("Éclair" → "E"). */
export function letterOf(title: string): string {
  const first = normalizeForSearch(title.trim()).charAt(0).toUpperCase();
  return ALPHABET.includes(first) ? first : OTHER_LETTER;
}

/** A–Z list view (DECISIONS D31): letter groups in order, each sorted by title. */
export function groupByLetter<T extends GlossaryEntry>(
  entries: readonly T[],
): { letter: string; entries: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const entry of sortByTitle(entries)) {
    const letter = letterOf(entry.title);
    groups.set(letter, [...(groups.get(letter) ?? []), entry]);
  }
  return [...ALPHABET, OTHER_LETTER].flatMap((letter) => {
    const group = groups.get(letter);
    return group ? [{ letter, entries: group }] : [];
  });
}

/**
 * Editor glossary panel (DECISIONS D30): an entry matches when its title appears in
 * any of the texts as a whole word or phrase, ignoring case and accents.
 */
export function glossaryMatches<T extends Pick<GlossaryEntry, 'title'>>(
  entries: readonly T[],
  texts: readonly string[],
): T[] {
  const haystack = texts.map(normalizeForSearch).join('\n');
  return entries.filter((entry) => {
    const title = normalizeForSearch(entry.title.trim());
    if (title === '') return false;
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(haystack);
  });
}

export type CategoryError = 'nameRequired' | 'nameTaken';

/** A category needs a name not used yet in the project (ignoring case). */
export function validateCategoryName(
  name: string,
  existing: readonly { name: string }[],
): { ok: true; name: string } | { ok: false; error: CategoryError } {
  const trimmed = name.trim();
  if (trimmed === '') return { ok: false, error: 'nameRequired' };
  const key = normalizeForSearch(trimmed);
  if (existing.some((c) => normalizeForSearch(c.name) === key))
    return { ok: false, error: 'nameTaken' };
  return { ok: true, name: trimmed };
}
