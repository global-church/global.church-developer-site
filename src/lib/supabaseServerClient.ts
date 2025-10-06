import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type CookieAccessor = {
  getAll: () => Promise<{ name: string; value: string }[]>;
  setAll?: (cookies: { name: string; value: string; options: CookieOptions }[]) => Promise<void>;
};

type CookieStore = Awaited<ReturnType<typeof cookies>>;

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

async function readAllCookies(store: CookieStore): Promise<{ name: string; value: string }[]> {
  const entries = store.getAll();
  return entries.map(({ name, value }) => ({ name, value }));
}

function buildCookieAdapter(store: CookieStore, mutable: boolean): CookieAccessor {
  return {
    getAll: () => readAllCookies(store),
    setAll: mutable
      ? async (supabaseCookies) => {
          await Promise.all(
            supabaseCookies.map(async ({ name, value, options }) => {
              store.set({ name, value, ...options });
            }),
          );
        }
      : undefined,
  };
}

function ensureSupabaseConfig(): { url: string; key: string } {
  assertSupabaseEnv();
  assertSupabaseKey();
  return { url: supabaseUrl, key: supabaseAnonKey };
}

export async function createSupabaseServerComponentClient<Database extends DefaultDatabase = DefaultDatabase>(): Promise<SupabaseClient<Database>> {
  const { url, key } = ensureSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: buildCookieAdapter(cookieStore, false),
  });
}

export async function createSupabaseServerActionClient<Database extends DefaultDatabase = DefaultDatabase>(): Promise<SupabaseClient<Database>> {
  const { url, key } = ensureSupabaseConfig();
  const cookieStore = await cookies();
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
