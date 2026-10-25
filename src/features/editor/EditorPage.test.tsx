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
    // The item's note is the context of the source-text line (DECISIONS D40).
    expect(screen.getByText(/Placeholder note for translators of Scene 1\.1/)).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Translation language' }));
    expect(
      await screen.findByRole('menuitemradio', { name: /Spanish.*1\/\d translated/ }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Submit for review' }));
    expect(await screen.findByText('1 translation sent to review.')).toBeInTheDocument();
    expect(await within(editor('Spanish')).findByText('Under Review')).toBeInTheDocument();

    // The demo's current user is a manager, so they can review.
    await user.click(within(editor('Spanish')).getByRole('button', { name: 'Approve' }));
    expect(await within(editor('Spanish')).findByText(/Approved by /)).toBeInTheDocument();
  });

  it('switches language from the picker', async () => {
    const { user, router } = await openItem('Sample Project Beta');
    await user.click(screen.getByRole('button', { name: 'Translation language' }));
    await user.click(await screen.findByRole('menuitemradio', { name: /French/ }));
    expect(await screen.findByRole('region', { name: 'French translation' })).toBeInTheDocument();
    expect(router.state.location.search).toContain('lang=fr');
    expect(screen.queryByRole('region', { name: 'Spanish translation' })).not.toBeInTheDocument();
  });

  it('corrects the source text and restores the OCR text', async () => {
    const { user } = await openItem('Sample Project Beta');
    await user.click(screen.getByRole('button', { name: 'Edit source text' }));
    const text = screen.getByLabelText('Text');
    await user.clear(text);
    await user.type(text, 'A corrected line.');
    await user.type(screen.getByLabelText('Speaker'), '{Control>}a{/Control}Mira');
    const context = screen.getByLabelText('Context (all images in this item)');
    await user.clear(context);
    await user.type(context, 'Before the bridge');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('edited')).toBeInTheDocument();
    // The data refreshes just before the form closes.
    await waitFor(() => expect(screen.queryByLabelText('Text')).not.toBeInTheDocument());
    expect(screen.getByText('A corrected line.')).toBeInTheDocument();
    expect(screen.getAllByText('Mira').length).toBeGreaterThan(0);
    expect(screen.getByText(/Before the bridge/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore OCR text' }));
    expect(await screen.findByText(/Placeholder line 1 for Scene 1\.1/)).toBeInTheDocument();
    expect(screen.queryByText('edited')).not.toBeInTheDocument();
  });

  it('shows threads, mentions people and resolves a thread', async () => {
    const { user } = await openItem('Sample Project Alpha');
    const card = screen.getByRole('region', { name: 'Comments' });
    // The card lists the open thread; the side bar holds the rest.
    expect(await within(card).findAllByRole('listitem')).toHaveLength(1);
    await user.click(within(card).getByRole('button', { name: 'View all' }));
    const comments = within(await screen.findByRole('dialog', { name: 'Comments on this image' }));
    expect(await comments.findByRole('tab', { name: 'Open · 1' })).toBeInTheDocument();
    expect(comments.getByRole('tab', { name: 'Resolved · 1' })).toBeInTheDocument();

    const composer = comments.getByRole('combobox', {
      name: 'Add a comment… Use @ to mention',
    });
    await user.type(composer, 'Please check @Ben');
    await user.keyboard('{Enter}');
    expect(composer).toHaveValue('Please check @Ben Carter ');
    await user.click(comments.getByRole('button', { name: 'Comment' }));

    expect(await comments.findByRole('tab', { name: 'Open · 2' })).toBeInTheDocument();
    expect(comments.getByText('@Ben Carter')).toBeInTheDocument();

    const [resolve] = comments.getAllByRole('button', { name: 'Resolve' });
    await user.click(resolve!);
    expect(await comments.findByRole('tab', { name: 'Open · 1' })).toBeInTheDocument();
    expect(comments.getByRole('tab', { name: 'Resolved · 2' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Two threads were open, one was resolved: the card still lists one.
    expect(within(card).getAllByRole('listitem')).toHaveLength(1);
  });

  it('writes a comment in the card without opening the side bar', async () => {
    const { user } = await openItem('Sample Project Beta');
    const card = screen.getByRole('region', { name: 'Comments' });
    await user.click(within(card).getByRole('button', { name: 'Comment' }));
    const composer = within(card).getByRole('combobox', {
      name: 'Add a comment… Use @ to mention',
    });
    expect(composer).toHaveFocus();
    await user.type(composer, 'Too long for the box?');
    await user.click(within(card).getByRole('button', { name: 'Comment' }));

    // The composer closes once the comment is saved, and the thread is listed.
    await waitFor(() => expect(within(card).queryByRole('combobox')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(within(card).getByRole('listitem')).toHaveTextContent('Too long for the box?'),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a thread from its replies and resolves from the card', async () => {
    const { user } = await openItem('Sample Project Alpha');
    const card = screen.getByRole('region', { name: 'Comments' });
    await user.click(await within(card).findByRole('button', { name: '1 reply' }));
    const panel = await screen.findByRole('dialog', { name: 'Comments on this image' });
    expect(
      within(panel).getByText('Yes, keep it short and add exclamation marks to both lines.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(panel).getByRole('article')).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(within(card).getByRole('button', { name: 'Resolve' }));
    expect(await within(card).findByText('No open comments on this image.')).toBeInTheDocument();
  });
});
