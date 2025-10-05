CREATE OR REPLACE FUNCTION api.search_churches(
  q             TEXT     DEFAULT NULL,   -- free text query (trgm sort)
  p_country     TEXT     DEFAULT NULL,   -- ISO-2 or canonical country name
  p_belief      TEXT     DEFAULT NULL,   -- enum/label as text
  p_trinit      BOOLEAN  DEFAULT NULL,   -- trinitarian filter
  p_region      TEXT     DEFAULT NULL,   -- exact match
  p_locality    TEXT     DEFAULT NULL,   -- exact match
  p_postal_code TEXT     DEFAULT NULL,   -- prefix match (e.g., '92115' -> '92115-3743')
  p_languages   TEXT[]   DEFAULT NULL,   -- overlap
  p_programs    TEXT[]   DEFAULT NULL,   -- partial contains vs ministry_names
  equals_id     UUID     DEFAULT NULL,   -- exact id match
  p_cursor_rank DOUBLE PRECISION DEFAULT NULL,
  p_cursor_church_id UUID DEFAULT NULL,
  p_limit       INT      DEFAULT 100     -- 1..N (edge clamps)
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
  logo_url              TEXT,
  logo_width            INT,
  logo_height           INT,
  logo_aspect_ratio     NUMERIC,
  banner_url            TEXT,
  banner_width          INT,
  banner_height         INT,
  banner_aspect_ratio   NUMERIC,
  rank                  DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_catalog
AS $$
DECLARE
  _q TEXT := NULLIF(q, '');
BEGIN
  RETURN QUERY
  WITH v AS (
    SELECT
      vc.*,
      -- lightweight search text (swap to a view column later if you add one)
      concat_ws(' ',
        vc.name, vc.address, vc.locality, vc.region, vc.postal_code,
        vc.country, vc.website
      ) AS search_text
    FROM api.v1_churches vc
  ),
  filtered AS (
    SELECT
      v.*,
      CASE WHEN _q IS NULL THEN NULL ELSE similarity(v.search_text, _q) END::DOUBLE PRECISION AS search_rank
    FROM v
    WHERE
      (equals_id IS NULL OR v.church_id = equals_id)
      AND (p_country   IS NULL OR v.country            = p_country)
      AND (p_belief    IS NULL OR v.belief_type        = p_belief)
      AND (p_trinit    IS NULL OR v.trinitarian        = p_trinit)
      AND (p_region    IS NULL OR v.region             = p_region)
      AND (p_locality  IS NULL OR v.locality           = p_locality)
      AND (p_postal_code IS NULL OR v.postal_code LIKE (p_postal_code || '%'))
      AND (p_languages IS NULL OR COALESCE(v.service_languages, '{}'::text[]) && p_languages)
      AND (
        p_programs IS NULL
        OR EXISTS (
             SELECT 1
             FROM unnest(COALESCE(v.ministry_names, '{}'::text[])) AS mn
             JOIN unnest(p_programs) AS pat
               ON mn ILIKE ('%' || pat || '%')
        )
      )
  )
  SELECT
    f.church_id, f.gers_id, f.name, f.pipeline_status,
    f.latitude, f.longitude, f.address, f.locality, f.region, f.postal_code, f.country,
    f.website, f.phone, f.created_at, f.updated_at,
    f.url_giving, f.url_beliefs, f.url_youtube, f.url_facebook, f.url_instagram, f.url_tiktok, f.url_campus, f.url_live,
    f.contact_emails, f.contact_phones,
    f.service_times, f.service_languages, f.service_source_urls,
    f.ministry_names, f.ministries_json,
    f.belief_type, f.denomination, f.trinitarian, f.extraction_confidence, f.church_summary,
    f.is_weekly_church, f.campus_name, f.overarching_name, f.is_multi_campus,
    f.logo_url,
    f.logo_width,
    f.logo_height,
    f.logo_aspect_ratio,
    f.banner_url,
    f.banner_width,
    f.banner_height,
    f.banner_aspect_ratio,
    f.search_rank AS rank
  FROM filtered AS f
  WHERE
    p_cursor_church_id IS NULL
    OR (
      _q IS NULL AND f.church_id > p_cursor_church_id
    )
    OR (
      _q IS NOT NULL AND p_cursor_rank IS NOT NULL AND (
        f.search_rank < p_cursor_rank OR
        (f.search_rank = p_cursor_rank AND f.church_id > p_cursor_church_id)
      )
    )
  ORDER BY
    CASE
      WHEN equals_id IS NOT NULL AND f.church_id = equals_id THEN 0
      ELSE 1
    END,
    f.search_rank DESC NULLS LAST,
    f.church_id ASC
  LIMIT p_limit;
END;
$$;

ALTER FUNCTION api.search_churches(
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT[], TEXT[], UUID, DOUBLE PRECISION, UUID, INT
) OWNER TO secure_definer;

ALTER FUNCTION api.search_churches(
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT[], TEXT[], UUID, DOUBLE PRECISION, UUID, INT
) SECURITY DEFINER;
