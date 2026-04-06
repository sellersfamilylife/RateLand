/**
 * wonder.js — CDC WONDER API (placeholder)
 *
 * CDC WONDER: https://wonder.cdc.gov/
 *
 * The CDC WONDER system requires an API agreement and token.
 * DO NOT implement key logic here — this is a placeholder only.
 */

/**
 * Placeholder for CDC WONDER mortality data.
 * Returns a structured object describing how to integrate later.
 *
 * @param {string} city  — city name
 * @param {string} state — state name or abbreviation
 * @returns {object} Placeholder with integration instructions
 */
export async function fetchMortalityPlaceholder(city, state) {
  return {
    source: 'CDC WONDER',
    status: 'placeholder',
    city,
    state,
    data: null,
    instructions:
      'CDC WONDER requires a formal data‑use agreement and an API token. ' +
      'To integrate:\n' +
      '1. Visit https://wonder.cdc.gov/ and agree to the data‑use terms.\n' +
      '2. Obtain an API token.\n' +
      '3. Use the WONDER XML‑based request format to query mortality data.\n' +
      '4. Parse the XML response and populate this object.\n' +
      '5. Do NOT expose the API token in client‑side code — use a ' +
      'Supabase Edge Function or server‑side proxy.',
  };
}
