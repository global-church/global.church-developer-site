'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserSession } from '@/lib/session';
import { useAuth } from './AuthContext';

const SessionContext = createContext<UserSession | null>(null);

/**
 * Server-side SessionProvider — used by developer/admin layouts
 * that already have the session from getServerSession().
 */
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
 * Client-side session loader — placed in root Providers.
 * Fetches /api/auth/me when authenticated to populate SessionContext
 * for components outside developer/admin layouts (e.g. Header).
 * Server-side SessionProviders in nested layouts override this.
 */
export function SessionLoader({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    if (loading || !isAuthenticated) {
      setSession(null);
      return;
    }

    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSession(data))
      .catch(() => setSession(null));
  }, [isAuthenticated, loading]);

  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}

/**
 * Returns the UserSession when inside any SessionProvider/SessionLoader,
 * or null on public pages before auth completes.
 */
export function useUserSession(): UserSession | null {
  return useContext(SessionContext);
}
