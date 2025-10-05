import type {
  AdminStatus,
  BeliefType,
  ChurchPublic,
  GeoJSONPoint,
  PipelineStatus,
} from './types';

type SupabaseChurchRow = Partial<ChurchPublic> & {
  enriched_json?: unknown;
  admin_status?: AdminStatus | null;
  pipeline_status?: PipelineStatus | null;
};

const PIPELINE_STATUS_VALUES = new Set<PipelineStatus>([
  'approved_for_gc_db',
  'no_website',
  'playwright_fail',
  'explicitly_non_church',
  'dns_fail',
  'ai_scrape_failed',
  'non_trinitarian_filter',
  'ai_church_network',
  'explicitly_non_trinitarian',
  'parachurch_filter',
  'ai_manual_review',
  'ai_non_trinitarian',
  'non_christian_terms',
  'gers_id_already_in_db',
]);

const BELIEF_TYPES = new Set<BeliefType>([
  'orthodox',
  'roman_catholic',
  'protestant',
  'anglican',
  'other',
  'unknown',
]);

const ADMIN_STATUS_VALUES = new Set<AdminStatus>(['approved', 'needs_review', 'rejected']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
}

function toRequiredString(value: unknown): string {
  const candidate = toStringOrNull(value);
  return candidate ?? '';
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (normalised === 'true' || normalised === 'yes') return true;
    if (normalised === 'false' || normalised === 'no') return false;
    if (normalised === '1') return true;
    if (normalised === '0') return false;
  }
  return null;
}

function toStringArrayOrNull(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const mapped = value
      .map((item) => toStringOrNull(item))
      .filter((item): item is string => Boolean(item));
    return mapped.length ? mapped : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const parsed = parseJson(trimmed);
    if (Array.isArray(parsed)) {
      const mapped = parsed
        .map((item) => toStringOrNull(item))
        .filter((item): item is string => Boolean(item));
      return mapped.length ? mapped : null;
    }
    const tokens = trimmed
      .split(/[\n,]/)
      .map((token) => token.trim())
      .filter(Boolean);
    return tokens.length ? tokens : null;
  }
  return null;
}

function toNumberArrayOrNull(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    const mapped = value
      .map((item) => toNumberOrNull(item))
      .filter((item): item is number => Number.isFinite(item));
    return mapped.length ? mapped : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const parsed = parseJson(trimmed);
    if (Array.isArray(parsed)) {
      const mapped = parsed
        .map((item) => toNumberOrNull(item))
        .filter((item): item is number => Number.isFinite(item));
      return mapped.length ? mapped : null;
    }
    const tokens = trimmed
      .split(/[\n,]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => Number(token))
      .filter((item) => Number.isFinite(item));
    return tokens.length ? tokens : null;
  }
  return null;
}

function toGeoJSONPointOrNull(value: unknown): GeoJSONPoint | null {
  if (isPlainObject(value)) {
    const type = toStringOrNull(value.type);
    const coordsRaw = (value.coordinates ?? value.coords) as unknown;
    if (type === 'Point' && Array.isArray(coordsRaw) && coordsRaw.length >= 2) {
      const lng = toNumberOrNull(coordsRaw[0]);
      const lat = toNumberOrNull(coordsRaw[1]);
      if (lng != null && lat != null) {
        return { type: 'Point', coordinates: [lng, lat] };
      }
    }
  }
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    return toGeoJSONPointOrNull(parsed ?? null);
  }
  return null;
}

function toPipelineStatusOrNull(value: unknown): PipelineStatus | null {
  const candidate = toStringOrNull(value) as PipelineStatus | null;
  if (candidate && PIPELINE_STATUS_VALUES.has(candidate)) {
    return candidate;
  }
  return null;
}

function toBeliefTypeOrNull(value: unknown): BeliefType | null {
  const candidate = toStringOrNull(value) as BeliefType | null;
  if (candidate && BELIEF_TYPES.has(candidate)) {
    return candidate;
  }
  return null;
}

function toAdminStatusOrNull(value: unknown): AdminStatus | null {
  const candidate = toStringOrNull(value) as AdminStatus | null;
  if (candidate && ADMIN_STATUS_VALUES.has(candidate)) {
    return candidate;
  }
  return null;
}

