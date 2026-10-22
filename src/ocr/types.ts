import type { LanguageCode, OcrBlock } from '@/domain/types';

/*
 * OCR behind its own interface so the engine can be swapped (CLAUDE.md,
 * DECISIONS D29). v1 uses Tesseract.js in the browser; the result is always
 * correctable by hand in the editor.
 */

export interface OcrResult {
  /** Detected text, one line per detected line; empty when nothing was found. */
  text: string;
  /** Positions of the detected lines, kept for later versions (v1 does not use them). */
  blocks: OcrBlock[];
  /** Mean confidence, 0–100. */
  confidence: number;
}

export interface OcrProvider {
  /** Reads the text of one image written in `language` (the project's source language). */
  recognize(image: Blob, language: LanguageCode): Promise<OcrResult>;
  /** Frees the engine (workers, memory). */
  dispose(): Promise<void>;
}

/** Thrown when the engine has no data for a language. */
export class UnsupportedOcrLanguageError extends Error {
  constructor(readonly language: LanguageCode) {
    super(`OCR does not support language ${language}`);
    this.name = 'UnsupportedOcrLanguageError';
  }
}
