import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

/** Opens the list, then Sample Project Alpha (4 sections × 4 items, languages es fr de it ja). */
async function openAlpha() {
  const user = userEvent.setup();
  const app = renderApp('/projects');
  await user.click(await screen.findByRole('link', { name: 'Sample Project Alpha' }));
  await screen.findByRole('heading', { level: 1, name: 'Sample Project Alpha' });
  return { ...app, user };
}

const region = (name: string) => screen.getByRole('region', { name });

describe('Project detail', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('shows the overview, the sections with the first one expanded, and languages', async () => {
    await openAlpha();
    const overview = region('Overview');
    expect(within(overview).getByText('SMP-ALPHA-2026')).toBeInTheDocument();
    expect(within(overview).getByText('Q3 2026')).toBeInTheDocument();
    // Two managers: the label is plural.
    expect(within(overview).getByText('Managers')).toBeInTheDocument();

    const sections = region('Section Progress');
    const links = within(sections).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Act 1 - Opening',
      'Act 2 - The journey',
      'Act 3 - Turning point',
      'Act 4 - Ending',
    ]);
    // Only the first section is expanded.
    expect(within(sections).getByText('Scene 1.1')).toBeInTheDocument();
    expect(within(sections).queryByText('Scene 2.1')).not.toBeInTheDocument();
    expect(within(sections).getByText('Not started')).toBeInTheDocument();

    const languages = region('Languages Progress');
    expect(within(languages).getByText('5 languages')).toBeInTheDocument();
    expect(within(languages).getByText('Japanese')).toBeInTheDocument();
  });

  it('expands a section and opens its detail from the name', async () => {
    const { user, router } = await openAlpha();
    const sections = region('Section Progress');
    await user.click(
      within(sections).getByRole('button', { name: /Show or hide the items of Act 2/ }),
    );
    expect(await within(sections).findByText('Scene 2.1')).toBeInTheDocument();

    await user.click(within(sections).getByRole('link', { name: 'Act 2 - The journey' }));
    expect(router.state.location.pathname).toMatch(/\/sections\/.+/);
    expect(await screen.findByRole('heading', { name: 'Act 2 - The journey' })).toBeInTheDocument();
  });

  it('adds a section, and "Create and add content" opens it', async () => {
    const { user, router } = await openAlpha();
    await user.click(screen.getByRole('button', { name: 'Add section' }));
    let dialog = await screen.findByRole('dialog', { name: 'Add section' });

    await user.click(within(dialog).getByRole('button', { name: 'Create section' }));
    expect(within(dialog).getByText('Enter a section name.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/Section name/), 'Act 5 - Epilogue');
    await user.click(within(dialog).getByRole('button', { name: 'Create section' }));
    // While the modal is open the page behind it is hidden from the accessibility tree.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const sections = region('Section Progress');
    expect(
      await within(sections).findByRole('link', { name: 'Act 5 - Epilogue' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).not.toMatch(/sections/);

    await user.click(screen.getByRole('button', { name: 'Add section' }));
    dialog = await screen.findByRole('dialog', { name: 'Add section' });
    await user.type(within(dialog).getByLabelText(/Section name/), 'Act 6 - Credits');
    await user.type(within(dialog).getByLabelText(/Description/), 'Thanks for playing.');
    await user.click(within(dialog).getByRole('button', { name: 'Create and add content' }));

    expect(await screen.findByRole('heading', { name: 'Act 6 - Credits' })).toBeInTheDocument();
    expect(screen.getByText('Thanks for playing.')).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ addContent: true });
  });

  it('adds a target language from the popover', async () => {
    const { user } = await openAlpha();
    await user.click(screen.getByRole('button', { name: 'Add language' }));
    const popover = await screen.findByRole('dialog');
    await user.click(within(popover).getByRole('combobox', { name: 'Language' }));
    // Languages already in the project are not offered.
    expect(screen.queryByRole('option', { name: 'Japanese' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('option', { name: 'Korean' }));
    await user.click(within(popover).getByRole('button', { name: 'Add' }));

    const languages = region('Languages Progress');
    expect(await within(languages).findByText('Korean')).toBeInTheDocument();
    expect(within(languages).getByText('6 languages')).toBeInTheDocument();
  });

  it('shows a message for an unknown project', async () => {
    renderApp('/projects/missing');
    expect(
      await screen.findByText('This project does not exist or was deleted.'),
    ).toBeInTheDocument();
  });
});

describe('Section detail', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  async function openFirstSection() {
    const app = await openAlpha();
    await app.user.click(
      within(region('Section Progress')).getByRole('link', { name: 'Act 1 - Opening' }),
    );
    await screen.findByRole('heading', { level: 2, name: 'Act 1 - Opening' });
    const items = region('Content items');
    const names = () =>
      within(items)
        .queryAllByRole('checkbox')
        .map((c) => c.getAttribute('aria-label')?.replace('Select ', ''));
    return { ...app, items, names };
  }

  it('shows the breadcrumb and searches the items', async () => {
    const { user, items, names } = await openFirstSection();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'All sections' })).toBeInTheDocument();
    expect(within(breadcrumb).getByText('SMP-ALPHA-2026')).toBeInTheDocument();
    expect(names()).toEqual(['Scene 1.1', 'Scene 1.2', 'Scene 1.3', 'Scene 1.4']);
    expect(within(items).getByText('Showing all 4 items')).toBeInTheDocument();

    await user.type(within(items).getByRole('searchbox'), '1.3');
    expect(names()).toEqual(['Scene 1.3']);
    expect(within(items).getByText('Showing 1 of 4 items')).toBeInTheDocument();

    await user.clear(within(items).getByRole('searchbox'));
    await user.type(within(items).getByRole('searchbox'), 'nothing');
    expect(
      within(items).getByText('No content items match your search or filter.'),
    ).toBeInTheDocument();
  });

  it('moves the selected items to another section', async () => {
    const { user, items, names } = await openFirstSection();
    await user.click(within(items).getByRole('checkbox', { name: 'Select Scene 1.2' }));
    await user.click(within(items).getByRole('checkbox', { name: 'Select Scene 1.3' }));
    expect(within(items).getByText('2 items selected')).toBeInTheDocument();

    await user.click(within(items).getByRole('button', { name: 'Move to section' }));
    const popover = await screen.findByRole('dialog');
    expect(within(popover).getByText('2 items selected: Scene 1.2, Scene 1.3')).toBeInTheDocument();
    const submit = within(popover).getByRole('button', { name: 'Move 2 items' });
    expect(submit).toBeDisabled();

    await user.click(within(popover).getByRole('combobox', { name: 'Destination section' }));
    await user.click(await screen.findByRole('option', { name: 'Act 2 - The journey' }));
    await user.click(submit);

    await waitFor(() => expect(names()).toEqual(['Scene 1.1', 'Scene 1.4']));
    expect(within(items).queryByText(/items selected/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'All sections' }));
    const sections = await screen.findByRole('region', { name: 'Section Progress' });
    await user.click(
      within(sections).getByRole('button', { name: /Show or hide the items of Act 2/ }),
    );
    // Appended after the destination's own items.
    const act2 = await within(sections).findByText('Scene 2.4');
    const list = act2.closest('ul')!;
    expect(
      within(list)
        .getAllByText(/^Scene /)
        .map((n) => n.textContent),
    ).toEqual(['Scene 2.1', 'Scene 2.2', 'Scene 2.3', 'Scene 2.4', 'Scene 1.2', 'Scene 1.3']);
  });

  it('opens an item from its card, while the checkbox only selects it', async () => {
    const { user, items, router } = await openFirstSection();
    await user.click(within(items).getByRole('checkbox', { name: 'Select Scene 1.1' }));
    expect(within(items).getByText('1 item selected')).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/\/sections\//);

    // The link is stretched over the card with CSS, which jsdom does not lay out: click it directly.
    await user.click(within(items).getByRole('link', { name: 'Open Scene 1.2 in the editor' }));
    expect(router.state.location.pathname).toMatch(/\/items\/.+/);
  });

  it('edits the section name and description', async () => {
    const { user } = await openFirstSection();
    await user.click(screen.getByRole('button', { name: 'Edit section' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit section' });
    const name = within(dialog).getByLabelText(/Section name/);
    expect(name).toHaveValue('Act 1 - Opening');

    await user.clear(name);
    await user.type(name, 'Act 1 - Arrival');
    await user.clear(within(dialog).getByLabelText(/Description/));
    await user.type(within(dialog).getByLabelText(/Description/), 'The ship docks.');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Act 1 - Arrival' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The ship docks.')).toBeInTheDocument();
  });
});
