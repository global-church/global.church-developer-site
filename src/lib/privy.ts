import 'server-only';
import { PrivyClient } from '@privy-io/server-auth';

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  if (privyClient) return privyClient;

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) return null;

  privyClient = new PrivyClient(appId, appSecret);
  return privyClient;
}

export type PrivyTokenClaims = {
  userId: string;
};

/**
 * Verify a Privy auth token from the request cookies.
 * Returns the user ID if valid, null otherwise.
 */
export async function verifyPrivyToken(
  cookieHeader: string | null,
): Promise<PrivyTokenClaims | null> {
  const client = getPrivyClient();
  if (!client || !cookieHeader) return null;

  // Privy stores the auth token in the `privy-token` cookie
  const cookies = parseCookies(cookieHeader);
  const token = cookies['privy-token'];
  if (!token) return null;

  try {
    const claims = await client.verifyAuthToken(token);
    return { userId: claims.userId };
  } catch (error) {
    console.error('[verifyPrivyToken] token verification failed:', error);
    return null;
  }
}

/**
 * Look up a Privy user's email by their DID.
 * Used for auto-provisioning when no email is available from the client.
 */
export async function getPrivyUserEmail(userId: string): Promise<string | null> {
  const client = getPrivyClient();
  if (!client) return null;

  try {
    const user = await client.getUser(userId);
    // Email may be on user.email (email login) or in linkedAccounts (Google OAuth)
    if (user.email?.address) return user.email.address;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oauthAccount = user.linkedAccounts?.find((a: any) =>
      a.type === 'google_oauth' || a.type === 'email'
    ) as any;
    return oauthAccount?.address ?? oauthAccount?.email ?? null;
  } catch (error) {
    console.error('[getPrivyUserEmail] failed for', userId, error);
    return null;
  }
}

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key) {
      result[key.trim()] = rest.join('=').trim();
    }
  }
  return result;
}
