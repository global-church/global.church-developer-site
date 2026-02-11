import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchChurchesGeoJSON } from '@/lib/zuplo';

export async function POST(req: NextRequest) {
  try {
    const params = (await req.json()) as Parameters<typeof searchChurchesGeoJSON>[0];
    const result = await searchChurchesGeoJSON(params);
    return NextResponse.json(result);
  } catch (err) {
    console.error('churches/geojson proxy error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
