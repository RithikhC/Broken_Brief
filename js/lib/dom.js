/**
 * Tiny DOM helpers. No framework — the whole app has to boot from cache
 * with zero network, so there is nothing to download and nothing to build.
 */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Build an element tree. h('div.card', {onclick}, [child, 'text']) */
export function h(spec, props = {}, children = []) {
  const [tagPart, ...classes] = String(spec).split('.');
  const tag = tagPart || 'div';
  const el = document.createElement(tag);
  if (classes.length) el.className = classes.join(' ');

  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }

  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Replace all children of `el` with `nodes`. */
export function mount(el, ...nodes) {
  el.replaceChildren(...nodes.flat().filter(Boolean));
  return el;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ── formatting ───────────────────────────────────────────── */

export const money = n => 'AED ' + Math.round(n).toLocaleString('en-AE');

export function clock(mins) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${h24 < 12 ? 'am' : 'pm'}`;
}

export function dur(mins) {
  const m = Math.round(mins);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function ago(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  if (s < 90) return 'a minute ago';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} hr${hr > 1 ? 's' : ''} ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

/* ── misc ─────────────────────────────────────────────────── */

/** Deterministic hash → used to keep procedural art stable across reloads. */
export function hash(str) {
  let hsh = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hsh ^= str.charCodeAt(i);
    hsh = Math.imul(hsh, 16777619);
  }
  return hsh >>> 0;
}

/** Seeded PRNG (mulberry32) — same seed, same "randomness", every time. */
export function rng(seed) {
  let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function debounce(fn, ms = 220) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
