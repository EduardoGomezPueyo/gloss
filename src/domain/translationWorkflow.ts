import type { Id, Member, Translation } from './types';

/*
 * Translation statuses (SPEC 5.4, DECISIONS D30):
 *
 *   Not started → (typing) → In progress → Mark translated (ready)
 *     → Submit for review (whole section) → Under Review
 *     → a manager approves (Completed) or requests changes (In progress).
 *   Editing an Under Review or Completed text sends it back to In progress.
 *
 * Pure functions: they return the updated translation and never touch storage.
 */

function touched(by: Id | null, now: Date): Pick<Translation, 'updatedAt' | 'updatedBy'> {
  return { updatedAt: now.toISOString(), updatedBy: by };
}

/** Saving new text: any change makes the translation In progress, not ready and unreviewed. */
export function editTranslation(
  translation: Translation,
  text: string,
  by: Id | null,
  now: Date,
): Translation {
  if (translation.text === text) return translation;
  return {
    ...translation,
    ...touched(by, now),
    text,
    status: 'in-progress',
    ready: false,
    authorId: by ?? translation.authorId,
    reviewerId: null,
  };
}

export function canMarkTranslated(translation: Pick<Translation, 'status' | 'text'>): boolean {
  return translation.status === 'in-progress' && translation.text.trim() !== '';
}

/** "Mark translated", or undo it. Only in-progress translations with text can be marked. */
export function setReady(
  translation: Translation,
  ready: boolean,
  by: Id | null,
  now: Date,
): Translation {
  if (ready && !canMarkTranslated(translation)) return translation;
  if (translation.ready === ready) return translation;
  return { ...translation, ...touched(by, now), ready };
}

/** "Submit for review": the section's translations marked as translated go to Under Review. */
export function submitForReview(
  translations: readonly Translation[],
  by: Id | null,
  now: Date,
): Translation[] {
  return translations
    .filter((t) => t.ready && t.status === 'in-progress')
    .map((t) => ({ ...t, ...touched(by, now), status: 'under-review', ready: false }));
}

/** A manager approves an Under Review translation. */
export function approve(translation: Translation, by: Id, now: Date): Translation {
  if (translation.status !== 'under-review') return translation;
  return { ...translation, ...touched(by, now), status: 'completed', reviewerId: by };
}

/** A manager sends an Under Review translation back to its translator. */
export function requestChanges(translation: Translation, by: Id, now: Date): Translation {
  if (translation.status !== 'under-review') return translation;
  return { ...translation, ...touched(by, now), status: 'in-progress', ready: false };
}

/** Only managers review (approve or request changes). */
export function canReview(member: Pick<Member, 'category'> | null | undefined): boolean {
  return member?.category === 'manager';
}

/** Counted in the language cards' "x/N translated": marked, under review or completed. */
export function isTranslated(
  translation: Pick<Translation, 'status' | 'ready'> | undefined,
): boolean {
  if (!translation) return false;
  return (
    translation.ready || translation.status === 'under-review' || translation.status === 'completed'
  );
}
