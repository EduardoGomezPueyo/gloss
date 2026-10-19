import { summarizeProject } from '@/domain/progress';
import { createDemoData } from './demoSeed';

const NOW = new Date('2026-10-19T12:00:00.000Z');

function sequentialIds() {
  let n = 0;
  return () => `id-${++n}`;
}

describe('createDemoData', () => {
  const data = createDemoData({ now: NOW, randomId: sequentialIds() });

  it('is deterministic for the same clock and id generator', () => {
    expect(createDemoData({ now: NOW, randomId: sequentialIds() })).toEqual(data);
  });

  it('only references entities that exist', () => {
    const ids = (list: { id: string }[]) => new Set(list.map((e) => e.id));
    const members = ids(data.members);
    const projects = ids(data.projects);
    const sections = ids(data.sections);
    const items = ids(data.items);
    const images = ids(data.images);

    for (const p of data.projects) {
      for (const id of [...p.managerIds, ...p.memberIds]) expect(members).toContain(id);
    }
    for (const s of data.sections) expect(projects).toContain(s.projectId);
    for (const i of data.items) expect(sections).toContain(i.sectionId);
    for (const i of data.images) expect(items).toContain(i.contentItemId);
    for (const t of data.translations) {
      expect(images).toContain(t.imageId);
      if (t.authorId) expect(members).toContain(t.authorId);
      if (t.reviewerId) expect(members).toContain(t.reviewerId);
    }
  });

  it('assigns managers and workers by category', () => {
    const byId = new Map(data.members.map((m) => [m.id, m]));
    for (const p of data.projects) {
      expect(p.managerIds.length).toBeGreaterThan(0);
      for (const id of p.managerIds) expect(byId.get(id)?.category).toBe('manager');
      for (const id of p.memberIds) expect(byId.get(id)?.category).toBe('worker');
    }
  });

  it('only translates into target languages, never the source language', () => {
    const projects = new Map(data.projects.map((p) => [p.id, p]));
    for (const p of data.projects) expect(p.targetLanguages).not.toContain(p.sourceLanguage);
    for (const t of data.translations) {
      expect(projects.get(t.projectId)?.targetLanguages).toContain(t.language);
    }
  });

  it('has at most one translation per image and language', () => {
    const keys = data.translations.map((t) => `${t.imageId}|${t.language}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('covers every project status so the list shows all of them', () => {
    const statuses = new Set(
      data.projects.map(
        (project) =>
          summarizeProject({
            project,
            sections: data.sections.filter((s) => s.projectId === project.id),
            items: data.items.filter((i) => i.projectId === project.id),
            images: data.images.filter((i) => i.projectId === project.id),
            translations: data.translations.filter((t) => t.projectId === project.id),
          }).status,
      ),
    );
    expect(statuses).toEqual(new Set(['not-started', 'in-progress', 'under-review', 'completed']));
  });

  it('dates everything in the past', () => {
    for (const t of data.translations) expect(new Date(t.updatedAt) < NOW).toBe(true);
  });
});
