/**
 * combine.js — Aggregation layer
 *
 * Calls every API module and merges the results into a single JSON object.
 * Each sub‑call is wrapped in a try/catch so one failing source doesn't
 * block the entire request.
 *
 * Supports an optional AbortSignal to cancel all in-flight requests
 * (on timeout or when the user navigates away).
 */

import { fetchCensusData } from './census.js';
import { fetchCrimeData } from './crime.js';
import { fetchHousingCosts } from './housing.js';
import { fetchLivingWage } from './livingWage.js';
import { fetchHealthIndicators } from './health.js';
import { fetchMortalityPlaceholder } from './wonder.js';
import { fetchCoordinates } from './geocode.js';
import { getCountyFIPS } from './fips.js';
import { withCache } from './cache.js';

const REQUEST_TIMEOUT_MS = 30_000;

const CACHE_TTL = {
  census: 30 * 24 * 60 * 60 * 1000, // 30 days
  crime: 7 * 24 * 60 * 60 * 1000, // 7 days
  housing: 14 * 24 * 60 * 60 * 1000, // 14 days
};

/**
 * Fetch and combine all city data sources.
 *
 * @param {string} city  — city name (pre-validated & sanitized)
 * @param {string} state — state name or abbreviation
 * @param {{ signal?: AbortSignal }} options — optional AbortSignal for cancellation
 * @returns {object} Merged data from all sources
 */
export async function combineCityData(city, state, { signal } = {}) {
  // Internal timeout controller — aborts all fetches after REQUEST_TIMEOUT_MS
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

  // If an external signal is provided (e.g. navigation away), link it
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw new DOMException('Aborted', 'AbortError');
    }
    signal.addEventListener('abort', () => timeoutController.abort(), { once: true });
  }

  const internalSignal = timeoutController.signal;

  const wrap = async (label, fn) => {
    try {
      return await fn();
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.error(`[${label}]`, err);
      return { source: label, error: 'Data temporarily unavailable. Please try again later.' };
    }
  };

  try {
    // ── Step 1: Verify the city exists via geocoding ──────────
    let coordinates;
    try {
      coordinates = await fetchCoordinates(city, state, { signal: internalSignal });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.error('[Geocode]', err);
      coordinates = { lat: null, lng: null, displayName: null };
    }

    if (coordinates.lat == null) {
      return {
        error: `City not found: "${city}, ${state}". Please check the spelling and try again.`,
      };
    }

    // ── Step 2: Resolve county FIPS from coordinates ──────────
    let fips = null;
    try {
      const result = await getCountyFIPS(coordinates.lat, coordinates.lng, state, { signal: internalSignal });
      if (!result.error) fips = result;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.error('[FIPS]', err);
    }

    // ── Step 3: Fetch remaining data sources in parallel ─────
    const cacheKey = `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}`;
    const housingCacheKey = `${cacheKey}|${fips?.countyFIPS || ''}`;

    const [census, crime, housing, livingWage, health, cdcWonder] = await Promise.all([
      wrap('Census', () =>
        withCache('census', cacheKey, CACHE_TTL.census, () =>
          fetchCensusData(city, state, { signal: internalSignal }),
        ),
      ),
      wrap('FBI Crime', () =>
        withCache('crime', cacheKey, CACHE_TTL.crime, () =>
          fetchCrimeData(city, state, { signal: internalSignal }),
        ),
      ),
      wrap('HUD Housing', () =>
        withCache('housing', housingCacheKey, CACHE_TTL.housing, () =>
          fetchHousingCosts(city, state, fips, { signal: internalSignal }),
        ),
      ),
      wrap('MIT Living Wage', () => fetchLivingWage(city, state, fips)),
      wrap('County Health Rankings', () => fetchHealthIndicators(city, state, fips)),
      wrap('CDC WONDER', () => fetchMortalityPlaceholder(city, state)),
    ]);

    return {
      city,
      state,
      fetchedAt: new Date().toISOString(),
      coordinates,
      fips,
      census,
      crime,
      housing,
      livingWage,
      health,
      cdcWonder,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      // Distinguish timeout from external abort
      if (signal?.aborted) throw err;
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
