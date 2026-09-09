/**
 * The day planner.
 *
 * The client asked to "specify a budget for the day and it gives you a plan
 * for it". A filtered list isn't a plan — so this is an actual constrained
 * scheduler. It reasons about:
 *
 *   • money   — per-stop cost AND taxi fares, with budget held in reserve for
 *               stops not yet chosen, then repaired if the day busts anyway
 *   • time    — opening hours, day-of-week, dwell times, travel between stops
 *   • light   — the photo-first stop is anchored INTO golden hour and the rest
 *               of the day is scheduled backwards and forwards around it
 *   • taste   — vibe overlap, variety (no two of the same kind back to back)
 *   • place   — nearest-neighbour ordering so you're not crossing town twice
 *
 * Pipeline: pick beats → fill beats → order around the light → lay on a clock
 * → repair (closed, then money, then time). It runs in ~2ms on-device, which
 * is the point: planning has to work with the radio off.
 */
import { rng, clamp } from '../lib/dom.js';
import { leg } from '../lib/geo.js';
import { sunTimes } from '../lib/sun.js';
import { city, spots as ALL_SPOTS } from '../data/spots.js';

const PACE_MINS = { chill: 150, balanced: 112, packed: 88 };
const PACE_STOPS = { chill: [3, 5], balanced: [4, 7], packed: [5, 8] };
const MIN_STOPS = 2;
const MAX_STOPS = 8;
const MIN_DWELL = 25;

/* ────────────────────────── helpers ────────────────────────── */

/** Is `spot` open for the whole of [t, t+need] on weekday `day`? */
function openAt(spot, day, t, need = 0) {
  const hrs = spot.hours;
  if (!hrs.days.includes(day)) return false;
  return t >= hrs.from && t + need <= Math.min(hrs.to, 1440);
}

/** Any chance of visiting this spot at all inside the window today? */
function openSomeTimeIn(spot, day, from, to) {
  if (!spot.hours.days.includes(day)) return false;
  return Math.min(spot.hours.to, to) - Math.max(spot.hours.from, from) >= Math.min(spot.mins, MIN_DWELL);
}

/* ────────────────────────── beats ────────────────────────── */
/**
 * A "beat" is a slot in the shape of a day: the coffee one, the make-something
 * one, the golden-hour one. Beats come from the time window + the chosen vibes;
 * each is then filled with the best spot that fits the remaining money and time.
 */
function beatsFor({ start, end, vibes, pace, indoorOnly }, sun) {
  const V = new Set(vibes);
  const spans = (a, b) => start < b && end > a;
  const goldenReachable = end > sun.goldenPM[0] + 10 && start < sun.goldenPM[1];

  // Every beat carries the window of the day it belongs to, clipped to the
  // user's hours. Candidates must actually be open in that window — otherwise
  // a Thursday-night market ends up filling the 10am "wander" slot and drags
  // the entire itinerary into the evening.
  const win = (a, b) => [Math.max(start, a), Math.min(end, b)];

  const menu = [
    { key: 'coffee',  label: 'slow start',      kinds: ['cafe'],                    win: win(start, 12 * 60),                            w: spans(0, 12 * 60) ? 5 : 2.2 },
    { key: 'make',    label: 'make something',  kinds: ['activity'],                win: win(10 * 60, 20 * 60),                          w: V.has('hands') ? 6 : 3.1 },
    { key: 'wander',  label: 'wander + look',   kinds: ['art', 'market', 'photo'],  win: win(9 * 60, 18 * 60),                           w: 4.2 },
    { key: 'lunch',   label: 'proper food',     kinds: ['cafe'], cheap: true,       win: win(11.5 * 60, 15.5 * 60),                      w: spans(12 * 60, 15 * 60) ? 4.6 : 0 },
    { key: 'green',   label: 'a bit of green',  kinds: ['nature'],                  win: win(7 * 60, 18 * 60),                           w: V.has('green') ? 5.2 : 1.6 },
    { key: 'golden',  label: 'golden hour',     kinds: ['photo', 'view', 'nature'], win: win(sun.goldenPM[0] - 80, sun.goldenPM[1] + 45), golden: true, w: goldenReachable ? (V.has('sunset') || V.has('film') ? 6.5 : 4.8) : 0 },
    { key: 'sweet',   label: 'something sweet', kinds: ['dessert'],                 win: win(13 * 60, 22 * 60),                          w: V.has('sweet') ? 5 : 2.6 },
    { key: 'evening', label: 'after dark',      kinds: ['view', 'market', 'art'],   win: win(17.5 * 60, end),                            w: end > 19 * 60 ? 3.8 : 0 },
  ].filter(b => b.w > 0 && b.win[1] - b.win[0] >= 30);

  for (const b of menu) b.pref = b.win;
  if (indoorOnly) for (const b of menu) if (b.golden) b.w *= 0.3;

  const [lo, hi] = PACE_STOPS[pace] || PACE_STOPS.balanced;
  const n = clamp(Math.round((end - start) / PACE_MINS[pace]), lo, Math.min(hi, menu.length));

  const chosen = menu.slice().sort((a, b) => b.w - a.w).slice(0, n);
  const rank = k => ({ coffee: 0, make: 2, wander: 3, lunch: 4, green: 5, golden: 7, sweet: 8, evening: 9 }[k] ?? 5);
  return chosen.sort((a, b) => rank(a.key) - rank(b.key));
}

