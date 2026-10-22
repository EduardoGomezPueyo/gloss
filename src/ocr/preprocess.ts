import type { OcrResult } from './types';

/*
 * Image preparation measured in the phase 4 benchmark (DECISIONS D29): game text
 * is usually light on a dark box, which Tesseract reads poorly, while a hard
 * black-and-white threshold destroys low-contrast boxes. So OCR runs twice, on the
 * original and on a soft version (grayscale, inverted when mostly dark, upscaled
 * when small), and keeps the better result.
 */

/** Images narrower than this are upscaled ×2 for the soft pass. */
export const UPSCALE_BELOW_WIDTH = 1000;

/**
 * Turns RGBA pixels into grayscale in place, inverted when the image is mostly
 * dark (so text becomes dark on light). Returns whether it inverted.
 */
export function softenPixels(rgba: Uint8ClampedArray): boolean {
  const pixels = rgba.length / 4;
  if (pixels === 0) return false;
  let total = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const gray = 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!;
    rgba[i] = gray;
    total += gray;
  }
  const invert = total / pixels < 128;
  for (let i = 0; i < rgba.length; i += 4) {
    const gray = invert ? 255 - rgba[i]! : rgba[i]!;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = gray;
  }
  return invert;
}

/**
 * Prefers the result with more confidently read text. Confidence alone is not
 * enough: Tesseract reports high confidence for an empty result.
 */
export function pickBetterResult(a: OcrResult, b: OcrResult): OcrResult {
  const score = (r: OcrResult) => r.confidence * r.text.replace(/\s+/g, '').length;
  return score(b) > score(a) ? b : a;
}
