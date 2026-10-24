import type { Member, Project } from './types';

/*
 * Editing a project's details from its Overview (DECISIONS D38): platforms,
 * managers, members, release date and priority. The name, code and original
 * language are not editable here.
 */

export type ProjectDetailsPatch = Partial<
  Pick<Project, 'platforms' | 'managerIds' | 'memberIds' | 'priority' | 'releaseDate'>
>;

/** Only active managers edit project details (D32: managers manage projects). */
export function canEditProject(member: Pick<Member, 'category' | 'status'> | null | undefined) {
  return member?.category === 'manager' && member.status === 'active';
}

export type ProjectDetailsError = 'managerRequired' | 'managerAndMember';

/** A project keeps at least one manager, and nobody is both manager and member (D23). */
export function checkProjectDetails(
  project: Pick<Project, 'managerIds' | 'memberIds'>,
  patch: ProjectDetailsPatch,
): ProjectDetailsError | null {
  const managerIds = patch.managerIds ?? project.managerIds;
  const memberIds = patch.memberIds ?? project.memberIds;
  if (managerIds.length === 0) return 'managerRequired';
  if (managerIds.some((id) => memberIds.includes(id))) return 'managerAndMember';
  return null;
}

export type Quarter = 1 | 2 | 3 | 4;
export const QUARTERS: readonly Quarter[] = [1, 2, 3, 4];

export interface ReleaseQuarter {
  quarter: Quarter;
  year: number;
}

/** Release dates are stored as "Q3 2026"; anything else is not a quarter. */
export function parseReleaseDate(value: string | null): ReleaseQuarter | null {
  const match = value?.trim().match(/^Q([1-4])\s+(\d{4})$/i);
  if (!match) return null;
  return { quarter: Number(match[1]) as Quarter, year: Number(match[2]) };
}

export function formatReleaseDate({ quarter, year }: ReleaseQuarter): string {
  return `Q${quarter} ${year}`;
}

/** Years offered by the picker: last year to ten years ahead, plus the stored one. */
export function releaseYears(currentYear: number, stored?: number): number[] {
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 1 + i);
  if (stored !== undefined && !years.includes(stored)) years.push(stored);
  return years.sort((a, b) => a - b);
}
