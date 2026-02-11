import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchChurchesGeoJSON } from '@/lib/zuplo';

// Allowed parameter keys to prevent mass assignment
const ALLOWED_KEYS = new Set([
  'q', 'country', 'belief', 'trinitarian', 'region', 'locality',
  'postal_code', 'languages', 'programs', 'id', 'limit', 'fields',
  'min_lat', 'max_lat', 'min_lng', 'max_lng',
  'center_lat', 'center_lng', 'radius_km',
]);

function pick(obj: Record<string, unknown>, allowed: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (allowed.has(key)) out[key] = obj[key];
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const params = pick(body, ALLOWED_KEYS) as Parameters<typeof searchChurchesGeoJSON>[0];
    const result = await searchChurchesGeoJSON(params);
    return NextResponse.json(result);
  } catch (err) {
    console.error('churches/geojson proxy error', err);
    return NextResponse.json(
      { error: 'Failed to fetch church data.' },
      { status: 500 },
    );
  }
}
