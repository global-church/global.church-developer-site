import { supabase } from '@/lib/supabase'
import type { ChurchPublic, ChurchWithinRadiusRow } from '@/lib/types'

/**
 * Fetch churches within a radius (in meters) from a lng/lat point.
 * Returns all columns from ChurchPublic plus a distance_m field.
 */
export async function fetchChurchesWithinRadius(params: {
  lng: number
  lat: number
  radius_m: number
  limit?: number
}): Promise<ChurchWithinRadiusRow[]> {
  const { lng, lat, radius_m, limit = 200 } = params
  const { data, error } = await supabase.rpc('churches_within_radius', {
    p_lng: lng,
    p_lat: lat,
    p_radius_m: radius_m,
    p_limit: limit,
  })
  if (error) {
    console.error('fetchChurchesWithinRadius error:', error)
    return []
  }
  return (data ?? []) as ChurchWithinRadiusRow[]
}

/**
 * Fetch churches inside a bounding box (min/max lng/lat).
 * Returns rows shaped like ChurchPublic.
 */
export async function fetchChurchesInBBox(params: {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
  limit?: number
}): Promise<ChurchPublic[]> {
  const { minLng, minLat, maxLng, maxLat, limit = 500 } = params
  const { data, error } = await supabase.rpc('churches_in_bbox', {
    p_min_lng: minLng,
    p_min_lat: minLat,
    p_max_lng: maxLng,
    p_max_lat: maxLat,
    p_limit: limit,
  })
  if (error) {
    console.error('fetchChurchesInBBox error:', error)
    return []
  }
  return (data ?? []) as ChurchPublic[]
}


