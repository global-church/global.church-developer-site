CREATE OR REPLACE FUNCTION api.search_churches_by_bbox(
  min_lat         DOUBLE PRECISION,
  max_lat         DOUBLE PRECISION,
  min_lng         DOUBLE PRECISION,
  max_lng         DOUBLE PRECISION,
  q               TEXT     DEFAULT NULL,
  p_country       TEXT     DEFAULT NULL,
  p_belief        TEXT     DEFAULT NULL,
  p_trinit        BOOLEAN  DEFAULT NULL,
  p_region        TEXT     DEFAULT NULL,
  p_locality      TEXT     DEFAULT NULL,
  p_postal_code   TEXT     DEFAULT NULL,
  p_languages     TEXT[]   DEFAULT NULL,
  p_programs      TEXT[]   DEFAULT NULL,
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
  logo_url              TEXT,
  logo_width            INT,
  logo_height           INT,
  logo_aspect_ratio     NUMERIC,
  banner_url            TEXT,
  banner_width          INT,
  banner_height         INT,
  banner_aspect_ratio   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_catalog
AS $bbox$
DECLARE
  _q TEXT := NULLIF(q, '');
  _center GEOGRAPHY := ST_SetSRID(
    ST_MakePoint((min_lng + max_lng) / 2.0, (min_lat + max_lat) / 2.0),
    4326
  )::geography;
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
    WHERE
      vc.latitude  IS NOT NULL AND vc.longitude IS NOT NULL
      AND vc.latitude  BETWEEN min_lat AND max_lat
      AND vc.longitude BETWEEN min_lng AND max_lng
  )
  SELECT
    b.church_id, b.gers_id, b.name, b.pipeline_status,
    b.latitude, b.longitude, b.address, b.locality, b.region, b.postal_code, b.country,
    b.website, b.phone, b.created_at, b.updated_at,
    b.url_giving, b.url_beliefs, b.url_youtube, b.url_facebook, b.url_instagram, b.url_tiktok, b.url_campus, b.url_live,
    b.contact_emails, b.contact_phones,
    b.service_times, b.service_languages, b.service_source_urls,
    b.ministry_names, b.ministries_json,
    b.belief_type, b.denomination, b.trinitarian, b.extraction_confidence, b.church_summary,
    b.is_weekly_church, b.campus_name, b.overarching_name, b.is_multi_campus,
    b.dist_m::DOUBLE PRECISION AS distance_m,
    b.logo_url,
    b.logo_width,
    b.logo_height,
    b.logo_aspect_ratio,
    b.banner_url,
    b.banner_width,
    b.banner_height,
    b.banner_aspect_ratio
  FROM v AS b
  WHERE
    (p_country     IS NULL OR b.country            = p_country)
    AND (p_belief  IS NULL OR b.belief_type        = p_belief)
    AND (p_trinit  IS NULL OR b.trinitarian        = p_trinit)
    AND (p_region  IS NULL OR b.region             = p_region)
    AND (p_locality IS NULL OR b.locality          = p_locality)
    AND (p_postal_code IS NULL OR b.postal_code LIKE (p_postal_code || '%'))
    AND (p_languages IS NULL OR COALESCE(b.service_languages, '{}'::text[]) && p_languages)
    AND (
      p_programs IS NULL
      OR EXISTS (
           SELECT 1
           FROM unnest(COALESCE(b.ministry_names, '{}'::text[])) AS mn
           JOIN unnest(p_programs) AS pat
             ON mn ILIKE ('%' || pat || '%')
      )
    )
    AND (
      p_cursor_church_id IS NULL
      OR (
        p_cursor_distance_m IS NOT NULL AND (
          b.dist_m > p_cursor_distance_m OR
          (b.dist_m = p_cursor_distance_m AND b.church_id > p_cursor_church_id)
        )
      )
    )
  ORDER BY
    b.dist_m ASC,
    b.church_id ASC
  LIMIT p_limit;
END;
$bbox$;

ALTER FUNCTION api.search_churches_by_bbox(
  double precision, double precision, double precision, double precision,
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT[], TEXT[], DOUBLE PRECISION, UUID, INT
) OWNER TO secure_definer;

ALTER FUNCTION api.search_churches_by_bbox(
  double precision, double precision, double precision, double precision,
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT[], TEXT[], DOUBLE PRECISION, UUID, INT
) SECURITY DEFINER;
