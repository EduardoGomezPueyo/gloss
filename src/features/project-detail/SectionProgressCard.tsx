import { Accordion } from 'radix-ui';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toPercent, type SectionSummary } from '@/domain/progress';
import { neutralButton } from '@/ui/buttons';
import { Card, CardTitle } from '@/ui/Card';
import { DisclosureTriangle } from '@/ui/icons';
import { ProgressBar } from '@/ui/ProgressBar';
import { StatusBadge } from '@/ui/StatusBadge';
import { StatusIcon } from '@/ui/StatusIcon';

/** Completion text: "75% completion", or the status name when nothing has started. */
export function CompletionLabel({ summary }: { summary: SectionSummary }) {
  const { t } = useTranslation();
  return (
    <span className="flex shrink-0 items-center gap-3 text-sm text-text-secondary">
      {summary.status === 'not-started'
        ? t('status.not-started')
        : t('projectDetail.completion', { percent: toPercent(summary.progress) })}
      <StatusIcon status={summary.status} progress={summary.progress} decorative />
    </span>
  );
}

/**
 * "Section Progress" card (SPEC 5.2): collapsible sections with their items. The
 * triangle expands a section; its name opens the section detail (DECISIONS D27).
 */
export function SectionProgressCard({
  projectId,
  sections,
  onAddSection,
}: {
  projectId: string;
  sections: SectionSummary[];
  onAddSection: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Card labelledBy={titleId}>
      <div className="flex items-center justify-between gap-4">
        <CardTitle id={titleId}>{t('projectDetail.sectionProgress')}</CardTitle>
        <button type="button" onClick={onAddSection} className={neutralButton}>
          {t('projectDetail.addSection')}
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('projectDetail.noSections')}</p>
      ) : (
        <Accordion.Root
          type="multiple"
          defaultValue={[sections[0]!.section.id]}
          className="flex flex-col gap-2"
        >
          {sections.map((summary) => (
            <SectionRow key={summary.section.id} projectId={projectId} summary={summary} />
          ))}
        </Accordion.Root>
      )}
    </Card>
  );
}

function SectionRow({ projectId, summary }: { projectId: string; summary: SectionSummary }) {
  const { t } = useTranslation();
  const { section, items } = summary;

  return (
    <Accordion.Item
      value={section.id}
      className="rounded-xl border border-transparent data-[state=open]:border-border-strong"
    >
      <Accordion.Header className="flex items-center gap-3 px-4 py-4">
        <Accordion.Trigger
          aria-label={t('projectDetail.toggleSection', { name: section.name })}
          className="group inline-flex size-6 shrink-0 items-center justify-center rounded-md text-text outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <DisclosureTriangle className="size-2.5 transition-transform group-data-[state=open]:rotate-90" />
        </Accordion.Trigger>
        <Link
          to={`/projects/${projectId}/sections/${section.id}`}
          className="min-w-0 flex-1 truncate rounded-sm text-lg text-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          {section.name}
        </Link>
        <CompletionLabel summary={summary} />
      </Accordion.Header>
      <Accordion.Content className="px-4 pb-5 pl-[52px]">
        {items.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('projectDetail.noItemsInSection')}</p>
        ) : (
          <ul className="flex flex-col gap-5">
            {items.map(({ item, progress, status }) => (
              <li key={item.id} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="truncate text-base font-semibold text-text">{item.name}</span>
                  <StatusBadge status={status} />
                  <span className="ml-auto text-sm text-text-secondary">
                    {toPercent(progress)}%
                  </span>
                </div>
                <ProgressBar
                  value={progress}
                  status={status}
                  label={t('projectDetail.itemProgress', { name: item.name })}
                  className="h-1.5"
                />
              </li>
            ))}
          </ul>
        )}
      </Accordion.Content>
    </Accordion.Item>
  );
}
