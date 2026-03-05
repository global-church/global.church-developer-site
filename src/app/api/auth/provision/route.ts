import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken } from '@/lib/privy';
import { getCurrentSession } from '@/lib/session';

/**
 * POST /api/auth/provision
 * Called after Privy login to ensure a profile row exists.
 * Accepts Bearer token (from getAccessToken()) or falls back to cookie.
 * Body: { email?: string, name?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Try Bearer token first (client passes it explicitly), fall back to cookie
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    let userId: string | null = null;

    if (bearerToken) {
      // Verify the token directly via Privy server SDK
      const { PrivyClient } = await import('@privy-io/server-auth');
      const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
      const appSecret = process.env.PRIVY_APP_SECRET;
      if (appId && appSecret) {
        try {
          const client = new PrivyClient(appId, appSecret);
          const claims = await client.verifyAuthToken(bearerToken);
          userId = claims.userId;
        } catch {
          // Token invalid
        }
      }
    }

    if (!userId) {
      // Fall back to cookie-based auth
      const cookieHeader = request.headers.get('cookie');
      const claims = await verifyPrivyToken(cookieHeader);
      userId = claims?.userId ?? null;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await getCurrentSession(userId, body.email, body.name);

    if (!session) {
      return NextResponse.json({ error: 'Profile creation failed' }, { status: 500 });
    }

    return NextResponse.json({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
      roles: session.roles,
    });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
