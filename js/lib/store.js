/**
 * Durable local store.
 *
 * The brief said, twice, that the app must not "lose its stuff". So:
 *   1. IndexedDB is the primary store (survives reloads, big, async).
 *   2. Every write is mirrored to localStorage, so a browser that blocks or
 *      wipes IDB (private windows, file://, quota eviction) still recovers.
 *   3. Everything is also held in memory, so reads are synchronous and the
 *      first paint never waits on a disk round-trip.
 *
 * Records are envelopes: { v: value, at: timestamp }. The timestamp is what
 * makes last-write-wins merging possible when an offline device reconnects.
 */

const DB_NAME = 'daydream';
const DB_VER = 1;
const LS_PREFIX = 'dd:';

class Store {
  #mem = new Map();
  #idb = null;
  #mode = 'memory';

  get mode() { return this.#mode; }

  async init() {
    // 1 ─ try IndexedDB
    try {
      this.#idb = await this.#openIDB();
      const rows = await this.#allIDB();
      for (const row of rows) this.#mem.set(row.k, row.rec);
      this.#mode = 'indexeddb';
    } catch (err) {
      console.warn('[store] IndexedDB unavailable, falling back to localStorage:', err?.message);
    }

    // 2 ─ fold in anything localStorage knows that IDB doesn't (or knows fresher)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(LS_PREFIX)) continue;
        const k = key.slice(LS_PREFIX.length);
        const rec = JSON.parse(localStorage.getItem(key));
        const cur = this.#mem.get(k);
        if (!cur || (rec?.at ?? 0) > (cur.at ?? 0)) this.#mem.set(k, rec);
      }
      if (this.#mode === 'memory') this.#mode = 'localstorage';
    } catch { /* storage disabled entirely — memory-only, still usable */ }

    return this;
  }

  /* ── sync reads ── */
  get(key, fallback = null) {
    const rec = this.#mem.get(key);
    return rec === undefined || rec === null ? fallback : structuredCloneSafe(rec.v);
  }

  stamp(key) { return this.#mem.get(key)?.at ?? 0; }

  has(key) { return this.#mem.has(key); }

  keys(prefix = '') { return [...this.#mem.keys()].filter(k => k.startsWith(prefix)); }

  /* ── writes (sync in memory, async to disk) ── */
  set(key, value, at = Date.now()) {
    const rec = { v: value, at };
    this.#mem.set(key, rec);
    this.#persist(key, rec);
    return value;
  }

  /** Last-write-wins: only applies if the incoming record is newer. */
  merge(key, value, at) {
    if (at <= this.stamp(key)) return false;
    this.set(key, value, at);
    return true;
  }

  del(key) {
    this.#mem.delete(key);
    try { localStorage.removeItem(LS_PREFIX + key); } catch {}
    if (this.#idb) {
      try { this.#tx('readwrite').delete(key); } catch {}
    }
  }

  /** Everything under a namespace, for export / device transfer. */
  dump(prefix = '') {
    const out = {};
    for (const [k, rec] of this.#mem) if (k.startsWith(prefix)) out[k] = rec;
    return out;
  }

  /** Merge a dump back in (used by the transfer code). */
  restore(dump) {
    let n = 0;
    for (const [k, rec] of Object.entries(dump || {})) {
      if (!rec || typeof rec !== 'object') continue;
      if (this.merge(k, rec.v, rec.at ?? Date.now())) n++;
    }
    return n;
  }

  /* ── internals ── */
  #persist(key, rec) {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(rec)); } catch {}
    if (!this.#idb) return;
    try { this.#tx('readwrite').put({ k: key, rec }); } catch (err) {
      console.warn('[store] idb write failed', err?.message);
    }
  }

  #tx(mode) { return this.#idb.transaction('kv', mode).objectStore('kv'); }

  #openIDB() {
    return new Promise((res, rej) => {
      if (!('indexedDB' in globalThis)) return rej(new Error('no indexedDB'));
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'k' });
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error || new Error('idb open failed'));
      setTimeout(() => rej(new Error('idb timeout')), 2500);
    });
  }

  #allIDB() {
    return new Promise((res, rej) => {
      const req = this.#tx('readonly').getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  }
}

function structuredCloneSafe(v) {
  if (v === null || typeof v !== 'object') return v;
  try { return structuredClone(v); } catch { return JSON.parse(JSON.stringify(v)); }
}

export const store = new Store();
