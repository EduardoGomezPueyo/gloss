import type { LanguageCode } from '@/domain/types';
import map from './tesseractLanguages.json';

/**
 * Tesseract model for a catalog language (shared with scripts/setup-ocr.mjs, which
 * downloads them). Regional variants use the base language's model.
 */
export function tesseractLanguage(code: LanguageCode): string | undefined {
  return (map as Record<string, string>)[code];
}
