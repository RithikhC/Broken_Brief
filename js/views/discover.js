/**
 * Discover — "someone opens the app and it just shows them cool stuff
 * happening around them right now".
 *
 * Ranking is time-aware, not alphabetical: what's open, what's on today, and
 * what's about to be in beautiful light floats to the top. All computed from
 * the local cache, so it's identical with the network off.
 */
import { h, mount, clock, dur, rng } from '../lib/dom.js';
import { spots as ALL_SPOTS, VIBES, KIND_LABEL, city } from '../data/spots.js';
import { isOpenNow, goldenIn, sunToday, nowMins } from '../core/clock.js';
import { state } from '../core/state.js';
import { sync } from '../lib/sync.js';

import { spotCard } from '../ui/card.js';
import { toast } from '../ui/overlay.js';

const FILTERS = [
  { id: 'all',     label: 'Everything' },
  { id: 'now',     label: '◉ Happening now' },
  { id: 'golden',  label: '🌅 Golden hour soon' },
  { id: 'cafe',    label: '☕ Cafés' },
  { id: 'photo',   label: '🎞️ Photo spots' },
  { id: 'activity',label: '🏺 Make something' },
  { id: 'dessert', label: '🍰 Sweet' },
  { id: 'art',     label: '🎨 Art' },
  { id: 'nature',  label: '🌿 Green' },
  { id: 'free',    label: '🪙 Free' },
];

let filter = 'all';
let query = '';
let moods = new Set();

export function renderDiscover(host) {
  moods = new Set(state.me?.vibes || []);
  const grid = h('div.masonry');

  const rail = h('div.rail.rail--sticky', {}, FILTERS.map(f =>
    h('button.pill' + (f.id === filter ? ' is-on' : ''), {
      dataset: { f: f.id },
      onclick: ev => {
        filter = f.id;
        [...rail.children].forEach(c => c.classList.toggle('is-on', c.dataset.f === filter));
        paint(grid);
      },
      text: f.label,
    })));

  const search = h('input.input', {
    placeholder: `search ${ALL_SPOTS.length} spots — “pottery”, “creek”, “free”…`,
    style: { maxWidth: '320px' },
    oninput: ev => { query = ev.target.value.toLowerCase(); paint(grid); },
  });

  mount(host,
    hero(),
    moodRow(grid),
    h('div.sec.sec--row', {}, [
      h('div', {}, [
        h('h2.sec__title', { text: filterTitle() }),
        h('p.sec__sub', { id: 'discSub', text: '' }),
      ]),
      search,
    ]),
    rail,
    grid,
  );

  paint(grid);
}

/* ── hero ─────────────────────────────────────────────────── */

function hero() {
  const t = nowMins();
  const sun = sunToday();
  const name = state.me?.handle ? `, ${state.me.handle}` : '';
  const greet = t < 300 ? `Late one${name}` : t < 720 ? `Morning${name}`
    : t < 1020 ? `Afternoon${name}` : t < 1290 ? `Evening${name}` : `Late one${name}`;

  const lightLine =
    t < sun.sunrise      ? `Sunrise at <b>${clock(sun.sunrise)}</b>, ${dur(sun.sunrise - t)} away — the old town is empty at that hour.`
  : t < sun.goldenAM[1]  ? `You're in the morning gold. It holds until <b>${clock(sun.goldenAM[1])}</b>.`
  : t < sun.goldenPM[0]  ? `Golden hour starts at <b>${clock(sun.goldenPM[0])}</b> — that's ${dur(sun.goldenPM[0] - t)} from now.`
  : t < sun.sunset       ? `You're in golden hour. Sunset at <b>${clock(sun.sunset)}</b>, in ${dur(sun.sunset - t)}.`
  : t < sun.bluePM[1]    ? `Sun's down. Blue hour until <b>${clock(sun.bluePM[1])}</b> — best light for the creek.`
  :                        `Dark out. Sunrise comes back around <b>${clock(sun.sunrise)}</b>.`;

  return h('div.hero', {}, [
    h('div.hero__deco', { html: deco() }),
    h('h1', { text: `${greet} — here's what's good right now.` }),
    h('p', { html: `${city.name} · ${clock(nowMins())} local. ${lightLine}` }),
    h('div.hero__row', {}, [
      h('button.btn.btn--primary', {
        onclick: () => document.dispatchEvent(new CustomEvent('dd:nav', { detail: 'plan' })),
        text: '✧  Plan my whole day',
      }),
      h('button.btn.btn--ghost', { onclick: surprise, text: '🎲  Surprise me' }),
    ]),
    h('div.hero__row', { style: { marginTop: '14px', gap: '18px' } }, [
      stat(ALL_SPOTS.length, 'spots cached on this device'),
      stat(ALL_SPOTS.filter(s => isOpenNow(s)).length, 'open right now'),
      stat(ALL_SPOTS.filter(s => s.cost === 0).length, 'completely free'),
    ]),
  ]);
}

