import { withoutSource } from './languages';
import type { Project } from './types';

/** What the "Add new project" modal collects (SPEC 5.1, DECISIONS D8). */
export type NewProjectInput = Pick<
  Project,
  | 'name'
  | 'sourceLanguage'
  | 'targetLanguages'
  | 'platforms'
  | 'managerIds'
  | 'memberIds'
  | 'priority'
>;

export type NewProjectError = 'nameRequired' | 'sourceLanguageRequired' | 'managerRequired';

export interface NewProjectDraft extends Omit<NewProjectInput, 'sourceLanguage'> {
  sourceLanguage: string | null;
}

export const EMPTY_PROJECT_DRAFT: NewProjectDraft = {
  name: '',
  sourceLanguage: null,
  targetLanguages: [],
  platforms: [],
  managerIds: [],
  memberIds: [],
  priority: 'none',
};

export type NewProjectValidation =
  { ok: true; input: NewProjectInput } | { ok: false; errors: NewProjectError[] };

/** Name, source language and at least one manager are required; the rest is optional. */
export function validateNewProject(draft: NewProjectDraft): NewProjectValidation {
  const name = draft.name.trim();
  const errors: NewProjectError[] = [];
  if (name === '') errors.push('nameRequired');
  if (!draft.sourceLanguage) errors.push('sourceLanguageRequired');
  if (draft.managerIds.length === 0) errors.push('managerRequired');
  if (errors.length > 0 || !draft.sourceLanguage) return { ok: false, errors };

  const managerIds = [...new Set(draft.managerIds)];
  return {
    ok: true,
    input: {
      ...draft,
      name,
      sourceLanguage: draft.sourceLanguage,
      targetLanguages: withoutSource([...new Set(draft.targetLanguages)], draft.sourceLanguage),
      platforms: [...new Set(draft.platforms)],
      managerIds,
      // A manager listed as a team member too would be counted twice.
      memberIds: [...new Set(draft.memberIds)].filter((id) => !managerIds.includes(id)),
    },
  };
}
