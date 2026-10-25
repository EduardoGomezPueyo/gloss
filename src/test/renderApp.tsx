import 'fake-indexeddb/auto';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { CurrentUserProvider } from '@/app/currentUser/CurrentUserProvider';
import { DataProvider } from '@/app/DataProvider';
import { OcrQueueProvider } from '@/app/ocr/OcrQueueProvider';
import { routes } from '@/app/routes';
import type { DemoConfig } from '@/app/workspace/demoConfig';
import type { WorkspaceKind } from '@/app/workspace/WorkspaceContext';
import { ThemeProvider } from '@/app/theme/ThemeProvider';
import { TranslatorDb } from '@/data/local/db';
import { createLocalRepositories } from '@/data/local/localRepositories';
import type { Repositories } from '@/data/repositories/types';
import type { OcrProvider } from '@/ocr/types';
import { createFixtureData } from './fixtures/workspaceFixture';

let dbCounter = 0;

/** Reads a test image's bytes back as its text, so tests choose what OCR "detects". */
export const fakeOcrProvider: OcrProvider = {
  async recognize(image) {
    return { text: await image.text(), blocks: [], confidence: 90 };
  },
  async dispose() {},
};

/** Opens the workspace with the fixture data already loaded, as if it were the demo. */
function withFixture(repositories: Repositories): Repositories {
  let loaded: Promise<void> | undefined;
  const { workspace } = repositories;
  return {
    ...repositories,
    workspace: {
      ensureInitialized: () => (loaded ??= workspace.replace(createFixtureData(), [])),
      replace: (data, files, settings) => workspace.replace(data, files, settings),
      reset: () => workspace.reset(),
      exportAll: () => workspace.exportAll(),
      getSettings: () => workspace.getSettings(),
      updateSettings: (patch) => workspace.updateSettings(patch),
    },
  };
}

/**
 * Renders the whole app at `path` with a fresh in-memory database holding the
 * fixture workspace, or a brand-new empty workspace with `empty`. With `demo`, the
 * demo workspace gets a database of its own, as in the app.
 */
export function renderApp(
  path = '/',
  {
    ocr = fakeOcrProvider,
    empty = false,
    demo = null,
  }: { ocr?: OcrProvider; empty?: boolean; demo?: DemoConfig | null } = {},
) {
  const db = new TranslatorDb(`app-test-${++dbCounter}`);
  const local = createLocalRepositories(db);
  const repositories = empty ? local : withFixture(local);
  const demoRepositories = createLocalRepositories(new TranslatorDb(`app-test-${++dbCounter}`));
  const openWorkspace = (kind: WorkspaceKind) =>
    kind === 'demo' ? demoRepositories : repositories;
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  const result = render(
    <ThemeProvider>
      <DataProvider openWorkspace={openWorkspace} demo={demo}>
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
