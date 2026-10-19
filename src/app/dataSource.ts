import { createLocalRepositories } from '@/data/local/localRepositories';
import type { Repositories } from '@/data/repositories/types';

export type DataSource = 'local' | 'remote';

export function readDataSource(value = import.meta.env.VITE_DATA_SOURCE): DataSource {
  if (value === undefined || value === '' || value === 'local') return 'local';
  if (value === 'remote') return 'remote';
  throw new Error(`Unknown VITE_DATA_SOURCE "${value}". Use "local" or "remote".`);
}

/** The only place that picks a storage implementation (DECISIONS D2). */
export function createRepositories(source: DataSource = readDataSource()): Repositories {
  switch (source) {
    case 'local':
      return createLocalRepositories();
    case 'remote':
      throw new Error(
        'The remote data source is not implemented yet. Implement the interfaces in ' +
          'src/data/repositories/types.ts (see README) or use VITE_DATA_SOURCE=local.',
      );
  }
}
