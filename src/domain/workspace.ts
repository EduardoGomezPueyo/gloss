import type {
  Assignment,
  Comment,
  CommentThread,
  ContentItem,
  GlossaryCategory,
  GlossaryEntry,
  GlossaryVersion,
  Id,
  Notification,
  Member,
  Project,
  SceneImage,
  Section,
  Translation,
} from './types';

/*
 * A whole workspace as plain data: what the demo loader imports (DECISIONS D34)
 * and what a backup holds (D41). The demo itself lives outside this repository
 * and is published as a snapshot file in this format.
 */

/** Settings that belong to the workspace, not to one browser (Settings > General, D41). */
export interface WorkspaceSettings {
  /** Workers only see the projects they take part in; off, they see the rest as view only. */
  workersSeeOnlyTheirProjects: boolean;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  workersSeeOnlyTheirProjects: true,
};

/** Reads stored or imported settings, falling back to the defaults for anything missing. */
export function parseWorkspaceSettings(value: unknown): WorkspaceSettings {
  const record = isRecord(value) ? value : {};
  return {
    workersSeeOnlyTheirProjects:
      typeof record.workersSeeOnlyTheirProjects === 'boolean'
        ? record.workersSeeOnlyTheirProjects
        : DEFAULT_WORKSPACE_SETTINGS.workersSeeOnlyTheirProjects,
  };
}

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
  /** Absent in snapshots made before assignments existed (the demo): read as none. */
  assignments: Assignment[];
  /** Absent in snapshots made before notifications existed: read as none. */
  notifications: Notification[];
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
  'assignments',
  'notifications',
] as const satisfies readonly (keyof WorkspaceData)[];

/** Lists added after the snapshot format was published: a snapshot may leave them out. */
const OPTIONAL_DATA_KEYS: readonly (keyof WorkspaceData)[] = ['assignments', 'notifications'];

export const SNAPSHOT_FORMAT = 'translator-tool-workspace';
export const SNAPSHOT_VERSION = 1;

/** A file referenced by `fileId` (images) or `imageFileIds` (glossary). */
export interface SnapshotFile {
  id: Id;
  name: string;
  /** MIME type, e.g. "image/svg+xml". */
  type: string;
  /** Where to download it, relative to the snapshot file; a backup embeds it as a data: URL. */
  url: string;
}

export interface WorkspaceSnapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: typeof SNAPSHOT_VERSION;
  /** When the snapshot was made; dates are moved forward so they stay recent. */
  exportedAt: string;
  data: WorkspaceData;
  files: SnapshotFile[];
  /** Absent in older snapshots and in the demo: the defaults apply. */
  settings?: WorkspaceSettings;
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
  if (
    !isRecord(data) ||
    !WORKSPACE_DATA_KEYS.every(
      (key) =>
        Array.isArray(data[key]) || (OPTIONAL_DATA_KEYS.includes(key) && data[key] === undefined),
    )
  ) {
    return { ok: false, error: 'shape' };
  }
  const validFile = (file: unknown) =>
    isRecord(file) && ['id', 'name', 'type', 'url'].every((key) => typeof file[key] === 'string');
  if (files !== undefined && !(Array.isArray(files) && files.every(validFile))) {
    return { ok: false, error: 'shape' };
  }

  return {
    ok: true,
    snapshot: {
      ...(json as unknown as WorkspaceSnapshot),
      data: {
        ...(data as unknown as WorkspaceData),
        ...Object.fromEntries(OPTIONAL_DATA_KEYS.map((key) => [key, data[key] ?? []])),
      },
      files: (files ?? []) as SnapshotFile[],
      settings: parseWorkspaceSettings(json.settings),
    },
  };
}

/** A backup: the whole workspace in one snapshot file, with its files embedded. */
export function buildBackupSnapshot(
  data: WorkspaceData,
  files: { id: Id; name: string; type: string; dataUrl: string }[],
  settings: WorkspaceSettings,
  exportedAt: Date,
): WorkspaceSnapshot {
  return {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    exportedAt: exportedAt.toISOString(),
    data,
    files: files.map(({ id, name, type, dataUrl }) => ({ id, name, type, url: dataUrl })),
    settings,
  };
}

/** "translator-workspace-2026-10-25.json" */
export function backupFileName(exportedAt: Date): string {
  return `translator-workspace-${exportedAt.toISOString().slice(0, 10)}.json`;
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
