import { describe, it, expect } from 'vitest';
import { STATE_NAME_TO_ABBR, ABBR_TO_NAME, resolveStateAbbr } from '../states.js';

describe('STATE_NAME_TO_ABBR', () => {
  it('contains all 50 states + DC (51 entries)', () => {
    expect(Object.keys(STATE_NAME_TO_ABBR)).toHaveLength(51);
  });

  it('maps lowercase state names to 2-letter abbreviations', () => {
    expect(STATE_NAME_TO_ABBR['texas']).toBe('TX');
    expect(STATE_NAME_TO_ABBR['new york']).toBe('NY');
    expect(STATE_NAME_TO_ABBR['district of columbia']).toBe('DC');
  });
});

describe('ABBR_TO_NAME', () => {
  it('contains all 50 states + DC (51 entries)', () => {
    expect(Object.keys(ABBR_TO_NAME)).toHaveLength(51);
  });

  it('maps abbreviations to title-case names', () => {
    expect(ABBR_TO_NAME['TX']).toBe('Texas');
    expect(ABBR_TO_NAME['NY']).toBe('New York');
    expect(ABBR_TO_NAME['DC']).toBe('District of Columbia');
  });

  it('is the inverse of STATE_NAME_TO_ABBR', () => {
    for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
      expect(ABBR_TO_NAME[abbr].toLowerCase()).toBe(name);
    }
  });
});

describe('resolveStateAbbr', () => {
  it('returns abbreviation for full lowercase name', () => {
    expect(resolveStateAbbr('texas')).toBe('TX');
    expect(resolveStateAbbr('new hampshire')).toBe('NH');
  });

  it('returns abbreviation for mixed-case name', () => {
    expect(resolveStateAbbr('Texas')).toBe('TX');
    expect(resolveStateAbbr('NEW YORK')).toBe('NY');
  });

  it('returns uppercase abbreviation when given a valid abbreviation', () => {
    expect(resolveStateAbbr('TX')).toBe('TX');
    expect(resolveStateAbbr('tx')).toBe('TX');
    expect(resolveStateAbbr('Tx')).toBe('TX');
  });

  it('trims whitespace', () => {
    expect(resolveStateAbbr('  TX  ')).toBe('TX');
    expect(resolveStateAbbr(' texas ')).toBe('TX');
  });

  it('returns null for null, undefined, or empty string', () => {
    expect(resolveStateAbbr(null)).toBeNull();
    expect(resolveStateAbbr(undefined)).toBeNull();
    expect(resolveStateAbbr('')).toBeNull();
  });

  it('returns null for unrecognized input', () => {
    expect(resolveStateAbbr('Narnia')).toBeNull();
    expect(resolveStateAbbr('XX')).toBeNull();
    expect(resolveStateAbbr('123')).toBeNull();
  });
});
