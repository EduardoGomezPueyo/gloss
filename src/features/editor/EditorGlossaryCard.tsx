import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import SearchIcon from '@/assets/icons/search.svg?react';
import { useGlossary } from '@/data/hooks';
import { glossaryMatches, searchEntries, sortByTitle } from '@/domain/glossary';
import { ExternalLinkIcon } from '@/ui/icons';
import { Tag } from '@/ui/Tag';
import { glossaryPaths } from '../glossary/format';
import { innerCard } from './styles';

/**
 * Glossary panel of the editor (DECISIONS D31, D40): without a search it lists the
 * entries whose title appears in this image's text or translation, and the header
 * counts them; with one, it searches the whole glossary.
 */
export function EditorGlossaryCard({ projectId, texts }: { projectId: string; texts: string[] }) {
  const { t } = useTranslation();
  const headingId = useId();
  const glossary = useGlossary(projectId);
  const [query, setQuery] = useState('');
  const entries = glossary.data?.entries ?? [];
  const matches = glossaryMatches(entries, texts);
  const searching = query.trim() !== '';
  const results = sortByTitle(searching ? searchEntries(entries, query, null) : matches);

  return (
    <section aria-labelledby={headingId} className={innerCard}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          <h3 id={headingId} className="font-heading text-lg font-bold text-text">
            {t('editor.glossary')}
          </h3>
          {matches.length > 0 && (
            <span className="text-sm font-semibold text-accent-text">
              {t('editor.glossaryMatches', { count: matches.length })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-5">
          <label className="flex w-36 items-center gap-2 rounded-md text-text-secondary focus-within:text-text">
            <SearchIcon aria-hidden className="size-4 shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('editor.search')}
              aria-label={t('editor.glossarySearch')}
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-secondary"
            />
          </label>
          <Link
            to={glossaryPaths.overview(projectId)}
            className="flex items-center gap-1.5 rounded-md text-sm font-semibold text-accent-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            {t('editor.fullGlossary')}
            <ExternalLinkIcon className="size-3.5" />
          </Link>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-text-tertiary" aria-live="polite">
          {searching ? t('editor.glossaryNoResults') : t('editor.noGlossaryMatches')}
        </p>
      ) : (
        <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {results.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <Link
                to={glossaryPaths.entry(projectId, entry.id)}
                className="self-start text-base text-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
              >
                {entry.title}
              </Link>
              <p className="text-sm text-text-secondary">{entry.description}</p>
              {entry.tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {entry.tags.slice(0, 3).map((tag) => (
                    <li key={tag}>
                      <Tag>{tag}</Tag>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
