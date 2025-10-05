'use server';

import { cookies } from 'next/headers';
import { createClient, type PostgrestSingleResponse } from '@supabase/supabase-js';
import type { AdminStatus, ChurchPublic } from '@/lib/types';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  getAdminSessionSignature,
  isAdminPasswordConfigured,
  matchesSessionSignature,
} from '@/lib/adminAuth';
import { hydrateChurchList, hydrateChurchPublic } from '@/lib/adminChurchHydration';

export type LoginFormState = {
  success: boolean;
  error?: string | null;
};

export type ChurchUpdatePayload = {
  churchId: string;
  updates: Partial<ChurchPublic>;
};

export type SaveChurchResult = {
  success: boolean;
  error?: string | null;
  data?: ChurchPublic | null;
};

export type CreateChurchPayload = {
  values: Partial<ChurchPublic>;
};

export type CreateChurchResult = SaveChurchResult;

export type AdminChurchListParams = {
  status: AdminStatus;
  limit?: number;
  cursor?: string | null;
  query?: string;
  locality?: string;
  id?: string;
};

export type AdminChurchListResult = {
  items: ChurchPublic[];
  nextCursor: string | null;
  previousCursor: string | null;
  count: number | null;
};

const secureCookie = process.env.NODE_ENV === 'production';

export async function authenticateAdmin(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const password = formData.get('password');
  if (!password || typeof password !== 'string') {
    return { success: false, error: 'Password is required.' };
  }

  if (!isAdminPasswordConfigured()) {
    return { success: false, error: 'Admin password is not configured on this environment.' };
  }

  const expectedPassword = process.env.ADMIN_PORTAL_PASSWORD as string;
  if (password !== expectedPassword) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  const signature = getAdminSessionSignature();
  if (!signature) {
    return { success: false, error: 'Unable to create session signature.' };
  }

  cookies().set({
    name: ADMIN_SESSION_COOKIE,
    value: signature,
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: '/',
  });

  return { success: true };
}

export async function logoutAdmin(): Promise<void> {
  cookies().delete(ADMIN_SESSION_COOKIE);
}

function ensureAuthenticated(): string | null {
  const sessionCookie = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!matchesSessionSignature(sessionCookie)) {
    return 'You have been signed out. Please log in again.';
  }

  return null;
}

function resolveSupabaseCredentials(): { url: string; key: string; table: string } | { error: string } {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      error: 'Supabase admin credentials are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  const table = process.env.ADMIN_SUPABASE_CHURCHES_TABLE ?? 'churches';
  return { url: supabaseUrl, key: supabaseKey, table };
}

function createSupabaseAdminClient() {
  const creds = resolveSupabaseCredentials();
  if ('error' in creds) {
    return { error: creds.error };
  }

  const client = createClient(creds.url, creds.key, {
    auth: { persistSession: false },
  });

  return { client, table: creds.table };
}

function scrubPayload(values: Partial<ChurchPublic>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === 'church_id') continue;
    if (typeof value === 'undefined') continue;
    output[key] = value;
  }
  return output;
}

function parseCursorValue(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const parsed = Number(cursor);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit ?? NaN)) {
    return 25;
  }
  const normalised = Math.floor(limit as number);
  if (normalised < 1) return 1;
  if (normalised > 100) return 100;
  return normalised;
}

function escapeILikePattern(value: string): string {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

function mapResponse(
  response: PostgrestSingleResponse<ChurchPublic>,
): CreateChurchResult {
  if (response.error) {
    return { success: false, error: response.error.message };
  }

  if (!response.data) {
    return { success: false, error: 'Operation completed but no record was returned.' };
  }

  return { success: true, data: response.data };
}

export async function saveChurchChanges(payload: ChurchUpdatePayload): Promise<SaveChurchResult> {
  const authError = ensureAuthenticated();
  if (authError) {
    return { success: false, error: authError };
  }

  if (!payload.churchId) {
    return { success: false, error: 'Invalid church identifier.' };
  }

  const updates = scrubPayload(payload.updates ?? {});

  if (Object.keys(updates).length === 0) {
    return { success: true, data: null };
  }

  const { client, table, error: clientError } = createSupabaseAdminClient();
  if (!client || clientError) {
    return { success: false, error: clientError ?? 'Failed to initialise Supabase client.' };
  }

  try {
    const response = await client
      .from<ChurchPublic>(table)
      .update(updates)
      .eq('church_id', payload.churchId)
      .select()
      .maybeSingle();

    return mapResponse(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function createChurch(payload: CreateChurchPayload): Promise<CreateChurchResult> {
  const authError = ensureAuthenticated();
  if (authError) {
    return { success: false, error: authError };
  }

  const values = scrubPayload(payload.values ?? {});
  if (Object.keys(values).length === 0) {
    return { success: false, error: 'Provide values for the new church record.' };
  }

  const { client, table, error: clientError } = createSupabaseAdminClient();
  if (!client || clientError) {
    return { success: false, error: clientError ?? 'Failed to initialise Supabase client.' };
  }

  try {
    const response = await client
      .from<ChurchPublic>(table)
      .insert(values)
      .select()
      .maybeSingle();

    return mapResponse(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function fetchAdminChurchesByStatus(params: AdminChurchListParams): Promise<AdminChurchListResult> {
  const authError = ensureAuthenticated();
  if (authError) {
    throw new Error(authError);
  }

  const { client, table, error: clientError } = createSupabaseAdminClient();
  if (!client || clientError) {
    throw new Error(clientError ?? 'Failed to initialise Supabase client.');
  }

  const limit = clampLimit(params.limit);
  const offset = parseCursorValue(params.cursor);

  let query = client
    .from(table)
    .select('*, enriched_json', { count: 'exact' })
    .eq('admin_status', params.status);

  if (params.id) {
    query = query.eq('church_id', params.id);
  }

  if (params.locality) {
    query = query.ilike('locality', `%${escapeILikePattern(params.locality.trim())}%`);
  }

  if (params.query) {
    const search = `%${escapeILikePattern(params.query.trim())}%`;
    query = query.ilike('name', search);
  }

  const { data, error, count } = await query
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  const items = hydrateChurchList(data ?? []);
  const hasMore = typeof count === 'number' ? offset + limit < count : (data?.length ?? 0) === limit;
  const nextCursor = hasMore ? String(offset + limit) : null;
  const previousCursor = offset > 0 ? String(Math.max(0, offset - limit)) : null;

  return {
    items,
    nextCursor,
    previousCursor,
    count: count ?? null,
  };
}

export async function getAdminChurchById(churchId: string): Promise<ChurchPublic | null> {
  const authError = ensureAuthenticated();
  if (authError) {
    throw new Error(authError);
  }

  if (!churchId) {
    throw new Error('Missing church identifier.');
  }

  const { client, table, error: clientError } = createSupabaseAdminClient();
  if (!client || clientError) {
    throw new Error(clientError ?? 'Failed to initialise Supabase client.');
  }

  const { data, error } = await client
    .from(table)
    .select('*, enriched_json')
    .eq('church_id', churchId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return hydrateChurchPublic(data);
}