/* ────────────────────────── scoring ────────────────────────── */

function scoreSpot(spot, o, beat, prevLoc, perStop, r) {
  const V = new Set(o.vibes);
  const hit = spot.vibes.filter(v => V.has(v)).length;
  const vibeScore = V.size ? hit / Math.min(3, V.size) : 0.45;

  let s = 0;
  s += vibeScore * 3.4;
  s += (spot.photo / 5) * 1.5;
  s += beat.golden && (spot.light === 'golden' || spot.light === 'blue') ? 1.8 : 0;
  s += beat.cheap ? clamp(1.4 - spot.cost / 60, -0.6, 1.4) : 0;
  s += spot.isEvent ? 0.5 : 0;                                    // events feel "happening now"
  s += o.indoorOnly && spot.indoor ? 1.2 : 0;
  s -= o.indoorOnly && !spot.indoor ? 1.4 : 0;

  // Budget pressure: the tighter the money, the harder cheap spots are pushed.
  s -= clamp(spot.cost / Math.max(35, perStop) - 1, 0, 3) * 1.3;
  s -= spot.cost > o.budget * 0.45 ? 1.5 : 0;                     // one stop shouldn't eat the day

  if (prevLoc) s -= clamp(leg(prevLoc, spot).mins / 15, 0, 3.4);  // don't cross the city for a coffee

  // Opens hours after this part of the day starts? That's a hole in the plan.
  s -= clamp((spot.hours.from - beat.win[0]) / 60, 0, 4) * 0.8;

  s += r() * 0.9;                                                 // makes "shuffle" feel alive
  return s;
}

/* ────────────────────────── main ────────────────────────── */

