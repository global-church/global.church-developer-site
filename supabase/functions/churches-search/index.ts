// supabase/functions/churches-search/index.ts
// VERY IMPORTANT: THIS IS FOR REFERENCE ONLY. The actual implementation of this edge function is in Supabase.
// Last synced: 2025-10-04
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
  "logo_url",
  "logo_width",
  "logo_height",
  "logo_aspect_ratio",
  "banner_url",
  "banner_width",
  "banner_height",
  "banner_aspect_ratio",
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
/** Default lean projection for list/search – MUST include church_id for linking. */
const DEFAULT_FIELDS = [
  "church_id",
  "name",
  "address",
  "locality",
  "region",
  "country",
  "website",
  "logo_url",
  "logo_width",
  "logo_height",
  "logo_aspect_ratio",
  "banner_url",
  "banner_width",
  "banner_height",
  "banner_aspect_ratio",
  "url_beliefs",
  "url_giving",
  "url_live",
  "latitude",
  "longitude",
] as const;
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
const json = (body, status = 200, extraHeaders = {})=>new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
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
class BadRequestError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.status = 400;
  }
}
type CursorMode = "rank" | "dist" | "id";
type CursorPayload = {
  mode: "rank";
  rank: number;
  id: string;
} | {
  mode: "dist";
  dist: number;
  id: string;
} | {
  mode: "id";
  id: string;
};
const b64UrlEncode = (value: string)=>btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64UrlDecode = (value: string)=>{
  const padLength = (4 - value.length % 4) % 4;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  return atob(padded);
};
const encodeCursor = (payload: CursorPayload)=>b64UrlEncode(JSON.stringify(payload));
const decodeCursor = (raw: string): CursorPayload=>{
  try {
    const parsed = JSON.parse(b64UrlDecode(raw));
    if (!parsed || typeof parsed !== "object" || typeof parsed.mode !== "string") {
      throw new BadRequestError("Invalid cursor format");
    }
    if (parsed.mode === "rank") {
      if (typeof parsed.rank !== "number" || typeof parsed.id !== "string") {
        throw new BadRequestError("Invalid rank cursor payload");
      }
      return {
        mode: "rank",
        rank: parsed.rank,
        id: parsed.id
      };
    }
    if (parsed.mode === "dist") {
      if (typeof parsed.dist !== "number" || typeof parsed.id !== "string") {
        throw new BadRequestError("Invalid distance cursor payload");
      }
      return {
        mode: "dist",
        dist: parsed.dist,
        id: parsed.id
      };
    }
    if (parsed.mode === "id") {
      if (typeof parsed.id !== "string") {
        throw new BadRequestError("Invalid id cursor payload");
      }
      return {
        mode: "id",
        id: parsed.id
      };
    }
    throw new BadRequestError("Unsupported cursor mode");
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    throw new BadRequestError("Malformed cursor");
  }
};
const getSortMode = (functionName: string, hasTextQuery: boolean): CursorMode=>{
  if (functionName === "search_churches_by_radius" || functionName === "search_churches_by_bbox") return "dist";
  if (hasTextQuery && functionName === "search_churches") return "rank";
  return "id";
};
const rowToCursorPayload = (mode: CursorMode, row: Record<string, unknown>): CursorPayload | null=>{
  const id = typeof row?.church_id === "string" ? row.church_id : null;
  if (!id) return null;
  if (mode === "rank") {
    const rawRank = row?.rank;
    const rank = typeof rawRank === "number" ? rawRank : typeof rawRank === "string" ? Number(rawRank) : null;
    if (rank === null || Number.isNaN(rank)) {
      return {
        mode: "id",
        id
      };
    }
    return {
      mode: "rank",
      rank,
      id
    };
  }
  if (mode === "dist") {
    const rawDist = row?.distance_m;
    const dist = typeof rawDist === "number" ? rawDist : typeof rawDist === "string" ? Number(rawDist) : null;
    if (dist === null || Number.isNaN(dist)) {
      return {
        mode: "id",
        id
      };
    }
    return {
      mode: "dist",
      dist,
      id
    };
  }
  return {
    mode: "id",
    id
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
    const p_trinit = parseBool(qp, "trinitarian"); // NOTE: `trinitarian` doesn't add value to the search since all records are true.
    const p_region = qp.get("region");
    const p_locality = qp.get("locality");
    const p_postal_code = qp.get("postal_code");
    const equals_id = qp.get("id");
    const limitRaw = parseNum(qp, "limit");
    const limit = Math.max(1, Math.min(limitRaw ?? 20, 100));
    const rpcLimit = limit + 1; // over-fetch to detect has_more
    const cursorRaw = qp.get("cursor");
    const cursorPayload = cursorRaw ? decodeCursor(cursorRaw) : null; // validated opaque cursor
    // Legacy params keep working but cursor takes priority if present.
    qp.get("offset");
    qp.get("page");
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
    let fields: string[] | null = null;
    if (fieldsParam && fieldsParam.trim().length) {
      fields = fieldsParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => V1_COLUMNS.has(s));
      if (!fields.includes("church_id")) fields.push("church_id");
      if (fields.length === 0) fields = null; // fall back if nothing valid
    } else {
      // No explicit projection requested: return a lean, helpful set with key links
      fields = [...DEFAULT_FIELDS];
    }
    const format = (qp.get("format") || "json").toLowerCase(); // "json" | "geojson"
    const forGlobe = parseBool(qp, "for_globe") === true;
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
      p_limit: rpcLimit
    };
    if (forGlobe) {
      functionName = "churches_for_globe";
      rpcArgs = {
        p_limit: rpcLimit
      };
    } else if (radiusProvided) {
      functionName = "search_churches_by_radius";
      rpcArgs = {
        ...baseArgs,
        p_lat: center_lat,
        p_lng: center_lng,
        p_radius_meters: (radius_km as number) * 1000,
        ...(p_languages !== null ? { p_languages } : {}),
        ...(p_programs !== null ? { p_programs } : {}),
      };
    } else if (bboxProvided) {
      functionName = "search_churches_by_bbox";
      rpcArgs = {
        ...baseArgs,
        min_lat,
        max_lat,
        min_lng,
        max_lng,
        ...(p_languages !== null ? { p_languages } : {}),
        ...(p_programs !== null ? { p_programs } : {}),
      };
    } else {
      functionName = "search_churches";
      rpcArgs = {
        ...baseArgs,
        ...(p_languages !== null ? { p_languages } : {}),
        ...(p_programs !== null ? { p_programs } : {}),
        equals_id,
      };
    }
    // ---------- Call RPC ----------
    const sortMode = getSortMode(functionName, Boolean(q));
    if (cursorPayload && cursorPayload.mode !== sortMode) {
      const allowsIdFallback = (sortMode === "rank" || sortMode === "dist") && cursorPayload.mode === "id";
      if (!allowsIdFallback) {
        throw new BadRequestError("Cursor does not match the current sort order");
      }
    }
    const cursorArgs = (()=>{
      if (!cursorPayload) return {};
      if (cursorPayload.mode === "rank") {
        // Keyset: honor text search order (rank DESC, church_id ASC)
        return {
          p_cursor_rank: cursorPayload.rank,
          p_cursor_church_id: cursorPayload.id
        };
      }
      if (cursorPayload.mode === "dist") {
        // Keyset: advance past last distance bucket (distance ASC, church_id ASC)
        return {
          p_cursor_distance_m: cursorPayload.dist,
          p_cursor_church_id: cursorPayload.id
        };
      }
      // Keyset: default to primary key ordering only
      return {
        p_cursor_church_id: cursorPayload.id
      };
    })();
    rpcArgs = {
      ...rpcArgs,
      ...cursorArgs
    };
    const { data, error } = await supabase.schema("api").rpc(functionName, rpcArgs);
    if (error) return json({
      error: error.message
    }, 400);
    // ---------- Field projection & formatting ----------
    const rawItems = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
    // Back-compat: if caller only provided singular params, filter client-side to be forgiving.
    // (The RPC already handles arrays; this is just a small UX nicety.)
    let filteredItems = rawItems;
    if (p_language) {
      filteredItems = filteredItems.filter((r)=>Array.isArray(r?.service_languages) ? r.service_languages?.some((v)=>(v || "").toLowerCase() === p_language.toLowerCase()) : true);
    }
    if (p_program) {
      filteredItems = filteredItems.filter((r)=>Array.isArray(r?.ministry_names) ? r.ministry_names?.some((v)=>v?.toLowerCase().includes(p_program.toLowerCase())) : true);
    }
    let projectedItems: Record<string, unknown>[] = filteredItems;
    if (fields?.length) {
      // Ensure GeoJSON has coordinates even if caller omitted them
      const needCoords = format === "geojson" && (!fields.includes("latitude") || !fields.includes("longitude"));
      const projFields = needCoords ? Array.from(new Set([...fields, "latitude", "longitude"])) : fields;
      projectedItems = filteredItems.map((row) => pick(row, projFields));
    }
    const pageSourceRows = filteredItems.slice(0, limit);
    const hasMore = filteredItems.length > limit;
    const pagedItems = projectedItems.slice(0, limit);
    let nextCursor: string | null = null;
    if (hasMore && pageSourceRows.length) {
      const cursorSourceRow = pageSourceRows[pageSourceRows.length - 1];
      const payload = rowToCursorPayload(sortMode, cursorSourceRow);
      if (!payload) {
        throw new Error("Unable to build cursor for next page");
      }
      nextCursor = encodeCursor(payload);
    }
    const paginationHeaders: Record<string, string> = {
      "X-Limit": String(limit),
      "X-Has-More": hasMore ? "true" : "false"
    };
    if (nextCursor) paginationHeaders["X-Next-Cursor"] = nextCursor;
    if (format === "geojson") {
      return json(toGeoJSON(pagedItems, fields ?? undefined), 200, paginationHeaders);
    }
    return json({
      items: pagedItems,
      limit,
      has_more: hasMore,
      next_cursor: nextCursor
    }, 200, paginationHeaders);
  } catch (e) {
    if (e instanceof BadRequestError) {
      return json({
        error: e.message
      }, e.status);
    }
    return json({
      error: String(e)
    }, 500);
  }
});
