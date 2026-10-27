import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RepositoryProvider, useRepositories } from '@/data/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import { createRepositories } from './dataSource';
import { LoadingScreen } from './layout/LoadingScreen';
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

/**
 * How long the loading screen stays at least (D48). Opening local data takes a few
 * milliseconds, so without it the screen would only flash.
 */
const MIN_LOADING_MS = 900;
/**
 * Unused files are deleted on opening only once they are a day old (D49), so an
 * entry still being edited in another tab keeps the images it has just added.
 */
const UNUSED_FILE_GRACE_MS = 24 * 60 * 60 * 1000;
/** The loading screen's fade-out, as its `duration-300`. */
const FADE_OUT_MS = 300;

/** True once `ms` have passed since mount (at once for 0). */
function useElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(ms <= 0);
  useEffect(() => {
    if (ms <= 0) return;
    const id = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return elapsed;
}

/**
 * Shows the loading screen until the workspace is initialized, then the app. It
 * remounts with every opened workspace, so switching workspaces shows it again.
 */
function WorkspaceGate({
  kind,
  minLoadingMs,
  children,
}: {
  kind: WorkspaceKind;
  minLoadingMs: number;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { workspace } = useRepositories();
  const ready = useQuery({
    queryKey: ['bootstrap'],
    queryFn: async () => {
      await workspace.ensureInitialized();
      // Housekeeping that never blocks opening the workspace.
      await workspace
        .deleteUnusedFiles(new Date(Date.now() - UNUSED_FILE_GRACE_MS))
        .catch((error: unknown) => console.warn('Could not delete unused files', error));
      return true;
    },
  });
  const shownLongEnough = useElapsed(minLoadingMs);
  const loaded = ready.isSuccess && shownLongEnough;
  // Without a minimum (tests) the screen goes at once, with no fade.
  const fades = minLoadingMs > 0;
  const [fadedOut, setFadedOut] = useState(false);
  useEffect(() => {
    if (!loaded || !fades) return;
    const id = setTimeout(() => setFadedOut(true), FADE_OUT_MS);
    return () => clearTimeout(id);
  }, [loaded, fades]);
  const showScreen = !loaded || (fades && !fadedOut);

  if (ready.isError && !ready.isFetching) {
    return (
      <LoadingScreen message={t('loadingScreen.error')} onRetry={() => void ready.refetch()} />
    );
  }
  return (
    <>
      {loaded && children}
      {showScreen && (
        <LoadingScreen
          message={t(kind === 'demo' ? 'loadingScreen.demo' : 'loadingScreen.workspace')}
          leaving={loaded}
        />
      )}
    </>
  );
}

export function DataProvider({
  children,
  openWorkspace = createRepositories,
  demo: demoConfig,
  minLoadingMs = MIN_LOADING_MS,
}: {
  children: ReactNode;
  /** Injected in tests (0: no minimum, no fade). */
  minLoadingMs?: number;
  /** Opens a workspace's repositories. Injected in tests; the app uses the configured data source. */
  openWorkspace?: (kind: WorkspaceKind) => Repositories;
  /** Injected in tests; the app reads VITE_DEMO_URL. */
  demo?: DemoConfig | null;
}) {
  const { t } = useTranslation();
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

  // While the demo downloads, the loading screen covers the current workspace; once
  // the demo opens, its own gate takes over with the same screen.
  const [demoLoading, setDemoLoading] = useState(false);
  const loadDemo = useCallback(async () => {
    if (!demo) return;
    setDemoLoading(true);
    try {
      const { data, files, settings } = await fetchDemoWorkspace(demo.url);
      await openWorkspace('demo').workspace.replace(data, files, settings);
      open('demo');
    } finally {
      setDemoLoading(false);
    }
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
          <WorkspaceGate kind={active.kind} minLoadingMs={minLoadingMs}>
            {children}
          </WorkspaceGate>
        </RepositoryProvider>
      </QueryClientProvider>
      {demoLoading && <LoadingScreen message={t('loadingScreen.demo')} />}
    </WorkspaceContext>
  );
}