function toMinistriesJson(
  value: unknown,
): ChurchPublic['ministries_json'] {
  if (value == null || value === '') {
    return null;
  }
  if (Array.isArray(value)) {
    return value as ChurchPublic['ministries_json'];
  }
  if (isPlainObject(value)) {
    return value as ChurchPublic['ministries_json'];
  }
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    if (!parsed) return null;
    if (Array.isArray(parsed) || isPlainObject(parsed)) {
      return parsed as ChurchPublic['ministries_json'];
    }
  }
  return null;
}

export function hydrateChurchPublic(row: SupabaseChurchRow): ChurchPublic {
  const enriched = isPlainObject(row.enriched_json) ? row.enriched_json : {};
  const merged = { ...enriched, ...row } as Record<string, unknown>;

  return {
    church_id: toRequiredString(merged.church_id),
    gers_id: toStringOrNull(merged.gers_id),
    name: toRequiredString(merged.name),
    latitude: toNumberOrNull(merged.latitude),
    longitude: toNumberOrNull(merged.longitude),
    address: toStringOrNull(merged.address),
    locality: toStringOrNull(merged.locality),
    region: toStringOrNull(merged.region),
    postal_code: toStringOrNull(merged.postal_code),
    country: toRequiredString(merged.country),
    website: toStringOrNull(merged.website),
    website_root: toStringOrNull(merged.website_root),
    pipeline_status: toPipelineStatusOrNull(merged.pipeline_status),
    admin_status: toAdminStatusOrNull(merged.admin_status),
    search_blob: toStringOrNull(merged.search_blob),
    belief_type: toBeliefTypeOrNull(merged.belief_type),
    trinitarian_beliefs: toBooleanOrNull(merged.trinitarian_beliefs),
    church_beliefs_url: toStringOrNull(merged.church_beliefs_url),
    services_info: toStringOrNull(merged.services_info),
    service_languages: toStringArrayOrNull(merged.service_languages),
    instagram_url: toStringOrNull(merged.instagram_url),
    youtube_url: toStringOrNull(merged.youtube_url),
    social_media: toStringArrayOrNull(merged.social_media),
    logo_url: toStringOrNull(merged.logo_url),
    logo_width: toNumberOrNull(merged.logo_width),
    logo_height: toNumberOrNull(merged.logo_height),
    logo_aspect_ratio: toNumberOrNull(merged.logo_aspect_ratio),
    banner_url: toStringOrNull(merged.banner_url),
    banner_width: toNumberOrNull(merged.banner_width),
    banner_height: toNumberOrNull(merged.banner_height),
    banner_aspect_ratio: toNumberOrNull(merged.banner_aspect_ratio),
    scraped_email: toStringOrNull(merged.scraped_email),
    phone: toStringOrNull(merged.phone),
    church_phone: toStringOrNull(merged.church_phone),
    giving_url: toStringOrNull(merged.giving_url),
    scraped_address: toStringOrNull(merged.scraped_address),
    programs_offered: toStringArrayOrNull(merged.programs_offered),
    church_summary: toStringOrNull(merged.church_summary),
    geo: toStringOrNull(merged.geo),
    geojson: toGeoJSONPointOrNull(merged.geojson),
    url_giving: toStringOrNull(merged.url_giving),
    url_beliefs: toStringOrNull(merged.url_beliefs),
    url_facebook: toStringOrNull(merged.url_facebook),
    url_instagram: toStringOrNull(merged.url_instagram),
    url_tiktok: toStringOrNull(merged.url_tiktok),
    url_campus: toStringOrNull(merged.url_campus),
    url_live: toStringOrNull(merged.url_live),
    contact_emails: toStringArrayOrNull(merged.contact_emails),
    contact_phones: toStringArrayOrNull(merged.contact_phones),
    service_times: toNumberArrayOrNull(merged.service_times),
    service_source_urls: toStringArrayOrNull(merged.service_source_urls),
    ministry_names: toStringArrayOrNull(merged.ministry_names),
    ministries_json: toMinistriesJson(merged.ministries_json),
    denomination: toStringOrNull(merged.denomination),
    trinitarian: toBooleanOrNull(merged.trinitarian),
    extraction_confidence: toNumberOrNull(merged.extraction_confidence),
    is_weekly_church: toBooleanOrNull(merged.is_weekly_church),
    campus_name: toStringOrNull(merged.campus_name),
    overarching_name: toStringOrNull(merged.overarching_name),
    is_multi_campus: toBooleanOrNull(merged.is_multi_campus),
  };
}

export function hydrateChurchList(rows: SupabaseChurchRow[]): ChurchPublic[] {
  return rows.map((row) => hydrateChurchPublic(row));
}
