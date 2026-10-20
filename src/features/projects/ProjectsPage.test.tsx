import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

async function renderList() {
  const user = userEvent.setup();
  const app = renderApp('/projects');
  const table = await screen.findByRole('table', { name: 'List of projects' });
  await within(table).findByRole('link', { name: 'Sample Project Alpha' });
  return { ...app, user, table };
}

const projectNames = (table: HTMLElement) =>
  within(table)
    .getAllByRole('link')
    .map((link) => link.textContent);

describe('Project list', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('lists the projects by name and links each row to its detail', async () => {
    const { table, user, router } = await renderList();
    expect(projectNames(table)).toHaveLength(8);
    expect(projectNames(table)[0]).toBe('Sample Project Alpha');

    await user.click(within(table).getByRole('link', { name: 'Sample Project Beta' }));
    expect(router.state.location.pathname).toMatch(/^\/projects\/.+/);
  });

  it('searches by name and shows an empty state with no matches', async () => {
    const { table, user } = await renderList();
    const search = screen.getByRole('searchbox', { name: /search projects/i });

    await user.type(search, 'gamma');
    expect(projectNames(table)).toEqual(['Sample Project Gamma']);

    await user.clear(search);
    await user.type(search, 'nothing like this');
    expect(screen.getByText('No projects match your search or filters.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(projectNames(table)).toHaveLength(8);
  });

  it('sorts by priority when the column header is clicked', async () => {
    const { table, user } = await renderList();
    await user.click(screen.getByRole('button', { name: 'Priority' }));
    // The two urgent projects come first, ties by name.
    expect(projectNames(table).slice(0, 2)).toEqual([
      'Sample Project Alpha',
      'Sample Project Theta',
    ]);
    expect(projectNames(table).at(-1)).toBe('Sample Project Eta');
    expect(screen.getByRole('columnheader', { name: /Priority/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('filters from the menu and removes the filter with its chip', async () => {
    const { table, user } = await renderList();
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Managers' }));
    const ben = await screen.findByRole('menuitemcheckbox', { name: /Ben Carter/ });
    // Pointer moves between menus are unreliable in jsdom: pick with the keyboard.
    ben.focus();
    await user.keyboard(' ');
    await user.keyboard('{Escape}{Escape}');

    // Ben Carter manages Alpha, Beta, Delta, Eta and Theta in the demo data.
    await waitFor(() => expect(projectNames(table)).toHaveLength(5));
    expect(screen.getByText('Manager is')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Remove filter: Manager is Ben Carter/ }));
    expect(projectNames(table)).toHaveLength(8);
  });

  it('creates a project and shows it in the list', async () => {
    const { table, user } = await renderList();
    await user.click(screen.getByRole('button', { name: 'Add project' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add new project' });

    // Submitting empty shows the required errors (the current user is already a manager).
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));
    expect(within(dialog).getByText('Enter a project name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Select the original language.')).toBeInTheDocument();
    expect(within(dialog).queryByText('Add at least one manager.')).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/Project name/), 'Moonfall');
    await user.click(within(dialog).getByRole('button', { name: /Switch/ }));
    await user.click(within(dialog).getByRole('combobox', { name: /Original language/ }));
    await user.click(await screen.findByRole('option', { name: 'Japanese' }));
    await user.click(within(dialog).getByRole('button', { name: 'Spanish' }));
    await user.click(within(dialog).getByRole('radio', { name: 'High' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add new project' })).not.toBeInTheDocument(),
    );
    expect(await within(table).findByRole('link', { name: 'Moonfall' })).toBeInTheDocument();
    // Default sort is by name, so it lands first.
    expect(projectNames(table)[0]).toBe('Moonfall');
  });
});
