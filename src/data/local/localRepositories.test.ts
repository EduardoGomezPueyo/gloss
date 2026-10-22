import 'fake-indexeddb/auto';
import { TranslatorDb } from './db';
import { createLocalRepositories } from './localRepositories';

let dbCounter = 0;

function setup() {
  const db = new TranslatorDb(`test-${++dbCounter}`);
  return { db, repos: createLocalRepositories(db) };
}

describe('local repositories', () => {
  it('seeds the demo data only once', async () => {
    const { db, repos } = setup();
    await Promise.all([repos.demo.ensureSeeded(), repos.demo.ensureSeeded()]);
    await repos.demo.ensureSeeded();
    expect(await db.projects.count()).toBe(8);
    expect(await db.members.count()).toBe(8);
  });

  it('resets the sandbox to the demo data', async () => {
    const { db, repos } = setup();
    await repos.demo.ensureSeeded();
    await db.projects.clear();
    expect(await db.projects.count()).toBe(0);

    await repos.demo.reset();
    expect(await db.projects.count()).toBe(8);
    expect(await db.members.count()).toBe(8);
  });

  it('lists members by name, without removed ones', async () => {
    const { db, repos } = setup();
    await repos.demo.ensureSeeded();
    const [first] = await repos.members.list();
    await db.members.update(first!.id, { removedAt: new Date().toISOString() });

    const members = await repos.members.list();
    expect(members).toHaveLength(7);
    expect(members.map((m) => m.name)).toEqual([...members.map((m) => m.name)].sort());
    expect(await repos.members.get(first!.id)).toBeDefined();
  });

  it('summarizes every project and returns the same numbers in the detail', async () => {
    const { repos } = setup();
    await repos.demo.ensureSeeded();
    const summaries = await repos.projects.listSummaries();
    expect(summaries).toHaveLength(8);

    const alpha = summaries.find((s) => s.project.name === 'Sample Project Alpha')!;
    const detail = await repos.projects.getDetail(alpha.project.id);
    expect(detail?.sections.map((s) => s.section.name)).toEqual([
      'Act 1 - Opening',
      'Act 2 - The journey',
      'Act 3 - Turning point',
      'Act 4 - Ending',
    ]);
    expect(detail).toMatchObject({
      progress: alpha.progress,
      status: alpha.status,
      wordCount: alpha.wordCount,
      languages: alpha.languages,
    });
  });

  it('returns undefined for an unknown project', async () => {
    const { repos } = setup();
    await repos.demo.ensureSeeded();
    expect(await repos.projects.getDetail('missing')).toBeUndefined();
  });

  it('creates an empty project with a generated, unique code', async () => {
    const { repos } = setup();
    await repos.demo.ensureSeeded();
    const input = {
      name: 'Moonfall',
      sourceLanguage: 'ja',
      targetLanguages: ['es', 'fr'],
      platforms: ['pc' as const],
      managerIds: ['m1'],
      memberIds: [],
      priority: 'high' as const,
    };

    const first = await repos.projects.create(input, 'm1');
    const second = await repos.projects.create(input, 'm1');
    const year = new Date().getFullYear();
    expect(first).toMatchObject({ ...input, code: `MOON-${year}`, createdBy: 'm1' });
    expect(second.code).toBe(`MOON-${year}-2`);

    const summary = (await repos.projects.listSummaries()).find((s) => s.project.id === first.id);
    expect(summary).toMatchObject({ progress: 0, status: 'not-started', wordCount: 0 });
    expect(summary?.languages.map((l) => l.language)).toEqual(['es', 'fr']);
  });
});

