import { nextOrder } from './sections';
import type { ContentItem, Id } from './types';

export interface ItemMove {
  id: Id;
  sectionId: Id;
  order: number;
}

/**
 * Moving content items to another section (SPEC 5.3): they keep their translations
 * and progress (nothing but the section and order changes) and are appended after
 * the destination's items, in their current order. Items already there are skipped.
 */
export function planMove(
  items: readonly ContentItem[],
  itemIds: readonly Id[],
  targetSectionId: Id,
): ItemMove[] {
  const moving = items
    .filter((item) => itemIds.includes(item.id) && item.sectionId !== targetSectionId)
    .sort((a, b) => a.order - b.order);
  const start = nextOrder(items.filter((item) => item.sectionId === targetSectionId));
  return moving.map((item, index) => ({
    id: item.id,
    sectionId: targetSectionId,
    order: start + index,
  }));
}
