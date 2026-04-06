import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withCache } from '../cache.js';

// Mock localStorage
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

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withCache', () => {
  it('calls fetchFn on cache miss and returns result', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ population: 100 });
    const result = await withCache('test', 'key1', 60_000, fetchFn);
    expect(result).toEqual({ population: 100 });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('returns in-memory cached result on second call', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ population: 200 });
    await withCache('inmem', 'k', 60_000, fetchFn);
    const result = await withCache('inmem', 'k', 60_000, fetchFn);
    expect(result).toEqual({ population: 200 });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('writes to localStorage on cache miss', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ val: 1 });
    await withCache('ls', 'k', 60_000, fetchFn);
    expect(localStorageMock.setItem).toHaveBeenCalled();
    const written = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(written.k.data).toEqual({ val: 1 });
  });

  it('reads from localStorage when in-memory cache is empty', async () => {
    // Pre-populate localStorage
    store['rateland_cache_lsread'] = JSON.stringify({
      mykey: { data: { cached: true }, ts: Date.now() },
    });
    const fetchFn = vi.fn().mockResolvedValue({ fresh: true });
    const result = await withCache('lsread', 'mykey', 60_000, fetchFn);
    expect(result).toEqual({ cached: true });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('re-fetches when TTL has expired', async () => {
    // Pre-populate localStorage with expired entry
    store['rateland_cache_ttl'] = JSON.stringify({
      k: { data: { old: true }, ts: Date.now() - 120_000 },
    });
    const fetchFn = vi.fn().mockResolvedValue({ fresh: true });
    const result = await withCache('ttl', 'k', 60_000, fetchFn);
    expect(result).toEqual({ fresh: true });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('does not cache results with .error property', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ error: 'something broke' });
    const result = await withCache('err', 'k', 60_000, fetchFn);
    expect(result).toEqual({ error: 'something broke' });

    // Second call should re-fetch
    const fetchFn2 = vi.fn().mockResolvedValue({ data: 'fixed' });
    const result2 = await withCache('err', 'k', 60_000, fetchFn2);
    expect(result2).toEqual({ data: 'fixed' });
    expect(fetchFn2).toHaveBeenCalledOnce();
  });

  it('does not cache null results', async () => {
    const fetchFn = vi.fn().mockResolvedValue(null);
    await withCache('nul', 'k', 60_000, fetchFn);
    // Second call should re-fetch
    const fetchFn2 = vi.fn().mockResolvedValue({ data: 'ok' });
    const result = await withCache('nul', 'k', 60_000, fetchFn2);
    expect(result).toEqual({ data: 'ok' });
  });

  it('handles QuotaExceededError by evicting oldest entry', async () => {
    // Pre-populate with an older entry
    store['rateland_cache_quota'] = JSON.stringify({
      old: { data: { x: 1 }, ts: 1000 },
    });

    let callCount = 0;
    localStorageMock.setItem.mockImplementation((key, val) => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      store[key] = val;
    });

    const fetchFn = vi.fn().mockResolvedValue({ data: 'new' });
    const result = await withCache('quota', 'k2', 60_000, fetchFn);
    // Should still return the data even if localStorage failed
    expect(result).toEqual({ data: 'new' });
  });

  it('handles corrupted localStorage gracefully', async () => {
    store['rateland_cache_corrupt'] = 'not-json{{{';
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const result = await withCache('corrupt', 'k', 60_000, fetchFn);
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('uses separate namespaces independently', async () => {
    const fn1 = vi.fn().mockResolvedValue({ ns: 'a' });
    const fn2 = vi.fn().mockResolvedValue({ ns: 'b' });
    await withCache('nsA', 'k', 60_000, fn1);
    await withCache('nsB', 'k', 60_000, fn2);
    const r1 = await withCache('nsA', 'k', 60_000, vi.fn());
    const r2 = await withCache('nsB', 'k', 60_000, vi.fn());
    expect(r1).toEqual({ ns: 'a' });
    expect(r2).toEqual({ ns: 'b' });
  });
});
