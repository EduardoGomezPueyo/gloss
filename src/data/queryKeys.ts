import type { Id } from '@/domain/types';

/** TanStack Query keys, shared so mutations can invalidate the right data. */
export const queryKeys = {
  members: ['members'] as const,
  workspaceSettings: ['workspaceSettings'] as const,
  projects: ['projects'] as const,
  project: (id: Id) => ['projects', id] as const,
  /** Under "projects", so every project write also refreshes the editor. */
  itemImages: (itemId: Id) => ['projects', 'items', itemId] as const,
  comments: (imageId: Id) => ['comments', imageId] as const,
  /** Under "comments", so every comment write also refreshes the Comments page. */
  commentInbox: ['comments', 'inbox'] as const,
  glossary: (projectId: Id) => ['glossary', projectId] as const,
  glossaryEntry: (entryId: Id) => ['glossary', 'entry', entryId] as const,
  glossaryVersions: (entryId: Id) => ['glossary', 'versions', entryId] as const,
};
