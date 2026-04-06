import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCensusData } from '../census.js';

// Mock supabase.functions.invoke
vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '../../supabaseClient.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchCensusData', () => {
  it('parses a successful Census response', async () => {
    const mockResponse = [
      ['NAME', 'B01003_001E', 'B01002_001E', 'B19013_001E', 'B17001_002E', 'B25077_001E', 'B25064_001E', 'B15003_022E', 'B15003_023E', 'B15003_025E', 'B01001_003E', 'B01001_020E', 'state', 'place'],
      ['Austin city, Texas', '1000000', '35.2', '75000', '120000', '350000', '1400', '250000', '80000', '20000', '30000', '10000', '48', '05000'],
    ];

    supabase.functions.invoke.mockResolvedValue({
      data: mockResponse,
      error: null,
    });

    const result = await fetchCensusData('Austin', 'Texas');

    expect(result.source).toBe('U.S. Census ACS 5‑Year Estimates');
    expect(result.population).toBe(1000000);
    expect(result.medianAge).toBe(35.2);
    expect(result.medianHouseholdIncome).toBe(75000);
    expect(result.medianHomeValue).toBe(350000);
    expect(result.medianGrossRent).toBe(1400);
    expect(result.educationBachelors).toBe(250000);
  });

  it('returns error object when city is not found', async () => {
    const mockResponse = [
      ['NAME', 'B01003_001E', 'state', 'place'],
      ['Houston city, Texas', '2300000', '48', '35000'],
    ];

    supabase.functions.invoke.mockResolvedValue({
      data: mockResponse,
      error: null,
    });

    const result = await fetchCensusData('FakeCity', 'Texas');
    expect(result.error).toContain('No Census data found');
  });

  it('throws when proxy invocation fails', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Function not found' },
    });

    await expect(fetchCensusData('Austin', 'Texas')).rejects.toThrow('Census proxy error');
  });

  it('throws when response format is unexpected', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: { unexpected: true },
      error: null,
    });

    await expect(fetchCensusData('Austin', 'Texas')).rejects.toThrow('unexpected response');
  });

  it('calls invoke with correct service and params', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: [['NAME'], ['test']],
      error: null,
    });

    await fetchCensusData('Austin', 'Texas').catch(() => {});

    expect(supabase.functions.invoke).toHaveBeenCalledWith('api-proxy', {
      body: {
        service: 'census',
        params: { variables: expect.any(String) },
      },
    });
  });
});
