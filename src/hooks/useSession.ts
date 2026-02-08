'use client';

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { useSupabaseBrowserClient } from './useSupabaseBrowserClient';

export function useSession() {
  const supabase = useSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Check if supabase client is a real client (not SSR dummy)
    if (!supabase.auth?.getUser) {
      setLoading(false);
      return;
    }

    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { user, loading };
}
