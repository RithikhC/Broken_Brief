/**
 * Plan a day — budget in, itinerary out.
 *
 * Everything here runs against the local dataset with the local solver, so a
 * full day can be planned, reshuffled and saved on a plane. The only thing the
 * network changes is whether friends can see it yet.
 */
import { h, mount, money, dur, clock, clamp } from '../lib/dom.js';
import { spots as ALL_SPOTS, areas, VIBES, KIND_LABEL, KIND_EMOJI, city } from '../data/spots.js';
import { buildPlan, alternativesFor } from '../core/planner.js';
import { cityNow, nowMins, DAY_NAMES } from '../core/clock.js';
import { cover } from '../lib/art.js';
import { legLabel, legIcon } from '../lib/geo.js';
import { state } from '../core/state.js';
import { net } from '../lib/net.js';
import { sync } from '../lib/sync.js';
import { toast } from '../ui/overlay.js';
import { openSpot } from '../ui/card.js';
import { makePoster } from '../ui/poster.js';
import { confetti, burstFrom } from '../ui/delight.js';

let opts = null;
let plan = null;
let outHost = null;

function defaults() {
  const now = nowMins();
  const start = clamp(Math.ceil(Math.max(now + 30, 9 * 60) / 30) * 30, 8 * 60, 18 * 60);
  return {
    budget: 300,
    start,
    end: clamp(start + 10 * 60, start + 4 * 60, 22 * 60 + 30),
    pace: 'balanced',
    vibes: state.me?.vibes?.slice(0, 3) || ['soft', 'film'],
    dayOffset: 0,
    fromArea: '',
    indoorOnly: false,
    locked: [],
    exclude: [],
  };
}

export function renderPlan(host, preset) {
  if (!opts) opts = defaults();
  if (preset) {
    opts.locked = [preset.id];
    opts.exclude = [];
    if (preset.vibes?.length) opts.vibes = [...new Set([...opts.vibes, preset.vibes[0]])].slice(0, 4);
  }

  outHost = h('div');
  mount(host, h('div.plan', {}, [panel(), outHost]));

  if (plan && !preset) paintPlan();
  else if (preset) generate();
  else paintEmpty();
}

/* ══════════════ control panel ══════════════ */

