import { useTranslation } from 'react-i18next';
import CompletedIcon from '@/assets/icons/status-completed.svg?react';
import UnderReviewIcon from '@/assets/icons/status-under-review.svg?react';
import type { Status } from '@/domain/types';

/** Pie slice from 12 o'clock, clockwise, covering `fraction` of a circle of radius r at (c, c). */
function piePath(fraction: number, c: number, r: number): string {
  const angle = fraction * 2 * Math.PI;
  const x = c + r * Math.sin(angle);
  const y = c - r * Math.cos(angle);
  const largeArc = fraction > 0.5 ? 1 : 0;
  return `M${c} ${c} L${c} ${c - r} A${r} ${r} 0 ${largeArc} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`;
}

/**
 * Status icon (Figma component 300:671): dashed circle, yellow ring filled like a
 * pie with the progress, orange "!" and green check. Labelled for screen readers
 * unless `decorative`.
 */
export function StatusIcon({
  status,
  progress = 0.5,
  decorative = false,
  className = 'size-4',
}: {
  status: Status;
  /** Only used by "in progress": how much of the pie is filled. */
  progress?: number;
  decorative?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': t(`status.${status}`) };

  switch (status) {
    case 'completed':
      return <CompletedIcon {...a11y} className={className} />;
    case 'under-review':
      return <UnderReviewIcon {...a11y} className={className} />;
    case 'not-started':
      return (
        <svg {...a11y} viewBox="0 0 16 16" fill="none" className={className}>
          <circle cx="8" cy="8" r="7.5" stroke="var(--status-not-started)" strokeDasharray="2 2" />
        </svg>
      );
    case 'in-progress': {
      // Keep the slice visible at the extremes: in progress is never empty or full.
      const fraction = Math.min(Math.max(progress, 0.1), 0.9);
      return (
        <svg {...a11y} viewBox="0 0 16 16" fill="none" className={className}>
          <circle cx="8" cy="8" r="7.5" stroke="var(--status-in-progress)" />
          <path d={piePath(fraction, 8, 6)} fill="var(--status-in-progress)" />
        </svg>
      );
    }
  }
}
