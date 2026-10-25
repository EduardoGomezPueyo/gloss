import {
  isProjectDeleted,
  matchesProjectQuery,
  validateProjectIdentity,
} from './workspaceProjects';

describe('validateProjectIdentity', () => {
  const others = ['SPA-2026', 'SPB-2026'];

  it('trims the name and stores the ID in capitals', () => {
    expect(validateProjectIdentity({ name: '  Ember Gate ', code: ' eg-2026 ' }, others)).toEqual({
      ok: true,
      name: 'Ember Gate',
      code: 'EG-2026',
    });
  });

  it('requires both, and limits their length', () => {
    expect(validateProjectIdentity({ name: ' ', code: '' }, others)).toEqual({
      ok: false,
      errors: { name: 'required', code: 'required' },
    });
    expect(validateProjectIdentity({ name: 'x'.repeat(81), code: 'A'.repeat(25) }, others)).toEqual(
      { ok: false, errors: { name: 'tooLong', code: 'tooLong' } },
    );
  });

  it('accepts letters, digits and single hyphens only', () => {
    for (const code of ['EG 2026', 'EG--2026', '-EG', 'EG_1', 'ÉG-1']) {
      expect(validateProjectIdentity({ name: 'Ember', code }, others)).toMatchObject({
        errors: { code: 'format' },
      });
    }
  });

  it('refuses an ID another project uses, ignoring case', () => {
    expect(validateProjectIdentity({ name: 'Ember', code: 'spb-2026' }, others)).toEqual({
      ok: false,
      errors: { code: 'taken' },
    });
  });
});

describe('project search and deletion', () => {
  it('finds projects by name or ID, ignoring accents', () => {
    const project = { name: 'Canción del Mar', code: 'CDM-2026' };
    expect(matchesProjectQuery(project, 'cancion')).toBe(true);
    expect(matchesProjectQuery(project, 'cdm')).toBe(true);
    expect(matchesProjectQuery(project, 'beta')).toBe(false);
    expect(matchesProjectQuery(project, ' ')).toBe(true);
  });

  it('treats a missing deletion date as not deleted', () => {
    expect(isProjectDeleted({})).toBe(false);
    expect(isProjectDeleted({ deletedAt: null })).toBe(false);
    expect(isProjectDeleted({ deletedAt: '2026-10-25T10:00:00.000Z' })).toBe(true);
  });
});
