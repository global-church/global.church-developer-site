import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken, getPrivyUserEmail } from '@/lib/privy';
import { getCurrentSession } from '@/lib/session';

/**
 * Temporary diagnostic endpoint to debug Privy auth.
 * DELETE THIS after fixing the redirect loop.
 */
export async function GET(request: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cookieHeader = request.headers.get('cookie');

  const diagnostics: Record<string, unknown> = {
    step1_env: {
      PRIVY_APP_ID: appId ? `${appId.slice(0, 8)}...` : 'NOT SET',
      PRIVY_APP_SECRET: appSecret ? `set (${appSecret.length} chars)` : 'NOT SET',
      SUPABASE_URL: supabaseUrl ? 'set' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? `set (${supabaseKey.length} chars)` : 'NOT SET',
    },
  };

  // Step 2: verify token
  const claims = await verifyPrivyToken(cookieHeader);
  diagnostics.step2_verifyToken = claims ?? 'null (token verification failed)';
  if (!claims) {
    return NextResponse.json(diagnostics, { status: 200 });
  }

  // Step 3: try getCurrentSession WITHOUT email (this is what getServerSession does)
  try {
    const session = await getCurrentSession(claims.userId);
    diagnostics.step3_getCurrentSession_noEmail = session ?? 'null (no profile found)';
  } catch (error) {
    diagnostics.step3_getCurrentSession_noEmail = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  // Step 4: look up full Privy user object
  try {
    const { PrivyClient } = await import('@privy-io/server-auth');
    const client = new PrivyClient(appId!, appSecret!);
    const user = await client.getUser(claims.userId);
    diagnostics.step4_privyUser = {
      id: user.id,
      email: user.email ?? 'undefined',
      phone: user.phone ?? 'undefined',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      linkedAccounts: user.linkedAccounts?.map((a: any) => ({
        type: a.type,
        address: a.address ?? a.email,
        verifiedAt: a.verifiedAt,
      })),
      createdAt: user.createdAt,
    };
  } catch (error) {
    diagnostics.step4_privyUser = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  // Step 5: test getPrivyUserEmail specifically
  let resolvedEmail: string | null = null;
  try {
    resolvedEmail = await getPrivyUserEmail(claims.userId);
    diagnostics.step5_getPrivyUserEmail = resolvedEmail ?? 'null';
  } catch (error) {
    diagnostics.step5_getPrivyUserEmail = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  // Step 6: try getCurrentSession WITH email (auto-provision path)
  if (resolvedEmail) {
    try {
      const session = await getCurrentSession(claims.userId, resolvedEmail);
      diagnostics.step6_getCurrentSession_withEmail = session ?? 'null (still failed)';
    } catch (error) {
      diagnostics.step6_getCurrentSession_withEmail = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
    }
  } else {
    // Try directly with known email as control test
    try {
      const session = await getCurrentSession(claims.userId, 'paul.martel@global.church');
      diagnostics.step6_hardcoded_email = session ?? 'null (still failed even with hardcoded email)';
    } catch (error) {
      diagnostics.step6_hardcoded_email = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
