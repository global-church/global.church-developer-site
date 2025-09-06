// src/lib/zuplo.ts
import type { ChurchPublic, ChurchWithinRadiusRow } from './types';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

const ZUPLO_API_URL = process.env.NEXT_PUBLIC_ZUPLO_API_URL;
const ZUPLO_API_KEY = process.env.NEXT_PUBLIC_ZUPLO_API_KEY;

if (!ZUPLO_API_URL || !ZUPLO_API_KEY) {
  throw new Error('Zuplo API URL or Key is not defined in environment variables.');
}

// A generic fetch function to handle calls to our Zuplo API
async function fetchFromZuploAPI<T>(params: Record<string, unknown>): Promise<T> {
  // All church search routes are served behind /v1/churches/search with query params
  const url = new URL(`${ZUPLO_API_URL}/v1/churches/search`);

  // Append non-null parameters to the URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        // Handle array parameters
        value.forEach(v => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  });

  const headers: HeadersInit = {
    Authorization: `Bearer ${ZUPLO_API_KEY}`,
  };

  const requestUrl = url.toString();
  let response: Response;
  try {
    response = await fetch(requestUrl, { headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Network error fetching ${requestUrl}: ${msg}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API Error (${response.status}): ${errorBody}`);
    const snippet = errorBody.slice(0, 500);
    throw new Error(`HTTP ${response.status} from ${requestUrl}: ${snippet}`);
  }

  const data = await response.json();
  return data.items as T;
}


// Wrapper for the search_churches RPC
export async function searchChurches(params: {
  q?: string;
  country?: string;
  belief?: string | string[];
  trinitarian?: boolean;
  region?: string;
  locality?: string;
  postal_code?: string;
  languages?: string[];
  programs?: string[];
  service_days?: string[];
  service_time_start?: string;
  service_time_end?: string;
  id?: string;
  limit?: number;
  fields?: string;
}): Promise<ChurchPublic[]> {
  // Ensure church_id is returned for linking when caller didn't specify fields
  const next: Record<string, unknown> = { ...params };
  if (!('fields' in next)) {
    // Request a minimal but linkable set to reduce payload
    next.fields = 'church_id,name,latitude,longitude,locality,region,country,website,belief_type,denomination,ministry_names,service_languages,service_times,geojson';
  } else if (typeof next.fields === 'string' && !String(next.fields).split(',').map(s => s.trim()).includes('church_id')) {
    next.fields = String(next.fields) + ',church_id';
  }
  return fetchFromZuploAPI<ChurchPublic[]>(next);
}

// Fetch a single church by id using the dedicated endpoint
export async function getChurchById(id: string): Promise<ChurchPublic | null> {
  if (!id) return null;
  const url = new URL(`${ZUPLO_API_URL}/v1/churches/${id}`);
  const headers: HeadersInit = { Authorization: `Bearer ${ZUPLO_API_KEY}` };
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${url.toString()}: ${body.slice(0, 500)}`);
  }
  return (await res.json()) as ChurchPublic;
}

// Wrapper for the search_churches_by_bbox RPC
export async function searchChurchesByBbox(params: {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  q?: string;
  country?: string;
  belief?: string | string[];
  trinitarian?: boolean;
  region?: string;
  locality?: string;
  postal_code?: string;
  languages?: string[];
  programs?: string[];
  service_days?: string[];
  service_time_start?: string;
  service_time_end?: string;
  limit?: number;
}): Promise<ChurchPublic[]> {
  const next: Record<string, unknown> = { ...params };
  if (!('fields' in next)) {
    next.fields = 'church_id,name,latitude,longitude,locality,region,country,website,belief_type,denomination,ministry_names,service_languages,service_times,geojson';
  } else if (typeof next.fields === 'string' && !String(next.fields).split(',').map(s => s.trim()).includes('church_id')) {
    next.fields = String(next.fields) + ',church_id';
  }
  return fetchFromZuploAPI<ChurchPublic[]>(next);
}


// Wrapper for the search_churches_by_radius RPC
export async function searchChurchesByRadius(params: {
  center_lat: number;
  center_lng: number;
  radius_km: number;
  q?: string;
  country?: string;
  belief?: string | string[];
  trinitarian?: boolean;
  region?: string;
  locality?: string;
  postal_code?: string;
  languages?: string[];
  programs?: string[];
  service_days?: string[];
  service_time_start?: string;
  service_time_end?: string;
  limit?: number;
}): Promise<ChurchWithinRadiusRow[]> {
  const next: Record<string, unknown> = { ...params };
  if (!('fields' in next)) {
    next.fields = 'church_id,name,latitude,longitude,locality,region,country,website,belief_type,denomination,ministry_names,service_languages,service_times,geojson,distance_m';
  } else if (typeof next.fields === 'string' && !String(next.fields).split(',').map(s => s.trim()).includes('church_id')) {
    next.fields = String(next.fields) + ',church_id';
  }
  return fetchFromZuploAPI<ChurchWithinRadiusRow[]>(next);
}

