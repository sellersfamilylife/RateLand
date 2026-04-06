import { describe, it, expect } from 'vitest';
import { sumLatestYear } from '../crime.js';

describe('sumLatestYear', () => {
  it('sums monthly data and returns the latest year', () => {
    const data = {
      '01-2023': 10,
      '02-2023': 20,
      '03-2023': 30,
      '01-2024': 100,
      '02-2024': 200,
    };
    const result = sumLatestYear(data);
    expect(result).toEqual({ year: 2024, total: 300 });
  });

  it('picks the most recent year when multiple years present', () => {
    const data = {
      '06-2021': 50,
      '06-2022': 75,
      '06-2023': 100,
    };
    const result = sumLatestYear(data);
    expect(result).toEqual({ year: 2023, total: 100 });
  });

  it('returns null for null input', () => {
    expect(sumLatestYear(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(sumLatestYear(undefined)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(sumLatestYear('not an object')).toBeNull();
    expect(sumLatestYear(42)).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(sumLatestYear({})).toBeNull();
  });

  it('treats non-numeric values as 0', () => {
    const data = {
      '01-2024': 100,
      '02-2024': 'bad',
      '03-2024': null,
      '04-2024': undefined,
      '05-2024': NaN,
      '06-2024': 50,
    };
    const result = sumLatestYear(data);
    expect(result).toEqual({ year: 2024, total: 150 });
  });

  it('skips malformed keys', () => {
    const data = {
      'bad-key': 100,
      'no-dash-here-2024': 50,
      '01-2024': 200,
      '': 999,
    };
    const result = sumLatestYear(data);
    expect(result).toEqual({ year: 2024, total: 200 });
  });

  it('rounds the total to nearest integer', () => {
    const data = {
      '01-2024': 10.3,
      '02-2024': 20.7,
    };
    const result = sumLatestYear(data);
    expect(result).toEqual({ year: 2024, total: 31 });
  });

  it('handles zero values correctly', () => {
    const data = {
      '01-2024': 0,
      '02-2024': 0,
      '03-2024': 0,
    };
    const result = sumLatestYear(data);
    expect(result).toEqual({ year: 2024, total: 0 });
  });
});
