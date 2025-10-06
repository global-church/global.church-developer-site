'use server';

import { createClient, type AuthApiError, type PostgrestSingleResponse, type SupabaseClient } from '@supabase/supabase-js';
import type { AdminStatus, ChurchPublic } from '@/lib/types';
import { hydrateChurchList, hydrateChurchPublic } from '@/lib/adminChurchHydration';
import { createSupabaseServerActionClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { ensureActiveAdmin } from '@/lib/adminSession';

export type LoginFormState = {
  success: boolean;
  error?: string | null;
  mfaTicket?: string | null;
  email?: string | null;
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

const SESSION_ERROR_MESSAGE = 'You have been signed out. Please log in again.';

type AdminAuthCheck = {
  supabase: SupabaseClient | null;
  error: string | null;
};

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

async function verifyAdminAccess(existingClient?: SupabaseClient): Promise<AdminAuthCheck> {
  if (!isSupabaseConfigured()) {
    return { supabase: existingClient ?? null, error: 'Supabase credentials are not configured.' };
  }

  const supabase = existingClient ?? createSupabaseServerActionClient();

  try {
    await ensureActiveAdmin(supabase);
    return { supabase, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : SESSION_ERROR_MESSAGE;
    return { supabase, error: message };
  }
}

export async function authenticateAdmin(prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  const supabase = createSupabaseServerActionClient();
  const ticket = formData.get('mfa_ticket');

  if (ticket && typeof ticket === 'string' && ticket.trim().length > 0) {
    const otp = formData.get('otp');
    if (!otp || typeof otp !== 'string' || otp.trim().length === 0) {
      return {
        success: false,
        error: 'Enter your 6-digit authentication code.',
        mfaTicket: ticket,
        email: prevState.email ?? null,
      };
    }

    const { error } = await supabase.auth.mfa.verifyOtp({
      ticket,
      token: otp.trim(),
      type: 'totp',
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        mfaTicket: ticket,
        email: prevState.email ?? null,
      };
    }

    const { error: membershipError } = await verifyAdminAccess(supabase);
    if (membershipError) {
      await supabase.auth.signOut({ scope: 'local' });
      return {
        success: false,
        error: membershipError,
        email: prevState.email ?? null,
      };
    }

    return { success: true, email: prevState.email ?? null };
  }

  const rawEmail = formData.get('email');
  const rawPassword = formData.get('password');

  if (!rawEmail || typeof rawEmail !== 'string') {
    return { success: false, error: 'Email is required.' };
  }

  if (!rawPassword || typeof rawPassword !== 'string') {
    return { success: false, error: 'Password is required.', email: rawEmail };
  }

  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const authError = error as AuthApiError;
    const mfaTicket = (data as { mfa?: { ticket?: string } } | null)?.mfa?.ticket;

    if (authError?.status === 400 && mfaTicket) {
      return {
        success: false,
        error: 'Two-factor authentication required. Enter the code from your authenticator app.',
        mfaTicket,
        email,
      };
    }

    return {
      success: false,
      error: authError?.message ?? 'Unable to sign in with the provided credentials.',
      email,
    };
  }

  const { error: membershipError } = await verifyAdminAccess(supabase);
  if (membershipError) {
    await supabase.auth.signOut({ scope: 'local' });
    return {
      success: false,
      error: membershipError,
      email,
    };
  }

  return { success: true, email };
}

export async function logoutAdmin(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = createSupabaseServerActionClient();
  await supabase.auth.signOut({ scope: 'local' });
}

async function ensureAuthenticated(): Promise<string | null> {
  const { error } = await verifyAdminAccess();
  if (error) {
    return error;
  }
  return null;
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
  const authError = await ensureAuthenticated();
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
  const authError = await ensureAuthenticated();
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
  const authError = await ensureAuthenticated();
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
  const authError = await ensureAuthenticated();
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
