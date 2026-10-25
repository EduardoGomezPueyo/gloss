import type { OcrBlock, SceneImage, SourceText } from './types';

/** Images have no title: "Station rendezvous - 1", "Station rendezvous - 2"… (DECISIONS D29). */
export function imageLabel(itemName: string, position: number): string {
  return `${itemName} - ${position}`;
}

export interface OcrProgress {
  /** Images still waiting for OCR (queued or running). */
  pending: number;
  /** Images where OCR found no text. */
  empty: number;
  /** Images where OCR failed; they can be retried. */
  failed: number;
}

export function ocrProgress(images: readonly Pick<SceneImage, 'ocrStatus'>[]): OcrProgress {
  const count = (status: SceneImage['ocrStatus']) =>
    images.filter((image) => image.ocrStatus === status).length;
  return { pending: count('pending'), empty: count('empty'), failed: count('failed') };
}

/** What OCR produced for one image. */
export type OcrOutcome =
  | { status: 'done'; text: string; blocks: OcrBlock[] }
  | { status: 'empty' }
  | { status: 'failed'; error: string };

/**
 * Stores an OCR outcome on the image. Found text becomes the source text and is
 * kept as `ocrText`, so the editor can mark later changes as "edited".
 */
export function applyOcrOutcome(image: SceneImage, outcome: OcrOutcome): SceneImage {
  switch (outcome.status) {
    case 'done':
      return {
        ...image,
        source: {
          ...image.source,
          text: outcome.text,
          ocrText: outcome.text,
          ocrBlocks: outcome.blocks,
        },
        ocrStatus: outcome.text.trim() === '' ? 'empty' : 'done',
        ocrError: null,
      };
    case 'empty':
      return {
        ...image,
        source: { ...image.source, text: '', ocrText: '', ocrBlocks: [] },
        ocrStatus: 'empty',
        ocrError: null,
      };
    case 'failed':
      return { ...image, ocrStatus: 'failed', ocrError: outcome.error };
  }
}

/** Fields of the source text block that can be corrected by hand (SPEC open 2, DECISIONS D30). */
export type SourceTextPatch = Pick<SourceText, 'text' | 'speaker' | 'type'>;

/** Applies a manual correction; empty optional fields become null. OCR's own text is kept. */
export function applySourceEdit(image: SceneImage, patch: SourceTextPatch): SceneImage {
  const optional = (value: string | null) => (value?.trim() ? value.trim() : null);
  return {
    ...image,
    source: {
      ...image.source,
      text: patch.text,
      speaker: optional(patch.speaker),
      type: optional(patch.type),
    },
  };
}

/** "edited" label: the text differs from what OCR read. Typed-by-hand text is never "edited". */
export function isSourceEdited(source: Pick<SourceText, 'text' | 'ocrText'>): boolean {
  return source.ocrText !== null && source.text !== source.ocrText;
}
