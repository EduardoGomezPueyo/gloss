/** Thin progress bar: green when complete, yellow otherwise (Figma "Progress" popover). */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-[3px] w-full overflow-hidden rounded-full bg-progress-track"
    >
      <div
        className={`h-full rounded-full ${percent === 100 ? 'bg-status-completed' : 'bg-status-in-progress'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
