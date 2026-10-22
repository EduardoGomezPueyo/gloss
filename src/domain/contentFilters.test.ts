import { aProject, aSection, anItem } from '@/test/builders';
import { filterItems } from './contentFilters';
import type { ItemSummary } from './progress';
import type { Status } from './types';

function summary(name: string, type: string, status: Status): ItemSummary {
  const item = anItem(aSection(aProject().id), { name, type });
  return {
    item,
    imageCount: 1,
    wordCount: 1,
    languageCount: 1,
    progress: 0,
    status,
    lastUpdate: { at: item.updatedAt, by: null },
  };
}

const items = [
  summary('Harbour arrival', 'Mission dialogue', 'completed'),
  summary('Café talk', 'Character dialogue', 'in-progress'),
  summary('Final duel', 'Mission dialogue', 'in-progress'),
];
const names = (list: ItemSummary[]) => list.map((s) => s.item.name);

describe('filterItems', () => {
  it('matches the name or the type, ignoring case and accents', () => {
    expect(names(filterItems(items, 'CAFE', null))).toEqual(['Café talk']);
    expect(names(filterItems(items, 'mission', null))).toEqual(['Harbour arrival', 'Final duel']);
  });

  it('filters by status and combines it with the search', () => {
    expect(names(filterItems(items, '', 'in-progress'))).toEqual(['Café talk', 'Final duel']);
    expect(names(filterItems(items, 'mission', 'in-progress'))).toEqual(['Final duel']);
    expect(filterItems(items, '  ', null)).toHaveLength(3);
  });
});
