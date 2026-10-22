import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

/** Opens Sample Project Alpha's glossary from the project page, as a user would. */
async function openGlossary() {
  const user = userEvent.setup();
  const app = renderApp('/projects');
  await user.click(await screen.findByRole('link', { name: 'Sample Project Alpha' }));
  await user.click(await screen.findByRole('link', { name: 'Open glossary' }));
  await screen.findByRole('heading', { name: 'Sample Project Alpha - Glossary' });
  return { ...app, user };
}

const section = (name: string) => screen.getByRole('region', { name });
const cardTitles = (container: HTMLElement) =>
  within(container)
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent);

describe('Glossary', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('shows the most viewed entries per category and filters by category', async () => {
    const { user } = await openGlossary();
    expect(cardTitles(section('Characters'))).toEqual(['Mira Vale', 'Tomas Reed', 'The Old Sage']);
    expect(cardTitles(section('Locations'))).toEqual(['North Gate', 'Ashbridge', 'Sunken Library']);

    await user.click(within(section('Locations')).getByRole('button', { name: /View all/ }));
    expect(screen.getByRole('button', { name: 'Locations' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('region', { name: 'Characters' })).not.toBeInTheDocument();
    expect(cardTitles(section('Locations'))).toEqual(['Ashbridge', 'North Gate', 'Sunken Library']);

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(section('Characters')).toBeInTheDocument();
  });

  it('searches and switches to the A–Z list', async () => {
    const { user } = await openGlossary();
    await user.type(screen.getByRole('searchbox', { name: 'Search the glossary' }), 'guild');
    // Matches titles, descriptions, tags and bodies.
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toContain('Lantern Guild');
    expect(names).toContain('Tomas Reed');

    await user.clear(screen.getByRole('searchbox', { name: 'Search the glossary' }));
    await user.click(screen.getByRole('button', { name: 'A–Z list view' }));
    const jump = screen.getByRole('navigation', { name: 'Jump to letter' });
    expect(within(jump).getByRole('link', { name: 'A' })).toBeInTheDocument();
    expect(within(jump).queryByRole('link', { name: 'Z' })).not.toBeInTheDocument();
    expect(
      within(section('T'))
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['The Long Night', 'The Old Sage', 'Tomas Reed']);
  });

  it('creates a category and refuses a duplicate name', async () => {
    const { user } = await openGlossary();
    await user.click(screen.getByRole('button', { name: 'Create new category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create new category' });
    await user.type(within(dialog).getByLabelText(/Category name/), 'lore');
    await user.click(within(dialog).getByRole('button', { name: 'Create category' }));
    expect(
      within(dialog).getByText('This glossary already has a category with this name.'),
    ).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText(/Category name/));
    await user.type(within(dialog).getByLabelText(/Category name/), 'Items');
    await user.click(within(dialog).getByRole('button', { name: 'Create category' }));
    expect(await screen.findByRole('button', { name: 'Items' })).toBeInTheDocument();
    expect(
      within(section('Items')).getByText('No entries in this category yet.'),
    ).toBeInTheDocument();
  });

  it('opens an entry with its links and references', async () => {
    const { user } = await openGlossary();
    await user.click(within(section('Characters')).getByRole('link', { name: 'Mira Vale' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Mira Vale' })).toBeInTheDocument();
    expect(screen.getByText('Main character')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'References' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('link', { name: 'Ashbridge' })[0]!);
    // The new entry loads and counts a view, which refreshes the glossary: allow a little longer.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ashbridge' }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('creates an entry, edits it into a new version, compares and restores', async () => {
    const { user } = await openGlossary();
    await user.click(screen.getByRole('link', { name: 'Add entry' }));
    await screen.findByRole('heading', { name: 'New entry' });

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Enter a title.')).toBeInTheDocument();
    expect(screen.getByText('Write a short description.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'Old Mill');
    await user.type(screen.getByLabelText(/Short description/), 'A ruined mill by the river.');
    await user.click(screen.getByRole('button', { name: 'Tag' }));
    await user.keyboard('Ruin{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Old Mill' })).toBeInTheDocument();
    expect(screen.getByText('Ruin')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Edit entry' }));
    const description = await screen.findByLabelText(/Short description/);
    await user.clear(description);
    await user.type(description, 'A rebuilt mill by the river.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('heading', { level: 1, name: 'Old Mill' });

    await user.click(screen.getByRole('link', { name: 'Edit entry' }));
    const history = await screen.findByRole('navigation', { name: 'Version history' });
    await waitFor(() => expect(within(history).getAllByRole('link')).toHaveLength(1));
    await user.click(within(history).getByRole('link'));

    expect(await screen.findByRole('heading', { name: 'Compare versions' })).toBeInTheDocument();
    const current = screen.getByRole('region', { name: 'Current Version' });
    expect(within(current).getByText('rebuilt').tagName).toBe('INS');
    expect(within(current).getByText('ruined').tagName).toBe('DEL');

    await user.click(screen.getByRole('button', { name: 'Restore version' }));
    await screen.findByRole('heading', { level: 1, name: 'Old Mill' });
    await user.click(screen.getByRole('link', { name: 'Edit entry' }));
    expect(await screen.findByLabelText(/Short description/)).toHaveValue(
      'A ruined mill by the river.',
    );
    const restoredHistory = screen.getByRole('navigation', { name: 'Version history' });
    await waitFor(() => expect(within(restoredHistory).getAllByRole('link')).toHaveLength(2));
  });
});
