import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCoordinates } from '../geocode.js';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchCoordinates', () => {
  it('returns lat/lng for a valid city', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { lat: '30.2672', lon: '-97.7431', display_name: 'Austin, Texas, USA' },
        ]),
    });

    const result = await fetchCoordinates('Austin', 'Texas');

    expect(result.lat).toBeCloseTo(30.2672);
    expect(result.lng).toBeCloseTo(-97.7431);
    expect(result.displayName).toBe('Austin, Texas, USA');
  });

  it('returns nulls when no results found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const result = await fetchCoordinates('Nowhereville', 'Fakeland');
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.displayName).toBeNull();
  });

  it('returns nulls when API returns non-OK status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    const result = await fetchCoordinates('Austin', 'Texas');
    expect(result.lat).toBeNull();
  });

  it('sends correct User-Agent header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await fetchCoordinates('Austin', 'Texas');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('nominatim.openstreetmap.org'),
      expect.objectContaining({
        headers: { 'User-Agent': 'RateLand/1.0 (city-data-explorer)' },
      }),
    );
  });
});
