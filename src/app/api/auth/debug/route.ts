import { NextRequest, NextResponse } from 'next/server';

/**
 * Temporary diagnostic endpoint to debug Privy auth.
 * DELETE THIS after fixing the redirect loop.
 */
export async function GET(request: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  const privyToken = request.cookies.get('privy-token')?.value;
  const allCookieNames = request.cookies.getAll().map((c) => c.name);

  const diagnostics: Record<string, unknown> = {
    NEXT_PUBLIC_PRIVY_APP_ID: appId ? `${appId.slice(0, 8)}...` : 'NOT SET',
    PRIVY_APP_SECRET: appSecret ? `set (${appSecret.length} chars)` : 'NOT SET',
    'privy-token cookie': privyToken ? `present (${privyToken.length} chars)` : 'MISSING',
    allCookieNames,
  };

  // If we have all three, try actual verification
  if (appId && appSecret && privyToken) {
    try {
      const { PrivyClient } = await import('@privy-io/server-auth');
      const client = new PrivyClient(appId, appSecret);
      const claims = await client.verifyAuthToken(privyToken);
      diagnostics.verification = 'SUCCESS';
      diagnostics.userId = claims.userId;
    } catch (error) {
      diagnostics.verification = 'FAILED';
      diagnostics.error = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
