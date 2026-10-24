import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toPercent, type ProjectSummary } from '@/domain/progress';
import { StatusIcon } from '@/ui/StatusIcon';
import { progressIconStatus } from './format';
import { Pill } from './shared';

/** Project name with status and "% translated" pills (Figma 370:10566, 370:10799). */
export function ProjectHeader({
  summary,
  actions,
}: {
  summary: ProjectSummary;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  const { project, status, progress } = summary;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-[28px] leading-[33px] font-bold text-text">
            {project.name}
          </h1>
          <Pill>
            <StatusIcon status={status} progress={progress} decorative />
            {t(`status.${status}`)}
          </Pill>
          <Pill>
            <StatusIcon status={progressIconStatus(progress)} progress={progress} decorative />
            {t('projectDetail.translated', { percent: toPercent(progress) })}
          </Pill>
        </div>
        <p className="text-sm leading-tight text-text-secondary">{t('projectDetail.subtitle')}</p>
      </div>
      {actions}
    </header>
  );
}
