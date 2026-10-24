import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useUpdateProjectDetails } from '@/data/hooks';
import type { ProjectSummary } from '@/domain/progress';
import { canEditProject, type ProjectDetailsPatch } from '@/domain/projectDetails';
import type { Id, Member } from '@/domain/types';
import { AvatarStack } from '@/ui/Avatar';
import { Card, CardTitle } from '@/ui/Card';
import { PlatformChip } from '@/ui/PlatformChip';
import { PriorityIcon } from '@/ui/PriorityIcon';
import { useFormatNumber } from './format';
import { PeopleMenu, PlatformsPicker, PriorityMenu, ReleaseDatePicker } from './OverviewPickers';
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

/**
 * "Overview" card of the project detail (SPEC 5.2). Managers change platforms,
 * people, release date and priority by clicking them (DECISIONS D38).
 */
export function OverviewCard({ summary, members }: { summary: ProjectSummary; members: Member[] }) {
  const { t } = useTranslation();
  const formatNumber = useFormatNumber();
  const titleId = useId();
  const { currentUser } = useCurrentUser();
  const updateDetails = useUpdateProjectDetails();
  const { project, wordCount } = summary;
  const editable = canEditProject(currentUser);

  const people = (ids: Id[]) => ids.flatMap((id) => members.find((m) => m.id === id) ?? []);
  const managers = people(project.managerIds);
  const team = people(project.memberIds);
  const candidates = members.filter((m) => m.removedAt === null);
  const muted = (text: string) => <span className="font-normal text-text-tertiary">{text}</span>;
  const none = muted(t('projectDetail.noPeople'));

  const save = (patch: ProjectDetailsPatch) =>
    updateDetails.mutate({ projectId: project.id, patch, by: currentUser?.id ?? null });

  const platforms =
    project.platforms.length > 0
      ? project.platforms.map((p) => <PlatformChip key={p} platform={p} />)
      : none;
  const managerValue = managers.length > 0 ? <AvatarStack members={managers} /> : none;
  const teamValue = team.length > 0 ? <AvatarStack members={team} /> : none;
  const releaseDate = project.releaseDate ?? muted(t('projectDetail.notSet'));
  const priority = (
    <Pill>
      <PriorityIcon priority={project.priority} decorative className="size-4" />
      {t(`priority.${project.priority}`)}
    </Pill>
  );

  return (
    <Card labelledBy={titleId} className="gap-5">
      <div className="flex items-center justify-between gap-4">
        <CardTitle id={titleId}>{t('projectDetail.overview')}</CardTitle>
        {editable ? (
          <PriorityMenu
            label={t('projectDetail.edit.priority')}
            value={project.priority}
            onChange={(value) => save({ priority: value })}
          >
            {priority}
          </PriorityMenu>
        ) : (
          priority
        )}
      </div>
      {/* Figma's left column is just wide enough for four platform chips on one line. */}
      <div className="grid gap-x-10 gap-y-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <dl className="flex flex-col gap-3">
          <Row label={t('projectDetail.platforms')}>
            {editable ? (
              <PlatformsPicker
                label={t('projectDetail.edit.platforms')}
                value={project.platforms}
                onChange={(value) => save({ platforms: value })}
              >
                {platforms}
              </PlatformsPicker>
            ) : (
              platforms
            )}
          </Row>
          {/* SPEC minor open decision: the design says "Manager" even with several. */}
          <Row
            label={managers.length > 1 ? t('projectDetail.managers') : t('projectDetail.manager')}
          >
            {editable ? (
              <PeopleMenu
                label={t('projectDetail.edit.managers')}
                options={candidates.filter((m) => m.category === 'manager')}
                value={project.managerIds}
                onChange={(value) => save({ managerIds: value })}
                keepOne={t('projectDetail.edit.lastManager')}
              >
                {managerValue}
              </PeopleMenu>
            ) : (
              managerValue
            )}
          </Row>
          <Row label={t('projectDetail.members')}>
            {editable ? (
              <PeopleMenu
                label={t('projectDetail.edit.members')}
                options={candidates.filter((m) => m.category === 'worker')}
                value={project.memberIds}
                onChange={(value) => save({ memberIds: value })}
              >
                {teamValue}
              </PeopleMenu>
            ) : (
              teamValue
            )}
          </Row>
        </dl>
        <dl className="flex flex-col gap-3">
          <Row label={t('projectDetail.projectId')}>{project.code}</Row>
          <Row label={t('projectDetail.releaseDate')}>
            {editable ? (
              <ReleaseDatePicker
                label={t('projectDetail.edit.releaseDate')}
                value={project.releaseDate}
                onChange={(value) => save({ releaseDate: value })}
              >
                {releaseDate}
              </ReleaseDatePicker>
            ) : (
              releaseDate
            )}
          </Row>
          <Row label={t('projectDetail.wordCount')}>
            {t('projectDetail.words', { count: wordCount, value: formatNumber(wordCount) })}
          </Row>
        </dl>
      </div>
      {updateDetails.isError && (
        <p role="alert" className="text-sm text-danger">
          {t('projectDetail.edit.saveError')}
        </p>
      )}
    </Card>
  );
}