/**
 * Fetches churches as a GeoJSON FeatureCollection for globe/map rendering.
 * Only include the fields you need via `fields` to reduce payload size.
 */
export async function searchChurchesGeoJSON(params: {
  q?: string;
  country?: string;
  belief?: string;
  trinitarian?: boolean;
  region?: string;
  locality?: string;
  postal_code?: string;
  languages?: string[];
  programs?: string[];
  id?: string;
  limit?: number;
  fields?: string; // e.g. "church_id,name,latitude,longitude,locality,region,country"
  // Optional geo selectors (if omitted, a global bbox is used to avoid RPC #1)
  min_lat?: number;
  max_lat?: number;
  min_lng?: number;
  max_lng?: number;
  center_lat?: number;
  center_lng?: number;
  radius_km?: number;
}): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
  // Helper to build URL with params
  const buildUrl = () => {
    const u = new URL(`${ZUPLO_API_URL}/v1/churches/search`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => u.searchParams.append(key, String(v)));
        } else {
          u.searchParams.set(key, String(value));
        }
      }
    });
    // Hint backend to use globe-optimized RPC if available
    if (!u.searchParams.has('for_globe')) {
      u.searchParams.set('for_globe', 'true');
    }
    // If no bbox or radius provided, default to a safe global bbox to engage the bbox RPC
    const hasBbox = [
      u.searchParams.get('min_lat'),
      u.searchParams.get('max_lat'),
      u.searchParams.get('min_lng'),
      u.searchParams.get('max_lng'),
    ].every((v) => v !== null);
    const hasRadius = [
      u.searchParams.get('center_lat'),
      u.searchParams.get('center_lng'),
      u.searchParams.get('radius_km'),
    ].every((v) => v !== null);
    if (!hasBbox && !hasRadius) {
      u.searchParams.set('min_lat', String(-85));
      u.searchParams.set('max_lat', String(85));
      u.searchParams.set('min_lng', String(-180));
      u.searchParams.set('max_lng', String(180));
    }
    return u;
  };

  const headers: HeadersInit = { Authorization: `Bearer ${ZUPLO_API_KEY}` };

  // 1) Try server-side GeoJSON first
  try {
    const u1 = buildUrl();
    u1.searchParams.set('format', 'geojson');
    const res1 = await fetch(u1.toString(), { headers });
    if (res1.ok) {
      return (await res1.json()) as FeatureCollection<Geometry, GeoJsonProperties>;
    } else {
      const body = await res1.text();
      console.warn(`GeoJSON format failed (${res1.status}): ${body}`);
    }
  } catch (e) {
    console.warn('GeoJSON request threw, will fallback to JSON:', e);
  }

  // 2) Fallback: request JSON and convert client-side to GeoJSON
  const u2 = buildUrl();
  // Ensure we don't pass format=geojson here
  u2.searchParams.delete('format');
  const res2 = await fetch(u2.toString(), { headers });
  if (!res2.ok) {
    const errorBody = await res2.text();
    console.warn(`JSON fallback failed (${res2.status}) – returning empty FeatureCollection: ${errorBody}`);
    return { type: 'FeatureCollection', features: [] } as FeatureCollection<Geometry, GeoJsonProperties>;
  }
  const json = (await res2.json()) as { items: ChurchPublic[] } | ChurchPublic[];
  const items: ChurchPublic[] = Array.isArray(json) ? (json as ChurchPublic[]) : (json.items as ChurchPublic[]);

  const fieldsArr = (params.fields || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const project = (row: ChurchPublic): Record<string, unknown> => {
    if (!fieldsArr.length) return row as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of fieldsArr) {
      if (k in row) out[k] = (row as unknown as Record<string, unknown>)[k];
    }
    return out;
  };

  const features = (items || []).map((r) => {
    const lon = (r.longitude ?? (r as unknown as { lng?: number }).lng ?? null) as number | null;
    const lat = (r.latitude ?? (r as unknown as { lat?: number }).lat ?? null) as number | null;
    const geometry = lon != null && lat != null ? ({ type: 'Point', coordinates: [lon, lat] } as Geometry) : null;
    const props = project(r) as GeoJsonProperties;
    return { type: 'Feature', geometry, properties: props } as unknown as FeatureCollection['features'][number];
  });

  return { type: 'FeatureCollection', features } as FeatureCollection<Geometry, GeoJsonProperties>;
}
