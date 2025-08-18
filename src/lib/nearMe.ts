// src/lib/nearMe.ts
import { supabase } from "@/lib/supabase";

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
  const { data, error } = await supabase.rpc("churches_nearby", {
    user_lat: lat,
    user_lng: lng,
    radius_km: radiusKm,
    max_results: maxResults,
  });

  if (error) throw error;
  return (data ?? []) as NearbyChurch[];
}