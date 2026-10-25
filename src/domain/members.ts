import { normalizeForSearch } from './filters';
import type { Id, Member, MemberCategory, Project } from './types';
import type { WorkspaceSettings } from './workspace';

/*
 * Settings > Members rules (SPEC 5.6, DECISIONS D32). Members, roles and
 * permissions are simulated with the current-user selector (CLAUDE.md).
 */

/** Only active managers manage members (invite, change category, remove). */
export function canManageMembers(member: Pick<Member, 'category' | 'status'> | null | undefined) {
  return member?.category === 'manager' && member.status === 'active';
}

/** Search by name or email (ignoring case and accents), with an optional category. */
export function searchMembers<T extends Pick<Member, 'name' | 'email' | 'category'>>(
  members: readonly T[],
  query: string,
  category: MemberCategory | null,
): T[] {
  const needle = normalizeForSearch(query.trim());
  return members.filter(
    (m) =>
      (category === null || m.category === category) &&
      (needle === '' ||
        normalizeForSearch(m.name).includes(needle) ||
        normalizeForSearch(m.email).includes(needle)),
  );
}

export function memberCounts(members: readonly Pick<Member, 'status'>[]) {
  return {
    active: members.filter((m) => m.status === 'active').length,
    invited: members.filter((m) => m.status === 'invited').length,
  };
}

export type MemberChangeError = 'self' | 'lastManager';

const activeManagers = (members: readonly Member[]) =>
  members.filter((m) => m.category === 'manager' && m.status === 'active');

/** Removing: never yourself, and the workspace keeps at least one active manager. */
export function checkRemoval(
  members: readonly Member[],
  ids: readonly Id[],
  currentUserId: Id | null,
): MemberChangeError | null {
  if (currentUserId && ids.includes(currentUserId)) return 'self';
  if (activeManagers(members).every((m) => ids.includes(m.id))) return 'lastManager';
  return null;
}

/** Changing category: the workspace keeps at least one active manager. */
export function checkCategoryChange(
  members: readonly Member[],
  ids: readonly Id[],
  category: MemberCategory,
): MemberChangeError | null {
  if (category === 'manager') return null;
  return activeManagers(members).every((m) => ids.includes(m.id)) ? 'lastManager' : null;
}

export interface InviteRow {
  name: string;
  email: string;
  category: MemberCategory;
}

export type InviteError = 'nameRequired' | 'emailInvalid' | 'emailTaken' | 'emailRepeated';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteValidation =
  { ok: true; rows: InviteRow[] } | { ok: false; errors: (InviteError[] | null)[] };

/**
 * "Invite members to workspace" (DECISIONS D32): every row needs a name and a
 * valid email that is not in the workspace yet nor repeated in the dialog.
 * Rows left completely empty are ignored.
 */
export function validateInvites(
  rows: readonly InviteRow[],
  existing: readonly Pick<Member, 'email'>[],
): InviteValidation {
  const filled = rows.filter((r) => r.name.trim() !== '' || r.email.trim() !== '');
  const taken = new Set(existing.map((m) => m.email.trim().toLowerCase()));
  const seen = new Set<string>();
  const errors = rows.map((row) => {
    if (!filled.includes(row)) return null;
    const email = row.email.trim().toLowerCase();
    const rowErrors: InviteError[] = [];
    if (row.name.trim() === '') rowErrors.push('nameRequired');
    if (!EMAIL.test(email)) rowErrors.push('emailInvalid');
    else if (taken.has(email)) rowErrors.push('emailTaken');
    else if (seen.has(email)) rowErrors.push('emailRepeated');
    seen.add(email);
    return rowErrors.length > 0 ? rowErrors : null;
  });
  if (filled.length === 0) return { ok: false, errors: rows.map(() => ['nameRequired']) };
  if (errors.some(Boolean)) return { ok: false, errors };
  return {
    ok: true,
    rows: filled.map((r) => ({
      name: r.name.trim(),
      email: r.email.trim().toLowerCase(),
      category: r.category,
    })),
  };
}

/**
 * Whether someone can work on a project (SPEC 5.6, simulated): managers on every
 * project; workers on the projects where they are a team member.
 */
export function canWorkOnProject(
  user: Pick<Member, 'id' | 'category'> | null | undefined,
  project: Pick<Project, 'managerIds' | 'memberIds'>,
): boolean {
  if (!user || user.category === 'manager') return true;
  return project.memberIds.includes(user.id) || project.managerIds.includes(user.id);
}

/**
 * Visibility (D32, D41): the people who can work on a project see it. When the
 * workspace lets workers see every project, the others see it as view only.
 */
export function canSeeProject(
  user: Pick<Member, 'id' | 'category'> | null | undefined,
  project: Pick<Project, 'managerIds' | 'memberIds'>,
  settings: Pick<WorkspaceSettings, 'workersSeeOnlyTheirProjects'>,
): boolean {
  return !settings.workersSeeOnlyTheirProjects || canWorkOnProject(user, project);
}
