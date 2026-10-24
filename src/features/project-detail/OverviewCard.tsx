import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectSummary } from '@/domain/progress';
import type { Id, Member } from '@/domain/types';
import { AvatarStack } from '@/ui/Avatar';
import { Card, CardTitle } from '@/ui/Card';
import { PlatformChip } from '@/ui/PlatformChip';
import { PriorityIcon } from '@/ui/PriorityIcon';
import { useFormatNumber } from './format';
import { Pill } from './shared';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-[13px] leading-4 text-text-secondary">{label}</dt>
      <dd className="flex min-w-0 flex-wrap justify-end gap-2 text-[13px] leading-4 font-semibold text-text">
        {children}
      </dd>
    </div>
  );
}

/** "Overview" card of the project detail (SPEC 5.2). */
export function OverviewCard({ summary, members }: { summary: ProjectSummary; members: Member[] }) {
  const { t } = useTranslation();
  const formatNumber = useFormatNumber();
  const titleId = useId();
  const { project, wordCount } = summary;
  const people = (ids: Id[]) => ids.flatMap((id) => members.find((m) => m.id === id) ?? []);
  const managers = people(project.managerIds);
  const team = people(project.memberIds);
  const none = (
    <span className="font-normal text-text-tertiary">{t('projectDetail.noPeople')}</span>
  );

  return (
    <Card labelledBy={titleId} className="gap-5">
      <div className="flex items-center justify-between gap-4">
        <CardTitle id={titleId}>{t('projectDetail.overview')}</CardTitle>
        <Pill>
          <PriorityIcon priority={project.priority} decorative className="size-4" />
          {t(`priority.${project.priority}`)}
        </Pill>
      </div>
      {/* Figma's left column is just wide enough for four platform chips on one line. */}
      <div className="grid gap-x-10 gap-y-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <dl className="flex flex-col gap-3">
          <Row label={t('projectDetail.platforms')}>
            {project.platforms.length > 0
              ? project.platforms.map((p) => <PlatformChip key={p} platform={p} />)
              : none}
          </Row>
          {/* SPEC minor open decision: the design says "Manager" even with several. */}
          <Row
            label={managers.length > 1 ? t('projectDetail.managers') : t('projectDetail.manager')}
          >
            {managers.length > 0 ? <AvatarStack members={managers} /> : none}
          </Row>
          <Row label={t('projectDetail.members')}>
            {team.length > 0 ? <AvatarStack members={team} /> : none}
          </Row>
        </dl>
        <dl className="flex flex-col gap-3">
          <Row label={t('projectDetail.projectId')}>{project.code}</Row>
          <Row label={t('projectDetail.releaseDate')}>
            {project.releaseDate ?? (
              <span className="font-normal text-text-tertiary">{t('projectDetail.notSet')}</span>
            )}
          </Row>
          <Row label={t('projectDetail.wordCount')}>
            {t('projectDetail.words', { count: wordCount, value: formatNumber(wordCount) })}
          </Row>
        </dl>
      </div>
    </Card>
  );
}
