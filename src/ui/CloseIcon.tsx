/** "×" glyph used by chips and dialogs. */
export function CloseIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3.5 3.5l9 9m0-9-9 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
