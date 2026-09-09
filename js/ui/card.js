/** The spot card + the spot detail sheet. Used by Discover, Saved and Nearby. */
import { h, money, dur, clock, ago } from '../lib/dom.js';
import { cover, cardRatio } from '../lib/art.js';
import { isOpenNow, opensLater, goldenIn, sunToday, dayIdx } from '../core/clock.js';
import { KIND_LABEL, KIND_EMOJI } from '../data/spots.js';
import { state } from '../core/state.js';
import { sync } from '../lib/sync.js';
import { net } from '../lib/net.js';
import { sheet, closeSheet, toast } from './overlay.js';
import { burstFrom } from './delight.js';

/* ── badges ───────────────────────────────────────────────── */

function badgesFor(spot) {
  const out = [];
  const open = isOpenNow(spot);
  const gold = goldenIn(spot);

  if (spot.isEvent && open) out.push(h('span.badge.badge--now', { text: 'happening now' }));
  else if (!open && opensLater(spot)) out.push(h('span.badge', { text: `opens ${clock(spot.hours.from)}` }));
  else if (!open) out.push(h('span.badge.badge--shut', { text: 'closed today' }));

  if (gold !== null && gold <= 150) {
    out.push(h('span.badge.badge--gold', { text: gold <= 5 ? 'golden hour now' : `golden in ${dur(gold)}` }));
  }
  if (spot.cost === 0 && out.length < 2) out.push(h('span.badge.badge--free', { text: 'free' }));
  return out;
}

/** Most recent live ping about this spot, if any. */
function pingFor(spotId) {
  return sync.feed.find(f => f.spotId === spotId);
}

/* ── card ─────────────────────────────────────────────────── */

export function spotCard(spot, { compact = false } = {}) {
  const ratio = compact ? 0.85 : cardRatio(spot);
  const art = h('div.card__art', { style: { aspectRatio: `1 / ${ratio}` } }, [
    cover(spot, { ratio }),
    h('div.card__sticker', { text: KIND_EMOJI[spot.kind] || '✨' }),
  ]);

  const saveBtn = h('button.card__save' + (state.isSaved(spot.id) ? ' is-on' : ''), {
    'aria-label': `Save ${spot.name}`,
    onclick: ev => {
      ev.stopPropagation();
      const on = state.toggleSave(spot);
      saveBtn.classList.toggle('is-on', on);
      saveBtn.textContent = on ? '❤' : '♡';
      if (on) burstFrom(saveBtn);
      toast(on ? `Saved <b>${spot.name}</b>${net.online ? '' : ' — will sync when you have signal'}`
                : `Removed <b>${spot.name}</b>`,
        { tone: on ? 'warm' : 'mute', icon: on ? '❤' : '' });
    },
    text: state.isSaved(spot.id) ? '❤' : '♡',
  });

  const ping = pingFor(spot.id);

  const card = h('div.card.card--' + spot.kind, {
    role: 'button', tabindex: '0', dataset: { spot: spot.id },
    onclick: () => openSpot(spot),
    onkeydown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openSpot(spot); } },
  }, [
    art,
    h('div.card__badges', {}, badgesFor(spot)),
    saveBtn,
    h('div.card__body', {}, [
      h('h3.card__title', { text: spot.name }),
      h('div.card__meta', {}, [
        h('span', { text: spot.area }),
        h('span', { text: '·' }),
        h('b', { text: spot.cost === 0 ? 'Free' : money(spot.cost) }),
        h('span', { text: '·' }),
        h('span', { text: dur(spot.mins) }),
      ]),
      compact ? null : h('p.card__blurb', { text: trim(spot.blurb, 96) }),
      h('div.card__tags', {}, [
        h('span.tag.tag--' + spot.kind, { text: KIND_LABEL[spot.kind] }),
        ...spot.tags.slice(0, compact ? 1 : 2).map(t => h('span.tag', { text: t })),
      ]),
    ]),
    ping ? h('div.card__ping', {}, [
      h('span', { text: ping.from.emoji }),
      h('span', { html: `<em>${ping.from.handle}</em> · ${ago(ping.at)}` }),
    ]) : null,
  ]);

  return card;
}

const trim = (s, n) => (s.length > n ? s.slice(0, n).replace(/[\s,.]+$/, '') + '…' : s);

/* ── detail sheet ─────────────────────────────────────────── */