export function buildPlan(opts) {
  const o = {
    budget: 300, start: 10 * 60, end: 21 * 60, vibes: [], pace: 'balanced',
    date: new Date(), from: null, indoorOnly: false, seed: Date.now(),
    lockedIds: [], excludeIds: [], pool: ALL_SPOTS,
    ...opts,
  };
  const r = rng(o.seed);
  const day = o.date.getDay();
  const sun = sunTimes(o.date, city.lat, city.lng, city.tz);
  const warnings = [];   // things that still don't fit
  const notes = [];      // things the planner did about it
  const excluded = new Set(o.excludeIds);

  const hasOrigin = !!o.from;
  const origin = o.from || { lat: city.lat, lng: city.lng, area: city.name };

  /* 1 ─ candidates: open today, inside the window, not excluded */
  const pool = o.pool.filter(s =>
    !excluded.has(s.id) &&
    openSomeTimeIn(s, day, o.start, o.end) &&
    (!o.indoorOnly || s.indoor || s.cost === 0));

  if (pool.length < 3) {
    return fail('Nothing in the city pack is open in that window — try a wider one.', sun, o);
  }

  /* 2 ─ the shape of the day */
  const beats = beatsFor(o, sun);
  const perStop = o.budget / Math.max(1, beats.length);

  /* 3 ─ fill each beat, holding money back for the beats still to come */
  const used = new Set();
  const picks = [];
  let spend = 0;
  let cursor = { ...origin };
  const locked = o.lockedIds.map(id => o.pool.find(s => s.id === id)).filter(Boolean);

  beats.forEach((beat, i) => {
    const reserve = (beats.length - i - 1) * 26;
    const allowance = Math.max(0, o.budget - spend - reserve);

    const lockedHere = locked.find(s => !used.has(s.id) && beat.kinds.includes(s.kind));
    let choice = lockedHere;

    if (!choice) {
      const fits = s =>
        !used.has(s.id) &&
        beat.kinds.includes(s.kind) &&
        openSomeTimeIn(s, day, beat.win[0], beat.win[1]);

      // Prefer candidates that also break up the day (no two of a kind in a row),
      // but don't leave a beat empty over it.
      const varied = pool.filter(s => fits(s) && (!picks.length || picks[picks.length - 1].spot.kind !== s.kind));
      const cands = varied.length ? varied : pool.filter(fits);
      if (!cands.length) return;

      const scored = cands
        .map(s => ({ s, sc: scoreSpot(s, o, beat, cursor, perStop, r) }))
        .sort((a, b) => b.sc - a.sc);

      const affordable = scored.filter(x => x.s.cost <= allowance);
      choice = (affordable[0] || scored.slice().sort((a, b) => a.s.cost - b.s.cost)[0]).s;
    }

    used.add(choice.id);
    spend += choice.cost;
    cursor = choice;
    picks.push({ spot: choice, beat, locked: !!lockedHere });
  });

  if (picks.length < MIN_STOPS) return fail('Could not build a day from those filters.', sun, o);

  /* 4 ─ order the day around the golden-hour anchor */
  const ordered = orderStops(picks, origin, sun, o);

  /* 5 ─ lay it on a clock */
  const ctx = { o, sun, day, origin, hasOrigin };
  let sched = ordered.map(p => ({
    spot: p.spot, beat: p.beat, locked: p.locked,
    dwellWant: p.spot.mins, cost: p.spot.cost,
  }));
  relay(sched, ctx);

  /* 6 ─ repair, in order of how badly each thing breaks a day */
  sched = repairClosed(sched, ctx, pool, used, notes);
  sched = fillGaps(sched, ctx, pool, used, notes);
  sched = extendTail(sched, ctx, pool, used);
  sched = repairBudget(sched, ctx, pool, used, notes);
  sched = repairTime(sched, ctx, notes);

  sched.forEach(st => { st.why = reasonFor(st, o); });

  const totals = totalsFor(sched, o.budget);
  const goldenStop = sched.find(st => st.light?.key === 'golden');

  if (!goldenStop && o.end > sun.goldenPM[0] && !o.indoorOnly) {
    warnings.push('No stop lands in golden hour — shuffle the photo stop, or push the end time later.');
  }
  if (totals.total > o.budget) {
    warnings.push(`Even after swapping, this day runs AED ${Math.round(totals.total - o.budget)} over. Lift the budget or drop a stop.`);
  }
  const last = sched[sched.length - 1];
  if (last && last.depart > o.end) {
    warnings.push(`Runs ${Math.round(last.depart - o.end)} min past your end time — everything after that is optional.`);
  }

  return {
    ok: sched.length >= MIN_STOPS,
    stops: sched, totals, sun, warnings, notes, opts: o,
    goldenStopId: goldenStop?.spot.id || null,
    seed: o.seed,
  };
}

const fail = (msg, sun, o) =>
  ({ ok: false, stops: [], warnings: [msg], notes: [], sun, totals: zeroTotals(o.budget), opts: o });

/* ── ordering ────────────────────────────────────────────── */

function orderStops(picks, origin, sun, o) {
  const golden = picks.find(p => p.beat.golden);
  const rest = picks.filter(p => p !== golden);

  const seq = [];
  let cur = origin;
  const left = rest.slice();
  while (left.length) {
    left.sort((a, b) => {
      const ta = a.beat.pref ? a.beat.pref[0] : 12 * 60;
      const tb = b.beat.pref ? b.beat.pref[0] : 12 * 60;
      if (Math.abs(ta - tb) > 150) return ta - tb;             // morning things first
      return leg(cur, a.spot).mins - leg(cur, b.spot).mins;    // then whatever's closest
    });
    const next = left.shift();
    seq.push(next);
    cur = next.spot;
  }

  if (!golden) return seq;
  const before = clamp(estimateStopsBefore(seq, origin, o, sun), 0, seq.length);
  return [...seq.slice(0, before), golden, ...seq.slice(before)];
}

/**
 * How many stops realistically fit before the light turns?
 * Two ways to fail: running out of clock, or hitting a stop that can't happen
 * before golden hour anyway (an evening market doesn't belong before sunset).
 */
