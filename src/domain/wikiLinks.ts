import { normalizeForSearch } from './filters';
import type { GlossaryEntry, Id } from './types';

/*
 * Links between glossary entries are written [[Title]] or [[Title|shown text]]
 * (DECISIONS D31). They resolve by title, ignoring case and accents.
 */

const WIKI_LINK = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g;

/** The URL scheme used for links whose target entry does not exist (yet). */
export const MISSING_ENTRY = 'glossary-missing:';

export function linkTargets(body: string): string[] {
  return [...body.matchAll(WIKI_LINK)].map((m) => m[1]!.trim());
}

/**
 * Turns [[Title]] into a standard Markdown link before rendering: to the entry
 * when it exists, or to a "missing" marker the renderer shows dimmed. Code spans
 * and blocks are left untouched.
 */
export function resolveWikiLinks(
  body: string,
  entries: readonly Pick<GlossaryEntry, 'id' | 'title'>[],
  hrefFor: (id: Id) => string,
): string {
  const byTitle = new Map(entries.map((e) => [normalizeForSearch(e.title.trim()), e.id]));
  // Split on fenced blocks and inline code so links inside code stay literal.
  return body
    .split(/(```[\s\S]*?```|`[^`\n]*`)/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(WIKI_LINK, (_, title: string, label?: string) => {
            const id = byTitle.get(normalizeForSearch(title.trim()));
            const text = (label ?? title).trim().replace(/[[\]]/g, '');
            const href = id ? hrefFor(id) : `${MISSING_ENTRY}${encodeURIComponent(title.trim())}`;
            return `[${text}](${href})`;
          }),
    )
    .join('');
}
