import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { createFixtureData } from '@/test/fixtures/workspaceFixture';
import { renderApp } from '@/test/renderApp';

const DEMO = { url: 'https://demo.test/workspace.json', imagesUrl: 'https://images.test/ff7' };

describe('Demo controls', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts empty, with the workspace owner and no demo when none is configured', async () => {
    const user = userEvent.setup();
    renderApp('/projects', { empty: true });
    await screen.findByRole('heading', { name: 'List of projects' });
    expect(screen.queryByRole('button', { name: 'Load demo' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open user menu' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(1);
    expect(within(menu).getByText('Alex Morgan')).toBeInTheDocument();
  });

  it('loads the demo into its own workspace and goes back to the user data', async () => {
    const snapshot = {
      format: 'translator-tool-workspace',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: createFixtureData(),
      files: [],
    };
    const fetch = vi.fn(async () => Response.json(snapshot));
    vi.stubGlobal('fetch', fetch);
    const user = userEvent.setup();
    renderApp('/projects', { empty: true, demo: DEMO });

    expect(await screen.findByRole('link', { name: /Try with real images/ })).toHaveAttribute(
      'href',
      DEMO.imagesUrl,
    );
    await user.click(screen.getByRole('button', { name: 'Load demo' }));

    expect(await screen.findByText('Sample Project Alpha')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(DEMO.url);
    expect(screen.getByText('Demo')).toBeInTheDocument();
    expect(localStorage.getItem('translator.workspace')).toBe('demo');

    await user.click(screen.getByRole('button', { name: 'Exit demo' }));
    expect(await screen.findByRole('button', { name: 'Load demo' })).toBeInTheDocument();
    expect(screen.queryByText('Sample Project Alpha')).not.toBeInTheDocument();
  });

  it('shows an error when the demo cannot be downloaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    renderApp('/projects', { empty: true, demo: DEMO });

    await user.click(await screen.findByRole('button', { name: 'Load demo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the demo');
    expect(screen.getByRole('button', { name: 'Load demo' })).toBeEnabled();
  });
});
