import type { Section } from './types';

/** What the "Add section" / "Edit section" dialog collects (DECISIONS D27). */
export type SectionInput = Pick<Section, 'name' | 'description'>;

export type SectionError = 'nameRequired';

export type SectionValidation =
  { ok: true; input: SectionInput } | { ok: false; errors: SectionError[] };

/** The name is required; both fields are trimmed. */
export function validateSection(draft: SectionInput): SectionValidation {
  const name = draft.name.trim();
  if (name === '') return { ok: false, errors: ['nameRequired'] };
  return { ok: true, input: { name, description: draft.description.trim() } };
}

/** New sections go after the last one. */
export function nextOrder(siblings: readonly { order: number }[]): number {
  return siblings.reduce((max, s) => Math.max(max, s.order + 1), 0);
}
