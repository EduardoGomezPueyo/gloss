import { Checkbox } from 'radix-ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useOcrQueue } from '@/app/ocr/useOcrQueue';
import { useRetryOcr } from '@/data/hooks';
import { filterItems } from '@/domain/contentFilters';
import { toPercent, type ItemSummary, type SectionSummary } from '@/domain/progress';
import { formatRelativeTime } from '@/domain/relativeTime';
import { STATUSES, type Id, type Member, type Section, type Status } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { accentButton, textButton } from '@/ui/buttons';
import { Card, CardTitle } from '@/ui/Card';
import { SelectInput } from '@/ui/form';
import { CheckIcon, ChevronRightIcon, PlusIcon } from '@/ui/icons';
import { ProgressBar } from '@/ui/ProgressBar';
import { StatusBadge } from '@/ui/StatusBadge';
import { MoveToSectionPopover } from './MoveToSectionPopover';
import { useFormatNumber } from './format';
import { useProjectAccess } from '@/app/projectAccess/ProjectAccessContext';

const ALL = 'all';

/**
 * "Content items" card of the section detail (SPEC 5.3): search, status filter,
 * multi-select and "Move to section".
 */
export function ContentItemsCard({
  projectId,
  summary,
  sections,
  members,
  onAddContent,
}: {
  projectId: Id;
  summary: SectionSummary;
  /** Every section of the project, for the move destinations. */
  sections: Section[];
  members: Member[];
  onAddContent: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [selected, setSelected] = useState<Id[]>([]);
  const { canWork } = useProjectAccess();

  const { items } = summary;
  const visible = filterItems(items, query, status);
  // Items that left the section (moved elsewhere) drop out of the selection.
  const selection = items.filter(({ item }) => selected.includes(item.id)).map((s) => s.item);
  const toggle = (id: Id, checked: boolean) =>
    setSelected((ids) => (checked ? [...ids, id] : ids.filter((s) => s !== id)));

  return (
    <Card labelledBy={titleId} className="gap-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <CardTitle id={titleId}>{t('sectionDetail.contentItems')}</CardTitle>
          <span className="text-[13px] text-text-secondary">{items.length}</span>
        </div>
        {canWork && (
          <button type="button" onClick={onAddContent} className={accentButton}>
            <PlusIcon />
            {t('sectionDetail.add')}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Figma: no search icon here, and the box sits on the page background. */}
          <label className="flex min-w-48 flex-1 items-center rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-text-secondary focus-within:border-text-tertiary">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('sectionDetail.searchPlaceholder')}
              aria-label={t('sectionDetail.searchLabel')}
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-secondary"
            />
          </label>
          <SelectInput
            value={status ?? ALL}
            onChange={(value) => setStatus(value === ALL ? null : (value as Status))}
            label={t('sectionDetail.statusFilter')}
            options={[
              { value: ALL, label: t('sectionDetail.allStatuses') },
              ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
            ]}
            className="h-8 w-auto shrink-0 rounded-full border border-border-strong px-4 text-sm whitespace-nowrap text-text-tertiary outline-none focus-visible:border-text-tertiary"
          />
        </div>

        {selection.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-text-secondary" aria-live="polite">
              {t('sectionDetail.selected', { count: selection.length })}
            </span>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setSelected([])} className={textButton}>
                {t('sectionDetail.clearSelection')}
              </button>
              {canWork && (
                <MoveToSectionPopover
                  items={selection}
                  destinations={sections.filter((s) => s.id !== summary.section.id)}
                  onMoved={() => setSelected([])}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('sectionDetail.noItems')}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('sectionDetail.noMatches')}</p>
      ) : (
        <ul className="flex flex-col gap-4 pt-1">
          {visible.map((itemSummary) => (
            <ContentItemRow
              key={itemSummary.item.id}
              projectId={projectId}
              summary={itemSummary}
              members={members}
              checked={selected.includes(itemSummary.item.id)}
              onCheckedChange={(checked) => toggle(itemSummary.item.id, checked)}
            />
          ))}
        </ul>
      )}

      <footer className="mt-auto flex flex-wrap justify-between gap-3 pt-2.5 text-xs text-text-secondary">
        <span>
          {visible.length === items.length
            ? t('sectionDetail.showingAll', { count: items.length })
            : t('sectionDetail.showingSome', { shown: visible.length, count: items.length })}
        </span>
        <span>{t('sectionDetail.progressNote')}</span>
      </footer>
    </Card>
  );
}

