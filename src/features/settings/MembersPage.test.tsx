import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

async function openMembers() {
  const user = userEvent.setup();
  const app = renderApp('/settings/members');
  const table = await screen.findByRole('table', { name: 'Team Members' });
  await within(table).findByText('Ana Torres');
  return { ...app, user, table };
}

const names = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1]!.textContent);

/** Switches the simulated current user from the avatar menu. */
async function switchUser(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Open user menu' }));
  await user.click(await screen.findByRole('menuitemradio', { name: new RegExp(name) }));
}

describe('Settings > Members', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('lists members with counts and the legend, and searches them', async () => {
    const { user, table } = await openMembers();
    expect(names(table)).toHaveLength(8);
    expect(screen.getByText('7 active · 1 invitation pending')).toBeInTheDocument();
    expect(within(table).getByText('Invited')).toBeInTheDocument();
    expect(
      screen.getByText('Manages members, projects and translation reviews.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/sub-team/i)).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'chloe');
    expect(names(table)).toEqual(['CMChloé Martinchloe@example.com']);
    expect(screen.getByText('Showing 1 of 8 members')).toBeInTheDocument();
  });

  it('invites people and checks their emails', async () => {
    const { user, table } = await openMembers();
    await user.click(screen.getByRole('button', { name: 'Invite members to workspace' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite members to workspace' });

    await user.type(within(dialog).getByLabelText('Name'), 'Iris Holm');
    await user.type(within(dialog).getByLabelText('Email'), 'ana@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Send invitations' }));
    expect(within(dialog).getByText('This email is already in the workspace.')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Email'));
    await user.type(within(dialog).getByLabelText('Email'), 'iris@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Add another' }));
    const [, secondName] = within(dialog).getAllByLabelText('Name');
    const [, secondEmail] = within(dialog).getAllByLabelText('Email');
    await user.type(secondName!, 'Jon Park');
    await user.type(secondEmail!, 'jon@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Send invitations' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await within(table).findByText('Iris Holm')).toBeInTheDocument();
    expect(screen.getByText('7 active · 3 invitations pending')).toBeInTheDocument();
  });

  it('changes categories but always keeps a manager', async () => {
    const { user, table } = await openMembers();
    await user.click(within(table).getByRole('checkbox', { name: 'Select Ana Torres' }));
    await user.click(within(table).getByRole('checkbox', { name: 'Select Ben Carter' }));
    expect(screen.getByText('2 members selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change category' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Worker' }));
    expect(
      screen.getByText('The workspace needs at least one active manager.'),
    ).toBeInTheDocument();

    await user.click(within(table).getByRole('combobox', { name: 'Category of Chloé Martin' }));
    await user.click(await screen.findByRole('option', { name: 'Manager' }));
    await waitFor(() =>
      expect(
        within(table).getByRole('combobox', { name: 'Category of Chloé Martin' }),
      ).toHaveTextContent('Manager'),
    );
  });

  it('removes members after confirming, but never yourself', async () => {
    const { user, table } = await openMembers();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    // The demo's current user is Ana Torres.
    await user.click(within(table).getByRole('button', { name: 'Remove Ana Torres' }));
    expect(screen.getByText("You can't remove yourself.")).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();

    await user.click(within(table).getByRole('button', { name: 'Remove Daniel Kim' }));
    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(within(table).queryByText('Daniel Kim')).not.toBeInTheDocument());
    confirm.mockRestore();
  });

  it('is read-only for workers, who only see their own projects', async () => {
    const { user, router } = await openMembers();
    await switchUser(user, 'Chloé Martin');
    expect(
      await screen.findByText('Only managers can invite, change or remove members.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Invite members to workspace' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();

    await router.navigate('/projects');
    const list = await screen.findByRole('table', { name: 'List of projects' });
    await within(list).findByRole('link', { name: 'Sample Project Alpha' });
    // Chloé works on Alpha, Gamma, Zeta and Theta in the demo data.
    expect(within(list).getAllByRole('link')).toHaveLength(4);
    expect(
      within(list).queryByRole('link', { name: 'Sample Project Beta' }),
    ).not.toBeInTheDocument();
  });
});
