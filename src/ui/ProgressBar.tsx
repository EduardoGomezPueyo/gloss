import type { Status } from '@/domain/types';

const FILL_CLASS: Record<Status, string> = {
  'not-started': 'bg-status-not-started',
  'in-progress': 'bg-status-in-progress',
  'under-review': 'bg-status-under-review',
  completed: 'bg-status-completed',
};

/**
 * Progress bar. Without `status` it is green when complete and yellow otherwise
 * (Figma "Progress" popover); with it, the fill takes the status colour (SPEC 5.2).
 */
export function ProgressBar({
  value,
  label,
  status,
  className = 'h-[3px]',
}: {
  value: number;
  label: string;
  status?: Status;
  className?: string;
}) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  const fill = status
    ? FILL_CLASS[status]
    : percent === 100
      ? 'bg-status-completed'
      : 'bg-status-in-progress';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`w-full overflow-hidden rounded-full bg-progress-track ${className}`}
    >
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
