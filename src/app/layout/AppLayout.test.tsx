import { screen } from '@testing-library/react';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

describe('App shell', () => {
  beforeEach(() => i18n.changeLanguage('en'));

  it('redirects the root to the project list', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'List of projects' })).toBeInTheDocument();
  });

  it('links Projects and Settings, and disables entries without a design', async () => {
    renderApp('/projects');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(nav).toHaveTextContent('Projects');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByText('Notifications')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('renders the interface in Spanish', async () => {
    await i18n.changeLanguage('es');
    renderApp('/projects');
    expect(await screen.findByRole('heading', { name: 'Lista de proyectos' })).toBeInTheDocument();
  });

  it('opens Settings > Members with its own navigation', async () => {
    renderApp('/settings');
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Back to translation space/ })).toBeInTheDocument();
  });
});
