import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RepositoryProvider, useRepositories } from '@/data/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import { createRepositories } from './dataSource';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Local data only changes through this app, so it never goes stale on its own.
      queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: false },
    },
  });
}

/** Waits until the demo sandbox is seeded before rendering the app. */
function SeedGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { demo } = useRepositories();
  const seeded = useQuery({
    queryKey: ['bootstrap'],
    queryFn: async () => {
      await demo.ensureSeeded();
      return true;
    },
  });

  if (seeded.isError) {
    return (
      <p role="alert" className="p-6 text-sm text-text-secondary">
        {t('data.loadError')}
      </p>
    );
  }
  if (!seeded.isSuccess) return null;
  return children;
}

export function DataProvider({
  children,
  repositories,
}: {
  children: ReactNode;
  /** Injected in tests; the app uses the configured data source. */
  repositories?: Repositories;
}) {
  const [queryClient] = useState(createQueryClient);
  const [repos] = useState(() => repositories ?? createRepositories());

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repositories={repos}>
        <SeedGate>{children}</SeedGate>
      </RepositoryProvider>
    </QueryClientProvider>
  );
}
