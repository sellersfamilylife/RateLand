/**
 * crime.js — FBI Crime Data Explorer (CDE) API
 *
 * Public API docs: https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi
 * Base URL: https://api.usa.gov/crime/fbi/cde
 *
 * Uses the "Summarized" endpoint group which provides estimated data for
 * individual offense categories at the state level.
 *
 * Requests are proxied through a Supabase Edge Function so the API key
 * never leaves the server.
 */

import { ABBR_TO_NAME, resolveStateAbbr } from '../states.js';
import { supabase } from '../supabaseClient.js';

/**
 * Offense slugs used in the Summarized endpoint, mapped to our output keys.
 */
const OFFENSES = [
  { slug: 'violent-crime',       key: 'violentCrime' },
  { slug: 'property-crime',     key: 'propertyCrime' },
  { slug: 'homicide',           key: 'homicide' },
  { slug: 'robbery',            key: 'robbery' },
  { slug: 'aggravated-assault', key: 'aggravatedAssault' },
  { slug: 'burglary',           key: 'burglary' },
  { slug: 'larceny',            key: 'larceny' },
  { slug: 'motor-vehicle-theft', key: 'motorVehicleTheft' },
];

/**
 * Sum monthly actuals for the most recent full year from the API response.
 *
 * The Summarized endpoint returns data keyed by "MM-YYYY", e.g.
 *   { "01-2022": 123, "02-2022": 456, ... }
 *
 * @param {object} monthlyData — e.g. json.offenses.actuals["{State} Offenses"]
 * @returns {{ year: number, total: number } | null}
 */
export function sumLatestYear(monthlyData) {
  if (!monthlyData || typeof monthlyData !== 'object') return null;

  // Group values by year
  const byYear = {};
  for (const [key, val] of Object.entries(monthlyData)) {
    const parts = key.split('-');
    if (parts.length !== 2) continue;
    const yr = Number(parts[1]);
    if (!yr) continue;
    const n = typeof val === 'number' && isFinite(val) ? val : 0;
    byYear[yr] = (byYear[yr] || 0) + n;
  }

  // Pick the most recent year that has data
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  if (years.length === 0) return null;
  return { year: years[0], total: Math.round(byYear[years[0]]) };
}

/**
 * Fetch a single offense category via the Edge Function proxy.
 */
async function fetchOffense(abbr, slug) {
  const { data, error } = await supabase.functions.invoke('api-proxy', {
    body: {
      service: 'crime',
      params: { stateAbbr: abbr, slug, from: '01-2020', to: '12-2024' },
    },
  });

  if (error) return null;
  return data;
}

/**
 * Fetch crime summary data for a state (the FBI CDE API does not support
 * city‑level queries directly — data is aggregated at the state/agency level).
 *
 * @param {string} city  — kept for interface consistency; included in output
 * @param {string} state — full name or abbreviation
 * @returns {object} Crime metrics
 */
export async function fetchCrimeData(city, state, { signal: _signal } = {}) {
  const abbr = resolveStateAbbr(state);

  if (!abbr || !/^[A-Z]{2}$/.test(abbr)) {
    throw new Error(`Unrecognized state: "${state}".`);
  }

  const stateName = ABBR_TO_NAME[abbr] || abbr;
  const offenseKey = `${stateName} Offenses`;

  // Fetch all offense categories concurrently
  const responses = await Promise.all(
    OFFENSES.map(({ slug }) => fetchOffense(abbr, slug)),
  );

  // Extract annual totals from each response
  const result = {
    source: 'FBI Crime Data Explorer',
    city,
    state: abbr,
    year: null,
  };

  let latestYear = 0;

  for (let i = 0; i < OFFENSES.length; i++) {
    const json = responses[i];
    const { key } = OFFENSES[i];
    const actuals = json?.offenses?.actuals?.[offenseKey];
    const yearData = sumLatestYear(actuals);
    if (yearData) {
      result[key] = yearData.total;
      if (yearData.year > latestYear) latestYear = yearData.year;
    } else {
      result[key] = null;
    }
  }

  result.year = latestYear || null;

  // Extract population from any successful response (same across offenses)
  const popKey = `${stateName}`;
  for (const json of responses) {
    const popData = json?.populations?.population?.[popKey];
    if (popData) {
      // Pick population for the latest year from any month entry
      const entry = Object.entries(popData).find(([k]) => k.endsWith(`-${latestYear}`));
      if (entry) {
        result.population = entry[1];
        break;
      }
    }
  }

  // Compute per-100k rates when population is available
  if (result.population && result.population > 0) {
    for (const { key } of OFFENSES) {
      const count = result[key];
      result[`${key}Rate`] = count != null
        ? Math.round((count / result.population) * 100_000 * 10) / 10
        : null;
    }
  }

  return result;
}
