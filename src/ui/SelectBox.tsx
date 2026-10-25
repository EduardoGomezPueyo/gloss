import { Checkbox } from 'radix-ui';
import { CheckIcon } from './icons';

/** Row selection checkbox of the settings tables (Members, Workspace projects). */
export function SelectBox({
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
