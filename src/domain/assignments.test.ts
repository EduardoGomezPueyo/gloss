import { assigneeOf, byPriorityThenRecent, itemLanguageProgress } from './assignments';
import type { Priority } from './types';

describe('assignments', () => {
  it('finds the assignee of an item in a language', () => {
    const assignments = [
      { contentItemId: 'i1', language: 'es', assigneeId: 'chloe' },
      { contentItemId: 'i1', language: 'fr', assigneeId: 'dan' },
    ];
    expect(assigneeOf(assignments, 'i1', 'fr')).toBe('dan');
    expect(assigneeOf(assignments, 'i1', 'de')).toBeNull();
    expect(assigneeOf(assignments, 'i2', 'es')).toBeNull();
  });

  it('measures an item in one language', () => {
    const images = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const translations = [
      { imageId: 'a', language: 'es', status: 'completed' as const, ready: false },
      { imageId: 'b', language: 'es', status: 'in-progress' as const, ready: true },
      { imageId: 'c', language: 'fr', status: 'completed' as const, ready: false },
    ];
    expect(itemLanguageProgress(images, translations, 'es')).toEqual({
      done: 2,
      total: 3,
      status: 'in-progress',
    });
    expect(itemLanguageProgress(images, translations, 'de')).toEqual({
      done: 0,
      total: 3,
      status: 'not-started',
    });
  });

  it('orders by project priority, then the most recent first', () => {
    const entry = (id: string, priority: Priority, at: string) => ({ id, priority, at });
    const sorted = byPriorityThenRecent(
      [
        entry('low-new', 'low', '2026-10-05'),
        entry('urgent-old', 'urgent', '2026-10-01'),
        entry('urgent-new', 'urgent', '2026-10-04'),
      ],
      (e) => e.priority,
      (e) => e.at,
    );
    expect(sorted.map((e) => e.id)).toEqual(['urgent-new', 'urgent-old', 'low-new']);
  });
});
