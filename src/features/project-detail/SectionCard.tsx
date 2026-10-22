import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { SectionSummary } from '@/domain/progress';
import type { Member, Project } from '@/domain/types';
import { AvatarStack } from '@/ui/Avatar';
import { Card } from '@/ui/Card';
import { PencilIcon } from '@/ui/icons';
import { PriorityIcon } from '@/ui/PriorityIcon';
import { CompletionLabel } from './SectionProgressCard';
import { useFormatNumber } from './format';

/**
 * Section card of the section detail (SPEC 5.3). Managers and priority are the
 * project's (SPEC 3: inherited). The pencil opens "Edit section" (DECISIONS D27).
 */
export function SectionCard({
  summary,
  project,
  members,
  onEdit,
}: {
  summary: SectionSummary;
  project: Project;
  members: Member[];
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const formatNumber = useFormatNumber();
  const titleId = useId();
  const { section, items, wordCount } = summary;
  const managers = project.managerIds.flatMap((id) => members.find((m) => m.id === id) ?? []);

  return (
    <Card labelledBy={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id={titleId} className="font-heading text-2xl leading-tight font-bold text-text">
            {section.name}
          </h2>
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('sectionDetail.editSection')}
            title={t('sectionDetail.editSection')}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-fill-subtle hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <PencilIcon />
          </button>
        </div>
        <CompletionLabel summary={summary} />
      </div>
      {section.description && (
        <p className="-mt-2 text-base text-text-secondary">{section.description}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap gap-6 text-base text-text-secondary">
          <li>{t('sectionDetail.contentItemCount', { count: items.length })}</li>
          <li>{t('projectDetail.words', { count: wordCount, value: formatNumber(wordCount) })}</li>
          <li>{t('projectDetail.languageCount', { count: project.targetLanguages.length })}</li>
        </ul>
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          {managers.length > 0 && (
            <>
              {t('sectionDetail.managers')}
              <AvatarStack members={managers} />
            </>
          )}
          <span className="flex items-center gap-1.5 font-semibold text-text">
            <PriorityIcon priority={project.priority} decorative className="size-4" />
            {t(`priority.${project.priority}`)}
          </span>
        </div>
      </div>
    </Card>
  );
}