const stat = (n, label) => h('span.hero__stat', {}, [h('b', { text: String(n) }), h('span', { text: label })]);

function deco() {
  return `<svg width="220" height="200" viewBox="0 0 220 200" fill="none">
    <circle cx="150" cy="60" r="46" fill="#fff" opacity=".45"/>
    <circle cx="150" cy="60" r="66" stroke="#fff" stroke-opacity=".35" fill="none"/>
    <circle cx="150" cy="60" r="88" stroke="#fff" stroke-opacity=".22" fill="none"/>
    <path d="M60 190 Q110 150 170 186" stroke="#C4694A" stroke-opacity=".18" stroke-width="3" fill="none"/>
  </svg>`;
}

/* ── mood row ─────────────────────────────────────────────── */

function moodRow(grid) {
  const wrap = h('div.mood');
  VIBES.slice(0, 6).forEach(v => {
    const b = h('button.mood__b' + (moods.has(v.id) ? ' is-on' : ''), {
      onclick: () => {
        moods.has(v.id) ? moods.delete(v.id) : moods.add(v.id);
        b.classList.toggle('is-on');
        paint(grid);
      },
    }, [
      h('div.mood__e', { text: v.emoji }),
      h('div.mood__t', { text: v.label }),
      h('div.mood__s', { text: v.sub }),
    ]);
    wrap.append(b);
  });
  return wrap;
}

/* ── ranking + paint ──────────────────────────────────────── */

function filterTitle() {
  return {
    all: 'Around you right now',
    now: 'Happening at this exact moment',
    golden: 'Get there before the light goes',
    free: "Costs nothing at all",
  }[filter] || `${KIND_LABEL[filter] ? KIND_LABEL[filter][0].toUpperCase() + KIND_LABEL[filter].slice(1) : 'Spots'} near you`;
}

function rank(spot, sun, t, jitter) {
  let s = 0;
  const open = isOpenNow(spot, t);
  const gold = goldenIn(spot, sun, t);

  if (open) s += 2.2;
  if (spot.isEvent && open) s += 3.4;
  if (gold !== null && gold <= 120) s += 2.6 - (gold / 120) * 1.4;
  s += spot.photo / 4;
  if (moods.size) s += spot.vibes.filter(v => moods.has(v)).length * 1.9;
  if (sync.feed.some(f => f.spotId === spot.id && Date.now() - f.at < 45 * 60000)) s += 1.5;
  if (state.isSaved(spot.id)) s -= 0.9;
  return s + jitter(spot.id);
}

