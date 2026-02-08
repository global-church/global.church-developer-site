import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentSession, hasRole, type UserSession } from './session';

/**
 * @deprecated Use UserSession from './session' instead.
 */
export type AdminMembership = {
  user_id: string;
  email: string;
  role: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

function sessionToMembership(session: UserSession): AdminMembership {
  return {
    user_id: session.userId,
    email: session.email,
    role: session.roles[0] ?? 'admin',
    display_name: session.displayName,
    is_active: true,
    created_at: '',
    last_login_at: null,
  };
}

/**
 * @deprecated Use getCurrentSession from './session' instead.
 */
export async function getCurrentAdmin(client: SupabaseClient): Promise<AdminMembership | null> {
  const session = await getCurrentSession(client);
  if (!session) return null;
  if (!hasRole(session, 'admin', 'support', 'editor')) return null;
  return sessionToMembership(session);
}

/**
 * @deprecated Use ensureRole from './session' instead.
 */
export async function ensureActiveAdmin(client: SupabaseClient): Promise<AdminMembership> {
  const session = await getCurrentSession(client);

  if (!session || !hasRole(session, 'admin', 'support', 'editor')) {
    throw new Error('Your account is not authorised for the admin portal.');
  }

  return sessionToMembership(session);
}
