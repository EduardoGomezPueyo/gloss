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
});
