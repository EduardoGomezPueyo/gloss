import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useMembers } from '@/data/hooks';
import type { Id, Member } from '@/domain/types';
import { useWorkspace, type WorkspaceKind } from '../workspace/WorkspaceContext';
import { CurrentUserContext } from './CurrentUserContext';

/** One remembered user per workspace, so leaving the demo restores the user's own choice. */
const storageKey = (workspace: WorkspaceKind) =>
  workspace === 'demo' ? 'translator.currentUser.demo' : 'translator.currentUser';

function readStoredId(key: string): Id | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeId(key: string, id: Id): void {
  try {
    localStorage.setItem(key, id);
  } catch {
    // The selection simply won't persist.
  }
}

/** Default user: the first active manager, so the app opens with the full view. */
function defaultUser(members: Member[]): Member | undefined {
  return members.find((m) => m.category === 'manager') ?? members[0];
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { data: members = [] } = useMembers();
  const key = storageKey(useWorkspace().kind);
  const [selectedId, setSelectedId] = useState<Id | null>(() => readStoredId(key));

  const selectableMembers = useMemo(() => members.filter((m) => m.status === 'active'), [members]);
  const currentUser =
    selectableMembers.find((m) => m.id === selectedId) ?? defaultUser(selectableMembers);

  const setCurrentUserId = useCallback(
    (id: Id) => {
      storeId(key, id);
      setSelectedId(id);
    },
    [key],
  );

  const value = useMemo(
    () => ({ currentUser, selectableMembers, setCurrentUserId }),
    [currentUser, selectableMembers, setCurrentUserId],
  );

  return <CurrentUserContext value={value}>{children}</CurrentUserContext>;
}
