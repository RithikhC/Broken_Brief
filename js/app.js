/**
 * Daydream — boot, identity gate and router.
 *
 * Boot order matters for the offline promise: storage first (so the first
 * paint comes from cache), then identity, then the live layer as a bolt-on
 * that is allowed to fail. Nothing on the critical path awaits the network.
 */
import { $, $$, h, mount } from './lib/dom.js';
import { svgNode } from './lib/art.js';
import { store } from './lib/store.js';
import { net } from './lib/net.js';
import { sync } from './lib/sync.js';
import { state } from './core/state.js';
import { spots as ALL_SPOTS, VIBES } from './data/spots.js';
import { toast } from './ui/overlay.js';
import { openProfile } from './ui/profile.js';
import { applyTheme, currentTheme, nextTheme, scatterStickers, confetti } from './ui/delight.js';
import { renderDiscover, discoverLiveUpdate } from './views/discover.js';
import { renderPlan, planWith } from './views/plan.js';
import { renderLive, teardownLive } from './views/live.js';
import { renderBoards } from './views/boards.js';

let current = 'discover';
let unseen = 0;

/* ══════════════════ boot ══════════════════ */

(async function boot() {
  registerSW();                // 0. start caching the shell immediately — the
                               //    offline promise shouldn't wait for sign-in
  await store.init();          // 1. local truth
  applyTheme(currentTheme());  //    …so the palette is right on first paint
  scatterStickers();
  net.init();                  // 2. connectivity model
  state.load();                // 3. who am I

  if (!state.me) return gate();
  start();
})();

function start() {
  sync.init({ me: state.me, spots: ALL_SPOTS });   // 4. live layer (optional by design)
  $('#gate').hidden = true;
  $('#shell').hidden = false;
  wireChrome();
  go(store.get('lastView', 'discover'));
}

/* ══════════════════ onboarding ══════════════════ */

function gate() {
  const host = $('#gate');
  host.hidden = false;

  let step = 0;
  const draft = { handle: '', emoji: '🌷', vibes: [] };
  const EMOJI = ['🌷', '🧋', '🎞️', '🍵', '🏺', '🌙', '🪴', '🍰', '🛼', '🐚', '🌊', '✨'];

  const paint = () => {
    const steps = h('div.gate__steps', {}, [0, 1].map(i => h('div.gate__step' + (i <= step ? ' is-on' : ''))));

    if (step === 0) {
      const input = h('input.input', {
        id: 'gateHandle',
        placeholder: 'pick a handle — anything', maxlength: '18', value: draft.handle,
        oninput: ev => { draft.handle = ev.target.value; },
        onkeydown: ev => { if (ev.key === 'Enter') next(); },
      });

      const emojis = h('div.gate__emojis', {}, EMOJI.map(e =>
        h('button.gate__emoji' + (draft.emoji === e ? ' is-on' : ''), {
          onclick: ev => {
            draft.emoji = e;
            [...emojis.children].forEach(c => c.classList.toggle('is-on', c.textContent === e));
          },
          text: e,
        })));

      mount(host, h('div.gate__card', {}, [
        steps,
        svgNode(`<svg class="gate__mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c2.5 4.2 5.6 6.1 9.8 6.6-1.4 4-1 7.6 1.2 11.2-4.4-.6-7.8.6-10.4 3.9-2.6-3.3-6-4.5-10.4-3.9 2.2-3.6 2.6-7.2 1.2-11.2C11.6 9.1 13.5 7.2 16 3Z"/><circle cx="16" cy="26" r="2.4"/></svg>`),
        h('h1', { text: 'Cute days, planned properly.' }),
        h('p.lede', { text: 'Cafés, photo spots and pottery classes near you — with a budget you set, and none of it needing signal.' }),
        h('div.field', { style: { marginTop: '22px' } }, [
          h('label.field__label', { text: 'What should we call you?' }),
          input,
        ]),
        h('div.field', {}, [h('label.field__label', { text: 'Pick your face' }), emojis]),
        h('button.btn.btn--primary.btn--block', { onclick: next, text: 'Next  →' }),
        h('p.gate__note', { text: 'No password, no email, no server. The handle just names the box your saved spots live in on this device — sign in with it again and they come back.' }),
      ]));
      setTimeout(() => input.focus(), 80);
    } else {
      const chips = h('div.chips', {}, VIBES.map(v =>
        h('button.pill' + (draft.vibes.includes(v.id) ? ' is-on' : ''), {
          onclick: ev => {
            const i = draft.vibes.indexOf(v.id);
            if (i >= 0) draft.vibes.splice(i, 1);
            else if (draft.vibes.length < 3) draft.vibes.push(v.id);
            ev.currentTarget.classList.toggle('is-on', draft.vibes.includes(v.id));
          },
          text: `${v.emoji} ${v.label}`,
        })));

      mount(host, h('div.gate__card', {}, [
        steps,
        h('h1', { text: 'What kind of day are you after?' }),
        h('p.lede', { text: 'Pick up to three. It seeds your feed and the planner — you can change it any time.' }),
        h('div.field', { style: { marginTop: '20px' } }, [chips]),
        h('button.btn.btn--primary.btn--block', { onclick: finish, text: 'Start exploring  ✿' }),
        h('button.btn.btn--ghost.btn--block', { style: { marginTop: '8px' }, onclick: finish, text: 'Skip' }),
      ]));
    }
  };

  const next = () => {
    draft.handle = document.getElementById('gateHandle')?.value ?? draft.handle;
    if (!draft.handle.trim()) return toast('Give yourself a name first 🌷', { tone: 'mute' });
    step = 1; paint();
  };

  const finish = () => {
    state.signIn({ handle: draft.handle, emoji: draft.emoji, color: '#C4694A', vibes: draft.vibes });
    host.hidden = true;
    start();
    confetti({ y: innerHeight * 0.35, count: 46 });
    toast(`Welcome, ${state.me.handle} — everything here works offline ✨`, { tone: 'warm' });
  };

  paint();
}

