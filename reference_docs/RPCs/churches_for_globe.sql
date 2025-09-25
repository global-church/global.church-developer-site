-- RPC #4: api.churches_for_globe (minimal fields needed for globe)

CREATE OR REPLACE FUNCTION api.churches_for_globe(
  p_limit INT DEFAULT 3000
)
RETURNS TABLE (
  church_id UUID,
  name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  locality TEXT,
  region TEXT,
  country TEXT,
  belief_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = extensions, public, pg_catalog
AS $$
  SELECT
    vc.church_id,
    vc.name,
    vc.latitude,
    vc.longitude,
    vc.locality,
    vc.region,
    vc.country,
    vc.belief_type
  FROM api.v1_churches vc
  WHERE vc.latitude  IS NOT NULL
    AND vc.longitude IS NOT NULL
  ORDER BY random()
  LIMIT LEAST(GREATEST(p_limit, 1), 50000);
$$;

ALTER FUNCTION api.churches_for_globe(INT) OWNER TO secure_definer;
ALTER FUNCTION api.churches_for_globe(INT) SECURITY DEFINER;