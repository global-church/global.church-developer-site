import type { SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'support' | 'editor';

export type Permission =
  | 'church:read'
  | 'church:create'
  | 'church:update'
  | 'church:delete'
  | 'users:read'
  | 'users:manage'
  | 'roles:assign'
  | 'system:config'
  | 'api_keys:view_all';

export type UserSession = {
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  roles: UserRole[];
  apiAccessApproved: boolean;
};

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'church:read',
    'church:create',
    'church:update',
    'church:delete',
    'users:read',
    'users:manage',
    'roles:assign',
    'system:config',
    'api_keys:view_all',
  ],
  support: [
    'church:read',
    'users:read',
    'users:manage',
    'api_keys:view_all',
  ],
  editor: [
    'church:read',
    'church:create',
    'church:update',
    'church:delete',
  ],
};

/**
 * Get the current user's session with profile and roles.
 * Returns null if not authenticated.
 */
export async function getCurrentSession(
  client: SupabaseClient,
): Promise<UserSession | null> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await client
    .from('profiles')
    .select('display_name, avatar_url, api_access_approved')
    .eq('id', user.id)
    .single();

  const { data: roleRows } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const roles = (roleRows ?? []).map((r) => r.role as UserRole);

  return {
    userId: user.id,
    email: user.email ?? '',
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    roles,
    apiAccessApproved: profile?.api_access_approved ?? false,
  };
}

/**
 * Check if the session has at least one of the specified roles.
 */
export function hasRole(session: UserSession, ...requiredRoles: UserRole[]): boolean {
  return session.roles.some((r) => requiredRoles.includes(r));
}

/**
 * Check if the session has a specific permission.
 */
export function hasPermission(session: UserSession, permission: Permission): boolean {
  return session.roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

/**
 * Guard: ensures the user is authenticated and has at least one of the required roles.
 * Throws on failure.
 */
export async function ensureRole(
  client: SupabaseClient,
  ...requiredRoles: UserRole[]
): Promise<UserSession> {
  const session = await getCurrentSession(client);
  if (!session) {
    throw new Error('Authentication required. Please sign in.');
  }
  if (requiredRoles.length > 0 && !hasRole(session, ...requiredRoles)) {
    throw new Error('You do not have permission to perform this action.');
  }
  return session;
}

/**
 * Guard: ensures the user is authenticated (any user type).
 * Throws on failure.
 */
export async function ensureAuthenticated(
  client: SupabaseClient,
): Promise<UserSession> {
  const session = await getCurrentSession(client);
  if (!session) {
    throw new Error('Authentication required. Please sign in.');
  }
  return session;
}
