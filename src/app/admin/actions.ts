'use server';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AdminStatus, ChurchPublic } from '@/lib/types';
import { hydrateChurchList, hydrateChurchPublic } from '@/lib/adminChurchHydration';
import { getServerSession } from '@/lib/serverAuth';
import { hasRole, type UserRole, type UserSession } from '@/lib/session';

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
  requiredRoles: UserRole[] = ['admin', 'support', 'editor'],
): Promise<{ session: UserSession | null; error: string | null }> {
  const session = await getServerSession();

  if (!session) {
    return { session: null, error: SESSION_ERROR_MESSAGE };
  }

  if (requiredRoles.length > 0 && !hasRole(session, ...requiredRoles)) {
    return { session, error: 'You do not have permission to perform this action.' };
  }

  return { session, error: null };
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

export async function saveChurchChanges(payload: ChurchUpdatePayload): Promise<SaveChurchResult> {
  const { error: authError } = await verifyAdminAccess();
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

    if (response.error) {
      return { success: false, error: response.error.message };
    }
    if (!response.data) {
      return { success: false, error: 'Operation completed but no record was returned.' };
    }
    return { success: true, data: response.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function createChurch(payload: CreateChurchPayload): Promise<CreateChurchResult> {
  const { error: authError } = await verifyAdminAccess();
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

    if (response.error) {
      return { success: false, error: response.error.message };
    }
    if (!response.data) {
      return { success: false, error: 'Operation completed but no record was returned.' };
    }
    return { success: true, data: response.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function fetchAdminChurchesByStatus(params: AdminChurchListParams): Promise<AdminChurchListResult> {
  const { error: authError } = await verifyAdminAccess();
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
  const { error: authError } = await verifyAdminAccess();
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
  const { error: authError } = await verifyAdminAccess(['admin', 'support']);
  if (authError) {
    throw new Error(authError);
  }

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
    .select('privy_user_id')
    .in('privy_user_id', userIds)
    .eq('is_active', true);

  const roleMap = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const existing = roleMap.get(row.user_id) ?? [];
    existing.push(row.role);
    roleMap.set(row.user_id, existing);
  }

  const keyCountMap = new Map<string, number>();
  for (const row of keyCounts ?? []) {
    keyCountMap.set(row.privy_user_id, (keyCountMap.get(row.privy_user_id) ?? 0) + 1);
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
  const { session, error: authError } = await verifyAdminAccess(['admin']);
  if (authError || !session) {
    return { success: false, error: authError ?? 'Authentication failed.' };
  }

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

  await adminClient.from('role_audit_log').insert({
    target_user: userId,
    action: 'grant',
    role,
    scope: 'platform',
    performed_by: session.userId,
  });

  return { success: true };
}

export async function removeRole(
  userId: string,
  role: UserRole,
): Promise<{ success: boolean; error?: string }> {
  const { session, error: authError } = await verifyAdminAccess(['admin']);
  if (authError || !session) {
    return { success: false, error: authError ?? 'Authentication failed.' };
  }

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

  await adminClient.from('role_audit_log').insert({
    target_user: userId,
    action: 'revoke',
    role,
    scope: 'platform',
    performed_by: session.userId,
  });

  return { success: true };
}

export async function toggleApiAccess(
  userId: string,
  approved: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (approved) {
    return assignRole(userId, 'developer');
  } else {
    return removeRole(userId, 'developer');
  }
}
