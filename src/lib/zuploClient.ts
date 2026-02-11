// src/lib/zuploClient.ts — Client-safe wrappers that call server-side API proxy routes.
// These mirror the function signatures in zuplo.ts but never expose the API key to the browser.
import type { ChurchPublic, ChurchWithinRadiusRow, ZuploListResponse } from './types';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export type { ZuploListResponse };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${url}: ${text.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

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
  cursor?: string;
}): Promise<ZuploListResponse<ChurchPublic>> {
  return post('/api/churches/search', params);
}

export async function getChurchById(id: string): Promise<ChurchPublic | null> {
  if (!id) return null;
  const res = await fetch(`/api/churches/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json() as Promise<ChurchPublic>;
}

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
  cursor?: string;
}): Promise<ZuploListResponse<ChurchPublic>> {
  return post('/api/churches/search', { _variant: 'bbox', ...params });
}

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
  cursor?: string;
}): Promise<ZuploListResponse<ChurchWithinRadiusRow>> {
  return post('/api/churches/search', { _variant: 'radius', ...params });
}

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
  fields?: string;
  min_lat?: number;
  max_lat?: number;
  min_lng?: number;
  max_lng?: number;
  center_lat?: number;
  center_lng?: number;
  radius_km?: number;
}): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
  return post('/api/churches/geojson', params);
}
