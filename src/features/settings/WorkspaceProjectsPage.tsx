import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import {
  useDeleteProjects,
  useMembers,
  useProjectSummaries,
  useWorkspaceSettings,
} from '@/data/hooks';
import { languageName } from '@/domain/languages';
import { canManageMembers, canSeeProject } from '@/domain/members';
import type { ProjectSummary } from '@/domain/progress';
import type { Id, Member, Project } from '@/domain/types';
import { DEFAULT_WORKSPACE_SETTINGS } from '@/domain/workspace';
import { matchesProjectQuery } from '@/domain/workspaceProjects';
import { Avatar } from '@/ui/Avatar';
import { neutralButton, textButton } from '@/ui/buttons';
import { PencilIcon } from '@/ui/icons';
import { ProgressBar } from '@/ui/ProgressBar';
import { SelectBox } from '@/ui/SelectBox';
import { RenameProjectDialog } from './RenameProjectDialog';

/** Checkbox, project, ID, languages, managers, progress, created, actions: fixed so header and rows line up. */
const rowGrid =
  'grid grid-cols-[1rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_88px_110px_96px_140px] items-center gap-4';

/**
 * Settings > Workspace projects (no design, spec approved by the author,
 * DECISIONS D37, D42): every project the current user can see, with rename
 * and delete for managers.
 */
