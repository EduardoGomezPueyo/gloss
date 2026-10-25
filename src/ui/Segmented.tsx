import { ToggleGroup } from 'radix-ui';

const SIZES = {
  /** Filter chips (inbox pages). */
  sm: { root: 'h-8', item: 'h-full px-3 text-[13px]' },
  /** Settings rows. */
  md: { root: '', item: 'px-3 py-1 text-sm' },
};

/** A pill of mutually exclusive options ("Open | Resolved", "System | Light | Dark"). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  labelledBy,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Accessible name, or `labelledBy` when a visible label exists. */
  label?: string;
  labelledBy?: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix sends '' when the active item is clicked again: keep it.
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={`flex items-center rounded-full border border-border-strong p-0.5 ${SIZES[size].root}`}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={`rounded-full text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong data-[state=on]:bg-fill-subtle data-[state=on]:text-text ${SIZES[size].item}`}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
