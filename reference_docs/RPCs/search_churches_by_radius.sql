CREATE OR REPLACE FUNCTION api.search_churches_by_radius(
  p_lat           DOUBLE PRECISION,
  p_lng           DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION,
  q               TEXT     DEFAULT NULL,
  p_country       TEXT     DEFAULT NULL,
  p_belief        TEXT     DEFAULT NULL,
  p_trinit        BOOLEAN  DEFAULT NULL,
  p_region        TEXT     DEFAULT NULL,
  p_locality      TEXT     DEFAULT NULL,
  p_postal_code   TEXT     DEFAULT NULL,     -- prefix match
  p_languages     TEXT[]   DEFAULT NULL,     -- overlap
  p_programs      TEXT[]   DEFAULT NULL,     -- partial contains vs ministry_names
  p_cursor_distance_m DOUBLE PRECISION DEFAULT NULL,
  p_cursor_church_id  UUID DEFAULT NULL,
  p_limit         INT      DEFAULT 100
)
RETURNS TABLE (
  church_id             UUID,
  gers_id               UUID,
  name                  TEXT,
  pipeline_status       TEXT,
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  address               TEXT,
  locality              TEXT,
  region                TEXT,
  postal_code           TEXT,
  country               TEXT,
  website               TEXT,
  phone                 TEXT,
  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ,
  url_giving            TEXT,
  url_beliefs           TEXT,
  url_youtube           TEXT,
  url_facebook          TEXT,
  url_instagram         TEXT,
  url_tiktok            TEXT,
  url_campus            TEXT,
  url_live              TEXT,
  contact_emails        TEXT[],
  contact_phones        TEXT[],
  service_times         INT[],
  service_languages     TEXT[],
  service_source_urls   TEXT[],
  ministry_names        TEXT[],
  ministries_json       JSONB,
  belief_type           TEXT,
  denomination          TEXT,
  trinitarian           BOOLEAN,
  extraction_confidence NUMERIC,
  church_summary        TEXT,
  is_weekly_church      BOOLEAN,
  campus_name           TEXT,
  overarching_name      TEXT,
  is_multi_campus       BOOLEAN,
  distance_m            DOUBLE PRECISION,
  logo_url              TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_catalog
AS $radius$
DECLARE
  _q TEXT := NULLIF(q, '');
  _center GEOGRAPHY := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
BEGIN
  RETURN QUERY
  WITH v AS (
    SELECT
      vc.*,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(vc.longitude, vc.latitude), 4326)::geography,
        _center
      ) AS dist_m,
      concat_ws(' ',
        vc.name, vc.address, vc.locality, vc.region, vc.postal_code,
        vc.country, vc.website
      ) AS search_text
    FROM api.v1_churches vc
    WHERE vc.latitude IS NOT NULL
      AND vc.longitude IS NOT NULL
      AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(vc.longitude, vc.latitude), 4326)::geography,
            _center,
            p_radius_meters
          )
  )
  SELECT
    r.church_id, r.gers_id, r.name, r.pipeline_status,
    r.latitude, r.longitude, r.address, r.locality, r.region, r.postal_code, r.country,
    r.website, r.phone, r.created_at, r.updated_at,
    r.url_giving, r.url_beliefs, r.url_youtube, r.url_facebook, r.url_instagram, r.url_tiktok, r.url_campus, r.url_live,
    r.contact_emails, r.contact_phones,
    r.service_times, r.service_languages, r.service_source_urls,
    r.ministry_names, r.ministries_json,
    r.belief_type, r.denomination, r.trinitarian, r.extraction_confidence, r.church_summary,
    r.is_weekly_church, r.campus_name, r.overarching_name, r.is_multi_campus,
    r.dist_m::DOUBLE PRECISION AS distance_m,
    r.logo_url
  FROM v AS r
  WHERE
    (p_country   IS NULL OR r.country         = p_country)
    AND (p_belief IS NULL OR r.belief_type    = p_belief)
    AND (p_trinit IS NULL OR r.trinitarian    = p_trinit)
    AND (p_region IS NULL OR r.region         = p_region)
    AND (p_locality IS NULL OR r.locality     = p_locality)
    AND (p_postal_code IS NULL OR r.postal_code LIKE (p_postal_code || '%'))
    AND (p_languages IS NULL OR COALESCE(r.service_languages, '{}'::text[]) && p_languages)
    AND (
      p_programs IS NULL
      OR EXISTS (
          SELECT 1
          FROM unnest(COALESCE(r.ministry_names, '{}'::text[])) AS mn
          JOIN unnest(p_programs) AS pat
            ON mn ILIKE ('%' || pat || '%')
      )
    )
    AND (
      p_cursor_church_id IS NULL
      OR (
        p_cursor_distance_m IS NOT NULL AND (
          r.dist_m > p_cursor_distance_m OR
          (r.dist_m = p_cursor_distance_m AND r.church_id > p_cursor_church_id)
        )
      )
    )
  ORDER BY
    r.dist_m ASC,
    r.church_id ASC
  LIMIT p_limit;
END;
$radius$;

ALTER FUNCTION api.search_churches_by_radius(
  double precision, double precision, double precision,
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT[], TEXT[], DOUBLE PRECISION, UUID, INT
) OWNER TO secure_definer;

ALTER FUNCTION api.search_churches_by_radius(
  double precision, double precision, double precision,
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT[], TEXT[], DOUBLE PRECISION, UUID, INT
) SECURITY DEFINER;
