import { createContext, use, type ReactNode } from 'react';
import type { Repositories } from './repositories/types';

const RepositoryContext = createContext<Repositories | null>(null);

/** Injects the repository implementations chosen by the app (see src/app/dataSource.ts). */
export function RepositoryProvider({
  repositories,
  children,
}: {
  repositories: Repositories;
  children: ReactNode;
}) {
  return <RepositoryContext value={repositories}>{children}</RepositoryContext>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useRepositories(): Repositories {
  const repositories = use(RepositoryContext);
  if (!repositories) throw new Error('useRepositories must be used inside <RepositoryProvider>');
  return repositories;
}
