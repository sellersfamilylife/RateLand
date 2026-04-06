import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHousingCosts } from '../housing.js';

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

const fipsData = {
  countyFIPS: '48453',
  countyName: 'Travis',
  hudEntityId: '4845399999',
};

describe('fetchHousingCosts', () => {
  it('parses county-level FMR response', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        data: {
          basicdata: {
            year: 2024,
            Efficiency: '950',
            'One-Bedroom': '1100',
            'Two-Bedroom': '1350',
            'Three-Bedroom': '1700',
            'Four-Bedroom': '2100',
          },
        },
      },
      error: null,
    });

    const result = await fetchHousingCosts('Austin', 'Texas', fipsData);

    expect(result.source).toBe('HUD Fair Market Rent');
    expect(result.scope).toBe('county');
    expect(result.fmr_1br).toBe(1100);
    expect(result.fmr_2br).toBe(1350);
    expect(result.countyName).toBe('Travis');
  });

  it('falls back to state-level when county fetch fails', async () => {
    // First call (county) fails, second call (state) succeeds
    supabase.functions.invoke
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'County not found' },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            year: 2024,
            metroareas: [
              { Efficiency: '800', 'One-Bedroom': '1000', 'Two-Bedroom': '1200', 'Three-Bedroom': '1500', 'Four-Bedroom': '1800' },
            ],
            counties: [],
          },
        },
        error: null,
      });

    const result = await fetchHousingCosts('Austin', 'Texas', fipsData);

    expect(result.scope).toBe('state');
    expect(result.fmr_1br).toBe(1000);
  });

  it('uses state-level directly when no fipsData', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        data: {
          year: 2024,
          metroareas: [
            { Efficiency: '900', 'One-Bedroom': '1050', 'Two-Bedroom': '1300', 'Three-Bedroom': '1600', 'Four-Bedroom': '2000' },
          ],
          counties: [],
        },
      },
      error: null,
    });

    const result = await fetchHousingCosts('Austin', 'Texas', null);

    expect(result.scope).toBe('state');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('api-proxy', {
      body: { service: 'housing', params: { endpoint: 'state', id: 'TX' } },
    });
  });

  it('throws on unrecognized state', async () => {
    await expect(
      fetchHousingCosts('Austin', 'Narnia', null),
    ).rejects.toThrow('Unrecognized state');
  });

  it('handles SAFMR basicdata array response', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        data: {
          basicdata: [
            { zip_code: '78701', Efficiency: '999', 'One-Bedroom': '1111', 'Two-Bedroom': '1333', 'Three-Bedroom': '1555', 'Four-Bedroom': '1777' },
            { zip_code: 'MSA level', Efficiency: '950', 'One-Bedroom': '1100', 'Two-Bedroom': '1350', 'Three-Bedroom': '1700', 'Four-Bedroom': '2100' },
          ],
        },
      },
      error: null,
    });

    const result = await fetchHousingCosts('Austin', 'Texas', fipsData);

    // Should use MSA level entry, not the first zip code entry
    expect(result.fmr_efficiency).toBe(950);
    expect(result.fmr_1br).toBe(1100);
  });

  it('state-level averages multiple metroareas and counties', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        data: {
          year: 2024,
          metroareas: [
            { Efficiency: '1000', 'One-Bedroom': '1200', 'Two-Bedroom': '1400', 'Three-Bedroom': '1600', 'Four-Bedroom': '1800' },
            { Efficiency: '800', 'One-Bedroom': '1000', 'Two-Bedroom': '1200', 'Three-Bedroom': '1400', 'Four-Bedroom': '1600' },
          ],
          counties: [],
        },
      },
      error: null,
    });

    const result = await fetchHousingCosts('Austin', 'Texas', null);
    expect(result.fmr_efficiency).toBe(900); // avg(1000, 800)
    expect(result.fmr_1br).toBe(1100); // avg(1200, 1000)
  });
});
