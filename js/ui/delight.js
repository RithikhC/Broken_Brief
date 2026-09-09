/**
 * Delight — palettes, floating stickers and confetti.
 *
 * All of it is CSS-driven and dependency-free, so the app keeps its
 * personality with the network off. Nothing here is load-bearing: if any of
 * it failed, the product would still work exactly the same.
 */
import { $, h, mount, rng, pick } from '../lib/dom.js';
import { store } from '../lib/store.js';

/* ══════════════ palettes ══════════════ */

export const THEMES = [
  { id: 'peach',    emoji: '🍑', name: 'Peach',     meta: '#FFF7F1' },
  { id: 'matcha',   emoji: '🍵', name: 'Matcha',    meta: '#F5FAF1' },
  { id: 'lavender', emoji: '💜', name: 'Lavender',  meta: '#FAF6FF' },
  { id: 'midnight', emoji: '🌙', name: 'Midnight',  meta: '#14111C' },
];

export function currentTheme() {
  return store.get('theme', 'peach');
}

export function applyTheme(id) {
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  document.documentElement.dataset.theme = t.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.meta);
  store.set('theme', t.id);
  const btn = $('#themeBtn');
  if (btn) {
    btn.textContent = t.emoji;
    btn.title = `Palette: ${t.name} — tap for the next one`;
  }
  return t;
}

/** Cycle to the next palette. Returns the one we landed on. */
export function nextTheme() {
  const i = THEMES.findIndex(t => t.id === currentTheme());
  return applyTheme(THEMES[(i + 1) % THEMES.length].id);
}

/* ══════════════ floating stickers ══════════════ */

const STICKERS = ['🌷', '🧋', '🎞️', '🏺', '🍰', '🌿', '🌅', '📷', '🎨', '🕌', '🪴', '🛍️', '✨', '🍵'];

/** Scatter a few slow-drifting emoji behind the app. Seeded, so they don't
 *  jump around between renders. */
export function scatterStickers(n = 11) {
  const host = $('#stickers');
  if (!host) return;
  const r = rng('stickers-v1');
  const nodes = [];
  for (let i = 0; i < n; i++) {
    nodes.push(h('span.sticker', {
      style: {
        left: (r() * 96).toFixed(1) + '%',
        top: (r() * 92).toFixed(1) + '%',
        '--sz': (22 + r() * 30).toFixed(0) + 'px',
        '--dur': (7 + r() * 8).toFixed(1) + 's',
        '--del': (-r() * 8).toFixed(1) + 's',
        '--rot': (r() * 26 - 13).toFixed(0) + 'deg',
      },
      text: pick(STICKERS, r),
    }));
  }
  mount(host, nodes);
}

/* ══════════════ confetti ══════════════ */

const CONFETTI_EMOJI = ['✨', '🌸', '🎞️', '🧋', '🌅', '🏺', '💫'];

/**
 * A burst from a point (defaults to the middle-top of the viewport).
 * Pure CSS animation, cleaned up on its own timer.
 */
export function confetti({ x = innerWidth / 2, y = innerHeight * 0.32, count = 34, emoji = true } = {}) {
  const host = $('#confetti');
  if (!host) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const colors = ['--primary', '--k-dessert', '--k-photo', '--gold', '--k-activity', '--k-view'];
  const frag = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const useEmoji = emoji && i % 5 === 0;
    const bit = h('i', {
      style: {
        left: x + 'px',
        top: y + 'px',
        '--dx': ((Math.random() - 0.5) * innerWidth * 0.8).toFixed(0) + 'px',
        '--rz': (Math.random() * 900 - 450).toFixed(0) + 'deg',
        '--d': (1.5 + Math.random() * 1.6).toFixed(2) + 's',
        '--del': (Math.random() * 0.22).toFixed(2) + 's',
        '--w': useEmoji ? 'auto' : (5 + Math.random() * 7).toFixed(0) + 'px',
        '--h': useEmoji ? 'auto' : (8 + Math.random() * 12).toFixed(0) + 'px',
        '--br': Math.random() > 0.6 ? '50%' : '2px',
        '--c': useEmoji ? 'transparent' : `var(${colors[i % colors.length]})`,
        fontSize: useEmoji ? (14 + Math.random() * 10).toFixed(0) + 'px' : '',
        fontStyle: 'normal',
      },
      text: useEmoji ? CONFETTI_EMOJI[i % CONFETTI_EMOJI.length] : '',
    });
    frag.append(bit);
  }

  host.append(frag);
  setTimeout(() => {
    while (host.childElementCount > 240) host.firstElementChild.remove();
  }, 100);
  setTimeout(() => { host.replaceChildren(); }, 3600);
}

/** Burst centred on an element — used when a card is saved. */
export function burstFrom(el, opts = {}) {
  const b = el?.getBoundingClientRect?.();
  if (!b) return confetti(opts);
  confetti({ x: b.left + b.width / 2, y: b.top + b.height / 2, count: 18, ...opts });
}