function panel() {
  const budgetVal = h('div.budget__val', {}, [
    h('span', { id: 'bVal', text: money(opts.budget) }),
    h('small', { text: '/ person' }),
  ]);

  const budget = h('input.range', {
    type: 'range', min: '50', max: '1200', step: '10', value: String(opts.budget),
    oninput: ev => {
      opts.budget = +ev.target.value;
      document.getElementById('bVal').textContent = money(opts.budget);
      document.getElementById('bHint').textContent = budgetHint(opts.budget);
      if (plan) generate({ quiet: true });
    },
  });

  const timeSel = (key) => h('select.select', {
    onchange: ev => {
      opts[key] = +ev.target.value;
      if (opts.end <= opts.start + 120) opts.end = Math.min(opts.start + 180, 24 * 60 - 30);
    },
  }, halfHours().map(m => h('option', { value: String(m), selected: opts[key] === m }, [clock(m)])));

  const daySel = h('select.select', {
    onchange: ev => { opts.dayOffset = +ev.target.value; },
  }, [0, 1, 2, 3, 4, 5, 6].map(off => {
    const d = cityNow(); d.setDate(d.getDate() + off);
    const label = off === 0 ? 'Today' : off === 1 ? 'Tomorrow' : `${DAY_NAMES[d.getDay()]} ${d.getDate()}`;
    return h('option', { value: String(off), selected: opts.dayOffset === off }, [label]);
  }));

  const fromSel = h('select.select', {
    onchange: ev => { opts.fromArea = ev.target.value; },
  }, [h('option', { value: '' }, ['Anywhere in the city']),
      ...areas.map(a => h('option', { value: a, selected: opts.fromArea === a }, [a]))]);

  const paceRow = h('div.chips', {}, ['chill', 'balanced', 'packed'].map(p =>
    h('button.pill' + (opts.pace === p ? ' is-on' : ''), {
      onclick: ev => {
        opts.pace = p;
        [...paceRow.children].forEach((c, i) => c.classList.toggle('is-on', ['chill', 'balanced', 'packed'][i] === p));
      },
      text: { chill: '🐌 Chill', balanced: '🍃 Balanced', packed: '⚡ Packed' }[p],
    })));

  const vibeRow = h('div.chips', {}, VIBES.map(v =>
    h('button.pill' + (opts.vibes.includes(v.id) ? ' is-on' : ''), {
      onclick: ev => {
        const i = opts.vibes.indexOf(v.id);
        if (i >= 0) opts.vibes.splice(i, 1);
        else if (opts.vibes.length < 4) opts.vibes.push(v.id);
        else return toast('Four vibes is plenty — unpick one first', { tone: 'mute' });
        ev.currentTarget.classList.toggle('is-on');
      },
      text: `${v.emoji} ${v.label}`,
    })));

  const indoor = h('button.switch' + (opts.indoorOnly ? ' is-on' : ''), {
    role: 'switch', 'aria-checked': String(opts.indoorOnly),
    onclick: ev => {
      opts.indoorOnly = !opts.indoorOnly;
      ev.currentTarget.classList.toggle('is-on', opts.indoorOnly);
      ev.currentTarget.setAttribute('aria-checked', String(opts.indoorOnly));
    },
  });

  return h('aside.panel', {}, [
    h('h2', { text: 'Build me a day' }),
    h('p.panel__sub', { text: 'Budget, hours, mood. The rest is maths.' }),

    h('div.field', {}, [
      h('div.budget__row', {}, [h('span.field__label', { style: { marginBottom: '0' }, text: 'Budget' }), budgetVal]),
      budget,
      h('div.budget__hint', { id: 'bHint', text: budgetHint(opts.budget) }),
    ]),

    h('div.field', {}, [
      h('label.field__label', { text: 'When' }),
      h('div.u-row', {}, [daySel]),
      h('div.u-row', { style: { marginTop: '8px' } }, [timeSel('start'), h('span.u-mut', { text: '→' }), timeSel('end')]),
    ]),

    h('div.field', {}, [h('label.field__label', { text: 'Pace' }), paceRow]),
    h('div.field', {}, [h('label.field__label', { text: 'Mood — pick up to 4' }), vibeRow]),
    h('div.field', {}, [h('label.field__label', { text: 'Starting from' }), fromSel]),

    h('div.row-tog', {}, [
      h('div', {}, [
        h('div.row-tog__t', { text: 'Indoors mostly' }),
        h('div.row-tog__s', { text: '40°C outside, or raining. Prefers air-conditioned stops.' }),
      ]),
      indoor,
    ]),

    h('button.btn.btn--primary.btn--block', { style: { marginTop: '18px' }, onclick: () => generate(), text: '✧  Make my day' }),
    h('p.u-sm.u-mut', { style: { marginTop: '10px', textAlign: 'center' }, text: 'Runs entirely on this device — no signal needed.' }),
  ]);
}

const halfHours = () => Array.from({ length: 33 }, (_, i) => 6 * 60 + i * 30);

function budgetHint(b) {
  if (b < 120) return 'Tight — expect free spots, street food and a lot of walking.';
  if (b < 260) return 'Comfortable: coffee, a proper meal and one paid thing.';
  if (b < 500) return 'Roomy — a workshop, food, dessert and taxis between.';
  return 'Generous. You can book the pottery wheel and still eat well.';
}

/* ══════════════ generate ══════════════ */