function estimateStopsBefore(seq, origin, o, sun) {
  const cutoff = sun.goldenPM[0] - 15;
  let t = o.start, cur = origin, n = 0;
  for (const p of seq) {
    if (p.spot.hours.from >= cutoff) break;
    const next = t + leg(cur, p.spot).mins + p.spot.mins;
    if (next > cutoff) break;
    t = next; cur = p.spot; n++;
  }
  return n;
}

/* ── the clock ───────────────────────────────────────────── */

/**
 * Recompute every arrival, departure, travel leg and light label from scratch.
 * Every repair pass calls this, so the itinerary is never half-updated.
 */
function relay(sched, { o, sun, day, origin, hasOrigin }) {
  let t = o.start;
  let cur = hasOrigin ? origin : sched[0]?.spot;

  sched.forEach((st, i) => {
    const l = (i === 0 && !hasOrigin) ? null : leg(cur, st.spot);
    st.leg = l && l.mins > 0 ? l : null;
    st.travelCost = l ? l.cost : 0;

    const closes = Math.min(st.spot.hours.to, 1440);
    const earliest = t + (l?.mins || 0);
    let arrive = Math.max(earliest, st.spot.hours.from);

    // Pull the golden-hour stop into the light if the day has slack for it.
    if (st.beat.golden) {
      const target = Math.max(sun.goldenPM[0] - 10, st.spot.hours.from);
      if (arrive < target && target + (st.dwellWant ?? st.spot.mins) <= o.end) arrive = target;
    }
    st.waited = Math.round(arrive - earliest);

    // Dead time before this stop: hand up to 40 min of it back to the previous
    // stop (better to linger over coffee than stand in the street), and report
    // whatever is left honestly as spare time rather than pretend the day is full.
    let gap = st.waited;
    const prev = sched[i - 1];
    if (gap > 15 && prev) {
      const give = Math.min(gap, 40, Math.max(0, Math.min(prev.spot.hours.to, 1440) - prev.depart));
      if (give > 5) {
        prev.dwell += give;
        prev.depart += give;
        prev.lingered = give;
        prev.light = describeLight(prev.arrive + prev.dwell / 2, sun);
        gap -= give;
      }
    }
    st.gapBefore = gap > 15 ? gap : 0;

    st.lingered = 0;
    st.dwell = clamp(st.dwellWant ?? st.spot.mins, MIN_DWELL, Math.max(MIN_DWELL, closes - arrive));
    st.arrive = Math.round(arrive);
    st.depart = Math.round(arrive + st.dwell);
    st.cost = st.spot.cost;
    st.light = describeLight(arrive + st.dwell / 2, sun);
    st.closed = !openAt(st.spot, day, arrive, Math.min(st.dwell, MIN_DWELL));

    t = st.depart;
    cur = st.spot;
  });
  return sched;
}

function describeLight(mins, sun) {
  if (mins >= sun.goldenPM[0] && mins <= sun.goldenPM[1]) return { key: 'golden', label: 'golden hour', icon: '🌅' };
  if (mins >= sun.goldenAM[0] && mins <= sun.goldenAM[1]) return { key: 'golden', label: 'morning gold', icon: '🌄' };
  if (mins > sun.sunset && mins <= sun.bluePM[1]) return { key: 'blue', label: 'blue hour', icon: '🌃' };
  if (mins > sun.bluePM[1] || mins < sun.blueAM[0]) return { key: 'night', label: 'after dark', icon: '🌙' };
  if (mins < sun.sunrise) return { key: 'blue', label: 'blue hour', icon: '🌌' };
  return { key: 'day', label: 'daylight', icon: '☀️' };
}

/* ── repair passes ───────────────────────────────────────── */

/** A stop you'd arrive at after closing time is worse than no stop at all. */
function repairClosed(sched, ctx, pool, used, notes) {
  for (let guard = 0; guard < 6; guard++) {
    const i = sched.findIndex(st => st.closed);
    if (i < 0) break;

    const bad = sched[i];
    const alt = pool
      .filter(s => !used.has(s.id) && bad.beat.kinds.includes(s.kind) && openAt(s, ctx.day, bad.arrive, MIN_DWELL))
      .sort((a, b) => (b.photo - a.photo) || (a.cost - b.cost))[0];

    if (alt) {
      used.delete(bad.spot.id); used.add(alt.id);
      notes.push(`${bad.spot.name} would have shut by the time you got there — swapped in ${alt.name}.`);
      sched[i] = { spot: alt, beat: bad.beat, locked: false, dwellWant: alt.mins, cost: alt.cost };
    } else {
      notes.push(`Dropped ${bad.spot.name} — it closes before you could get there.`);
      sched.splice(i, 1);
    }
    relay(sched, ctx);
    if (sched.length < MIN_STOPS) break;
  }
  return sched;
}

