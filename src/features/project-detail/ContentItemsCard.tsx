import { Checkbox } from 'radix-ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import SearchIcon from '@/assets/icons/search.svg?react';
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
}: {
  projectId: Id;
  summary: SectionSummary;
  /** Every section of the project, for the move destinations. */
  sections: Section[];
  members: Member[];
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [selected, setSelected] = useState<Id[]>([]);

  const { items } = summary;
  const visible = filterItems(items, query, status);
  // Items that left the section (moved elsewhere) drop out of the selection.
  const selection = items.filter(({ item }) => selected.includes(item.id)).map((s) => s.item);
  const toggle = (id: Id, checked: boolean) =>
    setSelected((ids) => (checked ? [...ids, id] : ids.filter((s) => s !== id)));

  return (
    <Card labelledBy={titleId}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <CardTitle id={titleId}>{t('sectionDetail.contentItems')}</CardTitle>
          <span className="text-sm text-text-secondary">{items.length}</span>
        </div>
        {/* "Add content to section" arrives in phase 4. */}
        <button
          type="button"
          aria-disabled="true"
          title={t('sectionDetail.addContentComingSoon')}
          className={accentButton}
        >
          <PlusIcon />
          {t('sectionDetail.add')}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-48 flex-1 items-center gap-3 rounded-lg border border-border-input px-3 py-2 text-text-secondary focus-within:border-text-tertiary">
            <SearchIcon aria-hidden className="size-4 shrink-0" />
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
            className="h-[38px] w-44 rounded-full border border-border-input px-4 text-sm text-text-secondary outline-none focus-visible:border-text-tertiary"
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
              <MoveToSectionPopover
                items={selection}
                destinations={sections.filter((s) => s.id !== summary.section.id)}
                onMoved={() => setSelected([])}
              />
            </div>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('sectionDetail.noItems')}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('sectionDetail.noMatches')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
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

      <footer className="mt-auto flex flex-wrap justify-between gap-3 pt-4 text-sm text-text-secondary">
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
      className={`group relative flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
        checked
          ? 'border-accent/40 bg-accent/5'
          : 'border-transparent hover:border-border-strong has-[a:focus-visible]:border-border-strong'
      }`}
    >
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={t('sectionDetail.selectItem', { name: item.name })}
        className="relative z-10 inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-border-strong data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      >
        <Checkbox.Indicator>
          <CheckIcon className="size-3.5 text-accent-foreground" />
        </Checkbox.Indicator>
      </Checkbox.Root>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-base font-semibold text-text">{item.name}</span>
          <StatusBadge status={status} />
          <span className="ml-auto text-sm text-text-secondary">{toPercent(progress)}%</span>
        </div>
        <ProgressBar
          value={progress}
          status={status}
          label={t('projectDetail.itemProgress', { name: item.name })}
          className="h-1"
        />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-text-secondary">
          <span>
            {[
              item.type,
              t('projectDetail.words', { count: wordCount, value: formatNumber(wordCount) }),
              t('sectionDetail.itemLanguages', { count: languageCount }),
            ].join(' · ')}
          </span>
          <span className="flex items-center gap-1.5">
            {updater && <Avatar member={updater} />}
            {t('sectionDetail.updated', {
              time: formatRelativeTime(lastUpdate.at, new Date(), i18n.resolvedLanguage ?? 'en'),
            })}
          </span>
        </div>
      </div>

      <Link
        to={`/projects/${projectId}/items/${item.id}`}
        aria-label={t('sectionDetail.openEditor', { name: item.name })}
        // Stretched over the whole card: a click anywhere opens the item; the checkbox sits above it.
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary outline-none group-hover:text-text after:absolute after:inset-0 after:rounded-xl focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        <ChevronRightIcon />
      </Link>
    </li>
  );
}
