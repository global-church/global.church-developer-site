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

  return results.map((church) => ({
    ...church,
    distance_km: church.distance_m / 1000,
  })) as unknown as NearbyChurch[];
}