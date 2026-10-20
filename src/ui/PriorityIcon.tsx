import { useTranslation } from 'react-i18next';
import HighIcon from '@/assets/icons/priority-high.svg?react';
import LowIcon from '@/assets/icons/priority-low.svg?react';
import MediumIcon from '@/assets/icons/priority-medium.svg?react';
import UrgentIcon from '@/assets/icons/priority-urgent.svg?react';
import type { Priority } from '@/domain/types';

/** Priority icon (Figma component 300:594): diamond, 3/2/1 bars or a dash, in a 20px box. */
export function PriorityIcon({
  priority,
  decorative = false,
  className = 'size-5',
}: {
  priority: Priority;
  decorative?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': t(`priority.${priority}`) };

  return (
    <span
      {...a11y}
      className={`inline-flex items-center justify-center text-priority ${className}`}
    >
      {priority === 'urgent' && <UrgentIcon aria-hidden className="size-[14.67px]" />}
      {priority === 'high' && <HighIcon aria-hidden className="size-3" />}
      {priority === 'medium' && <MediumIcon aria-hidden className="size-3" />}
      {priority === 'low' && <LowIcon aria-hidden className="size-3" />}
      {priority === 'none' && <span aria-hidden className="h-0.5 w-2.5 rounded-full bg-current" />}
    </span>
  );
}
