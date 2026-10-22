import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@/assets/icons/search.svg?react';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useMembers, useProjectSummaries } from '@/data/hooks';
import { EMPTY_FILTERS, filterProjects, hasActiveFilters } from '@/domain/filters';
import { canSeeProject } from '@/domain/members';
import { DEFAULT_PROJECT_SORT, sortProjects } from '@/domain/sorting';
import { PageTitle } from '@/ui/PageTitle';
import { CreateProjectDialog } from './createProject/CreateProjectDialog';
import { FilterChips } from './FilterChips';
import { ProjectFilterMenu } from './ProjectFilterMenu';
import { ProjectTable } from './ProjectTable';

/** "List of projects" (Figma 370:5392, SPEC 5.1). */
export function ProjectsPage() {
  const { t } = useTranslation();
  const summaries = useProjectSummaries();
  const { data: members = [] } = useMembers();
  const { currentUser } = useCurrentUser();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState(DEFAULT_PROJECT_SORT);
  const [creating, setCreating] = useState(false);

  const visible = useMemo(() => {
    // Workers only see the projects they take part in (D32).
    const mine = (summaries.data ?? []).filter((s) => canSeeProject(currentUser, s.project));
    return sortProjects(filterProjects(mine, filters, query), sort);
  }, [summaries.data, currentUser, filters, query, sort]);
  const narrowed = query.trim() !== '' || hasActiveFilters(filters);

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <PageTitle>{t('projects.title')}</PageTitle>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-xl bg-fill-subtle px-3 py-2 text-base text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          {t('projects.addProject')}
        </button>
      </header>

      <div className="flex items-center gap-3">
        <ProjectFilterMenu filters={filters} members={members} onChange={setFilters} />
        <label className="flex flex-1 items-center gap-3 rounded-lg border border-border-input px-3 py-1.5 text-text-secondary focus-within:border-text-tertiary">
          <SearchIcon aria-hidden className="size-4 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('projects.searchPlaceholder')}
            aria-label={t('projects.searchLabel')}
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-secondary"
          />
        </label>
      </div>

      <FilterChips filters={filters} members={members} onChange={setFilters} />

      {summaries.isPending ? (
        <p className="px-3 text-sm text-text-tertiary">{t('projects.loading')}</p>
      ) : summaries.isError ? (
        <p role="alert" className="px-3 text-sm text-text-secondary">
          {t('data.loadError')}
        </p>
      ) : (
        <>
          <ProjectTable projects={visible} members={members} sort={sort} onSortChange={setSort} />
          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-text-secondary">
                {narrowed ? t('projects.noMatches') : t('projects.empty')}
              </p>
              {narrowed && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFilters(EMPTY_FILTERS);
                  }}
                  className="rounded-xl bg-fill-subtle px-3 py-1.5 text-sm text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
                >
                  {t('projects.clearAllFilters')}
                </button>
              )}
            </div>
          )}
        </>
      )}

      <CreateProjectDialog open={creating} onOpenChange={setCreating} members={members} />
    </>
  );
}
