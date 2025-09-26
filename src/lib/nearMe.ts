// src/lib/nearMe.ts
import { searchChurchesByRadius } from "@/lib/zuplo";
import type { ChurchWithinRadiusRow } from "@/lib/types";
import type { ZuploListResponse } from "@/lib/zuplo";

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
  denomination?: string | null;
  services_info?: string | null;
  service_times?: number[] | null;
  ministry_names?: string[] | null;
  programs_offered?: string[] | null;
};

export async function fetchNearbyChurches(
  lat: number,
  lng: number,
  radiusKm = 25,
  pageSize = 50,
  filters?: {
    belief?: string | string[];
    languages?: string[];
    service_days?: string[];
    service_time_start?: string;
    service_time_end?: string;
    programs?: string[];
  },
  cursor?: string
): Promise<ZuploListResponse<NearbyChurch>> {
  const page = await searchChurchesByRadius({
    center_lat: lat,
    center_lng: lng,
    radius_km: radiusKm,
    limit: pageSize,
    belief: filters?.belief,
    languages: filters?.languages,
    service_days: filters?.service_days,
    service_time_start: filters?.service_time_start,
    service_time_end: filters?.service_time_end,
    programs: filters?.programs,
    cursor,
  });

  const rows = page.items as Array<ChurchWithinRadiusRow>;
  const items = rows.map((church) => ({
    ...church,
    distance_km: typeof church.distance_m === 'number' ? church.distance_m / 1000 : 0,
  })) as unknown as NearbyChurch[];

  return {
    items,
    limit: page.limit,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  };
}
