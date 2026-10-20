import type { FilterCategory } from '@/domain/filters';
import { PLATFORMS, PRIORITIES, STATUSES, type Member } from '@/domain/types';

export interface FilterOption {
  value: string;
  /** Members are shown with their avatar; the rest use the category's icon. */
  member?: Member;
}

/**
 * Values offered in each filter submenu. Managers and Workers list the members
 * of that category (invited workers included: they can already be on a team).
 */
export function filterOptions(category: FilterCategory, members: Member[]): FilterOption[] {
  switch (category) {
    case 'platforms':
      return PLATFORMS.map((value) => ({ value }));
    case 'priorities':
      return PRIORITIES.map((value) => ({ value }));
    case 'statuses':
      return STATUSES.map((value) => ({ value }));
    case 'managers':
    case 'workers': {
      const wanted = category === 'managers' ? 'manager' : 'worker';
      return members
        .filter((m) => m.category === wanted)
        .map((member) => ({ value: member.id, member }));
    }
  }
}
