'use client';

import { useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type DefaultDatabase = Record<string, unknown>;

export function useSupabaseBrowserClient<Database extends DefaultDatabase = DefaultDatabase>(): SupabaseClient<Database> {
  return useMemo(() => {
    // Only create client on client-side (browser)
    if (typeof window === 'undefined') {
      // During SSR, return a dummy client that won't be used
      // This prevents build-time errors when env vars are missing
      return {} as SupabaseClient<Database>;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
    }
    if (!supabaseAnonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.');
    }

    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { flowType: 'implicit' },
    });
  }, []);
}
