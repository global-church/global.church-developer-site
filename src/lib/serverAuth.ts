import 'server-only';
import { cookies, headers } from 'next/headers';
import { verifyPrivyToken } from './privy';
import { getCurrentSession, type UserSession } from './session';

/**
 * Get the authenticated user session from server components/actions.
 * Returns null if the user is not authenticated.
 */
export async function getServerSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');

  const claims = await verifyPrivyToken(cookieHeader);
  if (!claims) return null;

  // Privy doesn't embed email in the token; we look it up from the DB.
  // On first login the auto-provision in getCurrentSession handles creation.
  return getCurrentSession(claims.userId);
}

/**
 * Get session with auto-provisioning for first-time users.
 * Uses Privy user info to create a profile if one doesn't exist.
 */
export async function getServerSessionWithProvision(
  privyEmail?: string,
  privyName?: string,
): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');

  const claims = await verifyPrivyToken(cookieHeader);
  if (!claims) return null;

  return getCurrentSession(claims.userId, privyEmail, privyName);
}

/**
 * Get just the Privy user ID (without DB lookup).
 * Useful for lightweight checks.
 */
export async function getPrivyUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');

  const claims = await verifyPrivyToken(cookieHeader);
  return claims?.userId ?? null;
}
