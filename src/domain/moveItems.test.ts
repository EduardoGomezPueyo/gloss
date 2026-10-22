import { aProject, aSection, anItem } from '@/test/builders';
import { planMove } from './moveItems';

function fixture() {
  const project = aProject();
  const from = aSection(project.id, { order: 0 });
  const to = aSection(project.id, { order: 1 });
  const a = anItem(from, { order: 0 });
  const b = anItem(from, { order: 1 });
  const c = anItem(from, { order: 2 });
  const existing = anItem(to, { order: 4 });
  return { items: [c, a, b, existing], from, to, a, b, c, existing };
}

describe('planMove', () => {
  it('appends the moved items after the destination items, keeping their order', () => {
    const { items, to, a, c } = fixture();
    expect(planMove(items, [c.id, a.id], to.id)).toEqual([
      { id: a.id, sectionId: to.id, order: 5 },
      { id: c.id, sectionId: to.id, order: 6 },
    ]);
  });

  it('starts at 0 in an empty section and skips items already there', () => {
    const { items, from, existing } = fixture();
    const empty = aSection(from.projectId, { order: 2 });
    expect(planMove(items, [existing.id], empty.id)).toEqual([
      { id: existing.id, sectionId: empty.id, order: 0 },
    ]);
    expect(planMove(items, [existing.id], existing.sectionId)).toEqual([]);
  });
});
