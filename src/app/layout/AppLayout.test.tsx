import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import i18n from '@/i18n';
import { routes } from '../routes';
import { ThemeProvider } from '../theme/ThemeProvider';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
}

describe('App shell', () => {
  beforeEach(() => i18n.changeLanguage('en'));

  it('redirects the root to the project list', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'List of projects' })).toBeInTheDocument();
  });

  it('links Projects and Settings, and disables entries without a design', async () => {
    renderAt('/projects');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(nav).toHaveTextContent('Projects');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByText('Notifications')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('renders the interface in Spanish', async () => {
    await i18n.changeLanguage('es');
    renderAt('/projects');
    expect(await screen.findByRole('heading', { name: 'Lista de proyectos' })).toBeInTheDocument();
  });

  it('opens Settings > Members with its own navigation', async () => {
    renderAt('/settings');
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Back to translation space/ })).toBeInTheDocument();
  });
});
