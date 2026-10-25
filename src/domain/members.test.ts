import {
  canManageMembers,
  canSeeProject,
  canWorkOnProject,
  checkCategoryChange,
  checkRemoval,
  memberCounts,
  searchMembers,
  validateInvites,
} from './members';
import type { Member } from './types';

function member(id: string, overrides: Partial<Member> = {}): Member {
  const at = '2026-01-01T00:00:00.000Z';
  return {
    id,
    createdAt: at,
    updatedAt: at,
    createdBy: null,
    updatedBy: null,
    name: `Person ${id}`,
    email: `${id}@example.com`,
    category: 'worker',
    status: 'active',
    removedAt: null,
    ...overrides,
  };
}

const ana = member('ana', { name: 'Ana Torres', category: 'manager' });
const ben = member('ben', { name: 'Ben Carter', category: 'manager' });
const chloe = member('chloe', { name: 'Chloé Martin' });
const hana = member('hana', { name: 'Hana Ito', status: 'invited' });
const team = [ana, ben, chloe, hana];

describe('members', () => {
  it('lets only active managers manage members', () => {
    expect(canManageMembers(ana)).toBe(true);
    expect(canManageMembers(chloe)).toBe(false);
    expect(canManageMembers({ category: 'manager', status: 'invited' })).toBe(false);
  });

  it('searches name or email, ignoring accents, with a category filter', () => {
    expect(searchMembers(team, 'chloe', null)).toEqual([chloe]);
    expect(searchMembers(team, 'BEN@', null)).toEqual([ben]);
    expect(searchMembers(team, '', 'manager')).toEqual([ana, ben]);
    expect(memberCounts(team)).toEqual({ active: 3, invited: 1 });
  });

  it('never removes yourself or the last active manager', () => {
    expect(checkRemoval(team, ['ana'], 'ana')).toBe('self');
    expect(checkRemoval(team, ['ana', 'ben'], 'chloe')).toBe('lastManager');
    expect(checkRemoval(team, ['ben', 'hana'], 'ana')).toBeNull();
  });

  it('keeps at least one manager when changing categories', () => {
    expect(checkCategoryChange(team, ['ana'], 'worker')).toBeNull();
    expect(checkCategoryChange(team, ['ana', 'ben'], 'worker')).toBe('lastManager');
    expect(checkCategoryChange(team, ['chloe'], 'manager')).toBeNull();
  });
});

describe('validateInvites', () => {
  const row = (name: string, email: string) => ({ name, email, category: 'worker' as const });

  it('checks names and emails, and ignores empty rows', () => {
    const result = validateInvites(
      [
        row('Iris', 'iris@example.com'),
        row('', 'bad-email'),
        row('Ana again', 'ANA@example.com'),
        row('Iris twin', 'iris@example.com'),
        row('', ''),
      ],
      team,
    );
    expect(result).toEqual({
      ok: false,
      errors: [null, ['nameRequired', 'emailInvalid'], ['emailTaken'], ['emailRepeated'], null],
    });
  });

  it('returns the cleaned rows', () => {
    expect(validateInvites([row(' Iris ', ' Iris@Example.com '), row('', '')], team)).toEqual({
      ok: true,
      rows: [{ name: 'Iris', email: 'iris@example.com', category: 'worker' }],
    });
    expect(validateInvites([row('', '')], team).ok).toBe(false);
  });
});

describe('canSeeProject and canWorkOnProject', () => {
  const project = { managerIds: ['ana'], memberIds: ['chloe'] };
  const onlyTheirs = { workersSeeOnlyTheirProjects: true };
  const everything = { workersSeeOnlyTheirProjects: false };

  it('shows managers everything and workers only their projects by default', () => {
    expect(canSeeProject(ben, project, onlyTheirs)).toBe(true);
    expect(canSeeProject(chloe, project, onlyTheirs)).toBe(true);
    expect(canSeeProject(member('dan'), project, onlyTheirs)).toBe(false);
    expect(canSeeProject(null, project, onlyTheirs)).toBe(true);
  });

  it('shows workers every project when the workspace allows it, but only theirs to work on', () => {
    expect(canSeeProject(member('dan'), project, everything)).toBe(true);
    expect(canWorkOnProject(member('dan'), project)).toBe(false);
    expect(canWorkOnProject(chloe, project)).toBe(true);
    expect(canWorkOnProject(ben, project)).toBe(true);
  });
});
