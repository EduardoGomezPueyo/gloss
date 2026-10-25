import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

async function openProjects() {
  const user = userEvent.setup();
  const app = renderApp('/settings/projects');
  const table = await screen.findByRole('table', { name: 'Workspace projects' });
  await within(table).findByRole('link', { name: 'Sample Project Alpha' });
  return { ...app, user, table };
}

const projectNames = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1]!.textContent);

/** Switches the simulated current user from the avatar menu. */
async function switchUser(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Open user menu' }));
  await user.click(await screen.findByRole('menuitemradio', { name: new RegExp(name) }));
}

describe('Settings > Workspace projects', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('lists every project with its details and searches by name or ID', async () => {
    const { user, table } = await openProjects();
    expect(projectNames(table)).toHaveLength(8);
    expect(screen.getByText('8 projects')).toBeInTheDocument();
    const alpha = within(table)
      .getByRole('link', { name: 'Sample Project Alpha' })
      .closest('[role="row"]') as HTMLElement;
    expect(within(alpha).getByText('SMP-ALPHA-2026')).toBeInTheDocument();
    expect(within(alpha).getByText('English → 5 languages')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'beta-2026');
    expect(projectNames(table)).toEqual(['Sample Project Beta']);
  });

  it('renames a project and validates its ID', async () => {
    const { user, table } = await openProjects();
    await user.click(within(table).getByRole('button', { name: 'Rename Sample Project Alpha' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rename project' });
    const code = within(dialog).getByLabelText('Project ID');
    await user.clear(code);
    await user.type(code, 'SMP-BETA-2026');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText('Another project already uses this ID.')).toBeInTheDocument();

    await user.clear(code);
    await user.type(code, 'ember-2026');
    const name = within(dialog).getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Ember Gate');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await within(table).findByRole('link', { name: 'Ember Gate' })).toBeInTheDocument();
    expect(within(table).getByText('EMBER-2026')).toBeInTheDocument();
  });

  it('deletes selected projects after confirming', async () => {
    const { user, table, router } = await openProjects();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(within(table).getByRole('checkbox', { name: 'Select Sample Project Alpha' }));
    await user.click(within(table).getByRole('checkbox', { name: 'Select Sample Project Beta' }));
    expect(screen.getByText('2 projects selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Sample Project Alpha'));
    await waitFor(() => expect(projectNames(table)).toHaveLength(6));
    confirm.mockRestore();

    await router.navigate('/projects');
    await screen.findByRole('link', { name: 'Sample Project Gamma' });
    expect(screen.queryByRole('link', { name: 'Sample Project Alpha' })).not.toBeInTheDocument();
  });

  it('shows workers their projects only, without actions', async () => {
    const { user, table } = await openProjects();
    await switchUser(user, 'Chloé Martin');
    // Chloé takes part in Alpha, Gamma, Zeta and Theta.
    await waitFor(() => expect(projectNames(table)).toHaveLength(4));
    expect(within(table).queryByRole('button', { name: /^Rename/ })).not.toBeInTheDocument();
    expect(within(table).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('Only managers can rename or delete projects.')).toBeInTheDocument();
  });
});
