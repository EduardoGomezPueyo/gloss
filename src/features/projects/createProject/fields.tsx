import { DropdownMenu, RadioGroup } from 'radix-ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PRIORITIES, type Id, type Member, type Priority } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { CheckboxBox } from '@/ui/CheckboxBox';
import { CloseIcon } from '@/ui/CloseIcon';
import { menuClass, menuItemClass } from '@/ui/form';
import { CheckIcon, PlusIcon } from '@/ui/icons';
import { PriorityIcon } from '@/ui/PriorityIcon';

/*
 * Building blocks of the "Add new project" modal (Figma 370:5450). Managers and
 * the language fields have no design yet (DECISIONS D8): they reuse the look of
 * Team members and Platforms.
 */

/** Selectable chip with a check when pressed (Figma: Platforms). */
export function ToggleChip({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 font-heading text-sm leading-none font-semibold text-text outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
        pressed ? 'border-text-secondary' : 'border-tag-border bg-tag-bg hover:border-text-tertiary'
      }`}
    >
      {children}
      {pressed && <CheckIcon />}
    </button>
  );
}

/** Chips with avatar and × plus an "+ Add …" menu with checkboxes (Figma: Team members). */
export function PeoplePicker({
  addLabel,
  options,
  selected,
  onChange,
  invalid,
  describedBy,
}: {
  addLabel: string;
  options: Member[];
  selected: Id[];
  onChange: (ids: Id[]) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { t } = useTranslation();
  const chosen = selected.flatMap((id) => options.find((m) => m.id === id) ?? []);
  const toggle = (id: Id) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border bg-popup p-4 ${invalid ? 'border-danger' : 'border-border-input'}`}
    >
      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {chosen.map((member) => (
            <li
              key={member.id}
              className="inline-flex items-center gap-2 rounded-full bg-fill-subtle py-1.5 pr-2.5 pl-1.5 text-base text-text"
            >
              <Avatar member={member} size="md" />
              {member.name}
              <button
                type="button"
                aria-label={t('createProject.remove', { name: member.name })}
                onClick={() => toggle(member.id)}
                className="rounded-full p-0.5 text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
              >
                <CloseIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-describedby={describedBy}
          className="inline-flex w-fit items-center gap-2 rounded-md text-base text-text outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <PlusIcon />
          {addLabel}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className={menuClass}>
            {options.length === 0 && (
              <p className="px-3 py-1.5 text-sm text-text-tertiary">
                {t('createProject.noPeople')}
              </p>
            )}
            {options.map((member) => {
              const checked = selected.includes(member.id);
              return (
                <DropdownMenu.CheckboxItem
                  key={member.id}
                  checked={checked}
                  onCheckedChange={() => toggle(member.id)}
                  onSelect={(event) => event.preventDefault()}
                  className={menuItemClass}
                >
                  <CheckboxBox checked={checked} />
                  <Avatar member={member} size="md" className="size-[18px]" />
                  {member.name}
                </DropdownMenu.CheckboxItem>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

/** Five segmented options, None → Urgent (Figma: Priority). */
export function PriorityPicker({
  labelId,
  value,
  onChange,
}: {
  labelId: string;
  value: Priority;
  onChange: (priority: Priority) => void;
}) {
  const { t } = useTranslation();
  return (
    <RadioGroup.Root
      aria-labelledby={labelId}
      value={value}
      onValueChange={(v) => onChange(v as Priority)}
      orientation="horizontal"
      className="grid grid-cols-5 gap-2"
    >
      {[...PRIORITIES].reverse().map((priority) => (
        <RadioGroup.Item
          key={priority}
          value={priority}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border-input px-1 text-sm text-text outline-none hover:border-text-tertiary focus-visible:ring-2 focus-visible:ring-border-strong data-[state=checked]:border-text-secondary data-[state=checked]:bg-fill-subtle"
        >
          <PriorityIcon priority={priority} decorative className="size-4" />
          {t(`priority.${priority}`)}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
