import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchChurches, searchChurchesByBbox, searchChurchesByRadius } from '@/lib/zuplo';

// Allowed parameter keys for each search variant to prevent mass assignment
const ALLOWED_STANDARD = new Set([
  'q', 'country', 'belief', 'trinitarian', 'region', 'locality',
  'postal_code', 'languages', 'programs', 'service_days',
  'service_time_start', 'service_time_end', 'id', 'limit', 'fields', 'cursor',
]);
const ALLOWED_BBOX = new Set([
  ...ALLOWED_STANDARD, 'min_lat', 'max_lat', 'min_lng', 'max_lng',
]);
const ALLOWED_RADIUS = new Set([
  ...ALLOWED_STANDARD, 'center_lat', 'center_lng', 'radius_km',
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
    const { _variant, ...raw } = body;

    if (_variant === 'radius') {
      const params = pick(raw, ALLOWED_RADIUS);
      const result = await searchChurchesByRadius(params as Parameters<typeof searchChurchesByRadius>[0]);
      return NextResponse.json(result);
    }

    if (_variant === 'bbox') {
      const params = pick(raw, ALLOWED_BBOX);
      const result = await searchChurchesByBbox(params as Parameters<typeof searchChurchesByBbox>[0]);
      return NextResponse.json(result);
    }

    const params = pick(raw, ALLOWED_STANDARD);
    const result = await searchChurches(params as Parameters<typeof searchChurches>[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error('churches/search proxy error', err);
    return NextResponse.json(
      { error: 'Failed to search churches.' },
      { status: 500 },
    );
  }
}
