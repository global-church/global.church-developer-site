import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import { hasRole } from '@/lib/session';

const ZUPLO_API_URL = process.env.ZUPLO_API_URL;
const ZUPLO_API_KEY = process.env.ZUPLO_API_KEY;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !hasRole(session, 'admin', 'support')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!ZUPLO_API_URL || !ZUPLO_API_KEY) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 });
  }

  const body = await req.text();

  try {
    const res = await fetch(`${ZUPLO_API_URL}/v1/admin/claims/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZUPLO_API_KEY}`,
        'x-admin-email': session.email,
      },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Review proxy error' },
      { status: 502 },
    );
  }
}
