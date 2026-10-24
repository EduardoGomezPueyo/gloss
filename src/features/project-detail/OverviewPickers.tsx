import { DropdownMenu, Popover } from 'radix-ui';
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatReleaseDate,
  parseReleaseDate,
  QUARTERS,
  releaseYears,
  type Quarter,
} from '@/domain/projectDetails';
import {
  PLATFORMS,
  PRIORITIES,
  type Id,
  type Member,
  type Platform,
  type Priority,
} from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { CheckboxBox } from '@/ui/CheckboxBox';
import { menuClass, menuItemClass, SelectInput } from '@/ui/form';
import { CheckIcon } from '@/ui/icons';
import { PlatformDot } from '@/ui/PlatformChip';
import { PriorityIcon } from '@/ui/PriorityIcon';

/*
 * Pickers behind the Overview values (DECISIONS D38). Nothing is designed: the
 * value itself is the trigger, with a hover background, and each change saves
 * at once. They reuse the menus of the "Add new project" modal.
 */

/** The value stays where it is; the hover background bleeds slightly around it. */
const triggerClass =
  '-mx-1.5 -my-1 flex min-w-0 cursor-pointer flex-wrap items-center justify-end gap-2 rounded-md px-1.5 py-1 outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong data-[state=open]:bg-fill-subtle';

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function PlatformsPicker({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: Platform[];
  onChange: (platforms: Platform[]) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label={label} className={triggerClass}>
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuClass}>
          {PLATFORMS.map((platform) => {
            const checked = value.includes(platform);
            return (
              <DropdownMenu.CheckboxItem
                key={platform}
                checked={checked}
                // Kept in the catalog order, whatever the click order.
                onCheckedChange={() =>
                  onChange(PLATFORMS.filter((p) => (p === platform ? !checked : value.includes(p))))
                }
                onSelect={(event) => event.preventDefault()}
                className={menuItemClass}
              >
                <CheckboxBox checked={checked} />
                <PlatformDot platform={platform} />
                {t(`platform.${platform}`)}
              </DropdownMenu.CheckboxItem>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** People of one category with checkboxes; `keepOne` stops the last one being unchecked. */
export function PeopleMenu({
  label,
  options,
  value,
  onChange,
  keepOne,
  children,
}: {
  label: string;
  options: Member[];
  value: Id[];
  onChange: (ids: Id[]) => void;
  keepOne?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label={label} className={triggerClass}>
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuClass}>
          {options.length === 0 && (
            <p className="px-3 py-1.5 text-sm text-text-tertiary">{t('createProject.noPeople')}</p>
          )}
          {options.map((member) => {
            const checked = value.includes(member.id);
            const locked = keepOne !== undefined && checked && value.length === 1;
            return (
              <DropdownMenu.CheckboxItem
                key={member.id}
                checked={checked}
                disabled={locked}
                onCheckedChange={() => onChange(toggle(value, member.id))}
                onSelect={(event) => event.preventDefault()}
                className={`${menuItemClass} data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60`}
              >
                <CheckboxBox checked={checked} />
                <Avatar member={member} size="md" className="size-[18px]" />
                {member.name}
              </DropdownMenu.CheckboxItem>
            );
          })}
          {keepOne && value.length === 1 && (
            <p className="max-w-56 px-3 pt-1 pb-1.5 text-xs text-text-tertiary">{keepOne}</p>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function PriorityMenu({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: Priority;
  onChange: (priority: Priority) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={label}
        className="cursor-pointer rounded-full outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuClass}>
          <DropdownMenu.RadioGroup value={value} onValueChange={(v) => onChange(v as Priority)}>
            {[...PRIORITIES].reverse().map((priority) => (
              <DropdownMenu.RadioItem key={priority} value={priority} className={menuItemClass}>
                <PriorityIcon priority={priority} decorative className="size-4" />
                {t(`priority.${priority}`)}
                <DropdownMenu.ItemIndicator className="ml-auto">
                  <CheckIcon />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const NOT_SET = 'none';

/** Quarter and year (stored as "Q3 2026"); "Not set" clears it. */
export function ReleaseDatePicker({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | null;
  onChange: (releaseDate: string | null) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const current = parseReleaseDate(value);
  const thisYear = new Date().getFullYear();
  const year = current?.year ?? thisYear;

  return (
    <Popover.Root>
      <Popover.Trigger aria-label={label} className={triggerClass}>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          aria-labelledby={titleId}
          className="z-40 flex w-72 flex-col gap-3 rounded-2xl border border-border-strong bg-popup p-4 shadow-lg outline-none"
        >
          <p id={titleId} className="font-heading text-sm font-semibold text-text">
            {t('projectDetail.edit.releaseDateTitle')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <SelectInput
              label={t('projectDetail.edit.quarter')}
              value={current ? String(current.quarter) : NOT_SET}
              onChange={(q) =>
                onChange(
                  q === NOT_SET ? null : formatReleaseDate({ quarter: Number(q) as Quarter, year }),
                )
              }
              options={[
                { value: NOT_SET, label: t('projectDetail.notSet') },
                ...QUARTERS.map((q) => ({ value: String(q), label: `Q${q}` })),
              ]}
            />
            {current && (
              <SelectInput
                label={t('projectDetail.edit.year')}
                value={String(current.year)}
                onChange={(y) => onChange(formatReleaseDate({ ...current, year: Number(y) }))}
                options={releaseYears(thisYear, current.year).map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
              />
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
