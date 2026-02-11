'use server';

import { createClient, type PostgrestSingleResponse, type SupabaseClient } from '@supabase/supabase-js';
import type { AdminStatus, ChurchPublic } from '@/lib/types';
import { hydrateChurchList, hydrateChurchPublic } from '@/lib/adminChurchHydration';
import { createSupabaseServerActionClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { ensureRole, type UserRole } from '@/lib/session';

export type LoginFormState = {
  success: boolean;
  error?: string | null;
  email?: string | null;
  message?: string | null;
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

async function verifyAdminAccess(
  existingClient?: SupabaseClient,
  requiredRoles: UserRole[] = ['admin', 'support', 'editor'],
): Promise<AdminAuthCheck> {
  if (!isSupabaseConfigured()) {
    return { supabase: existingClient ?? null, error: 'Supabase credentials are not configured.' };
  }

  const supabase = existingClient ?? await createSupabaseServerActionClient();

  try {
    await ensureRole(supabase, ...requiredRoles);
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

  const rawEmail = formData.get('email');

  if (!rawEmail || typeof rawEmail !== 'string') {
    return { success: false, error: 'Email is required.' };
  }

  const email = rawEmail.trim().toLowerCase();

  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.SITE_URL ?? 'http://localhost:3000'}/api/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message, email };
  }

  return {
    success: true,
    email,
    message: 'Check your email for a sign-in link.',
  };
}

export async function logoutAdmin(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerActionClient();
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
      .from(table)
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
      .from(table)
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

// =============================================================================
// User Management (admin / support roles)
// =============================================================================

export type UserListParams = {
  limit?: number;
  cursor?: string | null;
  query?: string;
};

export type UserListItem = {
  id: string;
  email: string;
  display_name: string | null;
  roles: string[];
  api_key_count: number;
  api_access_approved: boolean;
  created_at: string;
};

export type UserListResult = {
  items: UserListItem[];
  nextCursor: string | null;
  previousCursor: string | null;
  count: number | null;
};

export async function fetchUsers(params: UserListParams): Promise<UserListResult> {
  const { error: authError } = await verifyAdminAccess(undefined, ['admin', 'support']);
  if (authError) {
    throw new Error(authError);
  }

  // Use service-role client so admins can read all profiles/roles/keys
  const { client: adminClient, error: clientError } = createSupabaseAdminClient();
  if (!adminClient || clientError) {
    throw new Error(clientError ?? 'Failed to initialise admin client.');
  }

  const limit = clampLimit(params.limit);
  const offset = parseCursorValue(params.cursor);

  let query = adminClient
    .from('profiles')
    .select('id, email, display_name, api_access_approved, created_at', { count: 'exact' });

  if (params.query) {
    const search = `%${escapeILikePattern(params.query.trim())}%`;
    query = query.or(`email.ilike.${search},display_name.ilike.${search}`);
  }

  const { data: profiles, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  if (!profiles || profiles.length === 0) {
    return { items: [], nextCursor: null, previousCursor: null, count: count ?? 0 };
  }

  const userIds = profiles.map((p) => p.id);

  const { data: roleRows } = await adminClient
    .from('user_roles')
    .select('user_id, role')
    .in('user_id', userIds)
    .eq('is_active', true);

  const { data: keyCounts } = await adminClient
    .from('api_keys')
    .select('user_id')
    .in('user_id', userIds)
    .eq('is_active', true);

  const roleMap = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const existing = roleMap.get(row.user_id) ?? [];
    existing.push(row.role);
    roleMap.set(row.user_id, existing);
  }

  const keyCountMap = new Map<string, number>();
  for (const row of keyCounts ?? []) {
    keyCountMap.set(row.user_id, (keyCountMap.get(row.user_id) ?? 0) + 1);
  }

  const items: UserListItem[] = profiles.map((p) => ({
    id: p.id,
    email: p.email,
    display_name: p.display_name,
    roles: roleMap.get(p.id) ?? [],
    api_key_count: keyCountMap.get(p.id) ?? 0,
    api_access_approved: p.api_access_approved ?? false,
    created_at: p.created_at,
  }));

  const hasMore = typeof count === 'number' ? offset + limit < count : profiles.length === limit;
  const nextCursor = hasMore ? String(offset + limit) : null;
  const previousCursor = offset > 0 ? String(Math.max(0, offset - limit)) : null;

  return { items, nextCursor, previousCursor, count: count ?? null };
}

export async function assignRole(
  userId: string,
  role: UserRole,
): Promise<{ success: boolean; error?: string }> {
  const { error: authError, supabase } = await verifyAdminAccess(undefined, ['admin']);
  if (authError || !supabase) {
    return { success: false, error: authError ?? 'Authentication failed.' };
  }

  const session = await ensureRole(supabase, 'admin');

  // Use service-role client — user_roles is locked down by RLS
  const { client: adminClient, error: clientError } = createSupabaseAdminClient();
  if (!adminClient || clientError) {
    return { success: false, error: clientError ?? 'Failed to initialise admin client.' };
  }

  const { error } = await adminClient.from('user_roles').upsert(
    {
      user_id: userId,
      role,
      is_active: true,
      assigned_by: session.userId,
    },
    { onConflict: 'user_id,role' },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeRole(
  userId: string,
  role: UserRole,
): Promise<{ success: boolean; error?: string }> {
  const { error: authError } = await verifyAdminAccess(undefined, ['admin']);
  if (authError) {
    return { success: false, error: authError };
  }

  // Use service-role client — user_roles is locked down by RLS
  const { client: adminClient, error: clientError } = createSupabaseAdminClient();
  if (!adminClient || clientError) {
    return { success: false, error: clientError ?? 'Failed to initialise admin client.' };
  }

  const { error } = await adminClient
    .from('user_roles')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('role', role);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function toggleApiAccess(
  userId: string,
  approved: boolean,
): Promise<{ success: boolean; error?: string }> {
  const { error: authError } = await verifyAdminAccess(undefined, ['admin', 'support']);
  if (authError) {
    return { success: false, error: authError };
  }

  // Use service-role client — profiles.api_access_approved is protected by trigger/RLS
  const { client: adminClient, error: clientError } = createSupabaseAdminClient();
  if (!adminClient || clientError) {
    return { success: false, error: clientError ?? 'Failed to initialise admin client.' };
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ api_access_approved: approved })
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
