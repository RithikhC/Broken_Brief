/**
 * Nearby — the live layer.
 *
 * The honest bit: this view never lies about freshness. Online it streams.
 * Offline it says so, freezes, timestamps everything it's showing, and tells
 * you exactly how many of your own finds are queued up waiting for signal.
 * That's the difference between "offline support" and an app that silently
 * shows you stale data as if it were live.
 */
import { h, mount, ago } from '../lib/dom.js';
import { spots as ALL_SPOTS } from '../data/spots.js';
import { sync } from '../lib/sync.js';
import { net } from '../lib/net.js';
import { state } from '../core/state.js';
import { spotCard, openSpot, sharePrompt } from '../ui/card.js';
import { sheet, closeSheet, toast } from '../ui/overlay.js';

let feedHost = null;
let hostEl = null;

export function renderLive(host) {
  hostEl = host;
  feedHost = h('div.feed');

  mount(host,
    h('div.sec.sec--row', {}, [
      h('div', {}, [
        h('h2.sec__title', { text: 'Nearby, right now' }),
        h('p.sec__sub', { text: 'What people around you are finding. Works when you have signal; keeps its shape when you don’t.' }),
      ]),
      h('button.btn.btn--primary', { onclick: composer, text: '📣  Share a find' }),
    ]),
    presenceBar(),
    statusBar(),
    feedHost,
    h('div', { style: { marginTop: '22px' } }, [
      h('p.u-sm.u-mut', { html: '<b>Try this:</b> open Daydream in a second browser window. That window is a real second device — saves and finds pass between them live, with no server involved. Ambient explorers are simulated so a single window still feels alive; switch them off in your profile.' }),
    ]),
  );

  paintFeed();

  sync.addEventListener('feed', onFeed);
  sync.addEventListener('presence', onPresence);
  net.addEventListener('change', onNet);
}

export function teardownLive() {
  sync.removeEventListener('feed', onFeed);
  sync.removeEventListener('presence', onPresence);
  net.removeEventListener('change', onNet);
}

const onFeed = () => paintFeed();
const onPresence = () => {
  const bar = hostEl?.querySelector('.presence');
  if (bar) bar.replaceWith(presenceBar());
};
const onNet = () => {
  const s = hostEl?.querySelector('[data-status]');
  if (s) s.replaceWith(statusBar());
  onPresence();
};

/* ── presence ── */

function presenceBar() {
  const roster = sync.roster();
  const wrap = h('div.presence', {}, [
    h('div.presence__avs', {}, roster.length
      ? roster.slice(0, 6).map(p => h('div.presence__av', { title: `${p.handle}${p.real ? ' (another window)' : ' (ambient)'}`, text: p.emoji }))
      : [h('div.presence__av', { text: '·' })]),
    h('div.presence__txt', {
      html: net.online
        ? (roster.length
            ? `<b>${roster.length} explorer${roster.length > 1 ? 's' : ''}</b> out near you${roster.some(p => p.real) ? ' · one of them is another window of yours, live' : ''}`
            : 'Nobody nearby this minute — you’re the scout.')
        : 'Presence paused — you’re offline. Everything below is cached.',
    }),
  ]);
  return wrap;
}

/* ── status ── */

function statusBar() {
  const fresh = sync.freshness();
  const queued = sync.outbox.length;

  if (net.online) {
    return h('div', { dataset: { status: '1' }, style: { marginBottom: '14px' } }, [
      h('p.u-sm.u-mut', {
        html: queued
          ? `⟳ Syncing ${queued} queued change${queued > 1 ? 's' : ''}…`
          : `◉ Live · newest find ${fresh == null ? 'any moment now' : ago(Date.now() - fresh)}`,
      }),
    ]);
  }

  return h('div.frozen', { dataset: { status: '1' } }, [
    h('span.frozen__ico', { text: net.airplane ? '✈️' : '📴' }),
    h('div', {}, [
      h('div', { html: `<b>Live feed paused${net.airplane ? ' — Airplane Mode is on' : ' — no signal'}.</b>` }),
      h('div.u-sm.u-mut', {
        html: `Showing ${sync.feed.length} cached finds${fresh == null ? '' : `, newest from ${ago(Date.now() - fresh)}`}.` +
              (queued ? ` <b>${queued}</b> of your own change${queued > 1 ? 's are' : ' is'} queued and will send itself the moment you're back.` : ' Everything you do now still saves.'),
      }),
    ]),
  ]);
}

