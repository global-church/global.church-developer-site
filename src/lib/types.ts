// src/lib/types.ts
export type ChurchPublic = {
  church_id: string
  name: string
  latitude: number | null
  longitude: number | null
  address: string | null
  locality: string | null
  region: string | null
  postal_code: string | null
  country: string
  website: string | null
  belief_type: 'orthodox' | 'roman_catholic' | 'protestant' | 'anglican' | 'other' | 'unknown' | null
  trinitarian_beliefs: boolean | null
  church_summary: string | null
}