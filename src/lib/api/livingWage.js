/**
 * livingWage.js — MIT Living Wage Calculator
 *
 * Website: https://livingwage.mit.edu/
 *
 * The MIT Living Wage Calculator publishes data per county at
 * https://livingwage.mit.edu/counties/{FIPS}. There is NO public
 * REST/JSON API. The FAQ explicitly states: "Please do not scrape
 * the data." Commercial use requires licensing through the
 * Living Wage Institute (https://www.livingwage.institute/).
 *
 * This module returns a context-aware "Coming Soon" placeholder.
 * When FIPS data is available, the placeholder includes the
 * resolved county name for transparency.
 */

/**
 * Return a coming-soon placeholder for living-wage data.
 * When fipsData is available, the placeholder names the county.
 *
 * @param {string} city  — city name
 * @param {string} state — state name or abbreviation
 * @param {object|null} fipsData — from getCountyFIPS(), or null
 * @returns {object} Structured placeholder
 */
export async function fetchLivingWage(city, state, fipsData = null) {
  const countyName = fipsData?.countyName || null;

  return {
    source: 'MIT Living Wage Calculator',
    status: 'coming-soon',
    city,
    state,
    countyName,
    note: countyName
      ? `Living wage data for ${countyName} County requires a data license from the Living Wage Institute. This feature is coming soon.`
      : 'Living wage data requires city-to-county mapping and a data license from the Living Wage Institute. This feature is coming soon.',
    livingWage: null,
    typicalExpenses: {
      food: null,
      childcare: null,
      housing: null,
      transportation: null,
      healthcare: null,
      otherNecessities: null,
      taxes: null,
    },
  };
}
