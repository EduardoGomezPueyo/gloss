import type { Id } from '@/domain/types';

/** TanStack Query keys, shared so mutations can invalidate the right data. */
export const queryKeys = {
  members: ['members'] as const,
  projects: ['projects'] as const,
  project: (id: Id) => ['projects', id] as const,
};
