import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import indexHtml from '../../../index.html?raw';
import { TranslatorDb } from '@/data/local/db';
import { createLocalRepositories } from '@/data/local/localRepositories';
import i18n from '@/i18n';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import { DataProvider } from '../DataProvider';

describe('Loading screen', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('keeps the static copy in index.html in step with the locales', () => {
    for (const locale of [en, es]) {
      expect(indexHtml).toContain(locale.loadingScreen.workspace);
      expect(indexHtml).toContain(locale.loadingScreen.demo);
    }
    expect(indexHtml).toContain(`>${en.general.appName}</p>`);
  });

  it('shows the loading screen, then the app', async () => {
    const repositories = createLocalRepositories(new TranslatorDb('loading-screen-ok'));
    const open = () => repositories;
    render(
      <DataProvider openWorkspace={open} demo={null} minLoadingMs={0}>
        <p>App</p>
      </DataProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading your workspace…');
    expect(await screen.findByText('App')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('offers to try again when the workspace cannot be opened', async () => {
    const user = userEvent.setup();
    const repositories = createLocalRepositories(new TranslatorDb('loading-screen-error'));
    const ensureInitialized = vi
      .spyOn(repositories.workspace, 'ensureInitialized')
      .mockRejectedValueOnce(new Error('IndexedDB is not available'));
    const open = () => repositories;
    render(
      <DataProvider openWorkspace={open} demo={null} minLoadingMs={0}>
        <p>App</p>
      </DataProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your workspace could not be loaded.',
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('App')).toBeInTheDocument();
    expect(ensureInitialized).toHaveBeenCalledTimes(2);
  });
});
