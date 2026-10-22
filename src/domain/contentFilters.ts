import { normalizeForSearch } from './filters';
import type { ItemSummary } from './progress';
import type { Status } from './types';

/**
 * Content items search and status filter in the section detail (SPEC 5.3). The
 * search matches the item name or type, ignoring case and accents; a null status
 * means "All statuses".
 */
export function filterItems(
  items: readonly ItemSummary[],
  query: string,
  status: Status | null,
): ItemSummary[] {
  const needle = normalizeForSearch(query.trim());
  return items.filter(
    ({ item, status: itemStatus }) =>
      (status === null || itemStatus === status) &&
      (needle === '' ||
        normalizeForSearch(item.name).includes(needle) ||
        normalizeForSearch(item.type).includes(needle)),
  );
}
