import type { Priority, Status } from './types';

/** Sort order for statuses (SPEC 6): In progress > Under Review > Not started > Completed. */
export const STATUS_SORT_ORDER: readonly Status[] = [
  'in-progress',
  'under-review',
  'not-started',
  'completed',
];

/** Sort order for priorities: Urgent → None. */
export const PRIORITY_SORT_ORDER: readonly Priority[] = ['urgent', 'high', 'medium', 'low', 'none'];

/**
 * Status of a group (item, section, language, project) from the statuses of its
 * translations, including "not-started" for missing ones. See DECISIONS D18.
 *
 * - empty or all not started → not started
 * - all completed → completed
 * - only under review and completed → under review
 * - anything else → in progress
 */
export function aggregateStatus(statuses: readonly Status[]): Status {
  if (statuses.length === 0 || statuses.every((s) => s === 'not-started')) return 'not-started';
  if (statuses.every((s) => s === 'completed')) return 'completed';
  if (statuses.every((s) => s === 'under-review' || s === 'completed')) return 'under-review';
  return 'in-progress';
}
