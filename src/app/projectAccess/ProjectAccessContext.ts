import { createContext, use } from 'react';

/** What the current user may do in the project being viewed (DECISIONS D41). */
export interface ProjectAccess {
  /** False for a worker who is not part of the project: everything is view only. */
  canWork: boolean;
}

export const ProjectAccessContext = createContext<ProjectAccess>({ canWork: true });

/** Outside a project's pages, nothing is restricted. */
export function useProjectAccess(): ProjectAccess {
  return use(ProjectAccessContext);
}
