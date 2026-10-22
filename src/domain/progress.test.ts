import { aProject, aSection, aTranslation, anImage, anItem } from '@/test/builders';
import { summarizeProject, toPercent, toProjectSummary } from './progress';

/**
 * Project with target languages es + fr:
 * - section 1, item A: 2 images → es: completed ×2, fr: completed + under review → 3/4
 * - section 1, item B: 1 image  → nothing translated → 0/2
 * - section 2: no items
 */
function fixture() {
  const project = aProject({ targetLanguages: ['es', 'fr'] });
  const s1 = aSection(project.id, { order: 0 });
  const s2 = aSection(project.id, { order: 1 });
  const itemA = anItem(s1, { order: 0 });
  const itemB = anItem(s1, { order: 1 });
  const a1 = anImage(itemA, { source: { ...anImage(itemA).source, text: 'one two' } });
  const a2 = anImage(itemA, { order: 1, source: { ...anImage(itemA).source, text: 'three' } });
  const b1 = anImage(itemB, { source: { ...anImage(itemB).source, text: 'four five six' } });
  const translations = [
    aTranslation(a1, 'es', 'completed'),
    aTranslation(a2, 'es', 'completed'),
    aTranslation(a1, 'fr', 'completed'),
    aTranslation(a2, 'fr', 'under-review'),
    // Source-language translations are ignored.
    aTranslation(b1, 'en', 'completed'),
  ];
  return {
    data: {
      project,
      sections: [s2, s1], // unordered on purpose
      items: [itemB, itemA],
      images: [a1, a2, b1],
      translations,
    },
    ids: { s1: s1.id, s2: s2.id, itemA: itemA.id, itemB: itemB.id },
  };
}

describe('summarizeProject', () => {
  it('computes item progress as completed ÷ (images × target languages)', () => {
    const { data, ids } = fixture();
    const [section] = summarizeProject(data).sections;
    expect(section?.section.id).toBe(ids.s1);
    const [itemA, itemB] = section!.items;
    expect(itemA).toMatchObject({ imageCount: 2, wordCount: 3, languageCount: 2, progress: 0.75 });
    expect(itemA?.status).toBe('under-review');
    expect(itemB).toMatchObject({
      imageCount: 1,
      wordCount: 3,
      progress: 0,
      status: 'not-started',
    });
  });

  it('averages items into sections and sections into the project', () => {
    const detail = summarizeProject(fixture().data);
    const [s1, s2] = detail.sections;
    expect(s1?.progress).toBe(0.375);
    expect(s2).toMatchObject({ progress: 0, status: 'not-started', items: [] });
    expect(detail.progress).toBe(0.1875);
    expect(detail.status).toBe('in-progress');
    expect(detail.wordCount).toBe(6);
  });

  it('computes progress per target language over all images', () => {
    const detail = summarizeProject(fixture().data);
    expect(detail.languages).toEqual([
      { language: 'es', progress: 2 / 3, status: 'in-progress' },
      { language: 'fr', progress: 1 / 3, status: 'in-progress' },
    ]);
  });

  it('computes per-language progress of each section over its own images', () => {
    const detail = summarizeProject(fixture().data);
    const [first, empty] = detail.sections;
    expect(first!.languages).toEqual(detail.languages);
    expect(empty!.languages).toEqual([
      { language: 'es', progress: 0, status: 'not-started' },
      { language: 'fr', progress: 0, status: 'not-started' },
    ]);
  });

  it('reports the most recent update of an item, its images or translations', () => {
    const { data, ids } = fixture();
    const image = data.images.find((i) => i.contentItemId === ids.itemB)!;
    data.translations.push(
      aTranslation(image, 'fr', 'in-progress', {
        updatedAt: '2026-05-01T10:00:00.000Z',
        updatedBy: 'member-1',
      }),
    );
    const itemB = summarizeProject(data).sections[0]!.items[1]!;
    expect(itemB.lastUpdate).toEqual({ at: '2026-05-01T10:00:00.000Z', by: 'member-1' });
    expect(itemB.status).toBe('in-progress');
  });

  it('handles a project without target languages or content', () => {
    const project = aProject({ targetLanguages: [] });
    const detail = summarizeProject({
      project,
      sections: [],
      items: [],
      images: [],
      translations: [],
    });
    expect(detail).toMatchObject({
      progress: 0,
      status: 'not-started',
      languages: [],
      wordCount: 0,
    });
  });

  it('drops the section breakdown for list summaries', () => {
    const summary = toProjectSummary(summarizeProject(fixture().data));
    expect(summary).not.toHaveProperty('sections');
    expect(summary.progress).toBe(0.1875);
  });
});

describe('toPercent', () => {
  it('rounds to a whole percentage', () => {
    expect(toPercent(0)).toBe(0);
    expect(toPercent(0.1875)).toBe(19);
    expect(toPercent(2 / 3)).toBe(67);
    expect(toPercent(1)).toBe(100);
  });
});
