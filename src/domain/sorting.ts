import type { ProjectSummary } from './progress';
import { PRIORITY_SORT_ORDER, STATUS_SORT_ORDER } from './status';

/*
 * Project list sorting (SPEC 5.1):
 * - name (default): A-Z, toggles to Z-A
 * - priority: Urgent → None
 * - status: In progress > Under Review > Not started > Completed
 * Ties are broken by name A-Z so the order is stable.
 */

export type ProjectSortKey = 'name' | 'priority' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface ProjectSort {
  key: ProjectSortKey;
  direction: SortDirection;
}

export const DEFAULT_PROJECT_SORT: ProjectSort = { key: 'name', direction: 'asc' };

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

function compareByKey(a: ProjectSummary, b: ProjectSummary, key: ProjectSortKey): number {
  switch (key) {
    case 'name':
      return collator.compare(a.project.name, b.project.name);
    case 'priority':
      return (
        PRIORITY_SORT_ORDER.indexOf(a.project.priority) -
        PRIORITY_SORT_ORDER.indexOf(b.project.priority)
      );
    case 'status':
      return STATUS_SORT_ORDER.indexOf(a.status) - STATUS_SORT_ORDER.indexOf(b.status);
  }
}

export function sortProjects(
  projects: readonly ProjectSummary[],
  sort: ProjectSort = DEFAULT_PROJECT_SORT,
): ProjectSummary[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...projects].sort(
    (a, b) =>
      sign * compareByKey(a, b, sort.key) || collator.compare(a.project.name, b.project.name),
  );
}

/** Clicking a column header: the same key toggles direction, a new key starts ascending. */
export function nextSort(current: ProjectSort, key: ProjectSortKey): ProjectSort {
  if (current.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: 'asc' };
}
