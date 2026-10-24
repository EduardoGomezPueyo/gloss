import { Checkbox, DropdownMenu } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useMembers, useRemoveMembers, useSetMemberCategory } from '@/data/hooks';
import {
  canManageMembers,
  checkCategoryChange,
  checkRemoval,
  memberCounts,
  searchMembers,
  type MemberChangeError,
} from '@/domain/members';
import type { Id, Member, MemberCategory } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { accentButton, neutralButton, textButton } from '@/ui/buttons';
import { menuClass, menuItemClass, SelectInput } from '@/ui/form';
import { CheckIcon, UserMinusIcon, UserPlusIcon } from '@/ui/icons';
import { StatusIcon } from '@/ui/StatusIcon';
import { InviteDialog } from './InviteDialog';

const CATEGORIES: MemberCategory[] = ['manager', 'worker'];
const ALL = 'all';
/** Figma: checkbox, member, 118px category, 92px status, 70px actions, 16px apart. */
const rowGrid = 'grid grid-cols-[1rem_minmax(0,1fr)_118px_92px_auto] items-center gap-4';

/**
 * Settings > Members (Figma 370:11028, SPEC 5.6), local only. No sub-teams (D10).
 * Only managers can change anything (DECISIONS D32).
 */
export function MembersPage() {
  const { t } = useTranslation();
  const { data: members = [], isPending } = useMembers();
  const { currentUser } = useCurrentUser();
  const setCategory = useSetMemberCategory();
  const remove = useRemoveMembers();
  const [query, setQuery] = useState('');
  const [category, setCategoryFilter] = useState<MemberCategory | null>(null);
  const [selected, setSelected] = useState<Id[]>([]);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<MemberChangeError | 'failed' | null>(null);

  const manage = canManageMembers(currentUser);
  const by = currentUser?.id ?? null;
  const visible = searchMembers(members, query, category);
  // People who were removed or filtered out drop out of the selection.
  const selection = visible.filter((m) => selected.includes(m.id));
  const counts = memberCounts(members);
  const allSelected = visible.length > 0 && selection.length === visible.length;

  const changeCategory = (ids: Id[], next: MemberCategory) => {
    const problem = checkCategoryChange(members, ids, next);
    setError(problem);
    if (problem) return;
    setCategory.mutate({ ids, category: next, by }, { onError: () => setError('failed') });
  };

  const removeMembers = (people: Member[]) => {
    const ids = people.map((m) => m.id);
    const problem = checkRemoval(members, ids, by);
    setError(problem);
    if (problem) return;
    const message = t('members.removeConfirm', {
      count: people.length,
      names: people.map((m) => m.name).join(', '),
    });
    if (!window.confirm(message)) return;
    remove.mutate(
      { ids, by },
      {
        onSuccess: () => setSelected((s) => s.filter((id) => !ids.includes(id))),
        onError: () => setError('failed'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="font-heading text-lg leading-tight font-bold text-text">
            {t('members.title')}
          </h2>
          <span className="text-[13px] text-text-secondary">
            {t('members.count', { count: members.length })}
          </span>
        </div>
        {manage && (
          <button type="button" onClick={() => setInviting(true)} className={accentButton}>
            <UserPlusIcon />
            {t('members.invite')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Figma: no search icon, on the page background (as in the section detail). */}
        <label className="flex min-w-60 flex-1 items-center rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-text-secondary focus-within:border-text-tertiary">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('members.searchPlaceholder')}
            aria-label={t('members.searchLabel')}
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-secondary"
          />
        </label>
        <SelectInput
          value={category ?? ALL}
          onChange={(value) => setCategoryFilter(value === ALL ? null : (value as MemberCategory))}
          label={t('members.categoryFilter')}
          options={[
            { value: ALL, label: t('members.allCategories') },
            ...CATEGORIES.map((c) => ({ value: c, label: t(`memberCategory.${c}`) })),
          ]}
          className="h-[34px] w-[142px] shrink-0 rounded-lg border border-border-strong px-3 text-[13px] whitespace-nowrap text-text-secondary outline-none focus-visible:border-text-tertiary"
        />
      </div>

      {!manage && <p className="text-sm text-text-secondary">{t('members.readOnly')}</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(`members.errors.${error}`)}
        </p>
      )}

      {manage && selection.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-text-secondary" aria-live="polite">
            {t('members.selected', { count: selection.length })}
          </span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSelected([])} className={textButton}>
              {t('members.clearSelection')}
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className={neutralButton}>
                {t('members.changeCategory')}
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={6} className={menuClass}>
                  {CATEGORIES.map((c) => (
                    <DropdownMenu.Item
                      key={c}
                      className={menuItemClass}
                      onSelect={() =>
                        changeCategory(
                          selection.map((m) => m.id),
                          c,
                        )
                      }
                    >
                      {t(`memberCategory.${c}`)}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <button
              type="button"
              onClick={() => removeMembers(selection)}
              className={neutralButton}
            >
              <UserMinusIcon />
              {t('members.removeSelected')}
            </button>
          </div>
        </div>
      )}

      <div
        role="table"
        aria-label={t('members.title')}
        className="flex flex-col rounded-2xl border border-border-strong"
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
                  label={t('members.selectAll')}
                  onChange={(checked) => setSelected(checked ? visible.map((m) => m.id) : [])}
                />
              )}
            </div>
            <div role="columnheader">{t('members.columns.member')}</div>
            <div role="columnheader">{t('members.columns.category')}</div>
            <div role="columnheader">{t('members.columns.status')}</div>
            <div role="columnheader">{t('members.columns.actions')}</div>
          </div>
        </div>
        <div role="rowgroup" className="flex min-h-40 flex-col">
          {!isPending && visible.length === 0 && (
            <p className="px-4 py-6 text-sm text-text-tertiary">{t('members.noMatches')}</p>
          )}
          {visible.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              manage={manage}
              checked={selected.includes(member.id)}
              onCheckedChange={(checked) =>
                setSelected((ids) =>
                  checked ? [...ids, member.id] : ids.filter((id) => id !== member.id),
                )
              }
              onCategoryChange={(next) => changeCategory([member.id], next)}
              onRemove={() => removeMembers([member])}
            />
          ))}
        </div>
        <div className="mt-auto flex flex-wrap justify-between gap-3 border-t border-border-strong px-4 py-4 text-xs text-text-secondary">
          <span>
            {visible.length === members.length
              ? t('members.showingAll', { count: members.length })
              : t('members.showingSome', { shown: visible.length, count: members.length })}
          </span>
          <span>
            {t('members.summary', {
              count: counts.invited,
              active: counts.active,
              invited: counts.invited,
            })}
          </span>
        </div>
      </div>

      <dl className="grid gap-x-12 gap-y-3 text-xs md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-text">{t('memberCategory.manager')}</dt>
          <dd className="text-text-secondary">{t('members.legend.manager')}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-text">{t('memberCategory.worker')}</dt>
          <dd className="text-text-secondary">{t('members.legend.worker')}</dd>
        </div>
      </dl>
      <p className="-mt-1 text-xs text-text-secondary">{t('members.legend.removal')}</p>

      <InviteDialog open={inviting} onOpenChange={setInviting} members={members} />
    </div>
  );
}

