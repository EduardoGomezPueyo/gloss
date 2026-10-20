import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

describe('Sidebar theme and language controls', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('switches between light and dark and remembers the choice', async () => {
    const user = userEvent.setup();
    renderApp('/projects');
    const toggle = await screen.findByRole('switch', { name: 'Dark mode' });
    const startsDark = toggle.getAttribute('aria-checked') === 'true';

    await user.click(toggle);
    const expected = startsDark ? 'light' : 'dark';
    expect(document.documentElement.dataset.theme).toBe(expected);
    expect(localStorage.getItem('translator.theme')).toBe(expected);
    expect(toggle).toHaveAttribute('aria-checked', String(!startsDark));
  });

  it('changes the interface language', async () => {
    const user = userEvent.setup();
    renderApp('/projects');
    await user.click(await screen.findByRole('radio', { name: 'Español' }));

    expect(await screen.findByRole('heading', { name: 'Lista de proyectos' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Español' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'Español' }));
    expect(i18n.resolvedLanguage).toBe('es');
  });
});
