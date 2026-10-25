import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

async function openGeneral() {
  const user = userEvent.setup();
  const app = renderApp('/settings/general');
  await screen.findByRole('heading', { name: 'General settings' });
  return { ...app, user };
}

/** Switches the simulated current user from the avatar menu. */
async function switchUser(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Open user menu' }));
  await user.click(await screen.findByRole('menuitemradio', { name: new RegExp(name) }));
}

const visibilitySwitch = () =>
  screen.getByRole('switch', { name: 'Workers only see the projects they take part in' });

describe('Settings > General', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('changes the theme and the interface language', async () => {
    const { user } = await openGeneral();
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    await user.click(screen.getByRole('radio', { name: 'Español' }));
    expect(await screen.findByRole('heading', { name: 'Ajustes generales' })).toBeInTheDocument();
  });

  it('lets workers see other projects as view only when a manager allows it', async () => {
    const { user, router } = await openGeneral();
    // By default workers only see their projects.
    await waitFor(() => expect(visibilitySwitch()).toBeEnabled());
    expect(visibilitySwitch()).toBeChecked();
    await user.click(visibilitySwitch());
    await waitFor(() => expect(visibilitySwitch()).not.toBeChecked());

    // Chloé is a worker who is not part of Beta.
    await switchUser(user, 'Chloé Martin');
    expect(visibilitySwitch()).toBeDisabled();
    expect(screen.getAllByText('Only managers can change these settings.').length).toBeGreaterThan(
      0,
    );

    await router.navigate('/projects');
    await user.click(await screen.findByRole('link', { name: 'Sample Project Beta' }));
    expect(await screen.findByText(/so it is view only/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add section' })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('link', { name: /^Act 1 - / }));
    await screen.findByRole('link', { name: 'Open Scene 1.1 in the editor' });
    expect(screen.queryByRole('button', { name: /^Add/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Open Scene 1.1 in the editor' }));
    await screen.findByText('Translation workspace');
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit source text' })).not.toBeInTheDocument();
    const editor = screen.getByRole('region', { name: 'Spanish translation' });
    expect(within(editor).getByRole('textbox')).toHaveAttribute('readonly');
    expect(within(editor).queryByRole('button', { name: 'Mark translated' })).toBeNull();
    const comments = screen.getByRole('region', { name: 'Comments' });
    expect(within(comments).queryByRole('button', { name: 'Comment' })).toBeNull();
  });

  it('hides other projects from workers by default', async () => {
    const { user, router } = await openGeneral();
    await switchUser(user, 'Chloé Martin');
    await router.navigate('/projects');
    expect(await screen.findByRole('link', { name: 'Sample Project Alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sample Project Beta' })).not.toBeInTheDocument();
  });

  it('deletes all data after typing the word', async () => {
    const { user, router } = await openGeneral();
    const open = screen.getByRole('button', { name: 'Delete all data' });
    await waitFor(() => expect(open).toBeEnabled());
    await user.click(open);
    const dialog = await screen.findByRole('dialog', { name: 'Delete all data?' });
    const confirm = within(dialog).getByRole('button', { name: 'Delete all data' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Type “delete” to confirm'), 'delete');
    await user.click(confirm);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await router.navigate('/projects');
    expect(await screen.findByText(/No projects yet/i)).toBeInTheDocument();
  });

  it('refuses a file that is not a backup', async () => {
    const { user } = await openGeneral();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restore…' })).toBeEnabled());
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const file = new File(['{"hello": 1}'], 'notes.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Backup file'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This file is not a workspace backup.',
    );
    confirm.mockRestore();
  });
});
