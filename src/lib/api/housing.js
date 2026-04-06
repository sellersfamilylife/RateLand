/**
 * housing.js — HUD Fair Market Rent (FMR) API
 *
 * Public API docs: https://www.huduser.gov/portal/dataset/fmr-api.html
 * Base URL: https://www.huduser.gov/hudapi/public/fmr
 *
 * Supports two resolution levels:
 *   - County-level: fmr/data/{entityId} — used when FIPS data is available
 *   - State-level:  fmr/statedata/{stateCode} — fallback when FIPS is unavailable
 *
 * Requests are proxied through a Supabase Edge Function so the API key
 * never leaves the server.
 */

import { resolveStateAbbr } from '../states.js';
import { supabase } from '../supabaseClient.js';

/**
 * Fetch HUD Fair Market Rent data.
 * When fipsData is provided, attempts county-level resolution first,
 * then falls back to state-level if the county endpoint fails.
 *
 * @param {string} city  — included in output for context
 * @param {string} state — 2‑letter abbreviation or full name
 * @param {object|null} fipsData — from getCountyFIPS(), or null
 * @returns {object} FMR values for various bedroom counts
 */
export async function fetchHousingCosts(city, state, fipsData = null, { signal } = {}) {
  // HUD accepts 2‑letter state code — resolve and validate
  const stateCode = resolveStateAbbr(state);

  if (!stateCode || !/^[A-Z]{2}$/.test(stateCode)) {
    throw new Error(`Unrecognized state: "${state}".`);
  }

  // ── Attempt county-level fetch when FIPS is available ─────
  if (fipsData?.hudEntityId) {
    try {
      const countyResult = await fetchCountyLevel(city, stateCode, fipsData, signal);
      if (countyResult) return countyResult;
    } catch (err) {
      console.warn('[HUD] County-level fetch failed, falling back to state-level:', err.message);
    }
  }

  // ── State-level fallback ──────────────────────────────────────
  return fetchStateLevel(city, stateCode, signal);
}

/**
 * Fetch county-level FMR via fmr/data/{entityId}.
 */
async function fetchCountyLevel(city, stateCode, fipsData, _signal) {
  const { data: json, error: invokeError } = await supabase.functions.invoke('api-proxy', {
    body: {
      service: 'housing',
      params: { endpoint: 'county', id: fipsData.hudEntityId },
    },
  });

  if (invokeError) {
    throw new Error(`HUD county proxy error: ${invokeError.message}`);
  }

  const d = json.data ?? json;

  // SAFMR areas return basicdata as an array with zip-code-level entries.
  // Use the "MSA level" entry when smallarea_status is "1".
  let bd = d.basicdata;
  if (Array.isArray(bd)) {
    const msaEntry = bd.find((e) => e.zip_code === 'MSA level');
    bd = msaEntry || bd[0] || {};
  } else {
    bd = bd || {};
  }

  return {
    source: 'HUD Fair Market Rent',
    scope: 'county',
    countyName: fipsData.countyName || d.county_name || null,
    city,
    state: stateCode,
    year: bd.year ?? d.year ?? null,
    fmr_efficiency: parseFloat(bd.Efficiency) || null,
    fmr_1br: parseFloat(bd['One-Bedroom']) || null,
    fmr_2br: parseFloat(bd['Two-Bedroom']) || null,
    fmr_3br: parseFloat(bd['Three-Bedroom']) || null,
    fmr_4br: parseFloat(bd['Four-Bedroom']) || null,
  };
}

/**
 * Fetch state-level FMR via fmr/statedata/{stateCode}.
 */
async function fetchStateLevel(city, stateCode, _signal) {
  const { data: json, error: invokeError } = await supabase.functions.invoke('api-proxy', {
    body: {
      service: 'housing',
      params: { endpoint: 'state', id: stateCode },
    },
  });

  if (invokeError) {
    throw new Error(`HUD state proxy error: ${invokeError.message}`);
  }

  const d = json.data ?? json;

  // State-level response contains arrays of metro areas and counties.
  // Average all entries to produce a statewide representative estimate.
  const allEntries = [
    ...(Array.isArray(d.metroareas) ? d.metroareas : []),
    ...(Array.isArray(d.counties) ? d.counties : []),
  ];

  function avg(field) {
    const vals = allEntries
      .map((e) => parseFloat(e[field]))
      .filter((v) => !isNaN(v) && v > 0);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  return {
    source: 'HUD Fair Market Rent',
    scope: 'state',
    city,
    state: stateCode,
    year: d.year ?? null,
    fmr_efficiency: avg('Efficiency'),
    fmr_1br: avg('One-Bedroom'),
    fmr_2br: avg('Two-Bedroom'),
    fmr_3br: avg('Three-Bedroom'),
    fmr_4br: avg('Four-Bedroom'),
  };
}
