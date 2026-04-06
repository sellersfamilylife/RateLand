/**
 * fips.js — County FIPS Code Resolution
 *
 * Converts latitude/longitude coordinates into a county FIPS code using
 * two free, government-operated APIs with automatic failover:
 *
 *   1. FCC Area API (primary)  — https://geo.fcc.gov/api/census/
 *   2. Census Geocoder (fallback) — https://geocoding.geo.census.gov/
 *
 * Both are free, require no API key, and return authoritative FIPS data.
 *
 * Results are cached in-memory and in localStorage (90-day TTL) because
 * FIPS codes only change during decennial census reapportionment.
 *
 * Attribution (FCC ToS): "This product uses the FCC Data API but is not
 * endorsed or certified by the FCC."
 */

import { resolveStateAbbr } from '../states.js';

/* ── Cache Configuration ──────────────────────────────────── */

const CACHE_KEY = 'rateland_fips_cache';
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/** In-memory cache (keyed by rounded coordinates). */
const memoryCache = new Map();

/** In-flight request deduplication map. */
const inflight = new Map();

/* ── Cache Helpers ────────────────────────────────────────── */

function cacheKey(lat, lon) {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function readLocalCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const entry = store[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      delete store[key];
      localStorage.setItem(CACHE_KEY, JSON.stringify(store));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeLocalCache(key, data) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[key] = { data, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable or full — non-critical
  }
}

/* ── Primary: FCC Area API ────────────────────────────────── */

async function fetchFromFCC(lat, lon, signal) {
  const url =
    `https://geo.fcc.gov/api/census/area?lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lon)}&format=json`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`FCC API ${res.status}`);

  const json = await res.json();
  const result = json?.results?.[0];

  if (!result?.county_fips) {
    throw new Error('FCC returned no county data — coordinates may be outside the US.');
  }

  return {
    countyFIPS: result.county_fips,
    countyName: (result.county_name || '').replace(/\s*County\s*$/i, '').trim(),
    stateFIPS: result.state_fips,
    stateCode: result.state_code,
    source: 'FCC Area API',
  };
}

/* ── Fallback: Census Geocoder Coordinates ────────────────── */

async function fetchFromCensus(lat, lon, signal) {
  const url =
    'https://geocoding.geo.census.gov/geocoder/geographies/coordinates' +
    `?x=${encodeURIComponent(lon)}&y=${encodeURIComponent(lat)}` +
    '&benchmark=Public_AR_Current&vintage=Current_Current&format=json';

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Census Geocoder ${res.status}`);

  const json = await res.json();
  const county = json?.result?.geographies?.Counties?.[0];

  if (!county?.GEOID) {
    throw new Error('Census Geocoder returned no county data.');
  }

  const stateObj = json.result.geographies.States?.[0];

  return {
    countyFIPS: county.GEOID,
    countyName: (county.BASENAME || county.NAME || '').replace(/\s*County\s*$/i, '').trim(),
    stateFIPS: county.STATE || stateObj?.STATE || county.GEOID.slice(0, 2),
    stateCode: stateObj?.STUSAB || '',
    source: 'Census Geocoder',
  };
}

/* ── Public API ───────────────────────────────────────────── */

/**
 * Resolve a latitude/longitude to a county FIPS code.
 *
 * @param {number} lat — latitude
 * @param {number} lon — longitude
 * @param {string} expectedState — the state the user entered (for cross-validation)
 * @returns {Promise<{
 *   countyFIPS: string,
 *   countyName: string,
 *   stateFIPS: string,
 *   stateCode: string,
 *   hudEntityId: string,
 *   source: string,
 * } | { error: string }>}
 */
export async function getCountyFIPS(lat, lon, expectedState, { signal } = {}) {
  const key = cacheKey(lat, lon);

  // ── 1. In-memory cache ──
  if (memoryCache.has(key)) return memoryCache.get(key);

  // ── 2. localStorage cache ──
  const local = readLocalCache(key);
  if (local) {
    memoryCache.set(key, local);
    return local;
  }

  // ── 3. Deduplicate in-flight requests ──
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    let result;

    // Primary: FCC
    try {
      result = await fetchFromFCC(lat, lon, signal);
    } catch (err) {
      console.warn('[FIPS] FCC failed, trying Census fallback:', err.message);
    }

    // Fallback: Census
    if (!result) {
      try {
        result = await fetchFromCensus(lat, lon, signal);
      } catch (err) {
        console.error('[FIPS] Both FCC and Census failed:', err.message);
        return { error: 'API_ERROR' };
      }
    }

    // ── State cross-validation ──
    const expectedAbbr = resolveStateAbbr(expectedState);
    if (expectedAbbr && result.stateCode && result.stateCode !== expectedAbbr) {
      console.warn(
        `[FIPS] State mismatch: user entered "${expectedState}" (${expectedAbbr}), ` +
        `but coordinates resolve to ${result.stateCode}. ` +
        'This may be a border city — using resolved state.'
      );
    }

    // ── Pre-compute HUD entity ID ──
    result.hudEntityId = `${result.countyFIPS}99999`;

    // ── Cache the result ──
    memoryCache.set(key, result);
    writeLocalCache(key, result);

    return result;
  })();

  inflight.set(key, promise);

  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
