// supabase/functions/churches-search/index.ts
// VERY IMPORTANT: THIS IS FOR REFERENCE ONLY. The actual implementation of this edge function is in Supabase.
// Last synced: 2025-08-26
// Versioned gateway that routes to the correct RPC based on query params.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SB_URL")!;
const serviceKey  = Deno.env.get("SB_SERVICE_ROLE_KEY")!; // backend-only
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const qp = url.searchParams;

    // Parse query params (nullable helpers)
    const str = (k: string) => (qp.get(k) ?? null) || null;
    const num = (k: string) => {
      const v = qp.get(k);
      if (v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const bool = (k: string) => {
      if (!qp.has(k)) return null;
      const v = (qp.get(k) || "").toLowerCase();
      return v === "true" ? true : v === "false" ? false : null;
    };

    // Base args common to all RPCs
    const p_limit = Math.max(1, Math.min(Number(qp.get("limit") ?? "25"), 1000));
    const baseArgs = {
      q: str("q"),
      p_country: str("country"),
      p_belief: str("belief"),
      p_trinit: bool("trinitarian"),
      p_region: str("region"),
      p_locality: str("locality"),
      p_postal_code: str("postal_code"),
      p_limit,
    } as const;

    // Geo selectors
    const min_lat = num("min_lat");
    const max_lat = num("max_lat");
    const min_lng = num("min_lng");
    const max_lng = num("max_lng");
    const center_lat = num("center_lat");
    const center_lng = num("center_lng");
    const radius_km = num("radius_km");

    // Basic guardrails for bbox (all-or-none)
    const bboxProvided = [min_lat, max_lat, min_lng, max_lng].some(v => v !== null);
    if (bboxProvided) {
      if ([min_lat, max_lat, min_lng, max_lng].some(v => v === null)) {
        return new Response(JSON.stringify({ error: "All bbox params (min_lat,max_lat,min_lng,max_lng) must be provided together." }), { status: 400 });
      }
    }

    // Basic guardrails for radius (all-or-none)
    const radiusProvided = [center_lat, center_lng, radius_km].some(v => v !== null);
    if (radiusProvided) {
      if ([center_lat, center_lng, radius_km].some(v => v === null)) {
        return new Response(JSON.stringify({ error: "Radius search needs center_lat, center_lng, and radius_km." }), { status: 400 });
      }
    }

    // Route to the correct RPC
    let data, error;
    if (radiusProvided) {
      ({ data, error } = await supabase.schema("api").rpc("search_churches_by_radius", {
        ...baseArgs,
        p_lat: center_lat,
        p_lng: center_lng,
        p_radius_meters: (radius_km as number) * 1000,
      }));
    } else if (bboxProvided) {
      ({ data, error } = await supabase.schema("api").rpc("search_churches_by_bbox", {
        ...baseArgs,
        min_lat,
        max_lat,
        min_lng,
        max_lng,
      }));
    } else {
      ({ data, error } = await supabase.schema("api").rpc("search_churches", {
        ...baseArgs,
        equals_id: str("id"),
      }));
    }
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ items: data }), { headers: { "content-type": "application/json; charset=utf-8" }, status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});