/* ══════════════════ chrome ══════════════════ */

function wireChrome() {
  $$('[data-nav]').forEach(b => b.addEventListener('click', () => go(b.dataset.nav)));

  $('#avatarBtn').textContent = state.me.emoji;
  $('#avatarBtn').addEventListener('click', openProfile);

  $('#themeBtn').addEventListener('click', ev => {
    const t = nextTheme();
    const b = ev.currentTarget.getBoundingClientRect();
    confetti({ x: b.left + b.width / 2, y: b.bottom, count: 16, emoji: false });
    toast(`${t.emoji} ${t.name} palette`, { tone: 'warm' });
  });

  $('#netChip').addEventListener('click', () => {
    net.toggleAirplane();
    toast(net.airplane
      ? '✈️ Airplane Mode — browse, plan and save as normal. Changes queue.'
      : '✨ Back online — anything queued is on its way.',
      { tone: net.airplane ? 'mute' : 'warm' });
  });

  $('#outboxFlush').addEventListener('click', () => {
    if (!net.online) return toast('Still no signal — it will go by itself', { tone: 'mute' });
    sync.flush();
  });

  net.addEventListener('change', paintNet);
  sync.addEventListener('outbox', paintOutbox);
  sync.addEventListener('synced', ev => {
    paintOutbox();
    if (ev.detail) toast(`Synced ${ev.detail} queued change${ev.detail > 1 ? 's' : ''} ✨`, { tone: 'warm' });
  });
  sync.addEventListener('feed', ev => {
    if (current !== 'live') { unseen++; $('#liveDot').hidden = false; }
    if (current === 'discover') discoverLiveUpdate(ev.detail);
  });
  state.addEventListener('saves', paintSaved);

  document.addEventListener('dd:nav', ev => go(ev.detail));
  document.addEventListener('dd:plan-with', ev => {
    go('plan', { silent: true });
    planWith(ev.detail);
  });

  paintNet(); paintOutbox(); paintSaved();
}

function paintNet() {
  const chip = $('#netChip');
  chip.dataset.state = net.state;
  chip.querySelector('.chip__label').textContent = net.label;
  chip.title = net.online
    ? 'Connected — tap to simulate losing signal'
    : 'Offline — everything still works. Tap to reconnect.';
}

function paintOutbox() {
  const n = sync.outbox.length;
  const bar = $('#outboxBar');
  bar.hidden = n === 0;
  if (n) {
    $('#outboxText').innerHTML = net.online
      ? `Sending ${n} change${n > 1 ? 's' : ''}…`
      : `<b>${n}</b> change${n > 1 ? 's' : ''} saved here, waiting for signal`;
  }
}

function paintSaved() {
  $('#savedCount').textContent = String(state.savedCount);
}

/* ══════════════════ router ══════════════════ */

function go(name, { silent = false } = {}) {
  if (current === 'live') teardownLive();
  current = name;
  store.set('lastView', name);

  $$('[data-nav]').forEach(b => b.classList.toggle('is-active', b.dataset.nav === name));
  const view = $('#view');
  view.scrollTop = 0;

  if (name === 'live') { unseen = 0; $('#liveDot').hidden = true; }

  ({
    discover: renderDiscover,
    plan: renderPlan,
    live: renderLive,
    boards: renderBoards,
  }[name] || renderDiscover)(view);

  if (!silent) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════ service worker ══════════════════ */

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!location.protocol.startsWith('http')) return;   // file:// can't host a SW

  // A cache-first shell will happily serve yesterday's build forever. When a new
  // worker takes over, reload once so the user is never a version behind — the
  // difference between a demo showing the current build and the previous one.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });

  navigator.serviceWorker.register('sw.js')
    .then(() => console.info('[daydream] offline shell ready'))
    .catch(err => console.warn('[daydream] sw failed', err.message));
}
