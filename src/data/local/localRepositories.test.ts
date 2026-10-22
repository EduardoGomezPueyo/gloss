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
