import type { Worker } from 'tesseract.js';
import type { LanguageCode, OcrBlock } from '@/domain/types';
import { tesseractLanguage } from '../languages';
import { pickBetterResult, softenPixels, UPSCALE_BELOW_WIDTH } from '../preprocess';
import { UnsupportedOcrLanguageError, type OcrProvider, type OcrResult } from '../types';

/**
 * Tesseract.js in a Web Worker, with the engine and the "fast" language models
 * served by the app itself from /ocr (prepared by scripts/setup-ocr.mjs,
 * DECISIONS D29). The library is loaded only when OCR first runs, and the
 * browser caches each language after its first use, so OCR then works offline.
 */
export class TesseractOcrProvider implements OcrProvider {
  private worker: Promise<Worker> | null = null;
  private workerLanguage: string | null = null;

  constructor(
    private readonly baseUrl = new URL(`${import.meta.env.BASE_URL}ocr/`, location.href),
  ) {}

  async recognize(image: Blob, language: LanguageCode): Promise<OcrResult> {
    const model = tesseractLanguage(language);
    if (!model) throw new UnsupportedOcrLanguageError(language);
    const worker = await this.workerFor(model);

    const bitmap = await createImageBitmap(image);
    try {
      // Two passes, the original and a softened copy; keep the better (see preprocess.ts).
      const original = await read(worker, drawToCanvas(bitmap, 1));
      const softCanvas = drawToCanvas(bitmap, bitmap.width < UPSCALE_BELOW_WIDTH ? 2 : 1);
      const context = softCanvas.getContext('2d')!;
      const pixels = context.getImageData(0, 0, softCanvas.width, softCanvas.height);
      softenPixels(pixels.data);
      context.putImageData(pixels, 0, 0);
      const soft = await read(worker, softCanvas, softCanvas.width / bitmap.width);
      return pickBetterResult(original, soft);
    } finally {
      bitmap.close();
    }
  }

  async dispose(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    this.workerLanguage = null;
    if (worker) await (await worker).terminate();
  }

  /** One worker, switched to the requested language when needed. */
  private async workerFor(model: string): Promise<Worker> {
    if (this.worker && this.workerLanguage === model) return this.worker;
    if (this.worker) {
      const worker = await this.worker;
      await worker.reinitialize(model);
      this.workerLanguage = model;
      return worker;
    }
    this.workerLanguage = model;
    this.worker = (async () => {
      const { createWorker, OEM, PSM } = await import('tesseract.js');
      const worker = await createWorker(model, OEM.LSTM_ONLY, {
        workerPath: new URL('engine/worker.min.js', this.baseUrl).href,
        corePath: new URL('engine/', this.baseUrl).href,
        langPath: new URL('lang', this.baseUrl).href,
        workerBlobURL: false,
      });
      // Fully automatic page segmentation worked best in the benchmark.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      return worker;
    })();
    try {
      return await this.worker;
    } catch (error) {
      // Let the next call try again (e.g. the language data was missing).
      this.worker = null;
      this.workerLanguage = null;
      throw error;
    }
  }
}

function drawToCanvas(bitmap: ImageBitmap, scale: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Runs one pass; box positions are mapped back to the original image's pixels. */
async function read(worker: Worker, canvas: HTMLCanvasElement, scale = 1): Promise<OcrResult> {
  const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
  const blocks: OcrBlock[] = (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map(({ text, confidence, bbox }) => ({
        text: text.trim(),
        confidence,
        bbox: {
          x: Math.round(bbox.x0 / scale),
          y: Math.round(bbox.y0 / scale),
          width: Math.round((bbox.x1 - bbox.x0) / scale),
          height: Math.round((bbox.y1 - bbox.y0) / scale),
        },
      })),
    ),
  );
  return { text: data.text.trim(), blocks, confidence: data.confidence };
}
