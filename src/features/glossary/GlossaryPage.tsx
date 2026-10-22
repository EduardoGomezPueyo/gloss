import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import SearchIcon from '@/assets/icons/search.svg?react';
import { useGlossary, useProjectDetail } from '@/data/hooks';
import { mostViewed, searchEntries, sortByTitle } from '@/domain/glossary';
import type { GlossaryEntry } from '@/domain/types';
import { neutralButton, textButton } from '@/ui/buttons';
import { PageMessage } from '../project-detail/shared';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { EntryCard } from './EntryCard';
import { glossaryPaths } from './format';
import { GlossaryListView } from './GlossaryListView';

type View = 'grid' | 'list';

/**
 * "<Project> - Glossary" (Figma 370:6317 / 370:7044, SPEC 5.5). Search, category,
 * and view live in the URL so the back button and links keep them.
 */
export function GlossaryPage() {
  const { t } = useTranslation();
  const { projectId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const detail = useProjectDetail(projectId);
  const glossary = useGlossary(projectId);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const query = params.get('q') ?? '';
  const view: View = params.get('view') === 'list' ? 'list' : 'grid';
  const update = (changes: Record<string, string | null>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  if (detail.isPending || glossary.isPending) {
    return <p className="text-sm text-text-tertiary">{t('glossary.loading')}</p>;
  }
  if (detail.isError || glossary.isError) {
    return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;
  }
  if (!detail.data) return <PageMessage>{t('projectDetail.notFound')}</PageMessage>;

  const { categories, entries } = glossary.data;
  const category = categories.find((c) => c.id === params.get('category')) ?? null;
  const visible = searchEntries(entries, query, category?.id ?? null);
  const filtered = query.trim() !== '' || category !== null;

  return (
    <>
      <header className="flex items-center gap-4">
        <BookIcon />
        <h1 className="font-heading text-[28px] leading-tight font-bold text-text">
          {t('glossary.title', { project: detail.data.project.name })}
        </h1>
      </header>

      <label className="flex items-center gap-3 rounded-lg border border-border-input px-4 py-3 text-text-secondary focus-within:border-text-tertiary">
        <SearchIcon aria-hidden className="size-4 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => update({ q: e.target.value })}
          placeholder={t('glossary.searchPlaceholder')}
          aria-label={t('glossary.searchLabel')}
          className="w-full bg-transparent text-base text-text outline-none placeholder:text-text-secondary"
        />
      </label>

      <div
        role="group"
        aria-label={t('glossary.categories')}
        className="flex flex-wrap items-center gap-3"
      >
        {categories.map((c) => {
          const selected = c.id === category?.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected}
              onClick={() => update({ category: selected ? null : c.id })}
              className={`rounded-full border px-5 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
                selected
                  ? 'border-text text-text'
                  : 'border-border-strong text-text-secondary hover:text-text'
              }`}
            >
              {c.name}
            </button>
          );
        })}
        {category && (
          <button type="button" onClick={() => update({ category: null })} className={textButton}>
            {t('glossary.clearFilters')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label={t('glossary.view')} className="flex gap-1">
          <ViewButton
            label={t('glossary.viewGrid')}
            pressed={view === 'grid'}
            onClick={() => update({ view: null })}
          >
            <GridIcon />
          </ViewButton>
          <ViewButton
            label={t('glossary.viewList')}
            pressed={view === 'list'}
            onClick={() => update({ view: 'list' })}
          >
            <ListIcon />
          </ViewButton>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setCreatingCategory(true)} className={textButton}>
            {t('glossary.createCategory')}
          </button>
          <Link to={glossaryPaths.newEntry(projectId)} className={neutralButton}>
            {t('glossary.addEntry')}
          </Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('glossary.noEntries')}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('glossary.noMatches')}</p>
      ) : view === 'list' ? (
        <GlossaryListView projectId={projectId} entries={visible} categories={categories} />
      ) : filtered ? (
        <CategorySection name={category?.name}>
          <CardGrid projectId={projectId} entries={sortByTitle(visible)} />
        </CategorySection>
      ) : (
        categories.map((c) => {
          const inCategory = entries.filter((e) => e.categoryId === c.id);
          return (
            <CategorySection
              key={c.id}
              name={c.name}
              onViewAll={inCategory.length > 0 ? () => update({ category: c.id }) : undefined}
            >
              {inCategory.length === 0 ? (
                <p className="text-sm text-text-tertiary">{t('glossary.emptyCategory')}</p>
              ) : (
                <CardGrid projectId={projectId} entries={mostViewed(inCategory)} />
              )}
            </CategorySection>
          );
        })
      )}

      <CreateCategoryDialog
        open={creatingCategory}
        onOpenChange={setCreatingCategory}
        projectId={projectId}
        categories={categories}
      />
    </>
  );
}

function CategorySection({
  name,
  onViewAll,
  children,
}: {
  name?: string;
  onViewAll?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4" aria-label={name}>
      {name && (
        <div className="flex items-center gap-4">
          <h2 className="text-2xl text-text">{name}</h2>
          <span aria-hidden className="h-px flex-1 bg-text-tertiary/60" />
          {onViewAll && (
            <button type="button" onClick={onViewAll} className={`${textButton} text-lg`}>
              {t('glossary.viewAll')} »
            </button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function CardGrid({ projectId, entries }: { projectId: string; entries: GlossaryEntry[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex">
          <EntryCard projectId={projectId} entry={entry} />
        </li>
      ))}
    </ul>
  );
}

function ViewButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex size-9 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
        pressed ? 'bg-fill-subtle text-text' : 'text-text-secondary hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

function BookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="size-9 text-accent-text">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 7.5h8M8 11h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className="size-5">
      {[
        [2.5, 2.5],
        [11, 2.5],
        [2.5, 11],
        [11, 11],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="6.5"
          height="6.5"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      ))}
    </svg>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className="size-5">
      <path
        d="M8 5h10M8 10h10M8 15h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <text x="1.5" y="8" fontSize="6" fill="currentColor" fontFamily="sans-serif">
        A
      </text>
      <text x="1.5" y="17" fontSize="6" fill="currentColor" fontFamily="sans-serif">
        Z
      </text>
    </svg>
  );
}