function generate({ quiet = false } = {}) {
  const date = cityNow();
  date.setDate(date.getDate() + opts.dayOffset);

  const from = opts.fromArea ? ALL_SPOTS.find(s => s.area === opts.fromArea) : null;

  const t0 = performance.now();
  plan = buildPlan({
    budget: opts.budget,
    start: opts.start,
    end: opts.end,
    vibes: opts.vibes,
    pace: opts.pace,
    date,
    from: from ? { lat: from.lat, lng: from.lng, area: from.area } : null,
    indoorOnly: opts.indoorOnly,
    lockedIds: opts.locked,
    excludeIds: opts.exclude,
    seed: Date.now(),
  });
  plan.ms = performance.now() - t0;

  paintPlan();
  if (!quiet) {
    if (plan.ok) confetti({ y: innerHeight * 0.28, count: 40 });
    toast(plan.ok
      ? `Built a ${plan.stops.length}-stop day in ${plan.ms.toFixed(0)}ms — offline.`
      : 'Could not fit a day into those constraints', { tone: plan.ok ? 'warm' : 'mute', icon: plan.ok ? '✧' : '' });
  }
  outHost.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
}

function paintEmpty() {
  mount(outHost, h('div.empty', {}, [
    h('div.empty__ico', { text: '✧' }),
    h('h3', { text: 'Tell me the budget, I’ll tell you the day' }),
    h('p', { text: 'Daydream picks stops that fit your money and your hours, orders them so you’re not crossing the city twice, and drops the photo stop into golden hour on purpose.' }),
    h('button.btn.btn--primary', { onclick: () => generate(), text: '✧  Make my day' }),
  ]));
}

/* ══════════════ itinerary ══════════════ */

function paintPlan() {
  if (!plan?.ok || !plan.stops.length) return paintEmpty();

  const T = plan.totals;
  const date = plan.opts.date;
  const dateLabel = opts.dayOffset === 0 ? 'today' : opts.dayOffset === 1 ? 'tomorrow' : DAY_NAMES[date.getDay()];

  mount(outHost,
    h('div.itin__head', {}, [
      h('div', {}, [
        h('h2.itin__title', { text: `${plan.stops.length} stops, ${dur(plan.stops[plan.stops.length - 1].depart - plan.stops[0].arrive)} of ${dateLabel}` }),
        h('p.itin__sub', { text: `${clock(plan.stops[0].arrive)} → ${clock(plan.stops[plan.stops.length - 1].depart)} · ${plan.opts.vibes.map(v => VIBES.find(x => x.id === v)?.label).filter(Boolean).join(' · ') || 'anything goes'}` }),
      ]),
      h('div.u-row', {}, [
        h('button.btn.btn--ghost.btn--sm', { onclick: () => { opts.exclude = []; opts.locked = plan.stops.filter(s => s.locked).map(s => s.spot.id); generate(); }, text: '🎲  Shuffle' }),
        h('button.btn.btn--ink.btn--sm', { onclick: savePlan, text: '❤  Save day' }),
      ]),
    ]),

    budgetMeter(T),
    dayRibbon(plan),

    ...plan.warnings.slice(0, 2).map(w =>
      h('div.gold', {}, [h('span.gold__sun', { text: '⚠️' }), h('span', { html: w })])),

    plan.notes?.length ? h('details.notes', {}, [
      h('summary', { text: `✦ ${plan.notes.length} adjustment${plan.notes.length > 1 ? 's' : ''} the planner made — tap to see the working` }),
      h('ul', {}, plan.notes.map(n => h('li', { html: n }))),
    ]) : null,

    h('div.tl', {}, plan.stops.flatMap((st, i) => [
      st.leg && st.leg.mins > 0 ? h('div.leg', {}, [
        h('span.leg__ico', { text: legIcon(st.leg) }),
        h('span', { text: `${legLabel(st.leg)} · ${st.leg.km.toFixed(1)} km` }),
      ]) : null,
      st.gapBefore ? h('div.leg', {}, [
        h('span.leg__ico', { text: '⌛' }),
        h('span', { text: `${dur(st.gapBefore)} spare — nothing scheduled, wander or sit somewhere` }),
      ]) : null,
      stopCard(st, i),
    ])),

    h('div.u-row.u-wrap', { style: { marginTop: '10px' } }, [
      h('button.btn.btn--primary', { onclick: () => makePoster(plan), text: '🖼  Make a poster' }),
      h('button.btn.btn--ghost', { onclick: sharePlan, text: '📣  Tell everyone nearby' }),
      h('button.btn.btn--ghost', { onclick: saveAllSpots, text: '❤  Save all stops' }),
    ]),
    h('p.u-sm.u-mut', { style: { marginTop: '12px' } , text: `Solved locally in ${plan.ms?.toFixed(1) ?? '—'}ms across ${ALL_SPOTS.length} cached spots. Sunset ${clock(plan.sun.sunset)}.` }),
  );
}

