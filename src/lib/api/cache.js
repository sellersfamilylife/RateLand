/**
 * cache.js — Generic in-memory + localStorage caching utility.
 *
 * Usage:
 *   const data = await withCache('census', key, TTL_MS, () => fetchCensusData(...));
 *
 * Each namespace gets its own localStorage key and in-memory Map.
 * Results with an `.error` property are NOT cached.
 */

const stores = new Map();

function localKey(namespace) {
  return `rateland_cache_${namespace}`;
}

function readLocal(namespace, key) {
  try {
    const raw = localStorage.getItem(localKey(namespace));
    if (!raw) return null;
    const store = JSON.parse(raw);
    return store[key] ?? null;
  } catch {
    return null;
  }
}

function writeLocal(namespace, key, data) {
  const lk = localKey(namespace);
  try {
    const raw = localStorage.getItem(lk);
    const store = raw ? JSON.parse(raw) : {};
    store[key] = { data, ts: Date.now() };
    localStorage.setItem(lk, JSON.stringify(store));
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      evictOldest(namespace);
      try {
        const raw = localStorage.getItem(lk);
        const store = raw ? JSON.parse(raw) : {};
        store[key] = { data, ts: Date.now() };
        localStorage.setItem(lk, JSON.stringify(store));
      } catch {
        /* localStorage full — skip persistence */
      }
    }
  }
}

function evictOldest(namespace) {
  const lk = localKey(namespace);
  try {
    const raw = localStorage.getItem(lk);
    if (!raw) return;
    const store = JSON.parse(raw);
    const keys = Object.keys(store);
    if (keys.length === 0) return;
    let oldest = keys[0];
    for (const k of keys) {
      if (store[k].ts < store[oldest].ts) oldest = k;
    }
    delete store[oldest];
    localStorage.setItem(lk, JSON.stringify(store));
  } catch {
    localStorage.removeItem(lk);
  }
}

/**
 * Return cached data if fresh, otherwise call fetchFn and cache the result.
 *
 * @param {string} namespace — cache namespace (e.g. 'census', 'crime')
 * @param {string} key       — cache key (e.g. 'new york|new york')
 * @param {number} ttlMs     — time-to-live in milliseconds
 * @param {() => Promise<any>} fetchFn — async function to call on miss
 */
export async function withCache(namespace, key, ttlMs, fetchFn) {
  if (!stores.has(namespace)) stores.set(namespace, new Map());
  const mem = stores.get(namespace);

  // 1. In-memory hit
  if (mem.has(key)) {
    const entry = mem.get(key);
    if (Date.now() - entry.ts < ttlMs) return entry.data;
    mem.delete(key);
  }

  // 2. localStorage hit
  const local = readLocal(namespace, key);
  if (local && Date.now() - local.ts < ttlMs) {
    mem.set(key, local);
    return local.data;
  }

  // 3. Fetch fresh
  const data = await fetchFn();

  if (data != null && !data.error) {
    const entry = { data, ts: Date.now() };
    mem.set(key, entry);
    writeLocal(namespace, key, data);
  }

  return data;
}
