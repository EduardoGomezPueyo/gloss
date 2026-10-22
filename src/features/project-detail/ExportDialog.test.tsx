import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderApp } from '@/test/renderApp';
import { downloadFile } from '@/ui/downloadFile';

vi.mock('@/ui/downloadFile', () => ({ downloadFile: vi.fn() }));

async function openExport() {
  const user = userEvent.setup();
  renderApp('/projects');
  await user.click(await screen.findByRole('link', { name: 'Sample Project Alpha' }));
  await user.click(await screen.findByRole('button', { name: 'Export to code' }));
  const dialog = await screen.findByRole('dialog', { name: 'Export to code' });
  await within(dialog).findByText(/strings ·/);
  return { user, dialog };
}

describe('Export to code', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.mocked(downloadFile).mockClear();
    await i18n.changeLanguage('en');
  });

  it('downloads completed translations as JSON by default', async () => {
    const { user, dialog } = await openExport();
    expect(within(dialog).getByRole('radio', { name: /JSON/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Download' }));

    expect(downloadFile).toHaveBeenCalledOnce();
    const [content, fileName, mimeType] = vi.mocked(downloadFile).mock.calls[0]!;
    expect(fileName).toBe('SMP-ALPHA-2026-translations.json');
    expect(mimeType).toBe('application/json');
    const file = JSON.parse(content);
    expect(file).toMatchObject({
      format: 'translator-export',
      version: 1,
      include: 'completed',
      languages: ['es', 'fr', 'de', 'it', 'ja'],
      project: { code: 'SMP-ALPHA-2026', sourceLanguage: 'en' },
    });
    expect(file.strings[0].key).toMatch(/^act-1-opening\.scene-1-1\.01$/);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('exports chosen languages, including unfinished text, as CSV', async () => {
    const { user, dialog } = await openExport();
    await user.click(within(dialog).getByRole('radio', { name: /CSV/ }));
    for (const language of ['French', 'German', 'Italian', 'Japanese']) {
      await user.click(within(dialog).getByRole('checkbox', { name: new RegExp(language) }));
    }
    const before = within(dialog).getByText(/strings ·/).textContent;
    await user.click(
      within(dialog).getByRole('checkbox', { name: /Include translations that are not completed/ }),
    );
    // More translations count once unfinished ones are included.
    expect(within(dialog).getByText(/strings ·/).textContent).not.toBe(before);
    await user.click(within(dialog).getByRole('button', { name: 'Download' }));

    const [content, fileName] = vi.mocked(downloadFile).mock.calls[0]!;
    expect(fileName).toBe('SMP-ALPHA-2026-translations.csv');
    expect(content.split('\r\n')[0]).toBe(
      '﻿key,id,section,item,position,speaker,type,context,source,es',
    );
  });

  it('needs at least one language', async () => {
    const { user, dialog } = await openExport();
    for (const language of ['Spanish', 'French', 'German', 'Italian', 'Japanese']) {
      await user.click(within(dialog).getByRole('checkbox', { name: new RegExp(language) }));
    }
    expect(within(dialog).getByText('Choose at least one language.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeDisabled();
  });
});
