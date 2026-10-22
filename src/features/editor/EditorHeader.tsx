import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useSubmitForReview } from '@/data/hooks';
import type { ProjectSummary } from '@/domain/progress';
import type { ContentItem, Section } from '@/domain/types';
import { accentButton } from '@/ui/buttons';
import { ArrowLeftIcon, CheckIcon, ChevronRightIcon } from '@/ui/icons';
import { StatusIcon } from '@/ui/StatusIcon';
import { Pill } from '../project-detail/shared';
import type { SaveState } from './useAutosave';

/** Project name, status, autosave indicator, Submit for review and the breadcrumb (SPEC 5.4). */
export function EditorHeader({
  summary,
  section,
  item,
  saveState,
}: {
  summary: ProjectSummary;
  section: Section;
  item: ContentItem;
  saveState: SaveState;
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const submit = useSubmitForReview();
  const [message, setMessage] = useState<string | null>(null);
  const { project, status, progress } = summary;

  const onSubmit = () =>
    submit.mutate(
      { sectionId: section.id, by: currentUser?.id ?? null },
      {
        onSuccess: (count) =>
          setMessage(count > 0 ? t('editor.submitted', { count }) : t('editor.nothingToSubmit')),
      },
    );

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <h1 className="font-heading text-[28px] leading-tight font-bold text-text">
            {project.name}
          </h1>
          <Pill>
            <StatusIcon status={status} progress={progress} decorative />
            {t(`status.${status}`)}
          </Pill>
          <span className="text-base text-text-secondary">{t('editor.workspace')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SaveIndicator state={saveState} />
          <button
            type="button"
            onClick={onSubmit}
            disabled={submit.isPending}
            title={t('editor.submitHint')}
            className={accentButton}
          >
            {t('editor.submitForReview')}
          </button>
        </div>
      </header>
      {message && (
        <p role="status" className="-mt-2 self-end text-sm text-text-secondary">
          {message}
        </p>
      )}

      <nav
        aria-label={t('sectionDetail.breadcrumb')}
        className="flex flex-wrap items-center justify-between gap-4 text-base"
      >
        <ol className="flex min-w-0 flex-wrap items-center gap-3">
          <li>
            <Link
              to={`/projects/${project.id}`}
              className="flex items-center gap-3 rounded-sm text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
            >
              <ArrowLeftIcon />
              {t('sectionDetail.allSections')}
            </Link>
          </li>
          <li aria-hidden className="text-text-secondary">
            <ChevronRightIcon className="size-3.5" />
          </li>
          <li>
            <Link
              to={`/projects/${project.id}/sections/${section.id}`}
              className="rounded-sm text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
            >
              {section.name}
            </Link>
          </li>
          <li aria-hidden className="text-text-secondary">
            <ChevronRightIcon className="size-3.5" />
          </li>
          <li aria-current="page" className="font-semibold text-text">
            {item.name}
          </li>
        </ol>
        <span className="text-sm text-text-secondary">{project.code}</span>
      </nav>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const { t } = useTranslation();
  if (state === 'idle') return null;
  return (
    <span
      role="status"
      className={`flex items-center gap-2 text-sm ${state === 'error' ? 'text-danger' : 'text-text-secondary'}`}
    >
      {state === 'saved' && <CheckIcon className="size-4" />}
      {state === 'saving'
        ? t('editor.saving')
        : state === 'saved'
          ? t('editor.saved')
          : t('editor.saveError')}
    </span>
  );
}
