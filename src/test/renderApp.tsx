import 'fake-indexeddb/auto';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { CurrentUserProvider } from '@/app/currentUser/CurrentUserProvider';
import { DataProvider } from '@/app/DataProvider';
import { OcrQueueProvider } from '@/app/ocr/OcrQueueProvider';
import { routes } from '@/app/routes';
import { ThemeProvider } from '@/app/theme/ThemeProvider';
import { TranslatorDb } from '@/data/local/db';
import { createLocalRepositories } from '@/data/local/localRepositories';
import type { OcrProvider } from '@/ocr/types';

let dbCounter = 0;

/** Reads a test image's bytes back as its text, so tests choose what OCR "detects". */
export const fakeOcrProvider: OcrProvider = {
  async recognize(image) {
    return { text: await image.text(), blocks: [], confidence: 90 };
  },
  async dispose() {},
};

/** Renders the whole app at `path` with a fresh, seeded in-memory database. */
export function renderApp(path = '/', { ocr = fakeOcrProvider }: { ocr?: OcrProvider } = {}) {
  const db = new TranslatorDb(`app-test-${++dbCounter}`);
  const repositories = createLocalRepositories(db);
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  const result = render(
    <ThemeProvider>
      <DataProvider repositories={repositories}>
        <OcrQueueProvider provider={ocr}>
          <CurrentUserProvider>
            <RouterProvider router={router} />
          </CurrentUserProvider>
        </OcrQueueProvider>
      </DataProvider>
    </ThemeProvider>,
  );
  return { ...result, db, repositories, router };
}
