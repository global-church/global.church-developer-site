'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { UserSession } from '@/lib/session';

const SessionContext = createContext<UserSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: UserSession;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}

/**
 * Returns the server-fetched UserSession when inside a SessionProvider
 * (dashboard/admin layouts), or null on public pages.
 */
export function useUserSession(): UserSession | null {
  return useContext(SessionContext);
}
