import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import { hasRole } from '@/lib/session';

const GC_API_URL = process.env.API_URL;
const GC_API_KEY = process.env.GC_API_KEY;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !hasRole(session, 'admin', 'support')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!GC_API_URL || !GC_API_KEY) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 });
  }

  const body = await req.json();

  try {
    const res = await fetch(`${GC_API_URL}/v0/admin/claims/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GC_API_KEY}`,
      },
      body: JSON.stringify({ ...body, adminEmail: session.email }),
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
