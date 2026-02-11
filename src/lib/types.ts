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

export type AdminStatus = 'approved' | 'needs_review' | 'rejected';

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
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  locality: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;

  // web
  website: string | null;
  website_root: string | null;

  // internal/search-ish
  pipeline_status: PipelineStatus | null;
  admin_status?: AdminStatus | null;
  admin_notes?: string | null;
  search_blob: string | null;

  // beliefs / classification
  belief_type: BeliefType | null;
  trinitarian_beliefs: boolean | null;
  church_beliefs_url: string | null;

  // services info
  services_info: string | null;
  service_languages: string[] | null;

  // socials
  instagram_url: string | null;
  youtube_url: string | null;
  social_media: string[] | null;
  logo_url?: string | null;
  logo_width?: number | null;
  logo_height?: number | null;
  logo_aspect_ratio?: number | null;
  banner_url?: string | null;
  banner_width?: number | null;
  banner_height?: number | null;
  banner_aspect_ratio?: number | null;

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
  geo: string | null;
  geojson: GeoJSONPoint | null;

  // new fields from V1 schema
  url_giving?: string | null;
  url_beliefs?: string | null;
  url_facebook?: string | null;
  url_instagram?: string | null;
  url_tiktok?: string | null;
  url_campus?: string | null;
  url_live?: string | null;
  contact_emails?: string[] | null;
  contact_phones?: string[] | null;
  service_times?: number[] | null;
  service_source_urls?: string[] | null;
  ministry_names?: string[] | null;
  ministries_json?:
    | Array<{ name?: string | null; notes?: string | null; source_url?: string | null; source_text?: string | null }>
    | { [key: string]: unknown }
    | null;
  denomination?: string | null;
  trinitarian?: boolean | null;
  extraction_confidence?: number | null;
  is_weekly_church?: boolean | null;
  campus_name?: string | null;
  overarching_name?: string | null;
  is_multi_campus?: boolean | null;
};

/**
 * RPC: churches_within_radius returns all ChurchPublic columns + distance_m
 * (distance in meters from the query point)
 */
export type ChurchWithinRadiusRow = ChurchPublic & {
  distance_m: number;
};

/** Paginated list response from Zuplo API */
export type ZuploListResponse<T> = {
  items: T[];
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
};
