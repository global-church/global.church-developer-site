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

  // Step 4: look up email from Privy
  try {
    const email = await getPrivyUserEmail(claims.userId);
    diagnostics.step4_getPrivyUserEmail = email ?? 'null (no email found)';
  } catch (error) {
    diagnostics.step4_getPrivyUserEmail = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  // Step 5: try getCurrentSession WITH email (auto-provision path)
  try {
    const email = await getPrivyUserEmail(claims.userId);
    const session = await getCurrentSession(claims.userId, email ?? undefined);
    diagnostics.step5_getCurrentSession_withEmail = session ?? 'null (still failed)';
  } catch (error) {
    diagnostics.step5_getCurrentSession_withEmail = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
