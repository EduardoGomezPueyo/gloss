import {
  parseWorkspaceSnapshot,
  rebaseTimestamps,
  type WorkspaceData,
  type WorkspaceFile,
} from '@/domain/workspace';

export interface LoadedWorkspace {
  data: WorkspaceData;
  files: WorkspaceFile[];
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

  const files = await Promise.all(
    snapshot.files.map(async (file) => {
      const fileResponse = await fetchFn(new URL(file.url, new URL(url, location.href)));
      if (!fileResponse.ok) throw new Error(`Demo file ${file.url}: HTTP ${fileResponse.status}`);
      // Use the snapshot's type: raw file hosts often serve images as text/plain.
      const data = new Blob([await fileResponse.arrayBuffer()], { type: file.type });
      return { id: file.id, name: file.name, data };
    }),
  );

  return { data: rebaseTimestamps(snapshot.data, snapshot.exportedAt, now), files };
}
