import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useMembers } from '@/data/hooks';
import type { Id, Member } from '@/domain/types';
import { CurrentUserContext } from './CurrentUserContext';

const STORAGE_KEY = 'translator.currentUser';

function readStoredId(): Id | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeId(id: Id): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // The selection simply won't persist.
  }
}

/** Default user: the first active manager, so the demo opens with the full view. */
function defaultUser(members: Member[]): Member | undefined {
  return members.find((m) => m.category === 'manager') ?? members[0];
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { data: members = [] } = useMembers();
  const [selectedId, setSelectedId] = useState<Id | null>(readStoredId);

  const selectableMembers = useMemo(() => members.filter((m) => m.status === 'active'), [members]);
  const currentUser =
    selectableMembers.find((m) => m.id === selectedId) ?? defaultUser(selectableMembers);

  const setCurrentUserId = useCallback((id: Id) => {
    storeId(id);
    setSelectedId(id);
  }, []);

  const value = useMemo(
    () => ({ currentUser, selectableMembers, setCurrentUserId }),
    [currentUser, selectableMembers, setCurrentUserId],
  );

  return <CurrentUserContext value={value}>{children}</CurrentUserContext>;
}
