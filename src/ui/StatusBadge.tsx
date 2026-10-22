import { useTranslation } from 'react-i18next';
import type { Status } from '@/domain/types';

const BADGE_CLASS: Record<Status, string> = {
  'not-started': 'bg-fill-subtle text-text-secondary',
  'in-progress': 'bg-status-in-progress/15 text-status-in-progress',
  'under-review': 'bg-status-under-review/15 text-status-under-review',
  completed: 'bg-status-completed/15 text-status-completed',
};

/** Status label on a tinted pill (Figma: Languages Progress, Section Progress items). */
export function StatusBadge({ status }: { status: Status }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-heading text-[11px] leading-none font-semibold whitespace-nowrap ${BADGE_CLASS[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