describe('local repositories: sections, items and languages', () => {
  async function alpha() {
    const { db, repos } = setup();
    await repos.demo.ensureSeeded();
    const summary = (await repos.projects.listSummaries()).find(
      (s) => s.project.name === 'Sample Project Alpha',
    )!;
    const detail = (await repos.projects.getDetail(summary.project.id))!;
    return { db, repos, detail };
  }

  it('creates a section after the last one and edits it', async () => {
    const { repos, detail } = await alpha();
    const created = await repos.sections.create(
      detail.project.id,
      { name: 'Act 5 - Epilogue', description: '' },
      'm1',
    );
    expect(created.order).toBe(4);

    const updated = await repos.sections.update(
      created.id,
      { name: 'Act 5 - Afterword', description: 'Credits.' },
      'm2',
    );
    expect(updated).toMatchObject({ name: 'Act 5 - Afterword', updatedBy: 'm2', order: 4 });
    const after = await repos.projects.getDetail(detail.project.id);
    expect(after?.sections.at(-1)?.section.name).toBe('Act 5 - Afterword');
  });

  it('moves items to another section and keeps their progress', async () => {
    const { repos, detail } = await alpha();
    const [first, second] = detail.sections;
    const moving = first!.items.slice(0, 2);

    await repos.contentItems.moveToSection(
      moving.map((s) => s.item.id),
      second!.section.id,
      'm1',
    );

    const after = (await repos.projects.getDetail(detail.project.id))!;
    expect(after.sections[0]!.items).toHaveLength(first!.items.length - 2);
    const moved = after.sections[1]!.items.slice(-2);
    expect(moved.map((s) => s.item.id)).toEqual(moving.map((s) => s.item.id));
    expect(moved.map((s) => s.progress)).toEqual(moving.map((s) => s.progress));
  });

  it('adds a target language that starts not started, and rejects invalid ones', async () => {
    const { repos, detail } = await alpha();
    const project = await repos.projects.addLanguage(detail.project.id, 'ko', 'm1');
    expect(project.targetLanguages.at(-1)).toBe('ko');

    const after = (await repos.projects.getDetail(detail.project.id))!;
    expect(after.languages.at(-1)).toEqual({ language: 'ko', progress: 0, status: 'not-started' });
    await expect(repos.projects.addLanguage(detail.project.id, 'ko', 'm1')).rejects.toThrow();
    await expect(repos.projects.addLanguage(detail.project.id, 'en', 'm1')).rejects.toThrow();
  });
});

describe('local repositories: content and OCR', () => {
  async function firstSection() {
    const { db, repos } = setup();
    await repos.demo.ensureSeeded();
    const summary = (await repos.projects.listSummaries()).find(
      (s) => s.project.name === 'Sample Project Alpha',
    )!;
    const detail = (await repos.projects.getDetail(summary.project.id))!;
    return { db, repos, detail, section: detail.sections[0]! };
  }

  const png = (text: string) => new Blob([text], { type: 'image/png' });

  it('creates an item with its images in order, waiting for OCR', async () => {
    const { repos, detail, section } = await firstSection();
    const item = await repos.contentItems.create(
      section.section.id,
      { name: 'Harbour', type: 'Mission dialogue' },
      [
        { name: 'b.png', data: png('second') },
        { name: 'a.png', data: png('first') },
      ],
      'm1',
    );
    expect(item.order).toBe(section.items.length);

    const pending = await repos.images.listPendingOcr();
    expect(pending.map((p) => p.image.fileName)).toEqual(['b.png', 'a.png']);
    expect(pending.every((p) => p.language === detail.project.sourceLanguage)).toBe(true);
    const file = await repos.images.getFile(pending[0]!.image.fileId!);
    expect(await file!.text()).toBe('second');

    const after = (await repos.projects.getDetail(detail.project.id))!;
    const created = after.sections[0]!.items.at(-1)!;
    expect(created).toMatchObject({ imageCount: 2, wordCount: 0, progress: 0 });
    expect(created.ocr).toEqual({ pending: 2, empty: 0, failed: 0 });
  });

  it('saves OCR outcomes and retries failures', async () => {
    const { repos, section } = await firstSection();
    await repos.contentItems.create(
      section.section.id,
      { name: 'Harbour', type: '' },
      [
        { name: 'a.png', data: png('a') },
        { name: 'b.png', data: png('b') },
      ],
      null,
    );
    const [a, b] = await repos.images.listPendingOcr();
    await repos.images.saveOcrOutcome(a!.image.id, {
      status: 'done',
      text: 'Meet me at the gate',
      blocks: [],
    });
    await repos.images.saveOcrOutcome(b!.image.id, { status: 'failed', error: 'offline' });
    expect(await repos.images.listPendingOcr()).toEqual([]);

    await repos.images.retryOcr(a!.image.contentItemId);
    const pending = await repos.images.listPendingOcr();
    expect(pending.map((p) => p.image.id)).toEqual([b!.image.id]);
  });
});

