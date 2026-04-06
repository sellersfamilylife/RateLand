/**
 * geocode.js — OpenStreetMap Nominatim geocoder
 *
 * Converts a city + state into latitude/longitude coordinates.
 * Free, no API key required.
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 *   - Max 1 request/second
 *   - Include a User-Agent header
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

/** Nominatim rate-limit: 1 request per second (per ToS). */
let lastNominatimRequest = 0;

async function throttleNominatim() {
  const now = Date.now();
  const elapsed = now - lastNominatimRequest;
  if (elapsed < 1000) {
    await new Promise((r) => setTimeout(r, 1000 - elapsed));
  }
  lastNominatimRequest = Date.now();
}

/**
 * Geocode a U.S. city to lat/lng.
 *
 * @param {string} city  — e.g. "Austin"
 * @param {string} state — e.g. "Texas"
 * @returns {{ lat: number|null, lng: number|null, displayName: string|null }}
 */
export async function fetchCoordinates(city, state, { signal } = {}) {
  await throttleNominatim();
  const query = `${city}, ${state}, United States`;
  const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'RateLand/1.0 (city-data-explorer)' },
    signal,
  });

  if (!res.ok) {
    return { lat: null, lng: null, displayName: null };
  }

  const results = await res.json();

  if (!results.length) {
    return { lat: null, lng: null, displayName: null };
  }

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}