function ContentItemRow({
  projectId,
  summary,
  members,
  checked,
  onCheckedChange,
}: {
  projectId: Id;
  summary: ItemSummary;
  members: Member[];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const formatNumber = useFormatNumber();
  const { item, progress, status, wordCount, languageCount, lastUpdate } = summary;
  const updater = members.find((m) => m.id === lastUpdate.by);

  return (
    <li
      className={`group relative flex items-center gap-3 rounded-lg border px-2.5 py-[9px] transition-colors ${
        checked
          ? 'border-accent/40 bg-accent/5'
          : 'border-border-strong hover:border-text-tertiary has-[a:focus-visible]:border-text-tertiary'
      }`}
    >
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={t('sectionDetail.selectItem', { name: item.name })}
        className="relative z-10 inline-flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border border-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-border-strong data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      >
        <Checkbox.Indicator>
          <CheckIcon className="size-3.5 text-accent-foreground" />
        </Checkbox.Indicator>
      </Checkbox.Root>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-sm leading-4 font-semibold text-text">{item.name}</span>
          <StatusBadge status={status} />
          <span className="ml-auto text-xs text-text-secondary">{toPercent(progress)}%</span>
        </div>
        <ProgressBar
          value={progress}
          status={status}
          label={t('projectDetail.itemProgress', { name: item.name })}
          className="h-1.5"
        />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-text-secondary">
          <span>
            {[
              item.type,
              t('projectDetail.words', { count: wordCount, value: formatNumber(wordCount) }),
              t('sectionDetail.itemLanguages', { count: languageCount }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span className="flex items-center gap-1.5 text-[11px]">
            {updater && <Avatar member={updater} />}
            {t('sectionDetail.updated', {
              time: formatRelativeTime(lastUpdate.at, new Date(), i18n.resolvedLanguage ?? 'en'),
            })}
          </span>
        </div>
        <OcrStatusLine itemId={item.id} ocr={summary.ocr} />
      </div>

      <Link
        to={`/projects/${projectId}/items/${item.id}`}
        aria-label={t('sectionDetail.openEditor', { name: item.name })}
        // Stretched over the whole card: a click anywhere opens the item; the checkbox sits above it.
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-text-secondary outline-none group-hover:text-text after:absolute after:inset-0 after:rounded-lg focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        <ChevronRightIcon />
      </Link>
    </li>
  );
}

/** OCR state of an item's images (DECISIONS D29); nothing when every image was read. */
function OcrStatusLine({ itemId, ocr }: { itemId: Id; ocr: ItemSummary['ocr'] }) {
  const { t } = useTranslation();
  const retry = useRetryOcr();
  const ocrQueue = useOcrQueue();
  const { canWork } = useProjectAccess();

  if (ocr.pending > 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-secondary" role="status">
        <span
          aria-hidden
          className="size-3 animate-spin rounded-full border-2 border-text-tertiary border-t-transparent"
        />
        {t('ocr.reading', { count: ocr.pending })}
      </p>
    );
  }
  if (ocr.failed > 0) {
    return (
      <p className="flex items-center gap-3 text-sm text-danger">
        {t('ocr.failed', { count: ocr.failed })}
        {canWork && (
          <button
            type="button"
            disabled={retry.isPending}
            onClick={() => retry.mutate(itemId, { onSuccess: () => ocrQueue.run() })}
            // Above the stretched link, so it does not open the item.
            className={`${textButton} relative z-10 underline`}
          >
            {t('ocr.retry')}
          </button>
        )}
      </p>
    );
  }
  if (ocr.empty > 0) {
    return <p className="text-sm text-text-tertiary">{t('ocr.empty', { count: ocr.empty })}</p>;
  }
  return null;
}
