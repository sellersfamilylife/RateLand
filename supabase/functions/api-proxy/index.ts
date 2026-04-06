// supabase/functions/api-proxy/index.ts
//
// Supabase Edge Function that proxies Census, FBI Crime, and HUD Housing API
// requests so that API keys never leave the server.
//
// Deploy:
//   supabase secrets set CENSUS_API_KEY=... FBI_API_KEY=... HUD_API_KEY=...
//   supabase functions deploy api-proxy
//
// Client usage:
//   const { data, error } = await supabase.functions.invoke('api-proxy', {
//     body: { service: 'census', params: { ... } },
//   });

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS headers (Supabase Edge Functions require explicit CORS) ────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Retry with exponential backoff ──────────────────────────────────────

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { retries = 3, baseDelay = 1000 } = {},
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);

      // Don't retry client errors (4xx) — only server errors (5xx)
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }

      lastError = new Error(`HTTP ${res.status} ${res.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry if the request was intentionally aborted
      if (lastError.name === "AbortError") throw lastError;
    }

    if (attempt < retries) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error("fetchWithRetry: all attempts failed");
}

// ── Service handlers ────────────────────────────────────────────────────

const CENSUS_BASE = "https://api.census.gov/data/2024/acs/acs5";

function handleCensus(params: Record<string, string>): {
  url: string;
  init: RequestInit;
} {
  const apiKey = Deno.env.get("CENSUS_API_KEY") ?? "";
  const variables = params.variables;
  if (!variables || typeof variables !== "string") {
    throw new Error("Missing required param: variables");
  }

  // Only allow known Census query parameters
  const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
  const url =
    `${CENSUS_BASE}?get=NAME,${encodeURIComponent(variables)}` +
    `&for=place:*&in=state:*${keyParam}`;

  return { url, init: {} };
}

const FBI_BASE = "https://api.usa.gov/crime/fbi/cde";

function handleCrime(params: Record<string, string>): {
  url: string;
  init: RequestInit;
} {
  const apiKey = Deno.env.get("FBI_API_KEY");
  if (!apiKey) throw new Error("FBI_API_KEY not configured on server");

  const { stateAbbr, slug, from, to } = params;

  if (!stateAbbr || !/^[A-Z]{2}$/.test(stateAbbr)) {
    throw new Error("Invalid stateAbbr: must be 2 uppercase letters");
  }

  const allowedSlugs = [
    "violent-crime",
    "property-crime",
    "homicide",
    "robbery",
    "aggravated-assault",
    "burglary",
    "larceny",
    "motor-vehicle-theft",
  ];
  if (!slug || !allowedSlugs.includes(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }

  const fromParam = from || "01-2020";
  const toParam = to || "12-2024";
  if (!/^\d{2}-\d{4}$/.test(fromParam) || !/^\d{2}-\d{4}$/.test(toParam)) {
    throw new Error("Invalid date format: use MM-YYYY");
  }

  const url =
    `${FBI_BASE}/summarized/state/${encodeURIComponent(stateAbbr)}/${slug}` +
    `?from=${fromParam}&to=${toParam}&API_KEY=${encodeURIComponent(apiKey)}`;

  return { url, init: {} };
}

const HUD_BASE = "https://www.huduser.gov/hudapi/public/fmr";

function handleHousing(params: Record<string, string>): {
  url: string;
  init: RequestInit;
} {
  const apiKey = Deno.env.get("HUD_API_KEY");
  if (!apiKey) throw new Error("HUD_API_KEY not configured on server");

  const { endpoint, id } = params;

  if (endpoint === "county") {
    if (!id) throw new Error("Missing param: id (HUD entity ID)");
    // HUD entity IDs are alphanumeric (e.g. "0100199999")
    if (!/^[A-Za-z0-9]+$/.test(id)) {
      throw new Error("Invalid HUD entity ID format");
    }
    const url = `${HUD_BASE}/data/${encodeURIComponent(id)}`;
    return {
      url,
      init: { headers: { Authorization: `Bearer ${apiKey}` } },
    };
  }

  if (endpoint === "state") {
    if (!id || !/^[A-Z]{2}$/.test(id)) {
      throw new Error("Invalid state code: must be 2 uppercase letters");
    }
    const url = `${HUD_BASE}/statedata/${encodeURIComponent(id)}`;
    return {
      url,
      init: { headers: { Authorization: `Bearer ${apiKey}` } },
    };
  }

  throw new Error(`Invalid housing endpoint: ${endpoint}`);
}

// ── Main handler ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { service, params } = await req.json();

    if (!service || !params || typeof params !== "object") {
      return new Response(
        JSON.stringify({ error: "Request must include service and params" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let target: { url: string; init: RequestInit };

    switch (service) {
      case "census":
        target = handleCensus(params);
        break;
      case "crime":
        target = handleCrime(params);
        break;
      case "housing":
        target = handleHousing(params);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown service: ${service}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    // Forward the request to the external API with retry
    const externalRes = await fetchWithRetry(target.url, target.init);

    const body = await externalRes.text();

    return new Response(body, {
      status: externalRes.status,
      headers: {
        ...corsHeaders,
        "Content-Type": externalRes.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