function budgetMeter(T) {
  const cap = Math.max(T.budget, T.total);
  const seg = (v, color, label) => ({ v, color, label });
  const segs = [
    seg(T.doing, 'var(--matcha)', 'doing things'),
    seg(T.food, 'var(--terracotta)', 'food & coffee'),
    seg(T.travel, 'var(--sky)', 'getting around'),
    seg(Math.max(0, T.left), 'var(--paper-2)', 'left over'),
  ];

  return h('div.meter', {}, [
    h('div.u-spread', {}, [
      h('div.u-serif', { style: { fontSize: '19px' }, text: `${money(T.total)} of ${money(T.budget)}` }),
      h('div.u-sm', {
        style: { color: T.left < 0 ? 'var(--err)' : 'var(--ok)', fontWeight: '650' },
        text: T.left < 0 ? `${money(-T.left)} over budget` : `${money(T.left)} still in your pocket`,
      }),
    ]),
    h('div.meter__bar', {}, segs.map(s =>
      h('div.meter__seg', { style: { width: `${Math.max(0, (s.v / cap) * 100)}%`, background: s.color } }))),
    h('div.meter__legend', {}, segs.map(s => h('span.meter__key', {}, [
      h('span.meter__sw', { style: { background: s.color } }),
      h('span', { text: `${s.label} · ${money(s.v)}` }),
    ]))),
  ]);
}

/** The light ribbon: where each stop sits against the sun. */
function dayRibbon(plan) {
  const first = plan.stops[0].arrive, last = plan.stops[plan.stops.length - 1].depart;
  const lo = Math.min(first, plan.sun.sunrise) - 30;
  const hi = Math.max(last, plan.sun.sunset + 60) + 30;
  const pct = m => ((m - lo) / (hi - lo)) * 100;
  const g = plan.sun.goldenPM;

  return h('div.daybar', {}, [
    h('div.daybar__track', {}, [
      h('div.daybar__gold', { style: { left: pct(g[0]) + '%', width: (pct(g[1]) - pct(g[0])) + '%' } }),
      ...plan.stops.map(st => h('div.daybar__pin', {
        style: { left: pct(st.arrive) + '%' },
        title: `${st.spot.name} · ${clock(st.arrive)}`,
      }, [h('span', { text: KIND_EMOJI[st.spot.kind] || '' })])),
    ]),
    h('div.daybar__labels', {}, [
      h('span', { text: clock(lo) }),
      h('span', { text: `🌅 golden ${clock(g[0])}–${clock(g[1])}` }),
      h('span', { text: clock(hi) }),
    ]),
  ]);
}

