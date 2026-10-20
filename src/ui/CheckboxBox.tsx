/** Square checkbox drawn inside menu items; the item itself carries the checked state. */
export function CheckboxBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-2.5 shrink-0 items-center justify-center rounded-[2px] border ${
        checked ? 'border-text bg-text text-surface' : 'border-text-secondary'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 10 10" fill="none" className="size-2">
          <path
            d="M2 5.2 4.1 7.2 8 2.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}
