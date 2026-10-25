import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RepositoryProvider, useRepositories } from '@/data/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import { createRepositories } from './dataSource';
import { readDemoConfig, type DemoConfig } from './workspace/demoConfig';
import { fetchDemoWorkspace } from './workspace/fetchDemoWorkspace';
import { WorkspaceContext, type WorkspaceKind } from './workspace/WorkspaceContext';

const WORKSPACE_KEY = 'translator.workspace';

function readStoredWorkspace(): WorkspaceKind {
  try {
    return localStorage.getItem(WORKSPACE_KEY) === 'demo' ? 'demo' : 'own';
  } catch {
    return 'own';
  }
}

function storeWorkspace(kind: WorkspaceKind): void {
  try {
    localStorage.setItem(WORKSPACE_KEY, kind);
  } catch {
    // The app simply reopens the user's own workspace next time.
  }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Local data only changes through this app, so it never goes stale on its own.
      queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: false },
    },
  });
}

/** Waits until the workspace is initialized before rendering the app. */
function WorkspaceGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { workspace } = useRepositories();
  const ready = useQuery({
    queryKey: ['bootstrap'],
    queryFn: async () => {
      await workspace.ensureInitialized();
      return true;
    },
  });

  if (ready.isError) {
    return (
      <p role="alert" className="p-6 text-sm text-text-secondary">
        {t('data.loadError')}
      </p>
    );
  }
  if (!ready.isSuccess) return null;
  return children;
}

export function DataProvider({
  children,
  openWorkspace = createRepositories,
  demo: demoConfig,
}: {
  children: ReactNode;
  /** Opens a workspace's repositories. Injected in tests; the app uses the configured data source. */
  openWorkspace?: (kind: WorkspaceKind) => Repositories;
  /** Injected in tests; the app reads VITE_DEMO_URL. */
  demo?: DemoConfig | null;
}) {
  const [demo] = useState(() => (demoConfig === undefined ? readDemoConfig() : demoConfig));
  // A new generation means a freshly opened workspace: new repositories, new cache, remounted UI.
  const [active, setActive] = useState<{ kind: WorkspaceKind; generation: number }>(() => ({
    kind: demo ? readStoredWorkspace() : 'own',
    generation: 0,
  }));
  const { repos, queryClient } = useMemo(
    () => ({ repos: openWorkspace(active.kind), queryClient: createQueryClient() }),
    [openWorkspace, active],
  );

  const open = useCallback((kind: WorkspaceKind) => {
    storeWorkspace(kind);
    setActive((current) => ({ kind, generation: current.generation + 1 }));
  }, []);

  const loadDemo = useCallback(async () => {
    if (!demo) return;
    const { data, files, settings } = await fetchDemoWorkspace(demo.url);
    await openWorkspace('demo').workspace.replace(data, files, settings);
    open('demo');
  }, [demo, openWorkspace, open]);

  const workspace = useMemo(
    () => ({
      kind: active.kind,
      demo,
      loadDemo,
      exitDemo: () => open('own'),
      reload: () => open(active.kind),
    }),
    [active.kind, demo, loadDemo, open],
  );

  return (
    <WorkspaceContext value={workspace}>
      <QueryClientProvider key={active.generation} client={queryClient}>
        <RepositoryProvider repositories={repos}>
          <WorkspaceGate>{children}</WorkspaceGate>
        </RepositoryProvider>
      </QueryClientProvider>
    </WorkspaceContext>
  );
}
