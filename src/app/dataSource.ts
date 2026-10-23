import { TranslatorDb } from '@/data/local/db';
import { createLocalRepositories } from '@/data/local/localRepositories';
import type { Repositories } from '@/data/repositories/types';
import type { WorkspaceKind } from './workspace/WorkspaceContext';

export type DataSource = 'local' | 'remote';

export function readDataSource(value = import.meta.env.VITE_DATA_SOURCE): DataSource {
  if (value === undefined || value === '' || value === 'local') return 'local';
  if (value === 'remote') return 'remote';
  throw new Error(`Unknown VITE_DATA_SOURCE "${value}". Use "local" or "remote".`);
}

/** The only place that picks a storage implementation (DECISIONS D2). */
export function createRepositories(
  workspace: WorkspaceKind,
  source: DataSource = readDataSource(),
): Repositories {
  switch (source) {
    case 'local':
      // The demo has its own database, so loading it never touches the user's data (D34).
      return createLocalRepositories(
        new TranslatorDb(workspace === 'demo' ? 'translator-demo' : 'translator'),
      );
    case 'remote':
      throw new Error(
        'The remote data source is not implemented yet. Implement the interfaces in ' +
          'src/data/repositories/types.ts (see README) or use VITE_DATA_SOURCE=local.',
      );
  }
}
