// supabase/functions/churches-search/index.ts
// VERY IMPORTANT: THIS IS FOR REFERENCE ONLY. The actual implementation of this edge function is in Supabase.
// Last synced: 2025-09-02
// This edge function routes to the correct RPC based on query params.



// supabase/functions/churches-search/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ZUPLO_SECRET = Deno.env.get("ZUPLO_GATEWAY_TOKEN"); // keep in sync with Supabase env
const supabaseUrl = Deno.env.get("SB_URL");
const serviceKey = Deno.env.get("SB_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false
  }
});
/**
 * Source of truth for columns available on api.v1_churches.
 * If the view evolves, update this list (safe superset).
 * Used for input validation & field projection.
 */ const V1_COLUMNS = new Set([
  "church_id",
  "gers_id",
  "name",
  "pipeline_status",
  "latitude",
  "longitude",
  "address",
  "locality",
  "region",
  "postal_code",
  "country",
  "website",
  "phone",
  "created_at",
  "updated_at",
  "url_giving",
  "url_beliefs",
  "url_youtube",
  "url_facebook",
  "url_instagram",
  "url_tiktok",
  "url_campus",
  "url_live",
  "contact_emails",
  "contact_phones",
  "service_times",
  "service_languages",
  "service_source_urls",
  "ministry_names",
  "ministries_json",
  "belief_type",
  "denomination",
  "trinitarian",
  "extraction_confidence",
  "church_summary",
  "is_weekly_church",
  "campus_name",
  "overarching_name",
  "is_multi_campus",
  // The radius RPC also returns "distance_m"; include it here for projection if present.
  "distance_m"
]);
/** Small helpers */ const pick = (obj, keys)=>{
  const out = {};
  for (const k of keys)if (k in obj) out[k] = obj[k];
  return out;
};
const parseList = (qp, key)=>{
  const raw = qp.getAll(key).flatMap((s)=>s.split(",")).map((s)=>s.trim()).filter(Boolean);
  return raw.length ? raw : null; // supports ?k=a,b and ?k=a&k=b
};
const parseNum = (qp, key)=>{
  const v = qp.get(key);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const parseBool = (qp, key)=>{
  if (!qp.has(key)) return null;
  const v = (qp.get(key) || "").toLowerCase();
  return v === "true" ? true : v === "false" ? false : null;
};
const json = (body, status = 200)=>new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
/** Build GeoJSON FeatureCollection from rows (longitude/latitude MUST be present) */ const toGeoJSON = (rows, fields)=>{
  const propsKeys = fields?.filter((k)=>k !== "longitude" && k !== "latitude") ?? null;
  const features = rows.map((r)=>{
    const lon = r.longitude, lat = r.latitude;
    const props = propsKeys ? pick(r, propsKeys) : r;
    return {
      type: "Feature",
      geometry: lon != null && lat != null ? {
        type: "Point",
        coordinates: [
          lon,
          lat
        ]
      } : null,
      properties: props
    };
  });
  return {
    type: "FeatureCollection",
    features
  };
};
serve(async (req)=>{
  // 🔐 Zuplo↔Supabase handshake
  const apiKey = req.headers.get("apikey");
  if (!ZUPLO_SECRET || apiKey !== ZUPLO_SECRET) {
    return json({
      error: "Unauthorized: Zuplo <> Supabase API key handshake failed."
    }, 401);
  }
  try {
    const url = new URL(req.url);
    const qp = url.searchParams;
    // ---------- Parse common query params ----------
    const q = qp.get("q") ?? qp.get("church_name") ?? null;
    const p_country = qp.get("country");
    const p_belief = qp.get("belief");
    const p_trinit = parseBool(qp, "trinitarian");
    const p_region = qp.get("region");
    const p_locality = qp.get("locality");
    const p_postal_code = qp.get("postal_code");
    const equals_id = qp.get("id");
    const limitRaw = parseNum(qp, "limit");
    // Be generous for internal/indexing jobs, but clamp absurd values
    const p_limit = Math.max(1, Math.min(limitRaw ?? 25, 300000));
    // Multi-select
    const p_languages = parseList(qp, "languages");
    const p_programs = parseList(qp, "programs");
    // Back-compat single
    const p_language = qp.get("language") ?? (p_languages?.length === 1 ? p_languages[0] : null);
    const p_program = qp.get("program") ?? (p_programs?.length === 1 ? p_programs[0] : null);
    // Geo selectors
    const min_lat = parseNum(qp, "min_lat");
    const max_lat = parseNum(qp, "max_lat");
    const min_lng = parseNum(qp, "min_lng");
    const max_lng = parseNum(qp, "max_lng");
    const center_lat = parseNum(qp, "center_lat");
    const center_lng = parseNum(qp, "center_lng");
    const radius_km = parseNum(qp, "radius_km");
    const bboxProvided = [
      min_lat,
      max_lat,
      min_lng,
      max_lng
    ].every((v)=>v !== null);
    const radiusProvided = [
      center_lat,
      center_lng,
      radius_km
    ].every((v)=>v !== null);
    // Response shaping
    const fieldsParam = qp.get("fields"); // e.g., fields=name,latitude,longitude,website
    const fields = fieldsParam ? fieldsParam.split(",").map((s)=>s.trim()).filter((s)=>V1_COLUMNS.has(s)) : null;
    const format = (qp.get("format") || "json").toLowerCase(); // "json" | "geojson"
    let functionName;
    let rpcArgs;
    const baseArgs = {
      q,
      p_country,
      p_belief,
      p_trinit,
      p_region,
      p_locality,
      p_postal_code,
      p_limit
    };
    if (radiusProvided) {
      functionName = "search_churches_by_radius";
      rpcArgs = {
        ...baseArgs,
        p_lat: center_lat,
        p_lng: center_lng,
        p_radius_meters: radius_km * 1000,
        p_languages,
        p_programs
      };
    } else if (bboxProvided) {
      functionName = "search_churches_by_bbox";
      rpcArgs = {
        ...baseArgs,
        min_lat,
        max_lat,
        min_lng,
        max_lng,
        p_languages,
        p_programs
      };
    } else {
      functionName = "search_churches";
      rpcArgs = {
        ...baseArgs,
        p_languages,
        p_programs,
        equals_id
      };
    }
    // ---------- Call RPC ----------
    const { data, error } = await supabase.schema("api").rpc(functionName, rpcArgs);
    if (error) return json({
      error: error.message
    }, 400);
    // ---------- Field projection & formatting ----------
    let items = data ?? [];
    // Back-compat: if caller only provided singular params, filter client-side to be forgiving.
    // (The RPC already handles arrays; this is just a small UX nicety.)
    if (p_language && Array.isArray(items)) {
      items = items.filter((r)=>Array.isArray(r?.service_languages) ? r.service_languages?.some((v)=>(v || "").toLowerCase() === p_language.toLowerCase()) : true);
    }
    if (p_program && Array.isArray(items)) {
      items = items.filter((r)=>Array.isArray(r?.ministry_names) ? r.ministry_names?.some((v)=>v?.toLowerCase().includes(p_program.toLowerCase())) : true);
    }
    if (fields?.length) {
      items = items.map((row)=>pick(row, fields));
    }
    if (format === "geojson") {
      return json(toGeoJSON(items, fields ?? undefined), 200);
    }
    return json({
      items
    }, 200);
  } catch (e) {
    return json({
      error: String(e)
    }, 500);
  }
});