function paint(grid) {
  const t = nowMins();
  const sun = sunToday();
  // Seeded per spot AND per 15-minute bucket: the order stays put while you
  // browse (repaints don't reshuffle the grid) but the feed feels fresh later.
  const bucket = Math.floor(Date.now() / 900000);
  const jitter = id => rng(`${id}|${bucket}`)() * 0.8;

  let list = ALL_SPOTS.filter(s => {
    if (query) {
      const hay = `${s.name} ${s.area} ${s.kind} ${s.tags.join(' ')} ${s.blurb} ${s.vibes.join(' ')}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    if (filter === 'all') return true;
    if (filter === 'now') return isOpenNow(s, t) && (s.isEvent || s.hours.to - s.hours.from < 600);
    if (filter === 'golden') { const g = goldenIn(s, sun, t); return g !== null && g <= 180; }
    if (filter === 'free') return s.cost === 0;
    return s.kind === filter;
  });

  list.sort((a, b) => rank(b, sun, t, jitter) - rank(a, sun, t, jitter));

  const sub = document.getElementById('discSub');
  if (sub) {
    sub.innerHTML = list.length
      ? `${list.length} places · ranked by what's open, what's on, and where the light is about to be good.`
      : 'Nothing matches that — try clearing a filter.';
  }

  mount(grid, list.length
    ? list.map((s, i) => {
        const c = spotCard(s);
        c.style.animationDelay = Math.min(i * 22, 420) + 'ms';
        return c;
      })
    : [emptyState(sun, t)]);
}

/**
 * An empty grid should say *why* it's empty. At 1am "golden hour soon" is
 * correctly empty — that's an answer, not a failure, so tell the user the time
 * to come back instead of showing them a shrug.
 */
function emptyState(sun, t) {
  const box = (ico, title, body, action) => h('div.empty', {}, [
    h('div.empty__ico', { text: ico }),
    h('h3', { text: title }),
    h('p', { text: body }),
    action,
  ]);
  const clearBtn = h('button.btn.btn--primary', {
    onclick: () => {
      filter = 'all'; query = ''; moods.clear();
      document.dispatchEvent(new CustomEvent('dd:nav', { detail: 'discover' }));
    },
    text: '✿  Show me everything',
  });

  if (query) {
    return box('🔍', `Nothing matches “${query}”`,
      'All 46 spots are cached on this device, so this isn’t a connection problem — just try a different word.', clearBtn);
  }
  if (filter === 'golden') {
    const mins = Math.round(sun.goldenPM[0] - t);
    return box('🌅', 'The light isn’t ready yet',
      mins > 0
        ? `Golden hour starts at ${clock(sun.goldenPM[0])} — that's ${dur(mins)} away. Come back then, or plan a day that lands in it.`
        : `Golden hour finished at ${clock(sun.goldenPM[1])} today. Tomorrow's starts around ${clock(sun.goldenPM[0])}.`,
      h('button.btn.btn--primary', {
        onclick: () => document.dispatchEvent(new CustomEvent('dd:nav', { detail: 'plan' })),
        text: '✧  Plan a day around golden hour',
      }));
  }
  if (filter === 'now') {
    return box('🌙', 'Quiet hour in the city',
      `It's ${clock(t)} — most of the time-limited things have finished for the night. The always-open spots are still there.`, clearBtn);
  }
  return box('🍃', 'Nothing matches that mood right now',
    'Try a different mood or clear the filters — everything is cached locally, so nothing is missing because of signal.', clearBtn);
}

function surprise() {
  const t = nowMins();
  const open = ALL_SPOTS.filter(s => isOpenNow(s, t));
  const pool = open.length ? open : ALL_SPOTS;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  import('../ui/card.js').then(m => m.openSpot(pick));
  toast(`How about <b>${pick.name}</b>?`, { icon: '🎲' });
}

/**
 * A friend found something while you're looking at the grid. Don't re-render
 * 46 cards and throw away the user's scroll — just light up the one card.
 */
export function discoverLiveUpdate(ping) {
  if (!ping?.spotId) return;
  const card = document.querySelector(`.card[data-spot="${CSS.escape(ping.spotId)}"]`);
  if (!card) return;

  const strip = h('div.card__ping', {}, [
    h('span', { text: ping.from.emoji }),
    h('span', { html: `<em>${ping.from.handle}</em> · just now` }),
  ]);
  const old = card.querySelector('.card__ping');
  old ? old.replaceWith(strip) : card.append(strip);

  card.animate?.(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }],
    { duration: 520, easing: 'cubic-bezier(.34,1.42,.5,1)' });
}