export function openSpot(spot) {
  const sun = sunToday();
  const gold = goldenIn(spot, sun);
  const open = isOpenNow(spot);
  const bestLight = {
    golden: `Golden hour · ${clock(sun.goldenPM[0])}–${clock(sun.goldenPM[1])}`,
    blue: `Blue hour · ${clock(sun.bluePM[0])}–${clock(sun.bluePM[1])}`,
    indoor: 'Indoors — light is good all day',
    day: 'Daylight, ideally overcast',
    any: 'Any time',
  }[spot.light] || 'Any time';

  const saveBtn = h('button.btn' + (state.isSaved(spot.id) ? ' btn--ink' : ' btn--primary'), {
    onclick: () => {
      const on = state.toggleSave(spot);
      saveBtn.textContent = on ? '❤  Saved' : '♡  Save this';
      saveBtn.className = 'btn ' + (on ? 'btn--ink' : 'btn--primary');
      toast(on ? `Saved to <b>Want to go</b>` : 'Removed', { tone: on ? 'warm' : 'mute' });
    },
    text: state.isSaved(spot.id) ? '❤  Saved' : '♡  Save this',
  });

  sheet([
    h('div.det__art', {}, [cover(spot, { ratio: 0.52 })]),
    h('div.sheet__pad.det', { style: { '--k': `var(--k-${spot.kind})` } }, [
      h('h2', { text: `${KIND_EMOJI[spot.kind] || ''} ${spot.name}` }),
      h('div.det__meta', {}, [
        h('span.tag.tag--' + spot.kind, { text: KIND_LABEL[spot.kind] }),
        h('span.pill.pill--tiny', { text: spot.area }),
        open ? h('span.pill.pill--tiny', { text: '● open now', style: { color: '#4C6B41' } })
             : h('span.pill.pill--tiny', { text: opensLater(spot) ? `opens ${clock(spot.hours.from)}` : 'closed today' }),
        gold !== null && gold <= 180 ? h('span.tag.tag--warn', { text: gold <= 5 ? '🌅 golden hour now' : `🌅 golden in ${dur(gold)}` }) : null,
      ]),
      h('p.det__blurb', { text: spot.blurb }),
      h('div.kv', {}, [
        kv('Typical spend', spot.cost === 0 ? 'Free' : money(spot.cost)),
        kv('Time needed', dur(spot.mins)),
        kv('Best light', bestLight),
        kv('Today', spot.hours.days.includes(dayIdx()) ? `${clock(spot.hours.from)} – ${clock(spot.hours.to)}` : 'Closed'),
      ]),
      h('div.tip', { html: `<b>Local tip ·</b> ${spot.tip}` }),
      spot.book ? h('p.u-sm.u-mut', { style: { marginTop: '10px' }, text: '📞 Worth booking ahead — walk-ins are hit and miss.' }) : null,
      h('div.det__acts', {}, [
        saveBtn,
        h('button.btn.btn--ghost', {
          onclick: () => sharePrompt(spot),
          text: '📣  Share this find',
        }),
        h('button.btn.btn--ghost', {
          onclick: () => {
            closeSheet();
            document.dispatchEvent(new CustomEvent('dd:plan-with', { detail: spot }));
          },
          text: '✧  Build a day around this',
        }),
      ]),
      h('p.u-sm.u-mut', { style: { marginTop: '14px' }, text: 'Saved spots and plans live on this device and sync to your other tabs when you have signal.' }),
    ]),
  ]);
}

const kv = (k, v) => h('div.kv__i', {}, [h('div.kv__k', { text: k }), h('div.kv__v', { text: v })]);

/* ── "I found something" composer ─────────────────────────── */

export function sharePrompt(spot) {
  const input = h('input.input', { placeholder: 'the light in here right now…', maxlength: '90' });
  const send = () => {
    const note = input.value.trim() || 'found something good here';
    sync.ping({ spotId: spot.id, note });
    closeSheet();
    toast(net.online
      ? `Sent to everyone nearby ✨`
      : `Queued — friends will see this when you're back in signal`,
      { tone: net.online ? 'warm' : 'mute', icon: net.online ? '📣' : '📥' });
  };

  sheet([
    h('div.sheet__pad', {}, [
      h('h2', { text: 'Share the find' }),
      h('p.u-sm.u-mut', { style: { marginTop: '6px', marginBottom: '16px' }, text: `Everyone nearby sees this next to ${spot.name}. ${net.online ? '' : "You're offline — it'll queue up and send itself later."}` }),
      h('div.field', {}, [input]),
      h('div.u-row', {}, [
        h('button.btn.btn--primary', { onclick: send, text: net.online ? 'Send it 📣' : 'Queue it 📥' }),
        h('button.btn.btn--ghost', { onclick: closeSheet, text: 'Cancel' }),
      ]),
    ]),
  ]);
  setTimeout(() => input.focus(), 60);
}

export { badgesFor };
