import type {
  Comment,
  CommentThread,
  ContentItem,
  GlossaryCategory,
  GlossaryEntry,
  GlossaryVersion,
  Id,
  Member,
  Project,
  SceneImage,
  Section,
  Translation,
} from './types';

/*
 * A whole workspace as plain data: what the demo loader imports (DECISIONS D34).
 * The demo itself lives outside this repository and is published as a snapshot
 * file in this format.
 */

export interface WorkspaceData {
  members: Member[];
  projects: Project[];
  sections: Section[];
  items: ContentItem[];
  images: SceneImage[];
  translations: Translation[];
  commentThreads: CommentThread[];
  comments: Comment[];
  glossaryCategories: GlossaryCategory[];
  glossaryEntries: GlossaryEntry[];
  glossaryVersions: GlossaryVersion[];
}

export const WORKSPACE_DATA_KEYS = [
  'members',
  'projects',
  'sections',
  'items',
  'images',
  'translations',
  'commentThreads',
  'comments',
  'glossaryCategories',
  'glossaryEntries',
  'glossaryVersions',
] as const satisfies readonly (keyof WorkspaceData)[];

export const SNAPSHOT_FORMAT = 'translator-tool-workspace';
export const SNAPSHOT_VERSION = 1;

/** A file referenced by `fileId` (images) or `imageFileIds` (glossary). */
export interface SnapshotFile {
  id: Id;
  name: string;
  /** MIME type, e.g. "image/svg+xml". */
  type: string;
  /** Where to download it, relative to the snapshot file. */
  url: string;
}

export interface WorkspaceSnapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: typeof SNAPSHOT_VERSION;
  /** When the snapshot was made; dates are moved forward so they stay recent. */
  exportedAt: string;
  data: WorkspaceData;
  files: SnapshotFile[];
}

/** A file ready to store: what the loader passes to the repository. */
export interface WorkspaceFile {
  id: Id;
  name: string;
  data: Blob;
}

export type SnapshotParseResult =
  { ok: true; snapshot: WorkspaceSnapshot } | { ok: false; error: 'format' | 'version' | 'shape' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Checks the envelope and the shape of the lists. Records themselves are trusted:
 * the snapshot comes from a source the deployment chose (VITE_DEMO_URL).
 */
export function parseWorkspaceSnapshot(json: unknown): SnapshotParseResult {
  if (!isRecord(json) || json.format !== SNAPSHOT_FORMAT) return { ok: false, error: 'format' };
  if (json.version !== SNAPSHOT_VERSION) return { ok: false, error: 'version' };

  const { data, files, exportedAt } = json;
  if (typeof exportedAt !== 'string' || Number.isNaN(Date.parse(exportedAt))) {
    return { ok: false, error: 'shape' };
  }
  if (!isRecord(data) || !WORKSPACE_DATA_KEYS.every((key) => Array.isArray(data[key]))) {
    return { ok: false, error: 'shape' };
  }
  const validFile = (file: unknown) =>
    isRecord(file) && ['id', 'name', 'type', 'url'].every((key) => typeof file[key] === 'string');
  if (files !== undefined && !(Array.isArray(files) && files.every(validFile))) {
    return { ok: false, error: 'shape' };
  }

  return {
    ok: true,
    snapshot: { ...(json as unknown as WorkspaceSnapshot), files: (files ?? []) as SnapshotFile[] },
  };
}

const TIMESTAMP_KEY = /At$/;

/**
 * Moves every timestamp (fields ending in "At") forward by the time elapsed since
 * `exportedAt`, so "2 days ago" in the snapshot still reads "2 days ago" today.
 */
export function rebaseTimestamps(
  data: WorkspaceData,
  exportedAt: string,
  now: Date,
): WorkspaceData {
  const offset = now.getTime() - Date.parse(exportedAt);
  if (!Number.isFinite(offset) || offset <= 0) return data;

  const shift = <T extends object>(record: T): T => {
    const copy = { ...record } as Record<string, unknown>;
    for (const [key, value] of Object.entries(copy)) {
      if (TIMESTAMP_KEY.test(key) && typeof value === 'string') {
        const time = Date.parse(value);
        if (!Number.isNaN(time)) copy[key] = new Date(time + offset).toISOString();
      }
    }
    return copy as T;
  };

  const rebased = {} as Record<keyof WorkspaceData, object[]>;
  for (const key of WORKSPACE_DATA_KEYS) rebased[key] = data[key].map(shift);
  return rebased as unknown as WorkspaceData;
}

/** An empty workspace with a single manager, so the user selector has someone to be. */
export function createWorkspaceOwner(id: Id, now: string): Member {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
    name: 'Alex Morgan',
    email: 'alex@example.com',
    category: 'manager',
    status: 'active',
    removedAt: null,
  };
}
