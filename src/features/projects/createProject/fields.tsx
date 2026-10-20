import { DropdownMenu, RadioGroup, Select } from 'radix-ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, languageName } from '@/domain/languages';
import { PRIORITIES, type Id, type LanguageCode, type Member, type Priority } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { CheckboxBox } from '@/ui/CheckboxBox';
import { CloseIcon } from '@/ui/CloseIcon';
import { LanguageFlag } from '@/ui/LanguageFlag';
import { PriorityIcon } from '@/ui/PriorityIcon';

/*
 * Building blocks of the "Add new project" modal (Figma 370:5450). Managers and
 * the language fields have no design yet (DECISIONS D8): they reuse the look of
 * Team members and Platforms.
 */

export const inputClass =
  'h-[42px] w-full rounded-lg border border-border-input bg-popup px-4 text-base text-text outline-none placeholder:text-text-tertiary focus-visible:border-text-tertiary aria-invalid:border-danger';

const menuClass =
  'z-[60] flex max-h-64 min-w-56 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-border-strong bg-popup p-1.5 shadow-lg';
const menuItemClass =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-text outline-none select-none data-[highlighted]:bg-fill-subtle';

export function Field({
  label,
  htmlFor,
  required,
  aside,
  help,
  error,
  errorId,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  aside?: ReactNode;
  help?: string;
  error?: string;
  errorId?: string;
  children: ReactNode;
}) {
  const LabelTag = htmlFor ? 'label' : 'span';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <LabelTag htmlFor={htmlFor} className="text-sm text-text">
          {label}
          {required && <span aria-hidden> *</span>}
        </LabelTag>
        {aside && <span className="text-sm text-text-secondary">{aside}</span>}
      </div>
      {children}
      {help && <p className="-mt-1 text-sm text-text-secondary">{help}</p>}
      {error && (
        <p id={errorId} className="-mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-4">
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      {pressed && <CheckGlyph />}
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
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-4">
            <path
              d="M8 2.5v11M2.5 8h11"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
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

/** Original language dropdown. */
export function LanguageSelect({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: LanguageCode | null;
  onChange: (code: LanguageCode) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';

  return (
    <Select.Root value={value ?? ''} onValueChange={onChange}>
      <Select.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${inputClass} flex items-center justify-between gap-3 text-left data-[placeholder]:text-text-tertiary`}
      >
        <Select.Value placeholder={t('createProject.sourceLanguagePlaceholder')}>
          {value && (
            <span className="flex items-center gap-2">
              <LanguageFlag code={value} />
              {languageName(value, locale)}
            </span>
          )}
        </Select.Value>
        <Select.Icon>
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-4 text-text">
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className={`${menuClass} w-[var(--radix-select-trigger-width)]`}
        >
          <Select.Viewport>
            {LANGUAGES.map(({ code }) => (
              <Select.Item key={code} value={code} className={menuItemClass}>
                <LanguageFlag code={code} />
                <Select.ItemText>{languageName(code, locale)}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <CheckGlyph />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
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
      className="grid grid-cols-5 gap-2.5"
    >
      {[...PRIORITIES].reverse().map((priority) => (
        <RadioGroup.Item
          key={priority}
          value={priority}
          className="inline-flex h-[54px] items-center justify-center gap-2 rounded-lg border border-border-input text-base text-text outline-none hover:border-text-tertiary focus-visible:ring-2 focus-visible:ring-border-strong data-[state=checked]:border-text-secondary data-[state=checked]:bg-fill-subtle"
        >
          <PriorityIcon priority={priority} decorative className="size-4" />
          {t(`priority.${priority}`)}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
