'use client';

import { useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type DefaultDatabase = Record<string, unknown>;

export function useSupabaseBrowserClient<Database extends DefaultDatabase = DefaultDatabase>(): SupabaseClient<Database> | null {
  return useMemo(() => {
    // Only create client on client-side (browser)
    if (typeof window === 'undefined') {
      return null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Supabase is not configured — auth features will be disabled
      return null;
    }

    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { flowType: 'pkce' },
    });
  }, []);
}
