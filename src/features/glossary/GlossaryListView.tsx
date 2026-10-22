import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ALPHABET, groupByLetter, OTHER_LETTER } from '@/domain/glossary';
import type { GlossaryCategory, GlossaryEntry } from '@/domain/types';
import { Tag } from '@/ui/Tag';
import { glossaryPaths } from './format';

/**
 * A–Z list view (no design; designed with the author, DECISIONS D31): letter
 * groups with a jump bar, one compact row per entry.
 */
export function GlossaryListView({
  projectId,
  entries,
  categories,
}: {
  projectId: string;
  entries: GlossaryEntry[];
  categories: GlossaryCategory[];
}) {
  const { t } = useTranslation();
  const id = useId();
  const groups = groupByLetter(entries);
  const present = new Set(groups.map((g) => g.letter));
  const anchor = (letter: string) => `${id}-letter-${letter === OTHER_LETTER ? 'other' : letter}`;
  const categoryName = (categoryId: string) => categories.find((c) => c.id === categoryId)?.name;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label={t('glossary.jumpTo')}>
        <ol className="flex flex-wrap gap-1">
          {[...ALPHABET, OTHER_LETTER].map((letter) => (
            <li key={letter}>
              {present.has(letter) ? (
                <a
                  href={`#${anchor(letter)}`}
                  aria-label={letter === OTHER_LETTER ? t('glossary.otherLetter') : letter}
                  className="inline-flex size-7 items-center justify-center rounded-md text-sm font-semibold text-text outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
                >
                  {letter}
                </a>
              ) : (
                <span
                  aria-hidden
                  className="inline-flex size-7 items-center justify-center text-sm text-text-tertiary/50"
                >
                  {letter}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {groups.map(({ letter, entries: group }) => (
        <section
          key={letter}
          id={anchor(letter)}
          aria-label={letter === OTHER_LETTER ? t('glossary.otherLetter') : letter}
          className="flex scroll-mt-4 flex-col gap-1"
        >
          <div className="flex items-center gap-4 pb-1">
            <h2 className="font-heading text-xl font-bold text-text">{letter}</h2>
            <span aria-hidden className="h-px flex-1 bg-border-strong" />
          </div>
          <ul className="flex flex-col">
            {group.map((entry) => (
              <li
                key={entry.id}
                className="relative grid grid-cols-[minmax(0,14rem)_8rem_minmax(0,1fr)] items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-row-hover max-md:grid-cols-1 max-md:gap-1"
              >
                <Link
                  to={glossaryPaths.entry(projectId, entry.id)}
                  className="truncate text-base font-semibold text-text outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:underline"
                >
                  {entry.title}
                </Link>
                <span className="truncate text-sm text-text-secondary">
                  {categoryName(entry.categoryId)}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="truncate text-sm text-text-secondary">{entry.description}</span>
                  {entry.tags.slice(0, 2).map((tag) => (
                    <Tag key={tag} className="shrink-0 max-lg:hidden">
                      {tag}
                    </Tag>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
