import { createContext } from 'react';
import type { Id, Member } from '@/domain/types';

export interface CurrentUserContextValue {
  /** Simulated signed-in member (SPEC 2: roles are simulated in v1). */
  currentUser: Member | undefined;
  /** Members who can be selected as the current user (active ones). */
  selectableMembers: Member[];
  setCurrentUserId: (id: Id) => void;
}

export const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);
