import 'fake-indexeddb/auto';
import { TranslatorDb } from './db';
import type { Repositories } from '../repositories/types';
import { createFixtureData } from '@/test/fixtures/workspaceFixture';
import { createLocalRepositories } from './localRepositories';

let dbCounter = 0;

function loadFixture(repos: Repositories) {
  return repos.workspace.replace(createFixtureData(), []);
}

function setup() {
  const db = new TranslatorDb(`test-${++dbCounter}`);
  return { db, repos: createLocalRepositories(db) };
}

describe('local repositories', () => {
  it('initializes an empty workspace with its owner only once', async () => {
    const { db, repos } = setup();
    await Promise.all([repos.workspace.ensureInitialized(), repos.workspace.ensureInitialized()]);
    await repos.workspace.ensureInitialized();
    expect(await db.projects.count()).toBe(0);
    expect(await repos.members.list()).toMatchObject([
      { name: 'Alex Morgan', category: 'manager', status: 'active' },
    ]);
  });

  it('replaces all data and files with a loaded workspace', async () => {
    const { db, repos } = setup();
    await repos.workspace.ensureInitialized();
    await repos.workspace.replace(createFixtureData(), [
      { id: 'file-1', name: 'scene.svg', data: new Blob(['<svg/>'], { type: 'image/svg+xml' }) },
    ]);
    expect(await db.projects.count()).toBe(8);
    expect(await db.members.count()).toBe(8);
    expect(await db.files.get('file-1')).toMatchObject({ type: 'image/svg+xml', size: 6 });

    // Already initialized: opening it again keeps the loaded data as it is.
    await repos.workspace.ensureInitialized();
    expect(await db.members.count()).toBe(8);
  });

  it('lists members by name, without removed ones', async () => {
    const { db, repos } = setup();
    await loadFixture(repos);
    const [first] = await repos.members.list();
    await db.members.update(first!.id, { removedAt: new Date().toISOString() });

    const members = await repos.members.list();
    expect(members).toHaveLength(7);
    expect(members.map((m) => m.name)).toEqual([...members.map((m) => m.name)].sort());
    expect(await repos.members.get(first!.id)).toBeDefined();
  });

  it('summarizes every project and returns the same numbers in the detail', async () => {
    const { repos } = setup();
    await loadFixture(repos);
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
    await loadFixture(repos);
    expect(await repos.projects.getDetail('missing')).toBeUndefined();
  });

  it('creates an empty project with a generated, unique code', async () => {
    const { repos } = setup();
    await loadFixture(repos);
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

describe('local repositories: workspace settings, backup and reset', () => {
  it('keeps settings, with the defaults until they change', async () => {
    const { repos } = setup();
    expect(await repos.workspace.getSettings()).toEqual({ workersSeeOnlyTheirProjects: true });
    await repos.workspace.updateSettings({ workersSeeOnlyTheirProjects: false });
    expect(await repos.workspace.getSettings()).toEqual({ workersSeeOnlyTheirProjects: false });
  });

  it('exports everything and restores it into another workspace', async () => {
    const { repos } = setup();
    await repos.workspace.replace(createFixtureData(), [
      { id: 'file-1', name: 'scene.svg', data: new Blob(['<svg/>'], { type: 'image/svg+xml' }) },
    ]);
    await repos.workspace.updateSettings({ workersSeeOnlyTheirProjects: false });
    const backup = await repos.workspace.exportAll();
    expect(backup.data.projects).toHaveLength(8);
    expect(backup.files).toHaveLength(1);
    expect(backup.settings.workersSeeOnlyTheirProjects).toBe(false);

    const other = setup();
    await other.repos.workspace.replace(backup.data, backup.files, backup.settings);
    expect(await other.db.projects.count()).toBe(8);
    expect(await other.db.files.get('file-1')).toMatchObject({ type: 'image/svg+xml', size: 6 });
    expect(await other.repos.workspace.getSettings()).toEqual(backup.settings);
  });

  it('resets to an empty workspace with a new owner and default settings', async () => {
    const { db, repos } = setup();
    await loadFixture(repos);
    await repos.workspace.updateSettings({ workersSeeOnlyTheirProjects: false });
    await repos.workspace.reset();
    expect(await db.projects.count()).toBe(0);
    expect(await db.files.count()).toBe(0);
    expect(await repos.members.list()).toMatchObject([{ name: 'Alex Morgan' }]);
    expect(await repos.workspace.getSettings()).toEqual({ workersSeeOnlyTheirProjects: true });
  });
});

describe('local repositories: renaming and deleting projects', () => {
  it('renames a project and refuses an ID another project uses', async () => {
    const { repos } = setup();
    await loadFixture(repos);
    const [alpha, beta] = (await repos.projects.listSummaries())
      .map((s) => s.project)
      .sort((a, b) => a.name.localeCompare(b.name));
    const renamed = await repos.projects.rename(
      alpha!.id,
      { name: ' Ember ', code: 'emb-1' },
      'm1',
    );
    expect(renamed).toMatchObject({ name: 'Ember', code: 'EMB-1', updatedBy: 'm1' });
    await expect(
      repos.projects.rename(alpha!.id, { name: 'Ember', code: beta!.code }, 'm1'),
    ).rejects.toThrow();
  });

  it('hides deleted projects everywhere but keeps their data and ID', async () => {
    const { db, repos } = setup();
    await loadFixture(repos);
    const [first, second] = (await repos.projects.listSummaries()).map((s) => s.project);
    await repos.projects.remove([first!.id], 'm1');

    expect((await repos.projects.listSummaries()).map((s) => s.project.id)).not.toContain(
      first!.id,
    );
    expect(await repos.projects.getDetail(first!.id)).toBeUndefined();
    expect(await repos.projects.getData(first!.id)).toBeUndefined();
    expect(await db.projects.get(first!.id)).toMatchObject({ updatedBy: 'm1' });
    expect((await db.projects.get(first!.id))!.deletedAt).toBeTruthy();
    // Its ID stays taken.
    await expect(
      repos.projects.rename(second!.id, { name: second!.name, code: first!.code }, 'm1'),
    ).rejects.toThrow();
  });
});

describe('local repositories: assignments and the review queue', () => {
  async function alpha() {
    const { db, repos } = setup();
    await loadFixture(repos);
    const project = (await db.projects.toArray()).find((p) => p.name === 'Sample Project Alpha')!;
    const items = (await db.contentItems.where({ projectId: project.id }).toArray()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return { db, repos, project, items };
  }

  it('assigns, reassigns and unassigns an item in a language', async () => {
    const { repos, project, items } = await alpha();
    const [manager] = project.managerIds;
    const [, daniel] = project.memberIds;
    const item = items[3]!;

    await repos.assignments.assign(item.id, 'fr', daniel!, manager!);
    let mine = (await repos.assignments.listForProject(project.id)).filter(
      (a) => a.contentItemId === item.id,
    );
    expect(mine).toMatchObject([{ language: 'fr', assigneeId: daniel }]);

    await repos.assignments.assign(item.id, 'fr', manager!, manager!);
    mine = (await repos.assignments.listForProject(project.id)).filter(
      (a) => a.contentItemId === item.id,
    );
    expect(mine).toMatchObject([{ language: 'fr', assigneeId: manager }]);

    await repos.assignments.assign(item.id, 'fr', null, manager!);
    expect(
      (await repos.assignments.listForProject(project.id)).some((a) => a.contentItemId === item.id),
    ).toBe(false);
  });

  it('only lets managers assign, to the project people, in its languages', async () => {
    const { db, repos, project, items } = await alpha();
    const [manager] = project.managerIds;
    const [chloe] = project.memberIds;
    const outsider = (await db.members.toArray()).find(
      (m) => !project.memberIds.includes(m.id) && !project.managerIds.includes(m.id),
    )!;
    await expect(repos.assignments.assign(items[0]!.id, 'es', chloe!, chloe!)).rejects.toThrow();
    await expect(
      repos.assignments.assign(items[0]!.id, 'es', outsider.id, manager!),
    ).rejects.toThrow();
    await expect(repos.assignments.assign(items[0]!.id, 'pt', chloe!, manager!)).rejects.toThrow();
  });

  it('lists assignments with their images and translations in that language', async () => {
    const { repos, project } = await alpha();
    const entries = (await repos.assignments.listInbox()).filter(
      (e) => e.project.id === project.id,
    );
    expect(entries).toHaveLength(2);
    const [entry] = entries;
    expect(entry!.images.length).toBeGreaterThan(0);
    expect(entry!.translations.every((t) => t.language === entry!.assignment.language)).toBe(true);
    expect(entry!.section.projectId).toBe(project.id);

    await repos.projects.remove([project.id], null);
    expect((await repos.assignments.listInbox()).some((e) => e.project.id === project.id)).toBe(
      false,
    );
  });

  it('lists the translations under review with their image and item', async () => {
    const { db, repos } = setup();
    await loadFixture(repos);
    const waiting = await db.translations.filter((t) => t.status === 'under-review').toArray();
    const queue = await repos.translations.listReviewQueue();
    expect(queue).toHaveLength(waiting.length);
    expect(queue.every((e) => e.translation.status === 'under-review')).toBe(true);
    expect(queue.every((e) => e.image.id === e.translation.imageId)).toBe(true);
  });
});

describe('local repositories: sections, items and languages', () => {
  async function alpha() {
    const { db, repos } = setup();
    await loadFixture(repos);
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

  it('updates project details and rejects a project without managers', async () => {
    const { repos, detail } = await alpha();
    const id = detail.project.id;
    const project = await repos.projects.updateDetails(
      id,
      { priority: 'low', releaseDate: 'Q1 2027', platforms: ['pc'] },
      'm1',
    );
    expect(project).toMatchObject({ priority: 'low', releaseDate: 'Q1 2027', platforms: ['pc'] });
    expect(project.updatedBy).toBe('m1');
    expect(project.code).toBe(detail.project.code);

    await expect(repos.projects.updateDetails(id, { managerIds: [] }, 'm1')).rejects.toThrow();
    const [manager] = detail.project.managerIds;
    await expect(
      repos.projects.updateDetails(id, { memberIds: [manager!] }, 'm1'),
    ).rejects.toThrow();
  });
});

describe('local repositories: content and OCR', () => {
  async function firstSection() {
    const { db, repos } = setup();
    await loadFixture(repos);
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
    await loadFixture(repos);
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
      { text: 'Fixed line', speaker: ' Mira ', type: '' },
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

  it('loads two comment threads on the first project', async () => {
    const { db } = await fixture();
    expect(await db.commentThreads.count()).toBe(2);
    expect(await db.comments.count()).toBe(3);
  });
});

describe('local repositories: glossary', () => {
  async function fixture() {
    const { db, repos } = setup();
    await loadFixture(repos);
    const alpha = (await repos.projects.listSummaries()).find(
      (s) => s.project.name === 'Sample Project Alpha',
    )!.project;
    return { db, repos, projectId: alpha.id };
  }

  it('loads default categories for every project and entries for the first one', async () => {
    const { db, repos, projectId } = await fixture();
    expect((await repos.glossary.listCategories(projectId)).map((c) => c.name)).toEqual([
      'Characters',
      'Factions',
      'Locations',
      'Lore',
    ]);
    expect(await db.glossaryCategories.count()).toBe(8 * 4);
    expect((await repos.glossary.listEntries(projectId)).length).toBeGreaterThan(5);
  });

  it('creates categories with unique names, and new projects get the defaults', async () => {
    const { repos, projectId } = await fixture();
    const created = await repos.glossary.createCategory(projectId, ' Items ', 'm1');
    expect(created).toMatchObject({ name: 'Items', order: 4 });
    await expect(repos.glossary.createCategory(projectId, 'items', 'm1')).rejects.toThrow();

    const project = await repos.projects.create(
      {
        name: 'Fresh',
        sourceLanguage: 'en',
        targetLanguages: [],
        platforms: [],
        managerIds: ['m1'],
        memberIds: [],
        priority: 'none',
      },
      'm1',
    );
    expect(await repos.glossary.listCategories(project.id)).toHaveLength(4);
  });

  it('versions every save and restores an older version as a new one', async () => {
    const { repos, projectId } = await fixture();
    const [category] = await repos.glossary.listCategories(projectId);
    const content = {
      categoryId: category!.id,
      title: 'Old Mill',
      description: 'A mill.',
      tags: ['Place'],
      imageFileIds: [],
      body: 'First text.',
    };
    const entry = await repos.glossary.createEntry(projectId, content, 'w1');
    await repos.glossary.updateEntry(entry.id, { ...content, body: 'Second text.' }, 'w2');
    // Saving the same content again adds no version.
    await repos.glossary.updateEntry(entry.id, { ...content, body: 'Second text.' }, 'w2');

    let versions = await repos.glossary.listVersions(entry.id);
    expect(versions.map((v) => [v.body, v.createdBy])).toEqual([
      ['Second text.', 'w2'],
      ['First text.', 'w1'],
    ]);

    const restored = await repos.glossary.restoreVersion(entry.id, versions[1]!.id, 'm1');
    expect(restored.body).toBe('First text.');
    versions = await repos.glossary.listVersions(entry.id);
    expect(versions).toHaveLength(3);

    await repos.glossary.recordView(entry.id);
    expect((await repos.glossary.getEntry(entry.id))!.viewCount).toBe(1);
  });

  it('stores gallery images as files', async () => {
    const { repos } = await fixture();
    const id = await repos.glossary.storeImage({
      name: 'map.png',
      data: new Blob(['map'], { type: 'image/png' }),
    });
    expect(await (await repos.images.getFile(id))!.text()).toBe('map');
  });
});

describe('local repositories: members', () => {
  async function fixture() {
    const { db, repos } = setup();
    await loadFixture(repos);
    const members = await repos.members.list();
    const byName = (name: string) => members.find((m) => m.name === name)!;
    return {
      db,
      repos,
      ana: byName('Ana Torres'),
      ben: byName('Ben Carter'),
      chloe: byName('Chloé Martin'),
    };
  }

  it('invites members as Invited and refuses taken emails', async () => {
    const { repos, ana } = await fixture();
    const [iris] = await repos.members.invite(
      [{ name: 'Iris Holm', email: 'Iris@example.com', category: 'worker' }],
      ana.id,
    );
    expect(iris).toMatchObject({ status: 'invited', email: 'iris@example.com', createdBy: ana.id });
    await expect(
      repos.members.invite(
        [{ name: 'Again', email: 'iris@example.com', category: 'worker' }],
        ana.id,
      ),
    ).rejects.toThrow();
  });

  it('changes categories but keeps a manager', async () => {
    const { repos, ana, ben, chloe } = await fixture();
    await repos.members.setCategory([chloe.id], 'manager', ana.id);
    expect((await repos.members.get(chloe.id))!.category).toBe('manager');
    await expect(
      repos.members.setCategory([ana.id, ben.id, chloe.id], 'worker', ana.id),
    ).rejects.toThrow();
  });

  it('removes others softly but never yourself', async () => {
    const { repos, ana, chloe } = await fixture();
    await expect(repos.members.remove([ana.id], ana.id)).rejects.toThrow();
    await repos.members.remove([chloe.id], ana.id);
    expect((await repos.members.list()).some((m) => m.id === chloe.id)).toBe(false);
    expect((await repos.members.get(chloe.id))!.removedAt).not.toBeNull();
  });
});
