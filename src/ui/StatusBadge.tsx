import { useTranslation } from 'react-i18next';
import type { Status } from '@/domain/types';

const BADGE_CLASS: Record<Status, string> = {
  'not-started': 'bg-fill-subtle text-text-secondary',
  'in-progress': 'bg-status-in-progress/15 text-status-in-progress',
  'under-review': 'bg-status-under-review/15 text-status-under-review',
  completed: 'bg-status-completed/15 text-status-completed',
};

const SIZE_CLASS = {
  sm: 'px-1.5 py-0.5 text-[11px] leading-[13px]',
  md: 'px-2.5 py-1 text-sm leading-4',
};

/**
 * Status label on a tinted pill (Figma: Languages Progress, Section Progress
 * items). The editor uses the larger size.
 */
export function StatusBadge({ status, size = 'sm' }: { status: Status; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md font-heading font-semibold whitespace-nowrap ${SIZE_CLASS[size]} ${BADGE_CLASS[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
