import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all sub-modules that combine.js imports
vi.mock('../census.js', () => ({
  fetchCensusData: vi.fn(),
}));
vi.mock('../crime.js', () => ({
  fetchCrimeData: vi.fn(),
}));
vi.mock('../housing.js', () => ({
  fetchHousingCosts: vi.fn(),
}));
vi.mock('../livingWage.js', () => ({
  fetchLivingWage: vi.fn(),
}));
vi.mock('../health.js', () => ({
  fetchHealthIndicators: vi.fn(),
}));
vi.mock('../wonder.js', () => ({
  fetchMortalityPlaceholder: vi.fn(),
}));
vi.mock('../geocode.js', () => ({
  fetchCoordinates: vi.fn(),
}));
vi.mock('../fips.js', () => ({
  getCountyFIPS: vi.fn(),
}));
vi.mock('../cache.js', () => ({
  withCache: vi.fn((_ns, _key, _ttl, fn) => fn()),
}));

import { combineCityData } from '../combine.js';
import { fetchCensusData } from '../census.js';
import { fetchCrimeData } from '../crime.js';
import { fetchHousingCosts } from '../housing.js';
import { fetchLivingWage } from '../livingWage.js';
import { fetchHealthIndicators } from '../health.js';
import { fetchMortalityPlaceholder } from '../wonder.js';
import { fetchCoordinates } from '../geocode.js';
import { getCountyFIPS } from '../fips.js';

beforeEach(() => {
  vi.clearAllMocks();

  // Default: geocode succeeds
  fetchCoordinates.mockResolvedValue({
    lat: 30.2672,
    lng: -97.7431,
    displayName: 'Austin, Texas, USA',
  });

  // Default: FIPS succeeds
  getCountyFIPS.mockResolvedValue({
    countyFIPS: '48453',
    countyName: 'Travis',
    stateFIPS: '48',
    stateCode: 'TX',
    hudEntityId: '4845399999',
  });

  // Default: all data sources succeed
  fetchCensusData.mockResolvedValue({ source: 'Census', population: 1000000 });
  fetchCrimeData.mockResolvedValue({ source: 'FBI', violentCrime: 500 });
  fetchHousingCosts.mockResolvedValue({ source: 'HUD', fmr_2br: 1400 });
  fetchLivingWage.mockResolvedValue({ source: 'MIT', note: 'Coming soon' });
  fetchHealthIndicators.mockResolvedValue({ source: 'CHR', note: 'Coming soon' });
  fetchMortalityPlaceholder.mockResolvedValue({ source: 'CDC', note: 'Coming soon' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('combineCityData', () => {
  it('returns combined data from all sources', async () => {
    const result = await combineCityData('Austin', 'Texas');

    expect(result.city).toBe('Austin');
    expect(result.state).toBe('Texas');
    expect(result.coordinates.lat).toBeCloseTo(30.2672);
    expect(result.census.population).toBe(1000000);
    expect(result.crime.violentCrime).toBe(500);
    expect(result.housing.fmr_2br).toBe(1400);
    expect(result.fetchedAt).toBeDefined();
  });

  it('returns error when city cannot be geocoded', async () => {
    fetchCoordinates.mockResolvedValue({ lat: null, lng: null, displayName: null });

    const result = await combineCityData('Nowhereville', 'Fakeland');
    expect(result.error).toContain('City not found');
  });

  it('continues when single data source fails', async () => {
    fetchCensusData.mockRejectedValue(new Error('Census down'));

    const result = await combineCityData('Austin', 'Texas');

    // Census should have graceful error, others should succeed
    expect(result.census.error).toContain('temporarily unavailable');
    expect(result.crime.violentCrime).toBe(500);
    expect(result.housing.fmr_2br).toBe(1400);
  });

  it('continues when FIPS resolution fails', async () => {
    getCountyFIPS.mockRejectedValue(new Error('FIPS down'));

    const result = await combineCityData('Austin', 'Texas');

    // Should still have census and crime data
    expect(result.census.population).toBe(1000000);
    expect(result.crime.violentCrime).toBe(500);
  });

  it('throws on AbortError from geocoding', async () => {
    fetchCoordinates.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    // Without an external signal, combine.js wraps AbortError as timeout
    await expect(combineCityData('Austin', 'Texas')).rejects.toThrow('Request timed out');
  });

  it('passes coordinates to FIPS resolver', async () => {
    await combineCityData('Austin', 'Texas');

    expect(getCountyFIPS).toHaveBeenCalledWith(
      30.2672,
      -97.7431,
      'Texas',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