export function WorkspaceProjectsPage() {
  const { t } = useTranslation();
  const summaries = useProjectSummaries();
  const { data: members = [] } = useMembers();
  const { currentUser } = useCurrentUser();
  const settings = useWorkspaceSettings().data ?? DEFAULT_WORKSPACE_SETTINGS;
  const remove = useDeleteProjects();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Id[]>([]);
  const [renaming, setRenaming] = useState<Project | null>(null);

  const manage = canManageMembers(currentUser);
  const all = (summaries.data ?? [])
    .filter((s) => canSeeProject(currentUser, s.project, settings))
    .sort((a, b) => a.project.name.localeCompare(b.project.name));
  const visible = all.filter((s) => matchesProjectQuery(s.project, query));
  // Projects that were deleted or filtered out drop out of the selection.
  const selection = visible.filter((s) => selected.includes(s.project.id));
  const allSelected = visible.length > 0 && selection.length === visible.length;

  const deleteProjects = (projects: Project[]) => {
    const message = t('workspaceProjects.deleteConfirm', {
      count: projects.length,
      names: projects.map((p) => p.name).join(', '),
    });
    if (!window.confirm(message)) return;
    const ids = projects.map((p) => p.id);
    remove.mutate(
      { projectIds: ids, by: currentUser?.id ?? null },
      { onSuccess: () => setSelected((s) => s.filter((id) => !ids.includes(id))) },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h2 className="font-heading text-lg leading-tight font-bold text-text">
          {t('workspaceProjects.title')}
        </h2>
        <span className="text-[13px] text-text-secondary">
          {t('workspaceProjects.count', { count: all.length })}
        </span>
      </div>

      <label className="flex items-center rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-text-secondary focus-within:border-text-tertiary">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('workspaceProjects.searchPlaceholder')}
          aria-label={t('workspaceProjects.searchLabel')}
          className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-secondary"
        />
      </label>

      {!manage && <p className="text-sm text-text-secondary">{t('workspaceProjects.readOnly')}</p>}
      {remove.isError && (
        <p role="alert" className="text-sm text-danger">
          {t('workspaceProjects.deleteError')}
        </p>
      )}

      {manage && selection.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-text-secondary" aria-live="polite">
            {t('workspaceProjects.selected', { count: selection.length })}
          </span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSelected([])} className={textButton}>
              {t('members.clearSelection')}
            </button>
            <button
              type="button"
              onClick={() => deleteProjects(selection.map((s) => s.project))}
              disabled={remove.isPending}
              className={neutralButton}
            >
              <TrashIcon />
              {t('workspaceProjects.deleteSelected')}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border-strong">
        <div
          role="table"
          aria-label={t('workspaceProjects.title')}
          className="flex min-w-[880px] flex-col"
        >
          <div role="rowgroup">
            <div
              role="row"
              className={`${rowGrid} border-b border-border-strong px-4 py-[11px] text-xs leading-4 text-text-secondary`}
            >
              <div role="columnheader" className="flex">
                {manage && (
                  <SelectBox
                    checked={allSelected}
                    label={t('workspaceProjects.selectAll')}
                    onChange={(checked) =>
                      setSelected(checked ? visible.map((s) => s.project.id) : [])
                    }
                  />
                )}
              </div>
              <div role="columnheader">{t('workspaceProjects.columns.project')}</div>
              <div role="columnheader">{t('workspaceProjects.columns.code')}</div>
              <div role="columnheader">{t('workspaceProjects.columns.languages')}</div>
              <div role="columnheader">{t('workspaceProjects.columns.managers')}</div>
              <div role="columnheader">{t('workspaceProjects.columns.progress')}</div>
              <div role="columnheader">{t('workspaceProjects.columns.created')}</div>
              <div role="columnheader">{manage && t('workspaceProjects.columns.actions')}</div>
            </div>
          </div>
          <div role="rowgroup" className="flex min-h-40 flex-col">
            {!summaries.isPending && visible.length === 0 && (
              <p className="px-4 py-6 text-sm text-text-tertiary">
                {all.length === 0 ? t('workspaceProjects.empty') : t('workspaceProjects.noMatches')}
              </p>
            )}
            {visible.map((summary) => (
              <ProjectRow
                key={summary.project.id}
                summary={summary}
                members={members}
                manage={manage}
                checked={selected.includes(summary.project.id)}
                onCheckedChange={(checked) =>
                  setSelected((ids) =>
                    checked
                      ? [...ids, summary.project.id]
                      : ids.filter((id) => id !== summary.project.id),
                  )
                }
                onRename={() => setRenaming(summary.project)}
                onDelete={() => deleteProjects([summary.project])}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-text-secondary">{t('workspaceProjects.deleteNote')}</p>

      <RenameProjectDialog
        project={renaming}
        otherCodes={(summaries.data ?? [])
          .filter((s) => s.project.id !== renaming?.id)
          .map((s) => s.project.code)}
        onOpenChange={(open) => !open && setRenaming(null)}
      />
    </div>
  );
}

function ProjectRow({
  summary,
  members,
  manage,
  checked,
  onCheckedChange,
  onRename,
  onDelete,
}: {
  summary: ProjectSummary;
  members: Member[];
  manage: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const { project, progress } = summary;
  const managers = project.managerIds.flatMap((id) => members.find((m) => m.id === id) ?? []);
  const percent = Math.round(progress * 100);
  const created = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(project.createdAt),
  );
  const actionClass =
    'inline-flex items-center gap-1 rounded-md text-[13px] whitespace-nowrap text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong';

  return (
    <div
      role="row"
      className={`${rowGrid} border-b border-border-strong px-4 py-3 last:border-b-0`}
    >
      <div role="cell" className="flex">
        {manage && (
          <SelectBox
            checked={checked}
            label={t('workspaceProjects.select', { name: project.name })}
            onChange={onCheckedChange}
          />
        )}
      </div>
      <div role="cell" className="min-w-0">
        <Link
          to={`/projects/${project.id}`}
          className="block truncate rounded-sm text-[13px] text-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          {project.name}
        </Link>
      </div>
      <div role="cell" className="truncate text-[13px] text-text-secondary">
        {project.code}
      </div>
      <div role="cell" className="truncate text-[13px] text-text-secondary">
        {t('workspaceProjects.languages', {
          source: languageName(project.sourceLanguage, locale),
          count: project.targetLanguages.length,
        })}
      </div>
      <div role="cell" className="flex -space-x-1.5">
        {managers.map((manager) => (
          <span key={manager.id} title={manager.name} className="rounded-full ring-2 ring-surface">
            <Avatar member={manager} size="md" />
          </span>
        ))}
      </div>
      <div role="cell" className="flex items-center gap-2">
        <ProgressBar
          value={progress}
          label={t('workspaceProjects.progressOf', { name: project.name })}
          className="h-[3px] flex-1"
        />
        <span className="w-9 text-right text-xs text-text-secondary">{percent}%</span>
      </div>
      <div role="cell" className="text-[13px] text-text-secondary">
        {created}
      </div>
      <div role="cell" className="flex items-center gap-3">
        {manage && (
          <>
            <button
              type="button"
              onClick={onRename}
              aria-label={t('workspaceProjects.renameProject', { name: project.name })}
              className={actionClass}
            >
              <PencilIcon className="size-3.5" />
              {t('workspaceProjects.rename')}
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={t('workspaceProjects.deleteProject', { name: project.name })}
              className={actionClass}
            >
              <TrashIcon />
              {t('workspaceProjects.delete')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-3.5">
      <path
        d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
