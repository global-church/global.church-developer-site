'use client';

import { useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type DefaultDatabase = Record<string, unknown>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertBrowserSupabaseEnv(): asserts supabaseUrl is string & { length: number } {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
}

function assertBrowserSupabaseKey(): asserts supabaseAnonKey is string & { length: number } {
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.');
  }
}

export function useSupabaseBrowserClient<Database extends DefaultDatabase = DefaultDatabase>(): SupabaseClient<Database> {
  return useMemo(() => {
    assertBrowserSupabaseEnv();
    assertBrowserSupabaseKey();
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }, []);
}
