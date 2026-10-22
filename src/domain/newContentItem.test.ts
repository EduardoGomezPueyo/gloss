import { aProject, aSection, anImage, anItem } from '@/test/builders';
import { applyOcrOutcome } from './images';
import { checkImageFile, suggestedItemTypes, validateNewContentItem } from './newContentItem';

describe('validateNewContentItem', () => {
  it('requires a name and at least one image, and trims the fields', () => {
    expect(validateNewContentItem({ name: ' ', type: '' }, 0)).toEqual({
      ok: false,
      errors: ['nameRequired', 'imagesRequired'],
    });
    expect(validateNewContentItem({ name: ' Harbour ', type: ' Mission dialogue ' }, 2)).toEqual({
      ok: true,
      input: { name: 'Harbour', type: 'Mission dialogue' },
    });
  });
});

describe('checkImageFile', () => {
  it('accepts PNG, JPEG and WebP up to 15 MB', () => {
    expect(checkImageFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(checkImageFile({ type: 'image/gif', size: 1000 })).toBe('unsupportedType');
    expect(checkImageFile({ type: 'image/webp', size: 16 * 1024 * 1024 })).toBe('tooLarge');
  });
});

describe('suggestedItemTypes', () => {
  it('suggests the project types, or defaults when there are none', () => {
    expect(suggestedItemTypes(['Tutorial', 'Mission dialogue', 'Tutorial', ''])).toEqual([
      'Mission dialogue',
      'Tutorial',
    ]);
    expect(suggestedItemTypes([])).toEqual(['Character dialogue', 'Mission dialogue']);
  });
});

describe('applyOcrOutcome', () => {
  const image = () => ({
    ...anImage(anItem(aSection(aProject().id))),
    ocrStatus: 'pending' as const,
  });

  it('stores found text as the source text and the OCR text', () => {
    const blocks = [{ text: 'Hi', bbox: { x: 1, y: 2, width: 3, height: 4 }, confidence: 90 }];
    const done = applyOcrOutcome(image(), { status: 'done', text: 'Hi', blocks });
    expect(done).toMatchObject({ ocrStatus: 'done', ocrError: null });
    expect(done.source).toMatchObject({ text: 'Hi', ocrText: 'Hi', ocrBlocks: blocks });
  });

  it('marks blank text as empty and keeps the error of a failure', () => {
    expect(applyOcrOutcome(image(), { status: 'done', text: '  ', blocks: [] }).ocrStatus).toBe(
      'empty',
    );
    const failed = applyOcrOutcome(image(), { status: 'failed', error: 'No language data' });
    expect(failed).toMatchObject({ ocrStatus: 'failed', ocrError: 'No language data' });
  });
});
