import type { ImageRepository } from '@/data/repositories/types';
import type { OcrOutcome } from '@/domain/images';
import { UnsupportedOcrLanguageError, type OcrProvider } from './types';

/** Why OCR failed, stored on the image and shown with the retry action. */
export type OcrFailure = 'missingFile' | 'unsupportedLanguage' | 'engineError';

/**
 * Reads every image waiting for OCR, one at a time, and stores each outcome as it
 * arrives. Images added while it runs are picked up too. `onSaved` lets the UI
 * refresh after each image.
 */
export async function processOcrQueue(
  images: ImageRepository,
  provider: OcrProvider,
  onSaved: () => void,
): Promise<void> {
  for (;;) {
    const [next] = await images.listPendingOcr();
    if (!next) return;
    let outcome: OcrOutcome;
    try {
      const file = next.image.fileId ? await images.getFile(next.image.fileId) : undefined;
      if (!file) {
        outcome = { status: 'failed', error: 'missingFile' satisfies OcrFailure };
      } else {
        const result = await provider.recognize(file, next.language);
        outcome =
          result.text.trim() === ''
            ? { status: 'empty' }
            : { status: 'done', text: result.text, blocks: result.blocks };
      }
    } catch (error) {
      console.error('OCR failed', error);
      const reason: OcrFailure =
        error instanceof UnsupportedOcrLanguageError ? 'unsupportedLanguage' : 'engineError';
      outcome = { status: 'failed', error: reason };
    }
    await images.saveOcrOutcome(next.image.id, outcome);
    onSaved();
  }
}
