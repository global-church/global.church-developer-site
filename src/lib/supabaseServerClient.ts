import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type DefaultDatabase = Record<string, unknown>;

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Create a service-role Supabase client for server-side data access.
 * Auth is handled by Privy — Supabase is used as a database only.
 */
export function createServiceRoleClient<Database extends DefaultDatabase = DefaultDatabase>(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey);
}
