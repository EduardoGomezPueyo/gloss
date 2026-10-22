import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import type { OcrProvider } from '@/ocr/types';
import { renderApp } from '@/test/renderApp';

/** A test "image" whose bytes are the text the fake OCR will detect. */
const image = (name: string, text: string, type = 'image/png') => new File([text], name, { type });

async function openAddContent(ocr?: OcrProvider) {
  // Let the test upload files the input's accept list would filter out.
  const user = userEvent.setup({ applyAccept: false });
  renderApp('/projects', ocr ? { ocr } : undefined);
  await user.click(await screen.findByRole('link', { name: 'Sample Project Alpha' }));
  await user.click(await screen.findByRole('link', { name: 'Act 1 - Opening' }));
  await user.click(await screen.findByRole('button', { name: 'Add' }));
  const dialog = await screen.findByRole('dialog', { name: 'Add content to section' });
  return { user, dialog };
}

const positions = (dialog: HTMLElement) =>
  within(dialog)
    .queryAllByRole('button', { name: /^Image \d/ })
    .map((b) => b.getAttribute('aria-label'));

describe('Add content to section', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('builds an ordered item from the uploaded images and reads their text', async () => {
    const { user, dialog } = await openAddContent();

    await user.click(within(dialog).getByRole('button', { name: 'Create content item' }));
    expect(within(dialog).getByText('Enter a name for the content item.')).toBeInTheDocument();
    expect(within(dialog).getByText('Add at least one image.')).toBeInTheDocument();
    expect(within(dialog).getByText('Selected images will appear here')).toBeInTheDocument();

    await user.upload(within(dialog).getByTestId('image-file-input'), [
      image('harbour-1.png', 'Meet me at the north gate'),
      image('harbour-2.png', 'Bring the lantern'),
      image('notes.gif', 'not an image we accept', 'image/gif'),
    ]);
    expect(within(dialog).getByText(/Not added: notes\.gif/)).toBeInTheDocument();

    // Click order sets the order; a second click takes an image out.
    await user.click(within(dialog).getByRole('button', { name: 'Add harbour-2.png' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add harbour-1.png' }));
    expect(positions(dialog)).toEqual(['Image 1: harbour-2.png', 'Image 2: harbour-1.png']);
    await user.click(
      within(dialog).getByRole('button', { name: 'Remove harbour-2.png from the content item' }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Add harbour-2.png' }));
    expect(positions(dialog)).toEqual(['Image 1: harbour-1.png', 'Image 2: harbour-2.png']);
    expect(within(dialog).getByText('2 images selected')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/Name/), 'Harbour arrival');
    await user.type(within(dialog).getByLabelText('Type'), 'Mission dialogue');
    await user.click(within(dialog).getByRole('button', { name: 'Create content item' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const items = screen.getByRole('region', { name: 'Content items' });
    expect(within(items).getByText('Harbour arrival')).toBeInTheDocument();
    // OCR (faked) reads both images: 6 + 3 words.
    expect(await within(items).findByText(/Mission dialogue · 9 words/)).toBeInTheDocument();
    expect(within(items).queryByText(/Reading text/)).not.toBeInTheDocument();
  });

  it('shows failed OCR and retries it', async () => {
    let broken = true;
    const flaky: OcrProvider = {
      async recognize(file) {
        if (broken) throw new Error('engine unavailable');
        return { text: await file.text(), blocks: [], confidence: 90 };
      },
      async dispose() {},
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { user, dialog } = await openAddContent(flaky);

    await user.upload(within(dialog).getByTestId('image-file-input'), [
      image('cave.png', 'Who goes there'),
    ]);
    await user.click(within(dialog).getByRole('button', { name: 'Add cave.png' }));
    await user.type(within(dialog).getByLabelText(/Name/), 'Cave');
    await user.click(within(dialog).getByRole('button', { name: 'Create content item' }));

    const items = await screen.findByRole('region', { name: 'Content items' });
    expect(
      await within(items).findByText('Text could not be read in 1 image.'),
    ).toBeInTheDocument();

    broken = false;
    await user.click(within(items).getByRole('button', { name: 'Retry' }));
    expect(await within(items).findByText(/3 words/)).toBeInTheDocument();
    expect(within(items).queryByText(/could not be read/)).not.toBeInTheDocument();
  });
});
