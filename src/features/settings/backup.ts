import type { WorkspaceRepository } from '@/data/repositories/types';
import { backupFileName, buildBackupSnapshot } from '@/domain/workspace';
import { downloadFile } from '@/ui/downloadFile';

/**
 * Downloads the whole workspace as one JSON file, images included as data: URLs,
 * in the same format as the demo snapshot (DECISIONS D41).
 */
export async function downloadBackup(workspace: WorkspaceRepository, now = new Date()) {
  const { data, files, settings } = await workspace.exportAll();
  const embedded = await Promise.all(
    files.map(async (file) => ({
      id: file.id,
      name: file.name,
      type: file.data.type,
      dataUrl: await toDataUrl(file.data),
    })),
  );
  const snapshot = buildBackupSnapshot(data, embedded, settings, now);
  downloadFile(JSON.stringify(snapshot), backupFileName(now), 'application/json');
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read a file'));
    reader.readAsDataURL(blob);
  });
}