/**
 * A two-hour hole in the middle of a day isn't a plan, it's a gap you'd fill
 * yourself. So fill it: something open, nearby, cheap, and reachable in the
 * time available.
 */
function fillGaps(sched, ctx, pool, used, notes) {
  const { o, day } = ctx;

  for (let guard = 0; guard < 3; guard++) {
    const i = sched.findIndex(st => (st.gapBefore || 0) >= 70);
    if (i < 0) break;

    const st = sched[i];
    const prev = sched[i - 1];
    const from = prev ? prev.depart : o.start;
    const room = st.arrive - from;
    const spare = Math.max(0, o.budget - totalsFor(sched, o.budget).total);

    const best = pool
      .filter(s => !used.has(s.id) && s.cost <= spare && s.kind !== st.spot.kind)
      .map(s => {
        const inLeg = prev ? leg(prev.spot, s) : { mins: 0, cost: 0 };
        const outLeg = leg(s, st.spot);
        const dwell = Math.min(s.mins, Math.max(MIN_DWELL, room - inLeg.mins - outLeg.mins - 5));
        return { s, dwell, arrive: from + inLeg.mins, need: inLeg.mins + dwell + outLeg.mins, cost: s.cost + inLeg.cost };
      })
      .filter(x => x.dwell >= MIN_DWELL && x.need <= room - 5 && x.cost <= spare &&
                   openAt(x.s, day, x.arrive, MIN_DWELL))
      .sort((a, b) => (b.s.photo - a.s.photo) || (a.cost - b.cost))[0];

    if (!best) break;

    used.add(best.s.id);
    sched.splice(i, 0, {
      spot: best.s,
      beat: { key: 'extra', label: 'while you wait', kinds: [best.s.kind], win: [from, st.arrive] },
      locked: false, dwellWant: best.dwell, cost: best.s.cost,
    });
    notes.push(`Slotted ${best.s.name} in before ${st.spot.name} — you had ${Math.round(room / 60)}h of nothing there.`);
    relay(sched, ctx);
  }
  return sched;
}

/**
 * You said you were free until 9pm and the plan ran out at 4. Keep going while
 * there's daylight, money and somewhere open — the user asked for a *day*.
 */
function extendTail(sched, ctx, pool, used) {
  const { o, day } = ctx;

  while (sched.length < MAX_STOPS) {
    const last = sched[sched.length - 1];
    if (!last || o.end - last.depart < 90) break;

    const spare = Math.max(0, o.budget - totalsFor(sched, o.budget).total);
    const V = new Set(o.vibes);

    const best = pool
      .filter(s => !used.has(s.id) && s.kind !== last.spot.kind)
      .map(s => {
        const l = leg(last.spot, s);
        const arrive = last.depart + l.mins;
        const dwell = Math.min(s.mins, o.end - arrive);
        return { s, l, arrive, dwell, spend: s.cost + l.cost };
      })
      .filter(x => x.dwell >= MIN_DWELL && x.arrive + x.dwell <= o.end &&
                   x.spend <= spare && openAt(x.s, day, x.arrive, MIN_DWELL))
      .sort((a, b) => tailScore(b, V) - tailScore(a, V))[0];

    if (!best) break;

    used.add(best.s.id);
    sched.push({
      spot: best.s,
      beat: { key: 'extra', label: 'one more', kinds: [best.s.kind], win: [last.depart, o.end] },
      locked: false, dwellWant: best.dwell, cost: best.s.cost,
    });
    relay(sched, ctx);
  }
  return sched;
}

const tailScore = (x, V) =>
  x.s.photo * 0.9 +
  x.s.vibes.filter(v => V.has(v)).length * 1.6 +
  (x.s.isEvent ? 0.8 : 0) -
  x.spend / 55 -
  x.l.mins / 13;

