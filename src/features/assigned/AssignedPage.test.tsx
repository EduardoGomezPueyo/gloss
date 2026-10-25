import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

/*
 * The fixture assigns the first item of every project, in its first language, to
 * its first worker, plus Alpha's second item: Chloé Martin is first worker of
 * Alpha, Gamma, Zeta and Theta, so five items are hers.
 */

/** Switches the simulated current user from the avatar menu. */
async function switchUser(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Open user menu' }));
  await user.click(await screen.findByRole('menuitemradio', { name: new RegExp(name) }));
}

const list = () => screen.findByRole('list', { name: 'Assigned to me' });

describe('Assigned to me', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it("lists a worker's items by project priority, without the review tab", async () => {
    const user = userEvent.setup();
    renderApp('/assigned');
    await screen.findByRole('heading', { name: 'Assigned to me' });
    await switchUser(user, 'Chloé Martin');
    await waitFor(async () =>
      expect(within(await list()).getAllByRole('listitem')).toHaveLength(5),
    );
    expect(screen.queryByRole('radio', { name: /To review/ })).not.toBeInTheDocument();

    // Urgent projects first (Alpha, Theta), then Zeta (medium) and Gamma (low).
    const projects = within(await list())
      .getAllByRole('listitem')
      .map((li) => li.textContent!.match(/Sample Project (\w+)/)![1]);
    expect(projects.slice(0, 3).sort()).toEqual(['Alpha', 'Alpha', 'Theta']);
    expect(projects.slice(3)).toEqual(['Zeta', 'Gamma']);
    expect(await screen.findByText('Your translation · Spanish')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in editor' }).getAttribute('href')).toMatch(
      /\?image=1&lang=es$/,
    );
  });

  it('gives managers the translations to review, and approves one', async () => {
    const user = userEvent.setup();
    renderApp('/assigned');
    // The count fills in once the queue has loaded.
    const tab = await screen.findByRole('radio', { name: /To review · [1-9]\d*/ });
    const before = Number(tab.textContent!.match(/\d+/)![0]);
    await user.click(tab);

    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /To review/ })).toHaveTextContent(
        `To review · ${before - 1}`,
      ),
    );
  });

  it('shows an item a manager assigns from the section detail', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects');
    await user.click(await screen.findByRole('link', { name: 'Sample Project Alpha' }));
    await user.click(await screen.findByRole('link', { name: /^Act 1 - / }));
    const assignees = await screen.findByRole('button', { name: /^Assignees of Scene 1\.3/ });
    await user.click(assignees);
    await user.click(await screen.findByRole('combobox', { name: 'Assignee for French' }));
    await user.click(await screen.findByRole('option', { name: 'Daniel Kim' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^Assignees of Scene 1\.3: French: Daniel Kim/ }),
      ).toBeInTheDocument(),
    );

    await user.keyboard('{Escape}');
    await switchUser(user, 'Daniel Kim');
    await router.navigate('/assigned');
    expect((await within(await list()).findAllByText(/Scene 1\.3/)).length).toBeGreaterThan(0);
  });
});
