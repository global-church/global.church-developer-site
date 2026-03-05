import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({
    userId: session.userId,
    email: session.email,
    displayName: session.displayName,
    roles: session.roles,
  });
}
