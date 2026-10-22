import { createContext } from 'react';

export interface OcrQueue {
  /** Starts reading the images waiting for OCR (no-op if it is already running). */
  run(): void;
}

export const OcrQueueContext = createContext<OcrQueue | null>(null);
