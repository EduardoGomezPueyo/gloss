import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { queryKeys } from '@/data/queryKeys';
import { useRepositories } from '@/data/RepositoryContext';
import { processOcrQueue } from '@/ocr/processOcrQueue';
import { TesseractOcrProvider } from '@/ocr/tesseract/TesseractOcrProvider';
import type { OcrProvider } from '@/ocr/types';
import { OcrQueueContext } from './OcrQueueContext';

/**
 * Runs OCR in the background for images waiting for it (DECISIONS D29): on start
 * (to resume after a reload) and whenever content is added or retried.
 */
export function OcrQueueProvider({
  children,
  provider,
}: {
  children: ReactNode;
  /** Injected in tests; the app uses Tesseract. */
  provider?: OcrProvider;
}) {
  const { images } = useRepositories();
  const queryClient = useQueryClient();
  const [ocr] = useState(() => provider ?? new TesseractOcrProvider());
  const running = useRef(false);
  const requested = useRef(false);

  const run = useCallback(() => {
    requested.current = true;
    if (running.current) return;
    running.current = true;
    void (async () => {
      try {
        while (requested.current) {
          requested.current = false;
          await processOcrQueue(images, ocr, () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
          });
        }
      } catch (error) {
        console.error('OCR queue stopped', error);
      } finally {
        running.current = false;
      }
    })();
  }, [images, ocr, queryClient]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => () => void ocr.dispose(), [ocr]);

  const value = useMemo(() => ({ run }), [run]);
  return <OcrQueueContext value={value}>{children}</OcrQueueContext>;
}
