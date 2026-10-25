import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

/*
 * The fixture has two threads on the first image of Alpha: an open one started
 * by Chloé Martin with a reply from Ana Torres (the default user, a manager),
 * and a resolved one started by Daniel Kim.
 */
const OPEN = 'Should the speaker sound more urgent here? The scene is a chase.';
const RESOLVED = 'Confirmed the word for "gate" with the glossary.';

async function openComments() {
  const user = userEvent.setup();
  const app = renderApp('/comments');
  const list = await screen.findByRole('list', { name: 'Comments' });
  return { ...app, user, list };
}

/** Switches the simulated current user from the avatar menu. */
async function switchUser(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Open user menu' }));
  await user.click(await screen.findByRole('menuitemradio', { name: new RegExp(name) }));
}

describe('Comments page', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('starts managers on the threads involving them and shows the selected one', async () => {
    const { user, list, router } = await openComments();
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText(OPEN)).toBeInTheDocument();
    expect(
      within(list).getByText(/Sample Project Alpha · Scene 1\.1 · 1 reply/),
    ).toBeInTheDocument();

    // The first thread is shown with its context and its reply.
    expect(
      await screen.findByText('Yes, keep it short and add exclamation marks to both lines.'),
    ).toBeInTheDocument();
    const editorLink = screen.getByRole('link', { name: 'Open in editor' });
    expect(editorLink.getAttribute('href')).toMatch(/\/projects\/.+\/items\/.+\?image=1/);
    // Picking an entry puts it in the URL.
    await user.click(within(list).getByRole('button', { name: /Chloé Martin/ }));
    expect(router.state.location.search).toContain('id=');
  });

  it('lets managers see every thread, open or resolved', async () => {
    const { user, list } = await openComments();
    await user.click(screen.getByRole('radio', { name: 'All' }));
    await user.click(screen.getByRole('radio', { name: 'Resolved' }));
    expect(await within(list).findByText(RESOLVED)).toBeInTheDocument();
    expect(await screen.findByText(/Resolved by /)).toBeInTheDocument();
  });

  it('gives workers only their threads, with no option', async () => {
    const { user } = await openComments();
    await switchUser(user, 'Daniel Kim');
    expect(screen.queryByRole('radio', { name: 'All' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(OPEN)).not.toBeInTheDocument());
    await user.click(screen.getByRole('radio', { name: 'Resolved' }));
    // The list is rendered again after being empty: look it up afresh.
    const resolved = await screen.findByRole('list', { name: 'Comments' });
    expect(await within(resolved).findByText(RESOLVED)).toBeInTheDocument();
  });

  it('replies and resolves from the page', async () => {
    const { user, list } = await openComments();
    await user.click(await screen.findByRole('button', { name: 'Reply to thread' }));
    await user.type(screen.getByRole('combobox', { name: 'Reply to thread' }), 'On it.');
    await user.click(screen.getByRole('button', { name: 'Reply' }));
    expect(await within(list).findByText(/2 replies/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(
      await within(screen.getByRole('main')).findByText(/No threads involve you here/),
    ).toBeInTheDocument();
  });
});
