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
  } catch {
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
