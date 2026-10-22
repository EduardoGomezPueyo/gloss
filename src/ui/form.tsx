import { Select } from 'radix-ui';
import type { ReactNode } from 'react';
import { CheckIcon, ChevronDownIcon } from './icons';

/*
 * Form building blocks shared by the modals and popovers (Figma "Add new project"
 * modal 370:5450; the other forms reuse its look, DECISIONS D8, D27).
 */

export const inputClass =
  'h-[42px] w-full rounded-lg border border-border-input bg-popup px-4 text-base text-text outline-none placeholder:text-text-tertiary focus-visible:border-text-tertiary aria-invalid:border-danger';

export const menuClass =
  'z-[60] flex max-h-64 min-w-56 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-border-strong bg-popup p-1.5 shadow-lg';

export const menuItemClass =
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

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

/** Dropdown styled like the text inputs. */
export function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  label,
  invalid,
  describedBy,
  className = inputClass,
}: {
  id?: string;
  value: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Accessible name when there is no <label htmlFor>. */
  label?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select.Root value={value ?? ''} onValueChange={onChange}>
      <Select.Trigger
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${className} flex items-center justify-between gap-3 text-left data-[placeholder]:text-text-tertiary`}
      >
        <Select.Value placeholder={placeholder}>
          {selected && (
            <span className="flex items-center gap-2">
              {selected.icon}
              {selected.label}
            </span>
          )}
        </Select.Value>
        <Select.Icon>
          <ChevronDownIcon className="size-4 text-text" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className={`${menuClass} w-[var(--radix-select-trigger-width)]`}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} className={menuItemClass}>
                {option.icon}
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <CheckIcon />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
