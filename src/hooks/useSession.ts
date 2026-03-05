'use client';

import { useAuth, type AuthUser } from '@/contexts/AuthContext';

export function useSession() {
  const { user, loading, isAuthenticated } = useAuth();

  return {
    user: isAuthenticated ? user : null,
    loading,
  };
}
