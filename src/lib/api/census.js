/**
 * census.js — U.S. Census ACS 5‑Year Estimates
 *
 * Public API docs: https://www.census.gov/data/developers/data-sets/acs-5year.html
 * Base URL: https://api.census.gov/data/{year}/acs/acs5
 *
 * Requests are proxied through a Supabase Edge Function so the API key
 * never leaves the server.
 */

import { supabase } from '../supabaseClient.js';

// ACS variable codes for the data we need
const VARIABLES = [
  'B01003_001E', // Total population
  'B01002_001E', // Median age
  'B19013_001E', // Median household income
  'B17001_002E', // Population below poverty level
  'B25077_001E', // Median home value
  'B25064_001E', // Median gross rent
  'B15003_022E', // Bachelor's degree holders
  'B15003_023E', // Master's degree holders
  'B15003_025E', // Doctorate degree holders
  'B01001_003E', // Males under 5
  'B01001_020E', // Males 65-66
].join(',');

/**
 * Fetch Census ACS data for a given city and state.
 *
 * @param {string} city  — e.g. "Austin"
 * @param {string} state — e.g. "Texas" or "TX"
 * @returns {object} Parsed Census metrics
 */
export async function fetchCensusData(city, state, { signal: _signal } = {}) {
  const { data: json, error: invokeError } = await supabase.functions.invoke('api-proxy', {
    body: { service: 'census', params: { variables: VARIABLES } },
  });

  if (invokeError) {
    throw new Error(`Census proxy error: ${invokeError.message}`);
  }

  if (!Array.isArray(json) || json.length < 2) {
    throw new Error('Census API returned unexpected response format.');
  }

  // json[0] is the header row; remaining rows are data
  const headers = json[0];
  const match = json
    .slice(1)
    .find((row) =>
      row[0].toLowerCase().includes(city.toLowerCase()) &&
      row[0].toLowerCase().includes(state.toLowerCase())
    );

  if (!match) {
    return {
      source: 'U.S. Census ACS 5‑Year Estimates',
      error: `No Census data found for "${city}, ${state}".`,
    };
  }

  // Map header → value
  const data = {};
  headers.forEach((h, i) => {
    data[h] = match[i];
  });

  return {
    source: 'U.S. Census ACS 5‑Year Estimates',
    population: Number(data['B01003_001E']),
    medianAge: Number(data['B01002_001E']),
    medianHouseholdIncome: Number(data['B19013_001E']),
    populationBelowPoverty: Number(data['B17001_002E']),
    medianHomeValue: Number(data['B25077_001E']),
    medianGrossRent: Number(data['B25064_001E']),
    educationBachelors: Number(data['B15003_022E']),
    educationMasters: Number(data['B15003_023E']),
    educationDoctorate: Number(data['B15003_025E']),
  };
}
