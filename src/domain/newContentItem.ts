import type { ContentItem } from './types';

/*
 * "Add content to section" (SPEC 5.3, DECISIONS D29): one content item made of
 * the chosen images, in the chosen order.
 */

export type NewContentItemInput = Pick<ContentItem, 'name' | 'type'>;

/** One chosen image file. */
export interface NewImageFile {
  name: string;
  data: Blob;
}

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export type ImageFileError = 'unsupportedType' | 'tooLarge';

export function checkImageFile(file: { type: string; size: number }): ImageFileError | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'unsupportedType';
  if (file.size > MAX_IMAGE_BYTES) return 'tooLarge';
  return null;
}

export type NewContentItemError = 'nameRequired' | 'imagesRequired';

export type NewContentItemValidation =
  { ok: true; input: NewContentItemInput } | { ok: false; errors: NewContentItemError[] };

/** A name and at least one image are required; the type is optional free text. */
export function validateNewContentItem(
  draft: NewContentItemInput,
  imageCount: number,
): NewContentItemValidation {
  const errors: NewContentItemError[] = [];
  const name = draft.name.trim();
  if (name === '') errors.push('nameRequired');
  if (imageCount === 0) errors.push('imagesRequired');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, input: { name, type: draft.type.trim() } };
}

/** Types already used in the project, for suggestions; defaults when there are none. */
export function suggestedItemTypes(existing: readonly string[]): string[] {
  const used = [...new Set(existing.map((t) => t.trim()).filter(Boolean))];
  return used.length > 0
    ? used.sort((a, b) => a.localeCompare(b))
    : ['Character dialogue', 'Mission dialogue'];
}