/* ── feed ── */

function paintFeed() {
  if (!feedHost) return;
  const stale = !net.online;

  if (!sync.feed.length) {
    return mount(feedHost, h('div.empty', {}, [
      h('div.empty__ico', { text: '◉' }),
      h('h3', { text: 'Quiet out there' }),
      h('p', { text: 'Nobody has pinged a find yet. Be first — share something you like and it goes out to everyone nearby.' }),
      h('button.btn.btn--primary', { onclick: composer, text: '📣  Share a find' }),
    ]));
  }

  mount(feedHost, sync.feed.slice(0, 30).map(p => pingRow(p, stale)));
}

function pingRow(p, stale) {
  const spot = ALL_SPOTS.find(s => s.id === p.spotId);
  if (!spot) return null;

  const saveBtn = h('button.pill.pill--tiny', {
    onclick: () => {
      const on = state.toggleSave(spot);
      saveBtn.textContent = on ? '❤ saved' : '♡ save it';
      saveBtn.classList.toggle('is-on', on);
      toast(on ? `Saved <b>${spot.name}</b>` : 'Removed', { tone: on ? 'warm' : 'mute' });
    },
    text: state.isSaved(spot.id) ? '❤ saved' : '♡ save it',
  });

  return h('article.ping' + (p.mine ? ' ping--mine' : '') + (stale ? ' ping--stale' : ''), {}, [
    h('div.ping__av', { style: { background: (p.from.color || '#EEE') + '33' }, text: p.from.emoji }),
    h('div.ping__b', {}, [
      h('div.ping__top', {}, [
        h('span.ping__who', { text: p.mine ? 'you' : p.from.handle }),
        h('span.ping__when', { text: ago(p.at) }),
        p.mine && sync.outbox.some(o => o.pingId === p.id) ? h('span.tag.tag--warn', { text: '📥 queued' }) : null,
        !p.mine && p.ambient ? h('span.tag', { text: 'ambient' }) : null,
        !p.mine && !p.ambient ? h('span.tag.tag--live', { text: '● live peer' }) : null,
      ]),
      h('div.ping__what', { html: `found <b>${spot.name}</b> · ${spot.area}` }),
      p.note ? h('div.ping__note', { text: `“${p.note}”` }) : null,
      h('div.ping__acts', {}, [
        saveBtn,
        h('button.pill.pill--tiny', { onclick: () => openSpot(spot), text: 'open' }),
        h('button.pill.pill--tiny', {
          onclick: () => document.dispatchEvent(new CustomEvent('dd:plan-with', { detail: spot })),
          text: '✧ build a day here',
        }),
      ]),
    ]),
    h('div.ping__art', {}, [importCover(spot)]),
  ]);
}

function importCover(spot) {
  // lazily pull the art module already loaded elsewhere
  const div = h('div', { style: { width: '100%', height: '100%' } });
  import('../lib/art.js').then(m => div.replaceChildren(m.cover(spot, { ratio: 1 })));
  return div;
}

/* ── composer ── */

function composer() {
  const list = h('div.masonry', { style: { columnCount: '2' } },
    ALL_SPOTS.slice(0, 10).map(s => {
      const c = spotCard(s, { compact: true });
      c.onclick = () => { closeSheet(); sharePrompt(s); };
      return c;
    }));

  const search = h('input.input', {
    placeholder: 'which place?',
    oninput: ev => {
      const q = ev.target.value.toLowerCase();
      const hits = ALL_SPOTS.filter(s => `${s.name} ${s.area} ${s.tags.join(' ')}`.toLowerCase().includes(q)).slice(0, 10);
      mount(list, hits.map(s => {
        const c = spotCard(s, { compact: true });
        c.onclick = () => { closeSheet(); sharePrompt(s); };
        return c;
      }));
    },
  });

  sheet([
    h('div.sheet__pad', {}, [
      h('h2', { text: 'What did you find?' }),
      h('p.u-sm.u-mut', { style: { margin: '6px 0 16px' }, text: 'Pick the place, then add a line. Offline is fine — it queues.' }),
      h('div.field', {}, [search]),
      list,
    ]),
  ]);
  setTimeout(() => search.focus(), 60);
}
