import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock localStorage before importing fips.js since it reads
// localStorage at module level for caching.
const store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => {
    store[key] = val;
  }),
  removeItem: vi.fn((key) => {
    delete store[key];
  }),
};
vi.stubGlobal('localStorage', localStorageMock);

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Dynamic import so mocks are in place
const { getCountyFIPS } = await import('../fips.js');

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  mockFetch.mockReset();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getCountyFIPS', () => {
  it('returns FIPS data from FCC API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              county_fips: '48453',
              county_name: 'Travis County',
              state_fips: '48',
              state_code: 'TX',
            },
          ],
        }),
    });

    const result = await getCountyFIPS(30.2672, -97.7431, 'Texas');

    expect(result.countyFIPS).toBe('48453');
    expect(result.countyName).toBe('Travis');
    expect(result.stateCode).toBe('TX');
    expect(result.hudEntityId).toBe('4845399999');
    expect(result.source).toBe('FCC Area API');
  });

  it('falls back to Census Geocoder when FCC fails', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('FCC unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              geographies: {
                Counties: [
                  {
                    GEOID: '48453',
                    BASENAME: 'Travis',
                    STATE: '48',
                  },
                ],
                States: [{ STUSAB: 'TX' }],
              },
            },
          }),
      });

    // Use unique coordinates to avoid in-memory cache from previous test
    const result = await getCountyFIPS(31.0000, -98.0000, 'Texas');

    expect(result.countyFIPS).toBe('48453');
    expect(result.source).toBe('Census Geocoder');
  });

  it('returns error when both APIs fail', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('FCC down'))
      .mockRejectedValueOnce(new Error('Census down'));

    // Use unique coordinates to avoid in-memory cache from previous tests
    const result = await getCountyFIPS(32.0000, -99.0000, 'Texas');
    expect(result.error).toBe('API_ERROR');
  });

  it('appends 99999 to county FIPS for HUD entity ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              county_fips: '06037',
              county_name: 'Los Angeles County',
              state_fips: '06',
              state_code: 'CA',
            },
          ],
        }),
    });

    const result = await getCountyFIPS(34.0522, -118.2437, 'California');
    expect(result.hudEntityId).toBe('0603799999');
  });

  it('strips "County" suffix from county name', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              county_fips: '48201',
              county_name: 'Harris County',
              state_fips: '48',
              state_code: 'TX',
            },
          ],
        }),
    });

    const result = await getCountyFIPS(29.7604, -95.3698, 'Texas');
    expect(result.countyName).toBe('Harris');
  });
});
