import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'support' | 'editor' | 'data_steward' | 'developer';

export type Permission =
  | 'church:read'
  | 'church:create'
  | 'church:update'
  | 'church:delete'
  | 'users:read'
  | 'users:manage'
  | 'roles:assign'
  | 'system:config'
  | 'api:access'
  | 'api:keys:manage'
  | 'api:keys:view_all'
  | 'claims:review'
  | 'claims:submit'
  | 'data:ingest'
  | 'data:read';

export type UserSession = {
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  roles: UserRole[];
};

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'church:read', 'church:create', 'church:update', 'church:delete',
    'users:read', 'users:manage', 'roles:assign', 'system:config',
    'api:access', 'api:keys:manage', 'api:keys:view_all',
    'claims:review', 'claims:submit', 'data:ingest', 'data:read',
  ],
  support: [
    'church:read', 'users:read', 'users:manage',
    'api:keys:view_all', 'claims:review', 'data:read',
  ],
  editor: [
    'church:read', 'church:create', 'church:update', 'church:delete',
    'data:read',
  ],
  data_steward: [
    'church:read', 'data:ingest', 'data:read',
  ],
  developer: [
    'api:access', 'api:keys:manage', 'data:read',
  ],
};

function getServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Get the current user's session by Privy user ID.
 * Queries the unified profiles + user_roles tables via service role.
 * Auto-provisions a new profile row if the user doesn't exist yet.
 */
export async function getCurrentSession(
  privyUserId: string,
  privyEmail?: string,
  privyName?: string,
): Promise<UserSession | null> {
  const client = getServiceClient();

  let { data: profile } = await client
    .from('profiles')
    .select('id, email, display_name, avatar_url, first_name, last_name')
    .eq('id', privyUserId)
    .single();

  // Auto-provision: create profile row on first Privy login
  if (!profile && privyEmail) {
    // Check if a legacy profile exists with this email (backfilled from migration)
    const { data: legacyMatch } = await client
      .from('profiles')
      .select('id, email, display_name, avatar_url, first_name, last_name, company, website, bio')
      .eq('email', privyEmail)
      .single();

    if (legacyMatch && legacyMatch.id.startsWith('legacy:')) {
      // Upgrade legacy profile: replace temporary ID with Privy DID
      await client
        .from('profiles')
        .update({ id: privyUserId, auth_provider: 'privy', updated_at: new Date().toISOString() })
        .eq('id', legacyMatch.id);

      // Also update user_roles, org_memberships, and api_keys FK references
      await Promise.all([
        client.from('user_roles').update({ user_id: privyUserId }).eq('user_id', legacyMatch.id),
        client.from('org_memberships').update({ user_id: privyUserId }).eq('user_id', legacyMatch.id),
        client.from('api_keys').update({ privy_user_id: privyUserId }).eq('privy_user_id', legacyMatch.id),
      ]);

      profile = { ...legacyMatch, id: privyUserId };
    } else if (legacyMatch) {
      // Profile exists with a real Privy ID already (maybe from engage)
      profile = legacyMatch;
    } else {
      // Brand new user — create fresh profile
      const displayName = privyName ?? privyEmail.split('@')[0];
      const { data: newProfile } = await client
        .from('profiles')
        .insert({
          id: privyUserId,
          email: privyEmail,
          display_name: displayName,
          auth_provider: 'privy',
        })
        .select('id, email, display_name, avatar_url, first_name, last_name')
        .single();

      profile = newProfile;
    }
  }

  if (!profile) return null;

  const { data: roleRows } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', profile.id)
    .eq('is_active', true);

  const roles = (roleRows ?? []).map((r) => r.role as UserRole);
  const displayName = profile.display_name
    ?? ([profile.first_name, profile.last_name].filter(Boolean).join(' ') || null);

  return {
    userId: profile.id,
    email: profile.email ?? '',
    displayName,
    avatarUrl: profile.avatar_url ?? null,
    roles,
  };
}

export function hasRole(session: UserSession, ...requiredRoles: UserRole[]): boolean {
  return session.roles.some((r) => requiredRoles.includes(r));
}

export function hasPermission(session: UserSession, permission: Permission): boolean {
  return session.roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export async function ensureRole(
  privyUserId: string,
  ...requiredRoles: UserRole[]
): Promise<UserSession> {
  const session = await getCurrentSession(privyUserId);
  if (!session) {
    throw new Error('Authentication required. Please sign in.');
  }
  if (requiredRoles.length > 0 && !hasRole(session, ...requiredRoles)) {
    throw new Error('You do not have permission to perform this action.');
  }
  return session;
}

export async function ensureAuthenticated(
  privyUserId: string,
  privyEmail?: string,
  privyName?: string,
): Promise<UserSession> {
  const session = await getCurrentSession(privyUserId, privyEmail, privyName);
  if (!session) {
    throw new Error('Authentication required. Please sign in.');
  }
  return session;
}
