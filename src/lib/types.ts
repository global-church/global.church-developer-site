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
  search_blob: string | null;

  // beliefs / classification
  belief_type: BeliefType | null;
  trinitarian_beliefs: boolean | null;
  church_beliefs_url: string | null;

  // services info
  services_info: string | null;

  /**
   * Postgres text[] → Supabase client returns string[]
   */
  service_languages: string[] | null;

  // socials
  instagram_url: string | null;
  youtube_url: string | null;

  /**
   * Generic social media accounts (Facebook, Twitter, etc.)
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
};