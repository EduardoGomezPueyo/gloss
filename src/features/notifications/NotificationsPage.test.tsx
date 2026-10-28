import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

/** Switches the simulated current user from the avatar menu. */
async function switchUser(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Open user menu' }));
  await user.click(await screen.findByRole('menuitemradio', { name: new RegExp(name) }));
}

/**
 * Ana Torres (the default user) replies in Alpha's open thread, started by
 * Chloé Martin, and mentions Ben Carter.
 */
async function replyAsAna() {
  const user = userEvent.setup();
  const app = renderApp('/comments');
  await user.click(await screen.findByRole('button', { name: 'Reply to thread' }));
  await user.type(screen.getByRole('combobox', { name: 'Reply to thread' }), 'cc @Ben');
  await user.keyboard('{Enter}');
  await user.click(screen.getByRole('button', { name: 'Reply' }));
  await screen.findByText(/2 replies/);
  return { ...app, user };
}

const nav = () => screen.getByRole('navigation', { name: 'Main navigation' });

describe('Notifications', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('tells the mentioned person, and opening it marks it read', async () => {
    const { user, router } = await replyAsAna();
    await switchUser(user, 'Ben Carter');
    await within(nav()).findByRole('link', { name: /Notifications\s*1 unread/ });

    await router.navigate('/notifications');
    const list = await screen.findByRole('list', { name: 'Notifications' });
    expect(within(list).getByText('Ana Torres mentioned you')).toBeInTheDocument();
    // The thread is shown with its image, and the notification is now read.
    expect(await screen.findByText('@Ben Carter')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(nav()).getByRole('link', { name: 'Notifications' })).toBeInTheDocument(),
    );
  });

  it('tells earlier writers about replies, with filters and mark all as read', async () => {
    const { user, router } = await replyAsAna();
    await switchUser(user, 'Chloé Martin');
    await router.navigate('/notifications');
    const list = await screen.findByRole('list', { name: 'Notifications' });
    expect(within(list).getByText('Ana Torres replied in a thread')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Mentions' }));
    expect(await screen.findByText('Nothing here with this filter.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'All' }));
  });

  it('keeps unread notifications listed under Unread once they are opened', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/comments');
    // Two notifications for Chloé: a reply and a resolution.
    await user.click(await screen.findByRole('button', { name: 'Reply to thread' }));
    await user.type(screen.getByRole('combobox', { name: 'Reply to thread' }), 'Noted.');
    await user.click(screen.getByRole('button', { name: 'Reply' }));
    await screen.findByText(/2 replies/);
    await user.click(screen.getByRole('button', { name: 'Resolve' }));

    await switchUser(user, 'Chloé Martin');
    await router.navigate('/notifications');
    await screen.findByRole('list', { name: 'Notifications' });
    await user.click(screen.getByRole('radio', { name: /Unread/ }));
    // Opening the first one marks it read, but neither leaves the list.
    await waitFor(() =>
      expect(within(nav()).getByRole('link', { name: /1 unread/ })).toBeInTheDocument(),
    );
    const list = screen.getByRole('list', { name: 'Notifications' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    // ↓ from the filter moves through the list, not the filter, and leaves it.
    const filter = screen.getByRole('radio', { name: /Unread/ });
    const entries = within(list).getAllByRole('button');
    expect(filter).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(entries[1]).toHaveAttribute('aria-current', 'true');
    expect(filter).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(document.body);
  });

  it('marks everything read at once', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/comments');
    // Two notifications for Chloé: a reply and a resolution.
    await user.click(await screen.findByRole('button', { name: 'Reply to thread' }));
    await user.type(screen.getByRole('combobox', { name: 'Reply to thread' }), 'Noted.');
    await user.click(screen.getByRole('button', { name: 'Reply' }));
    await screen.findByText(/2 replies/);
    await user.click(screen.getByRole('button', { name: 'Resolve' }));

    await switchUser(user, 'Chloé Martin');
    await within(nav()).findByRole('link', { name: /2 unread/ });
    await router.navigate('/notifications');
    await user.click(await screen.findByRole('button', { name: 'Mark all as read' }));
    await waitFor(() =>
      expect(within(nav()).getByRole('link', { name: 'Notifications' })).toBeInTheDocument(),
    );
  });
});
