import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

async function openMenu() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Open user menu' }));
  return { user, menu: await screen.findByRole('menu') };
}

describe('User menu', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('starts as the first manager and lists only active members', async () => {
    renderApp('/projects');
    const { menu } = await openMenu();
    await within(menu).findByText('Ana Torres');
    // 7 active members; Hana Ito is only invited.
    expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(7);
    expect(within(menu).queryByText('Hana Ito')).not.toBeInTheDocument();
    expect(within(menu).getByRole('menuitemradio', { name: /Ana Torres/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('switches the simulated current user and remembers it', async () => {
    renderApp('/projects');
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('menuitemradio', { name: /Chloé Martin/ }));

    expect(await screen.findByRole('button', { name: 'Open user menu' })).toHaveAttribute(
      'title',
      'Chloé Martin',
    );
    expect(localStorage.getItem('translator.currentUser')).not.toBeNull();
  });

  it('resets the demo data after confirmation', async () => {
    const { repositories, db } = renderApp('/projects');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const reset = vi.spyOn(repositories.demo, 'reset');
    await waitFor(async () => expect(await db.projects.count()).toBe(8));

    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('menuitem', { name: 'Reset demo data' }));

    expect(confirm).toHaveBeenCalled();
    await waitFor(() => expect(reset).toHaveBeenCalledOnce());
    expect(await db.projects.count()).toBe(8);
    confirm.mockRestore();
  });
});
