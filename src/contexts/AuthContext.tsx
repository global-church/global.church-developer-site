'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { usePrivy, useLogin, useLogout } from '@privy-io/react-auth';

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  profileImage?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  const user = useMemo<AuthUser | null>(() => {
    if (!privyUser) return null;

    const googleAccount = privyUser.google;
    const emailAddress = privyUser.email?.address;

    return {
      id: privyUser.id,
      name: googleAccount?.name ?? undefined,
      email: emailAddress ?? googleAccount?.email ?? undefined,
      profileImage: undefined,
    };
  }, [privyUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: authenticated,
      user,
      loading: !ready,
      connect: login,
      disconnect: logout,
    }),
    [authenticated, user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