function stopCard(st, i) {
  const s = st.spot;
  const el = h('div.stop.stop--' + s.kind + (st.locked ? ' is-locked' : ''), { style: { animationDelay: `${i * 60}ms` } }, [
    h('div.stop__num', { text: String(i + 1) }),
    h('div.stop__in', {}, [
      h('div.stop__art', {}, [cover(s, { ratio: 1 })]),
      h('div.stop__main', {}, [
        h('div.stop__time', { text: `${clock(st.arrive)} – ${clock(st.depart)} · ${dur(st.dwell)}` }),
        h('h3.stop__name', { text: `${KIND_EMOJI[s.kind] || ''} ${s.name}` }),
        h('div.stop__meta', {}, [
          h('span.tag.tag--' + s.kind, { text: KIND_LABEL[s.kind] }),
          h('span', { text: s.area }),
          st.light ? h('span.tag' + (st.light.key === 'golden' ? '.tag--warn' : ''), { text: `${st.light.icon} ${st.light.label}` }) : null,
          st.lingered ? h('span.tag', { text: `☕ linger +${dur(st.lingered)}` }) : null,
          st.closed ? h('span.tag.tag--warn', { text: '⚠ closed at this time' }) : null,
          s.book ? h('span.tag', { text: '📞 book ahead' }) : null,
        ]),
        h('div.stop__why', { text: st.why }),
      ]),
      h('div.stop__cost', {}, [
        h('span', { text: st.cost === 0 ? 'Free' : money(st.cost) }),
        h('small', { text: st.travelCost ? `+${money(st.travelCost)} taxi` : 'no fare' }),
      ]),
    ]),
    h('div.stop__acts', {}, [
      h('button.btn.btn--ghost.btn--sm', { onclick: () => swap(i), text: '↺ Swap' }),
      h('button.btn.btn--ghost.btn--sm', {
        onclick: ev => {
          const on = toggleLock(s.id);
          ev.currentTarget.textContent = on ? '🔒 Locked' : '🔓 Lock';
          el.classList.toggle('is-locked', on);
        },
        text: st.locked ? '🔒 Locked' : '🔓 Lock',
      }),
      h('button.btn.btn--ghost.btn--sm', { onclick: () => openSpot(s), text: 'Details' }),
      h('button.btn.btn--ghost.btn--sm', {
        onclick: ev => {
          const on = state.toggleSave(s);
          ev.currentTarget.textContent = on ? '❤ Saved' : '♡ Save';
        },
        text: state.isSaved(s.id) ? '❤ Saved' : '♡ Save',
      }),
    ]),
  ]);
  return el;
}

function swap(i) {
  const st = plan.stops[i];
  const alts = alternativesFor(plan, i);
  if (!alts.length) return toast('Nothing else fits that slot today', { tone: 'mute' });

  opts.exclude = [...new Set([...opts.exclude, st.spot.id])];
  opts.locked = plan.stops.filter((x, k) => k !== i).map(x => x.spot.id);
  generate({ quiet: true });
  toast(`Swapped out <b>${st.spot.name}</b>`, { icon: '↺' });
}

function toggleLock(id) {
  const i = opts.locked.indexOf(id);
  if (i >= 0) { opts.locked.splice(i, 1); return false; }
  opts.locked.push(id);
  return true;
}

/* ══════════════ actions ══════════════ */

function savePlan() {
  if (!plan?.ok) return;
  const title = `${plan.stops[0].spot.area} day · ${money(plan.totals.total)}`;
  state.savePlan(plan, title);
  confetti({ y: innerHeight * 0.3, count: 28 });
  toast(net.online ? `Saved <b>${title}</b> to your days` : `Saved locally — syncs when you're back`, { tone: 'warm', icon: '❤' });
}

function saveAllSpots() {
  let n = 0;
  plan.stops.forEach(st => { if (!state.isSaved(st.spot.id)) { state.toggleSave(st.spot); n++; } });
  toast(n ? `Saved ${n} spots to <b>Want to go</b>` : 'All of these were already saved', { tone: 'warm', icon: '❤' });
}

function sharePlan() {
  const st = plan.stops.find(s => s.light?.key === 'golden') || plan.stops[0];
  sync.ping({ spotId: st.spot.id, note: `planning a ${plan.stops.length}-stop day around here — ${money(plan.totals.total)} all in` });
  toast(net.online ? 'Everyone nearby can see your day ✨' : 'Queued — it will send itself when you have signal', { tone: net.online ? 'warm' : 'mute' });
}

export function planWith(spot) {
  renderPlan(document.getElementById('view'), spot);
}