function repairBudget(sched, ctx, pool, used, notes) {
  const { o } = ctx;
  for (let guard = 0; guard < 8; guard++) {
    if (totalsFor(sched, o.budget).total <= o.budget) break;

    const target = sched
      .map((st, i) => ({ i, st }))
      .filter(x => !x.st.locked)
      .sort((a, b) => (b.st.cost + b.st.travelCost) - (a.st.cost + a.st.travelCost))[0];
    if (!target) break;

    const cheaper = pool
      .filter(s => !used.has(s.id) &&
        target.st.beat.kinds.includes(s.kind) &&
        s.cost < target.st.cost &&
        openAt(s, ctx.day, target.st.arrive, MIN_DWELL))
      .sort((a, b) => (a.cost - b.cost) || (b.photo - a.photo))[0];

    if (cheaper) {
      used.delete(target.st.spot.id); used.add(cheaper.id);
      notes.push(`Swapped ${target.st.spot.name} → ${cheaper.name} to stay inside AED ${o.budget}.`);
      sched[target.i] = { spot: cheaper, beat: target.st.beat, locked: false, dwellWant: cheaper.mins, cost: cheaper.cost };
    } else if (sched.length > MIN_STOPS) {
      notes.push(`Dropped ${target.st.spot.name} — the day didn't fit inside AED ${o.budget}.`);
      sched.splice(target.i, 1);
    } else break;

    relay(sched, ctx);
  }
  return sched;
}

function repairTime(sched, ctx, notes) {
  const { o } = ctx;
  for (let guard = 0; guard < 6; guard++) {
    const last = sched[sched.length - 1];
    if (!last || last.depart <= o.end) break;

    if (sched.length <= 3) {
      // Trim time at each stop rather than gutting a short day.
      let trimmed = false;
      for (const st of sched) {
        const floor = Math.max(MIN_DWELL, Math.round(st.spot.mins * 0.6));
        if ((st.dwellWant ?? st.spot.mins) > floor) { st.dwellWant = floor; trimmed = true; }
      }
      if (!trimmed) break;
    } else {
      const drop = sched
        .map((st, i) => ({ i, st }))
        .filter(x => !x.st.locked && !x.st.beat.golden)
        .sort((a, b) => a.st.spot.photo - b.st.spot.photo)[0];
      if (!drop) break;
      notes.push(`Cut ${drop.st.spot.name} — the day was running past your end time.`);
      sched.splice(drop.i, 1);
    }
    relay(sched, ctx);
  }
  return sched;
}

/* ── explanations ────────────────────────────────────────── */

function reasonFor(st, o) {
  const s = st.spot, V = new Set(o.vibes);
  const shared = s.vibes.filter(v => V.has(v));

  if (st.beat.golden && st.light?.key === 'golden') {
    return st.waited > 15
      ? `Held back ${Math.round(st.waited)} min on purpose so you arrive in golden hour.`
      : `Timed for golden hour — ${s.name} is at its best in this light.`;
  }
  if (st.beat.key === 'extra') return `Slotted in to fill dead time, not because the day needed padding — it's open, close by, and ${s.cost === 0 ? 'free' : 'cheap'}.`;
  if (st.locked) return 'You locked this one, so the rest of the day was built around it.';
  if (s.isEvent) return 'Only runs on certain days — and the day you picked is one of them.';
  if (shared.length >= 2) return `Matches your ${shared.slice(0, 2).join(' + ')} vibe, and it's on the way.`;
  if (s.cost === 0) return 'Free, which is what keeps budget back for the rest of the day.';
  if (s.book) return 'Worth booking ahead — this slot usually has the most availability.';
  if (shared.length === 1) return `Picked for the ${shared[0]} vibe without pushing the budget.`;
  return `Fits the ${st.beat.label} part of the day and is a short hop from the last stop.`;
}

/* ── totals ──────────────────────────────────────────────── */

const FOOD_KINDS = new Set(['cafe', 'dessert']);

export function totalsFor(sched, budget) {
  let food = 0, doing = 0, travel = 0;
  for (const st of sched) {
    if (FOOD_KINDS.has(st.spot.kind)) food += st.cost; else doing += st.cost;
    travel += st.travelCost || 0;
  }
  const total = food + doing + travel;
  return { food, doing, travel, total, budget, left: budget - total };
}

const zeroTotals = budget => ({ food: 0, doing: 0, travel: 0, total: 0, budget, left: budget });

/* ── alternatives for the swap button ────────────────────── */

export function alternativesFor(plan, index, pool = ALL_SPOTS) {
  const st = plan.stops[index];
  if (!st) return [];
  const day = plan.opts.date.getDay();
  const taken = new Set(plan.stops.map(s => s.spot.id));
  return pool
    .filter(s => !taken.has(s.id) && st.beat.kinds.includes(s.kind) && openAt(s, day, st.arrive, MIN_DWELL))
    .sort((a, b) => (b.photo - a.photo) || (a.cost - b.cost));
}
