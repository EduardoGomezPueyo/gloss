import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ProjectSummary } from '@/domain/progress';
import { nextSort, type ProjectSort, type ProjectSortKey } from '@/domain/sorting';
import type { Id, Member } from '@/domain/types';
import { AvatarStack } from '@/ui/Avatar';
import { PlatformChip } from '@/ui/PlatformChip';
import { PriorityIcon } from '@/ui/PriorityIcon';
import { ProgressPopover } from './ProgressPopover';

/** Name and platforms flex; the four people/state columns are 75px and centred (Figma 370:5392). */
const rowGrid = 'grid grid-cols-[minmax(0,1fr)_auto_75px_75px_75px_75px] items-center gap-2';

type ColumnKey = 'name' | 'platforms' | 'manager' | 'members' | 'priority' | 'status';

const COLUMNS: { key: ColumnKey; sortKey?: ProjectSortKey; align: 'left' | 'right' | 'center' }[] =
  [
    { key: 'name', sortKey: 'name', align: 'left' },
    { key: 'platforms', align: 'right' },
    { key: 'manager', align: 'center' },
    { key: 'members', align: 'center' },
    { key: 'priority', sortKey: 'priority', align: 'center' },
    { key: 'status', sortKey: 'status', align: 'center' },
  ];

const alignClass = { left: 'justify-start', right: 'justify-end', center: 'justify-center' };

function SortArrow({ direction }: { direction: 'asc' | 'desc' }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      fill="none"
      className={`size-3 ${direction === 'desc' ? 'rotate-180' : ''}`}
    >
      <path
        d="M6 9.5v-7m0 0L3 5.5m3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeaderCell({
  column,
  sort,
  onSortChange,
}: {
  column: (typeof COLUMNS)[number];
  sort: ProjectSort;
  onSortChange: (sort: ProjectSort) => void;
}) {
  const { t } = useTranslation();
  const label = t(`projects.columns.${column.key}`);
  const isSorted = column.sortKey === sort.key;
  const ariaSort = isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined;

  return (
    <div role="columnheader" aria-sort={ariaSort} className={`flex ${alignClass[column.align]}`}>
      {column.sortKey ? (
        <button
          type="button"
          title={t('projects.sortBy', { column: label })}
          onClick={() => onSortChange(nextSort(sort, column.sortKey!))}
          className="group inline-flex items-center gap-1 rounded-sm text-xs text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          {label}
          {/* Spec 5.1: the arrow appears on hover; the active column keeps it once changed. */}
          <span
            className={
              isSorted && (sort.key !== 'name' || sort.direction === 'desc')
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            }
          >
            <SortArrow direction={isSorted ? sort.direction : 'asc'} />
          </span>
        </button>
      ) : (
        <span className="text-xs text-text-secondary">{label}</span>
      )}
    </div>
  );
}

function ProjectRow({
  summary,
  memberById,
}: {
  summary: ProjectSummary;
  memberById: Map<Id, Member>;
}) {
  const { project } = summary;
  const people = (ids: Id[]) => ids.flatMap((id) => memberById.get(id) ?? []);

  return (
    <div
      role="row"
      className={`${rowGrid} relative rounded-lg p-3 transition-colors hover:bg-popup has-[a:focus-visible]:bg-popup`}
    >
      <div role="cell" className="min-w-0">
        {/* The link stretches over the whole row: clicking anywhere opens the project (SPEC 5.1). */}
        <Link
          to={`/projects/${project.id}`}
          className="block truncate text-base text-text outline-none after:absolute after:inset-0 after:rounded-lg"
        >
          {project.name}
        </Link>
      </div>
      <div role="cell" className="flex flex-wrap justify-end gap-3">
        {project.platforms.map((platform) => (
          <PlatformChip key={platform} platform={platform} />
        ))}
      </div>
      <div role="cell" className="flex justify-center">
        <AvatarStack members={people(project.managerIds)} />
      </div>
      <div role="cell" className="flex justify-center">
        <AvatarStack members={people(project.memberIds)} />
      </div>
      <div role="cell" className="flex justify-center">
        <PriorityIcon priority={project.priority} />
      </div>
      <div role="cell" className="flex justify-center">
        <ProgressPopover summary={summary} />
      </div>
    </div>
  );
}

export function ProjectTable({
  projects,
  members,
  sort,
  onSortChange,
}: {
  projects: ProjectSummary[];
  members: Member[];
  sort: ProjectSort;
  onSortChange: (sort: ProjectSort) => void;
}) {
  const { t } = useTranslation();
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div role="table" aria-label={t('projects.title')} className="flex flex-col gap-2">
      <div role="rowgroup">
        <div role="row" className={`${rowGrid} px-3 pb-2`}>
          {COLUMNS.map((column) => (
            <HeaderCell key={column.key} column={column} sort={sort} onSortChange={onSortChange} />
          ))}
        </div>
      </div>
      <div role="rowgroup" className="flex flex-col gap-2">
        {projects.map((summary) => (
          <ProjectRow key={summary.project.id} summary={summary} memberById={memberById} />
        ))}
      </div>
    </div>
  );
}
