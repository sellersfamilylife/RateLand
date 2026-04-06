/**
 * health.js — County Health Rankings
 *
 * Website: https://www.countyhealthrankings.org/
 * Data: Free / open access via CSV downloads
 *
 * County Health Rankings does NOT expose a public JSON REST API.
 * Data is available only as downloadable CSV files organized by
 * county FIPS code. The program is sunsetting in December 2026
 * and transitioning to an open-source GitHub project
 * (https://github.com/countyhealthrankings).
 *
 * This module returns a context-aware "Coming Soon" placeholder.
 * When FIPS data is available, the placeholder includes the
 * resolved county name for transparency.
 */

/**
 * Return a coming-soon placeholder for health rankings data.
 * When fipsData is available, the placeholder names the county.
 *
 * @param {string} city  — city name
 * @param {string} state — state name or abbreviation
 * @param {object|null} fipsData — from getCountyFIPS(), or null
 * @returns {object} Structured placeholder
 */
export async function fetchHealthIndicators(city, state, fipsData = null) {
  const countyName = fipsData?.countyName || null;

  return {
    source: 'County Health Rankings',
    status: 'coming-soon',
    city,
    state,
    countyName,
    note: countyName
      ? `Health rankings data for ${countyName} County is not yet available via API. County Health Rankings provides data as downloadable datasets. This feature is coming soon.`
      : 'Health rankings data requires city-to-county mapping and is not available via API. This feature is coming soon.',
    healthOutcomes: {
      prematureDeathYearsLost: null,
      poorOrFairHealthPct: null,
      poorPhysicalHealthDays: null,
      poorMentalHealthDays: null,
      lowBirthweightPct: null,
    },
    healthFactors: {
      adultSmokingPct: null,
      adultObesityPct: null,
      physicalInactivityPct: null,
      excessiveDrinkingPct: null,
      uninsuredPct: null,
    },
    mortality: {
      infantMortalityRate: null,
      drugOverdoseDeathRate: null,
    },
  };
}
