import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getChurchById } from '@/lib/zuplo';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const church = await getChurchById(id);
    if (!church) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(church);
  } catch (err) {
    console.error('churches/[id] proxy error', err);
    return NextResponse.json(
      { error: 'Failed to fetch church.' },
      { status: 500 },
    );
  }
}
