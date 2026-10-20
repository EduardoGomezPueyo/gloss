import type { ProjectSummary } from './progress';
import type { Id, Platform, Priority, Status } from './types';

/*
 * Project list search and filters (SPEC 5.1):
 * - categories combine with AND (a project must match every active category);
 * - values inside one category combine with OR ([Proposal] confirmed in phase 2);
 * - the search matches the project name or code, ignoring case and accents.
 */

export interface ProjectFilters {
  platforms: Platform[];
  managers: Id[];
  workers: Id[];
  priorities: Priority[];
  statuses: Status[];
}

export type FilterCategory = keyof ProjectFilters;

export const FILTER_CATEGORIES: readonly FilterCategory[] = [
  'platforms',
  'managers',
  'workers',
  'priorities',
  'statuses',
];

export const EMPTY_FILTERS: ProjectFilters = {
  platforms: [],
  managers: [],
  workers: [],
  priorities: [],
  statuses: [],
};

export function hasActiveFilters(filters: ProjectFilters): boolean {
  return FILTER_CATEGORIES.some((category) => filters[category].length > 0);
}

/** Adds the value to the category if missing, removes it otherwise. */
export function toggleFilterValue<C extends FilterCategory>(
  filters: ProjectFilters,
  category: C,
  value: ProjectFilters[C][number],
): ProjectFilters {
  const values = filters[category] as readonly string[];
  const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  return { ...filters, [category]: next };
}

export function clearFilterCategory(
  filters: ProjectFilters,
  category: FilterCategory,
): ProjectFilters {
  return { ...filters, [category]: [] };
}

/** Lowercase without diacritics, so "Chloé" matches "chloe". */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function matchesAny<T>(selected: readonly T[], test: (value: T) => boolean): boolean {
  return selected.length === 0 || selected.some(test);
}

export function matchesFilters(summary: ProjectSummary, filters: ProjectFilters): boolean {
  const { project } = summary;
  return (
    matchesAny(filters.platforms, (p) => project.platforms.includes(p)) &&
    matchesAny(filters.managers, (id) => project.managerIds.includes(id)) &&
    matchesAny(filters.workers, (id) => project.memberIds.includes(id)) &&
    matchesAny(filters.priorities, (p) => project.priority === p) &&
    matchesAny(filters.statuses, (s) => summary.status === s)
  );
}

export function matchesSearch(summary: ProjectSummary, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (needle === '') return true;
  const { name, code } = summary.project;
  return normalizeForSearch(name).includes(needle) || normalizeForSearch(code).includes(needle);
}

export function filterProjects(
  summaries: readonly ProjectSummary[],
  filters: ProjectFilters,
  query: string,
): ProjectSummary[] {
  return summaries.filter((s) => matchesFilters(s, filters) && matchesSearch(s, query));
}
