import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';

/** Opens Scene 1.1 of a demo project from the list, as a user would. */
async function openItem(project: string) {
  const user = userEvent.setup();
  const app = renderApp('/projects');
  await user.click(await screen.findByRole('link', { name: project }));
  await user.click(await screen.findByRole('link', { name: /^Act 1 - / }));
  await user.click(await screen.findByRole('link', { name: 'Open Scene 1.1 in the editor' }));
  await screen.findByText('Translation workspace');
  return { ...app, user };
}

const editor = (language: string) =>
  screen.getByRole('region', { name: `${language} translation` });

describe('Translation editor', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('shows the context, the breadcrumb and moves between images', async () => {
    const { user, router } = await openItem('Sample Project Beta');
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Scene 1.1')).toHaveAttribute('aria-current', 'page');
    expect(within(breadcrumb).getByRole('link', { name: 'Act 1 - Opening' })).toBeInTheDocument();
    expect(screen.getByText(/Placeholder line 1 for Scene 1\.1/)).toBeInTheDocument();
    // Beta: es, fr, pt; the editor starts on the first one.
    expect(editor('Spanish')).toBeInTheDocument();

    const next = screen.getByRole('button', { name: 'Next image' });
    if (!(next as HTMLButtonElement).disabled) {
      await user.click(next);
      expect(router.state.location.search).toContain('image=2');
      expect(await screen.findByText(/Placeholder line 2 for Scene 1\.1/)).toBeInTheDocument();
    }
  });

  it('autosaves, marks translated, submits the section and approves', async () => {
    const { user } = await openItem('Sample Project Beta');
    await user.type(within(editor('Spanish')).getByRole('textbox'), '¡Hola!');
    expect(await screen.findByText('All changes saved')).toBeInTheDocument();
    expect(within(editor('Spanish')).getByText('In progress')).toBeInTheDocument();
    expect(within(editor('Spanish')).getByText('6 characters · 1 line')).toBeInTheDocument();

    await user.click(within(editor('Spanish')).getByRole('button', { name: 'Mark translated' }));
    expect(
      await within(editor('Spanish')).findByRole('button', { name: 'Marked as translated' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Spanish.*1\/\d translated/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit for review' }));
    expect(await screen.findByText('1 translation sent to review.')).toBeInTheDocument();
    expect(await within(editor('Spanish')).findByText('Under Review')).toBeInTheDocument();

    // The demo's current user is a manager, so they can review.
    await user.click(within(editor('Spanish')).getByRole('button', { name: 'Approve' }));
    expect(await within(editor('Spanish')).findByText(/Approved by /)).toBeInTheDocument();
  });

  it('switches language from the cards and from the comparison', async () => {
    const { user } = await openItem('Sample Project Beta');
    await user.click(screen.getByRole('button', { name: /^French/ }));
    expect(editor('French')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit Spanish' }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'French translation' })).not.toBeInTheDocument(),
    );
  });

  it('corrects the source text and restores the OCR text', async () => {
    const { user } = await openItem('Sample Project Beta');
    await user.click(screen.getByRole('button', { name: 'Edit source text' }));
    const text = screen.getByLabelText('Text');
    await user.clear(text);
    await user.type(text, 'A corrected line.');
    await user.type(screen.getByLabelText('Speaker'), '{Control>}a{/Control}Mira');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('edited')).toBeInTheDocument();
    // The data refreshes just before the form closes.
    await waitFor(() => expect(screen.queryByLabelText('Text')).not.toBeInTheDocument());
    expect(screen.getByText('A corrected line.')).toBeInTheDocument();
    expect(screen.getAllByText('Mira').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Restore OCR text' }));
    expect(await screen.findByText(/Placeholder line 1 for Scene 1\.1/)).toBeInTheDocument();
    expect(screen.queryByText('edited')).not.toBeInTheDocument();
  });

  it('shows threads, mentions people and resolves a thread', async () => {
    const { user } = await openItem('Sample Project Alpha');
    const comments = screen.getByRole('tab', { name: /^Open/ }).closest('section')!;
    expect(await within(comments).findByRole('tab', { name: 'Open · 1' })).toBeInTheDocument();
    expect(within(comments).getByRole('tab', { name: 'Resolved · 1' })).toBeInTheDocument();

    const composer = within(comments).getByRole('combobox', {
      name: 'Add a comment… Use @ to mention',
    });
    await user.type(composer, 'Please check @Ben');
    await user.keyboard('{Enter}');
    expect(composer).toHaveValue('Please check @Ben Carter ');
    await user.click(within(comments).getByRole('button', { name: 'Comment' }));

    expect(await within(comments).findByRole('tab', { name: 'Open · 2' })).toBeInTheDocument();
    expect(within(comments).getByText('@Ben Carter')).toBeInTheDocument();

    const [resolve] = within(comments).getAllByRole('button', { name: 'Resolve' });
    await user.click(resolve!);
    expect(await within(comments).findByRole('tab', { name: 'Open · 1' })).toBeInTheDocument();
    expect(within(comments).getByRole('tab', { name: 'Resolved · 2' })).toBeInTheDocument();
  });
});
