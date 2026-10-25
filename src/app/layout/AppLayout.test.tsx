import { screen, waitFor, within } from '@testing-library/react';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

describe('App shell', () => {
  beforeEach(() => i18n.changeLanguage('en'));

  it('redirects the root to the project list', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'List of projects' })).toBeInTheDocument();
  });

  it('links every page of the main navigation', async () => {
    renderApp('/projects');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    const href = (name: string) => within(nav).getByRole('link', { name }).getAttribute('href');
    expect(href('Projects')).toBe('/projects');
    expect(href('Notifications')).toBe('/notifications');
    expect(href('Assigned to me')).toBe('/assigned');
    expect(href('Comments')).toBe('/comments');
    expect(href('Settings')).toBe('/settings');
  });

  it('renders the interface in Spanish', async () => {
    await i18n.changeLanguage('es');
    renderApp('/projects');
    expect(await screen.findByRole('heading', { name: 'Lista de proyectos' })).toBeInTheDocument();
  });

  it('opens Settings > General with its own navigation', async () => {
    renderApp('/settings');
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    // /settings redirects to /settings/general after the first render.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'General settings' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to translation space/ })).toBeInTheDocument();
  });
});
