import { normalizeForSearch } from './filters';
import type { Project } from './types';

/*
 * Settings > Workspace projects (no design, spec approved by the author,
 * DECISIONS D37, D42): rename a project, change its ID and delete it.
 */

export const PROJECT_NAME_MAX = 80;
export const PROJECT_CODE_MAX = 24;

/** Letters, digits and single hyphens between them, as generated codes ("SPA-2026-2"). */
const CODE_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

export type ProjectNameError = 'required' | 'tooLong';
export type ProjectCodeError = 'required' | 'tooLong' | 'format' | 'taken';

export type ProjectIdentityResult =
  | { ok: true; name: string; code: string }
  | { ok: false; errors: { name?: ProjectNameError; code?: ProjectCodeError } };

/**
 * Checks a new name and ID. The ID is stored in capitals; it must not be used by
 * any other project, deleted ones included, so old links and exports stay unique.
 */
export function validateProjectIdentity(
  input: { name: string; code: string },
  otherCodes: readonly string[],
): ProjectIdentityResult {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const errors: { name?: ProjectNameError; code?: ProjectCodeError } = {};

  if (name === '') errors.name = 'required';
  else if (name.length > PROJECT_NAME_MAX) errors.name = 'tooLong';

  if (code === '') errors.code = 'required';
  else if (code.length > PROJECT_CODE_MAX) errors.code = 'tooLong';
  else if (!CODE_PATTERN.test(code)) errors.code = 'format';
  else if (otherCodes.some((other) => other.toUpperCase() === code)) errors.code = 'taken';

  return errors.name || errors.code ? { ok: false, errors } : { ok: true, name, code };
}

/** Deleted projects keep their data (like removed members, D21) but disappear everywhere. */
export function isProjectDeleted(project: Pick<Project, 'deletedAt'>): boolean {
  return Boolean(project.deletedAt);
}

/** Search by name or ID, ignoring case and accents. */
export function matchesProjectQuery(project: Pick<Project, 'name' | 'code'>, query: string) {
  const q = normalizeForSearch(query);
  return (
    q === '' ||
    normalizeForSearch(project.name).includes(q) ||
    normalizeForSearch(project.code).includes(q)
  );
}
