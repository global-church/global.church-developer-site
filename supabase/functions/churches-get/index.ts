// supabase/functions/churches-get/index.ts
// NEW: Full-details endpoint for a single church (no projection).
// Proxied by Zuplo route: GET /v1/churches/{id}  ->  ${SUPABASE_FUNCTIONS_BASE}/churches-get?id=:idin
// Requires Zuplo ↔ Supabase shared secret via "apikey" header.
//
// Runtime: Deno (Supabase Edge Functions)
// Docs: https://supabase.com/docs/guides/functions (Edge Functions) and
//       https://supabase.com/docs/reference/javascript/select (schema() + select)

// IMPORTANT: This is for reference only. The actual implementation is in Supabase.
// Last synced: 2025-09-05

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ZUPLO_SECRET = Deno.env.get("ZUPLO_GATEWAY_TOKEN"); // must match Zuplo policy
const supabaseUrl = Deno.env.get("SB_URL");
const serviceKey = Deno.env.get("SB_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceKey) {
  console.error("Missing SB_URL or SB_SERVICE_ROLE_KEY env vars");
}
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false
  }
});
/** JSON helper */ const json = (body, status = 200)=>new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
/** Simple UUID v4/v5 guard (accepts any valid UUID format) */ const UUID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
serve(async (req)=>{
  // 🔐 Zuplo↔Supabase handshake (shared secret travels in 'apikey' header)
  const apiKey = req.headers.get("apikey");
  if (!ZUPLO_SECRET || apiKey !== ZUPLO_SECRET) {
    return json({
      error: "Unauthorized: Zuplo <> Supabase API key handshake failed."
    }, 401);
  }
  try {
    const url = new URL(req.url);
    // Primary: Zuplo forwards the path param as a query string (?id=...)
    const id = url.searchParams.get("id")?.trim() || "";
    if (!id) {
      return json({
        error: "Missing required parameter: id"
      }, 400);
    }
    if (!UUID_PATTERN.test(id)) {
      return json({
        error: "Invalid id: must be a UUID"
      }, 400);
    }
    // Query the api schema view directly; return the full ChurchV1 record.
    // Supabase JS supports per-query schema selection via .schema('api').from(...).select()
    // Ref: Supabase docs on select() and schema(): 
    // https://supabase.com/docs/reference/javascript/select
    const { data, error } = await supabase.schema("api").from("v1_churches").select("*").eq("church_id", id).limit(1).single();
    if (error) {
      // Differentiate not found vs other errors where possible
      // (supabase-js sets error.code === 'PGRST116' sometimes for no rows; .single() normalizes though)
      return json({
        error: error.message
      }, 400);
    }
    if (!data) {
      return json({
        error: "Not found"
      }, 404);
    }
    // ✅ Always return the full record
    return json(data, 200);
  } catch (e) {
    console.error("churches-get error:", e);
    return json({
      error: String(e)
    }, 500);
  }
});
