import {
  parseWorkspaceSnapshot,
  rebaseTimestamps,
  type WorkspaceData,
  type WorkspaceFile,
  type WorkspaceSettings,
  type WorkspaceSnapshot,
} from '@/domain/workspace';

export interface LoadedWorkspace {
  data: WorkspaceData;
  files: WorkspaceFile[];
  settings: WorkspaceSettings | undefined;
}

/** Downloads the demo snapshot and its files, with dates moved up to `now`. */
export async function fetchDemoWorkspace(
  url: string,
  { fetch: fetchFn = fetch, now = new Date() }: { fetch?: typeof fetch; now?: Date } = {},
): Promise<LoadedWorkspace> {
  const response = await fetchFn(url);
  if (!response.ok) throw new Error(`Demo snapshot: HTTP ${response.status}`);
  const parsed = parseWorkspaceSnapshot(await response.json());
  if (!parsed.ok) throw new Error(`Demo snapshot: invalid ${parsed.error}`);
  const { snapshot } = parsed;

  return {
    data: rebaseTimestamps(snapshot.data, snapshot.exportedAt, now),
    files: await fetchSnapshotFiles(snapshot, new URL(url, location.href), fetchFn),
    settings: snapshot.settings,
  };
}

/**
 * Reads a backup made in Settings > General (DECISIONS D41). Dates are kept as
 * they were. Throws `InvalidBackupError` when the file is not a backup.
 */
export async function readBackupFile(
  file: Blob,
  { fetch: fetchFn = fetch }: { fetch?: typeof fetch } = {},
): Promise<LoadedWorkspace> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new InvalidBackupError();
  }
  const parsed = parseWorkspaceSnapshot(json);
  if (!parsed.ok) throw new InvalidBackupError();
  const { snapshot } = parsed;
  return {
    data: snapshot.data,
    files: await fetchSnapshotFiles(snapshot, new URL(location.href), fetchFn),
    settings: snapshot.settings,
  };
}

export class InvalidBackupError extends Error {
  constructor() {
    super('The file is not a workspace backup');
  }
}

/** Downloads every file of a snapshot: from the demo host, or from the data: URLs of a backup. */
async function fetchSnapshotFiles(
  snapshot: WorkspaceSnapshot,
  base: URL,
  fetchFn: typeof fetch,
): Promise<WorkspaceFile[]> {
  return Promise.all(
    snapshot.files.map(async (file) => {
      const fileResponse = await fetchFn(new URL(file.url, base));
      if (!fileResponse.ok)
        throw new Error(`Snapshot file ${file.name}: HTTP ${fileResponse.status}`);
      // Use the snapshot's type: raw file hosts often serve images as text/plain.
      const data = new Blob([await fileResponse.arrayBuffer()], { type: file.type });
      return { id: file.id, name: file.name, data };
    }),
  );
}
