// types.ts

export type BeliefType =
  | 'orthodox'
  | 'roman_catholic'
  | 'protestant'
  | 'anglican'
  | 'other'
  | 'unknown';

export type PipelineStatus =
  | 'approved_for_gc_db'
  | 'no_website'
  | 'playwright_fail'
  | 'explicitly_non_church'
  | 'dns_fail'
  | 'ai_scrape_failed'
  | 'non_trinitarian_filter'
  | 'ai_church_network'
  | 'explicitly_non_trinitarian'
  | 'parachurch_filter'
  | 'ai_manual_review'
  | 'ai_non_trinitarian'
  | 'non_christian_terms'
  | 'gers_id_already_in_db';

/** Minimal GeoJSON Point for map libs (lng, lat) */
export type GeoJSONPoint = {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
};

export type ChurchPublic = {
  // core ids / names
  church_id: string;
  gers_id: string | null;
  name: string;

  // location
  latitude: number | null; // double precision
  longitude: number | null; // double precision
  address: string | null;
  locality: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;

  // web
  website: string | null;
  website_root: string | null;

  // internal/search-ish
  pipeline_status: PipelineStatus | null; // stored as text in DB
  search_blob: string | null;

  // beliefs / classification
  belief_type: BeliefType | null; // enum in app, enum type in DB
  trinitarian_beliefs: boolean | null;
  church_beliefs_url: string | null;

  // services info
  services_info: string | null;

  /** Postgres text[] → Supabase returns string[] */
  service_languages: string[] | null;

  // socials
  instagram_url: string | null;
  youtube_url: string | null;

  /**
   * Generic social media accounts (Facebook, etc.)
   * Postgres text[] → Supabase returns string[]
   */
  social_media: string[] | null;

  // contact
  scraped_email: string | null;
  phone: string | null;
  church_phone: string | null;

  // giving / donation
  giving_url: string | null;

  // scraped address
  scraped_address: string | null;

  // programs
  programs_offered: string[] | null;

  // public-facing copy
  church_summary: string | null;

  // spatial (from view)
  /** Raw PostGIS geography WKB (you can ignore this in FE) */
  geo: string | null;

  /** Handy for maps: { type: 'Point', coordinates: [lng, lat] } */
  geojson: GeoJSONPoint | null;
};

/**
 * RPC: churches_within_radius returns all ChurchPublic columns + distance_m
 * (distance in meters from the query point)
 */
export type ChurchWithinRadiusRow = ChurchPublic & {
  distance_m: number;
};