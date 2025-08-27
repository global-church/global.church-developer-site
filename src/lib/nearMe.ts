// src/lib/nearMe.ts
import { searchChurchesByRadius } from "@/lib/zuplo";

export type NearbyChurch = {
  church_id: string;
  name: string;
  distance_km: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  locality: string | null;
  region: string | null;
  country: string;
  website: string | null;
  service_languages: string[] | null;
  belief_type: 'orthodox' | 'roman_catholic' | 'protestant' | 'anglican' | 'other' | 'unknown' | null;
  services_info?: string | null;
  programs_offered?: string[] | null;
};

export async function fetchNearbyChurches(
  lat: number,
  lng: number,
  radiusKm = 25,
  maxResults = 50
): Promise<NearbyChurch[]> {
  const results = await searchChurchesByRadius({
    center_lat: lat,
    center_lng: lng,
    radius_km: radiusKm,
    limit: maxResults,
  });

  // Resilient number parsing
  const asNumber = (v: unknown): number | null => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  // Be resilient to different distance fields from API (distance_km, distance_m, distance). Fallback to haversine.
  const toKm = (row: any): number | null => {
    const km = asNumber(row?.distance_km);
    if (km !== null) return km;
    const m = asNumber(row?.distance_m);
    if (m !== null) return m / 1000;
    const d = asNumber(row?.distance);
    if (d !== null) return d; // assume already in km
    return null;
  };

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const haversineKm = (la1: number, lo1: number, la2: number, lo2: number) => {
    const R = 6371; // km
    const dLat = toRad(la2 - la1);
    const dLon = toRad(lo2 - lo1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(la1)) * Math.cos(toRad(la2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return results.map((church: any) => {
    const apiKm = toKm(church);
    const lat2 = asNumber(church?.latitude);
    const lng2 = asNumber(church?.longitude);
    const fallbackKm = lat2 !== null && lng2 !== null ? haversineKm(lat, lng, lat2, lng2) : 0;
    return {
      ...church,
      distance_km: apiKm !== null && apiKm > 0 ? apiKm : fallbackKm,
    } as NearbyChurch;
  });
}