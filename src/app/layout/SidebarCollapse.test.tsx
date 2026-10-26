import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';
import { SIDEBAR_STORAGE_KEY } from './useSidebarCollapsed';

describe('Collapsible sidebar', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('collapses to icons, keeps the link names and remembers the choice', async () => {
    const user = userEvent.setup();
    renderApp('/projects');
    await user.click(await screen.findByRole('button', { name: 'Collapse sidebar' }));

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(screen.queryByRole('switch', { name: 'Dark mode' })).not.toBeInTheDocument();
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeInTheDocument();
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('false');
  });

  it('starts collapsed when it was left collapsed', async () => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
    renderApp('/projects');
    expect(await screen.findByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('toggles with Ctrl+B, but not while typing', async () => {
    const user = userEvent.setup();
    renderApp('/projects');
    await screen.findByRole('button', { name: 'Collapse sidebar' });

    await user.keyboard('{Control>}b{/Control}');
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();

    await user.click(screen.getByRole('searchbox'));
    await user.keyboard('{Control>}b{/Control}');
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('moves theme and language into the avatar menu when collapsed', async () => {
    const user = userEvent.setup();
    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
    renderApp('/projects');
    await user.click(await screen.findByRole('button', { name: 'Open user menu' }));
    const menu = await screen.findByRole('menu');

    await user.click(within(menu).getByRole('menuitemradio', { name: 'Español' }));
    expect(await screen.findByRole('heading', { name: 'Lista de proyectos' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir menú de usuario' }));
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitemradio', { name: 'Oscuro' }),
    );
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
