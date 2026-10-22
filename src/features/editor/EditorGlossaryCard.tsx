import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import SearchIcon from '@/assets/icons/search.svg?react';
import { useGlossary } from '@/data/hooks';
import { glossaryMatches, searchEntries, sortByTitle } from '@/domain/glossary';
import { Card, CardTitle } from '@/ui/Card';
import { ExternalLinkIcon } from '@/ui/icons';
import { Tag } from '@/ui/Tag';
import { glossaryPaths } from '../glossary/format';

/**
 * Glossary panel of the editor (SPEC 5.4, adapted to Markdown entries, DECISIONS
 * D30/D31): without a search it lists the entries whose title appears in this
 * image's text; with one, it searches the whole glossary.
 */
export function EditorGlossaryCard({ projectId, texts }: { projectId: string; texts: string[] }) {
  const { t } = useTranslation();
  const glossary = useGlossary(projectId);
  const [query, setQuery] = useState('');
  const entries = glossary.data?.entries ?? [];
  const searching = query.trim() !== '';
  const results = searching
    ? sortByTitle(searchEntries(entries, query, null))
    : sortByTitle(glossaryMatches(entries, texts));

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <CardTitle>{t('editor.glossary')}</CardTitle>
        <Link
          to={glossaryPaths.overview(projectId)}
          className="flex items-center gap-1.5 rounded-md text-sm font-semibold text-accent-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          {t('editor.fullGlossary')}
          <ExternalLinkIcon className="size-3.5" />
        </Link>
      </div>

      <label className="flex items-center gap-3 rounded-lg border border-border-input px-3 py-2 text-text-secondary focus-within:border-text-tertiary">
        <SearchIcon aria-hidden className="size-4 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('editor.glossarySearch')}
          aria-label={t('editor.glossarySearch')}
          className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-secondary"
        />
      </label>

      <p className="-mt-2 text-sm text-text-secondary" aria-live="polite">
        {searching
          ? t('editor.glossaryResults', { count: results.length })
          : results.length > 0
            ? `${t('editor.glossaryResults', { count: results.length })} · ${t('editor.glossaryInText')}`
            : t('editor.noGlossaryMatches')}
      </p>

      {results.length > 0 && (
        <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {results.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-2 rounded-lg border border-border-strong p-3"
            >
              <Link
                to={glossaryPaths.entry(projectId, entry.id)}
                className="text-base font-semibold text-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
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
    </Card>
  );
}
