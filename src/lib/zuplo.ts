// src/lib/zuplo.ts
import type { ChurchPublic, ChurchWithinRadiusRow } from './types';

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
  belief?: string;
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
}): Promise<ChurchPublic[]> {
  return fetchFromZuploAPI<ChurchPublic[]>(params);
}

// Wrapper for the search_churches_by_bbox RPC
export async function searchChurchesByBbox(params: {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  q?: string;
  country?: string;
  belief?: string;
  trinitarian?: boolean;
  region?: string;
  locality?: string;
  postal_code?: string;
  languages?: string[];
  programs?: string[];
  limit?: number;
}): Promise<ChurchPublic[]> {
  return fetchFromZuploAPI<ChurchPublic[]>(params);
}


// Wrapper for the search_churches_by_radius RPC
export async function searchChurchesByRadius(params: {
  center_lat: number;
  center_lng: number;
  radius_km: number;
  q?: string;
  country?: string;
  belief?: string;
  trinitarian?: boolean;
  region?: string;
  locality?: string;
  postal_code?: string;
  languages?: string[];
  programs?: string[];
  limit?: number;
}): Promise<ChurchWithinRadiusRow[]> {
  return fetchFromZuploAPI<ChurchWithinRadiusRow[]>(params);
}