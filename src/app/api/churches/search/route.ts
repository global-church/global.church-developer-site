import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchChurches, searchChurchesByBbox, searchChurchesByRadius } from '@/lib/zuplo';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const { _variant, ...params } = body;

    if (_variant === 'radius') {
      const result = await searchChurchesByRadius(params as Parameters<typeof searchChurchesByRadius>[0]);
      return NextResponse.json(result);
    }

    if (_variant === 'bbox') {
      const result = await searchChurchesByBbox(params as Parameters<typeof searchChurchesByBbox>[0]);
      return NextResponse.json(result);
    }

    const result = await searchChurches(params as Parameters<typeof searchChurches>[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error('churches/search proxy error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
