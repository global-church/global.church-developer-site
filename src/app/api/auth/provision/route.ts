import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithProvision } from '@/lib/serverAuth';

/**
 * POST /api/auth/provision
 * Called after Privy login to ensure a profile row exists.
 * Body: { email?: string, name?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = await getServerSessionWithProvision(body.email, body.name);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
