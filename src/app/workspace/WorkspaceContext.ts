import { createContext, use } from 'react';
import type { DemoConfig } from './demoConfig';

/** The user's own data, or the demo, each in its own database (DECISIONS D34). */
export type WorkspaceKind = 'own' | 'demo';

export interface WorkspaceContextValue {
  kind: WorkspaceKind;
  /** Null when this deployment has no demo (VITE_DEMO_URL unset). */
  demo: DemoConfig | null;
  /** Downloads the demo, replaces the demo workspace with it and opens it. */
  loadDemo(): Promise<void>;
  /** Goes back to the user's own workspace. */
  exitDemo(): void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const value = use(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside DataProvider');
  return value;
}
