import { languageName, withoutSource } from './languages';
import { EMPTY_PROJECT_DRAFT, validateNewProject, type NewProjectDraft } from './newProject';

const draft = (patch: Partial<NewProjectDraft>): NewProjectDraft => ({
  ...EMPTY_PROJECT_DRAFT,
  ...patch,
});

describe('validateNewProject', () => {
  it('requires a name, the original language and a manager', () => {
    expect(validateNewProject(draft({ name: '   ' }))).toEqual({
      ok: false,
      errors: ['nameRequired', 'sourceLanguageRequired', 'managerRequired'],
    });
  });

  it('returns a clean input: trimmed name, no duplicates, no source among targets', () => {
    const result = validateNewProject(
      draft({
        name: '  Moonfall ',
        sourceLanguage: 'ja',
        targetLanguages: ['es', 'ja', 'es'],
        platforms: ['pc', 'pc'],
        managerIds: ['m1', 'm1'],
        memberIds: ['w1', 'm1'],
        priority: 'high',
      }),
    );
    expect(result).toEqual({
      ok: true,
      input: {
        name: 'Moonfall',
        sourceLanguage: 'ja',
        targetLanguages: ['es'],
        platforms: ['pc'],
        managerIds: ['m1'],
        memberIds: ['w1'],
        priority: 'high',
      },
    });
  });

  it('accepts a project without platforms, members or target languages', () => {
    const result = validateNewProject(
      draft({ name: 'Moonfall', sourceLanguage: 'en', managerIds: ['m1'] }),
    );
    expect(result.ok).toBe(true);
  });
});

describe('languages', () => {
  it('names languages in the interface language', () => {
    expect(languageName('ja', 'en')).toBe('Japanese');
    expect(languageName('ja', 'es')).toBe('Japonés');
  });

  it('drops the source language from the targets', () => {
    expect(withoutSource(['en', 'es', 'fr'], 'en')).toEqual(['es', 'fr']);
    expect(withoutSource(['en'], null)).toEqual(['en']);
  });
});
