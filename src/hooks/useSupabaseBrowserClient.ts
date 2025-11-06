'use client';

import { useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type DefaultDatabase = Record<string, unknown>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertBrowserSupabaseEnv(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
}

function assertBrowserSupabaseKey(key: string | undefined): asserts key is string {
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.');
  }
}

export function useSupabaseBrowserClient<Database extends DefaultDatabase = DefaultDatabase>(): SupabaseClient<Database> {
  return useMemo(() => {
    assertBrowserSupabaseEnv(supabaseUrl);
    assertBrowserSupabaseKey(supabaseAnonKey);
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }, []);
}