describe('local repositories: editor writes', () => {
  async function fixture() {
    const { db, repos } = setup();
    await repos.demo.ensureSeeded();
    const summary = (await repos.projects.listSummaries()).find(
      (s) => s.project.name === 'Sample Project Beta',
    )!;
    const detail = (await repos.projects.getDetail(summary.project.id))!;
    const section = detail.sections[0]!;
    const item = section.items[0]!.item;
    const { images } = await repos.images.listForItem(item.id);
    const manager = (await db.members.toArray()).find((m) => m.category === 'manager');
    return { db, repos, section, item, image: images[0]!, managerId: manager!.id };
  }

  it('runs a translation through mark, submit and review', async () => {
    const { repos, section, image, managerId } = await fixture();
    const read = async () =>
      (await repos.images.listForItem(image.contentItemId)).translations.find(
        (t) => t.imageId === image.id && t.language === 'es',
      );

    // Beta starts untranslated: saving empty text creates nothing.
    await repos.translations.save(image.id, 'es', '', 'w1');
    expect(await read()).toBeUndefined();

    await repos.translations.save(image.id, 'es', 'Hola', 'w1');
    expect(await read()).toMatchObject({ status: 'in-progress', ready: false, authorId: 'w1' });

    await repos.translations.setReady(image.id, 'es', true, 'w1');
    expect(await repos.translations.submitSectionForReview(section.section.id, 'w1')).toBe(1);
    expect(await read()).toMatchObject({ status: 'under-review', ready: false });

    await expect(repos.translations.review(image.id, 'es', 'approve', 'w1')).rejects.toThrow();
    await repos.translations.review(image.id, 'es', 'approve', managerId);
    expect(await read()).toMatchObject({ status: 'completed', reviewerId: managerId });

    await repos.translations.save(image.id, 'es', 'Hola de nuevo', 'w1');
    expect(await read()).toMatchObject({ status: 'in-progress', reviewerId: null });
  });

  it('corrects the source text and the note for translators', async () => {
    const { repos, item, image } = await fixture();
    await repos.images.updateSource(
      image.id,
      { text: 'Fixed line', speaker: ' Mira ', type: '', contextNote: null },
      'm1',
    );
    const [updated] = (await repos.images.listForItem(item.id)).images;
    expect(updated!.source).toMatchObject({
      text: 'Fixed line',
      speaker: 'Mira',
      type: null,
      ocrText: image.source.ocrText,
    });

    await repos.contentItems.updateNote(item.id, '  Keep it short. ', 'm1');
    const detail = await repos.projects.getDetail(item.projectId);
    const saved = detail!.sections.flatMap((s) => s.items).find((s) => s.item.id === item.id);
    expect(saved!.item.translatorNote).toBe('Keep it short.');
  });

  it('starts, replies to, resolves and reopens comment threads', async () => {
    const { repos, image } = await fixture();
    await repos.comments.startThread(image.id, 'es', ' Is this formal? ', 'w1');
    let [entry] = await repos.comments.listForImage(image.id);
    expect(entry!.thread).toMatchObject({ language: 'es', resolvedAt: null });
    expect(entry!.comments.map((c) => c.body)).toEqual(['Is this formal?']);

    await repos.comments.reply(entry!.thread.id, 'Informal, please.', 'm1');
    await repos.comments.resolve(entry!.thread.id, 'm1');
    [entry] = await repos.comments.listForImage(image.id);
    expect(entry!.comments).toHaveLength(2);
    expect(entry!.thread).toMatchObject({ resolvedBy: 'm1' });

    await repos.comments.reopen(entry!.thread.id, 'w1');
    [entry] = await repos.comments.listForImage(image.id);
    expect(entry!.thread.resolvedAt).toBeNull();
  });

  it('seeds two comment threads on the first project', async () => {
    const { db } = await fixture();
    expect(await db.commentThreads.count()).toBe(2);
    expect(await db.comments.count()).toBe(3);
  });
});
