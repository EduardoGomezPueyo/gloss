import 'fake-indexeddb/auto';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { CurrentUserProvider } from '@/app/currentUser/CurrentUserProvider';
import { DataProvider } from '@/app/DataProvider';
import { routes } from '@/app/routes';
import { ThemeProvider } from '@/app/theme/ThemeProvider';
import { TranslatorDb } from '@/data/local/db';
import { createLocalRepositories } from '@/data/local/localRepositories';

let dbCounter = 0;

/** Renders the whole app at `path` with a fresh, seeded in-memory database. */
export function renderApp(path = '/') {
  const db = new TranslatorDb(`app-test-${++dbCounter}`);
  const repositories = createLocalRepositories(db);
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  const result = render(
    <ThemeProvider>
      <DataProvider repositories={repositories}>
        <CurrentUserProvider>
          <RouterProvider router={router} />
        </CurrentUserProvider>
      </DataProvider>
    </ThemeProvider>,
  );
  return { ...result, db, repositories, router };
}
