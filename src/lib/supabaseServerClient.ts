import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type CookieAccessor = {
  getAll: () => { name: string; value: string }[];
  setAll?: (cookies: { name: string; value: string; options: CookieOptions }[]) => void;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertSupabaseEnv(): asserts supabaseUrl is string & { length: number } {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
}

function assertSupabaseKey(): asserts supabaseAnonKey is string & { length: number } {
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.');
  }
}

type DefaultDatabase = Record<string, unknown>;

function buildCookieAdapter(store: ReturnType<typeof cookies>, mutable: boolean): CookieAccessor {
  return {
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    setAll: mutable
      ? (supabaseCookies) => {
          for (const { name, value, options } of supabaseCookies) {
            store.set({ name, value, ...options });
          }
        }
      : undefined,
  };
}

function ensureSupabaseConfig(): { url: string; key: string } {
  assertSupabaseEnv();
  assertSupabaseKey();
  return { url: supabaseUrl, key: supabaseAnonKey };
}

export function createSupabaseServerComponentClient<Database extends DefaultDatabase = DefaultDatabase>(): SupabaseClient<Database> {
  const { url, key } = ensureSupabaseConfig();
  const cookieStore = cookies();
  return createServerClient<Database>(url, key, {
    cookies: buildCookieAdapter(cookieStore, false),
  });
}

export function createSupabaseServerActionClient<Database extends DefaultDatabase = DefaultDatabase>(): SupabaseClient<Database> {
  const { url, key } = ensureSupabaseConfig();
  const cookieStore = cookies();
  return createServerClient<Database>(url, key, {
    cookies: buildCookieAdapter(cookieStore, true),
  });
}

export function createSupabaseRouteHandlerClient<Database extends DefaultDatabase = DefaultDatabase>(
  request: NextRequest,
  response: NextResponse,
): SupabaseClient<Database> {
  const { url, key } = ensureSupabaseConfig();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });
}

export function createSupabaseMiddlewareClient<Database extends DefaultDatabase = DefaultDatabase>(
  request: NextRequest,
  response: NextResponse,
): SupabaseClient<Database> {
  const { url, key } = ensureSupabaseConfig();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