function SelectBox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={(value) => onChange(value === true)}
      aria-label={label}
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-border-strong data-[state=checked]:border-accent data-[state=checked]:bg-accent"
    >
      <Checkbox.Indicator>
        <CheckIcon className="size-3 text-accent-foreground" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

function MemberRow({
  member,
  manage,
  checked,
  onCheckedChange,
  onCategoryChange,
  onRemove,
}: {
  member: Member;
  manage: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onCategoryChange: (category: MemberCategory) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="row"
      className={`${rowGrid} border-b border-border-strong px-4 py-3 last:border-b-0`}
    >
      <div role="cell" className="flex">
        {manage && (
          <SelectBox
            checked={checked}
            label={t('members.select', { name: member.name })}
            onChange={onCheckedChange}
          />
        )}
      </div>
      <div role="cell" className="flex min-w-0 items-center gap-3">
        <Avatar member={member} size="row" />
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate text-[13px] leading-4 text-text">{member.name}</span>
          <span className="truncate text-xs leading-[15px] text-text-secondary">
            {member.email}
          </span>
        </span>
      </div>
      <div role="cell">
        {manage ? (
          <SelectInput
            value={member.category}
            onChange={(value) => onCategoryChange(value as MemberCategory)}
            label={t('members.categoryOf', { name: member.name })}
            options={CATEGORIES.map((c) => ({ value: c, label: t(`memberCategory.${c}`) }))}
            className="h-7 w-full rounded-md bg-fill-subtle px-3 text-[13px] text-text outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          />
        ) : (
          <span className="text-[13px] text-text">{t(`memberCategory.${member.category}`)}</span>
        )}
      </div>
      <div role="cell" className="flex items-center gap-1.5 text-[13px] text-text-secondary">
        <StatusIcon status={member.status === 'active' ? 'completed' : 'under-review'} decorative />
        {t(`members.status.${member.status}`)}
      </div>
      <div role="cell">
        {manage && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('members.removeMember', { name: member.name })}
            className="inline-flex items-center gap-1 rounded-md text-[13px] whitespace-nowrap text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <UserMinusIcon className="size-3.5" />
            {t('members.remove')}
          </button>
        )}
      </div>
    </div>
  );
}
