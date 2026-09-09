/**
 * The live layer + the outbox.
 *
 * ── How the "offline vs. live" contradiction is resolved ──────────────────
 * Every write is applied to local state FIRST and is instantly true for the
 * user. It then drops into an outbox. If there's signal, the outbox drains
 * immediately and other people see it. If there isn't, it waits — visibly,
 * with a count — and drains the moment signal returns. Nothing is ever lost
 * and nothing ever blocks on the network.
 *
 * ── What is real vs. simulated ────────────────────────────────────────────
 * REAL: cross-tab/cross-window peers. Two browser windows are two genuine
 *       devices talking over BroadcastChannel (with a localStorage-event
 *       fallback). Save a spot in one, it lands in the other's feed live.
 * SIMULATED: "ambient" explorers, so a single window still feels alive in a
 *       demo. They're clearly labelled and can be switched off in Profile.
 * There is no server: a weekend build shouldn't need one, and a serverless
 * mesh is exactly what keeps the offline path honest.
 */
import { store } from './store.js';
import { net } from './net.js';
import { uid, rng } from './dom.js';

const CHANNEL = 'daydream-live-v1';
const LS_BEACON = 'dd:beacon';
const FEED_CAP = 60;

const AMBIENT = [
  { handle: 'noor',   emoji: '🧋', color: '#E7A99F' },
  { handle: 'kavya',  emoji: '🌸', color: '#C4694A' },
  { handle: 'zed',    emoji: '🎞️', color: '#7A5C7E' },
  { handle: 'mariam', emoji: '🍵', color: '#7D9471' },
  { handle: 'ollie',  emoji: '🛼', color: '#7E9CB5' },
  { handle: 'rhea',   emoji: '🪴', color: '#EFCB8C' },
];

const NOTES = {
  cafe: ['the matcha here is unreal ✨', 'corner table by the window is free right now', 'they just put out warm cardamom buns', 'oat flat white + zero queue', 'staff let me stay 3 hrs, no notes'],
  dessert: ['pistachio croissant is still warm 🥐', 'got the last kunafa cheesecake', 'the gelato counter has rose today', 'this is dangerously good'],
  photo: ['light is doing something insane right now 🌤️', 'staircase is completely empty, go go go', 'shot half a roll here in 10 min', 'the shadows on this wall, seriously', 'blue hour here is unmatched'],
  art: ['new show just opened, free entry', 'whole gallery to myself', 'the installation room is so photogenic'],
  activity: ['got a wheel at the pottery class 🏺', 'they had a walk-in spot for painting', 'candle bar smells like a dream', 'signed up for the 4pm slot, come'],
  view: ['skyline is glowing from up here', 'best bench in the city, currently free', 'sunset in ~40 min from here'],
  market: ['tiny vintage stall, everything AED 20', 'flower guy is back today 💐', 'found stickers, film, and trouble'],
  nature: ['ducks. so many ducks.', 'shade + breeze + nobody here', 'perfect picnic patch, marking it'],
};

class Sync extends EventTarget {
  me = null;
  spots = [];
  tabId = uid();         // this window's address on the mesh
  peers = new Map();     // tab id → { ...identity, lastSeen }
  feed = [];
  outbox = [];
  #bc = null;
  #beat = null;
  #ambientTimer = null;

  init({ me, spots }) {
    this.me = me;
    this.spots = spots;
    this.feed = store.get('feed', []);
    this.outbox = store.get('outbox', []);

    // ── real peer transport ──
    try {
      this.#bc = new BroadcastChannel(CHANNEL);
      this.#bc.onmessage = ev => this.#receive(ev.data);
    } catch { /* older browser — the localStorage fallback below covers it */ }

    addEventListener('storage', ev => {
      if (ev.key === LS_BEACON && ev.newValue) {
        try { this.#receive(JSON.parse(ev.newValue)); } catch {}
      }
    });

    net.addEventListener('change', () => this.#onNetChange());

    this.#beat = setInterval(() => this.#heartbeat(), 4000);
    setInterval(() => this.#prunePeers(), 3000);
    this.#heartbeat();
    this.#scheduleAmbient();
    if (net.online && this.outbox.length) setTimeout(() => this.flush(), 900);
    return this;
  }

  get ambientOn() { return store.get('live:ambient', true); }
  setAmbient(on) {
    store.set('live:ambient', on);
    if (on) this.#scheduleAmbient();
    else clearTimeout(this.#ambientTimer);
  }

  /* ══════════ outgoing ══════════ */

  /** Optimistic local write + queue for the world. */
  push(op) {
    const full = { id: uid(), at: Date.now(), from: this.#identity(), ...op };
    this.outbox.push(full);
    store.set('outbox', this.outbox);
    this.dispatchEvent(new CustomEvent('outbox', { detail: this.outbox.length }));
    if (net.online) this.flush();
    return full;
  }

  /** Share a find with everyone nearby. */
  ping({ spotId, note }) {
    const p = { kind: 'ping', spotId, note, id: uid(), at: Date.now(), from: this.#identity(), mine: true };
    this.#addToFeed(p);
    this.push({ kind: 'ping', spotId, note, pingId: p.id });
    return p;
  }

  async flush() {
    if (!this.outbox.length || !net.online) return 0;
    net.setSyncing(true);
    await sleep(net.latency());
    if (!net.online) { net.setSyncing(false); return 0; }   // signal died mid-flight — keep the queue

    const sent = this.outbox.slice();
    for (const op of sent) {
      this.#broadcast({ t: 'op', op });
      if (op.kind === 'ping') {
        this.#broadcast({ t: 'ping', ping: { ...op, id: op.pingId || op.id, mine: false } });
      }
    }
    this.outbox = [];
    store.set('outbox', this.outbox);
    net.setSyncing(false);
    this.dispatchEvent(new CustomEvent('outbox', { detail: 0 }));
    this.dispatchEvent(new CustomEvent('synced', { detail: sent.length }));
    return sent.length;
  }

  /* ══════════ incoming ══════════ */

  #receive(msg) {
    // Identity is per *window*, not per handle: two tabs signed in as the same
    // person are still two devices, and that's what makes the live layer
    // demonstrable without a server.
    if (!msg || msg.from?.tab === this.tabId) return;
    switch (msg.t) {
      case 'beat':
        this.peers.set(msg.from.tab, { ...msg.from, lastSeen: Date.now() });
        this.dispatchEvent(new CustomEvent('presence'));
        break;
      case 'ping':
        this.#addToFeed({ ...msg.ping, mine: false });
        break;
      case 'op':
        if (msg.op?.kind === 'save') {
          this.dispatchEvent(new CustomEvent('peer-save', { detail: msg.op }));
        }
        break;
      case 'bye':
        this.peers.delete(msg.from?.tab);
        this.dispatchEvent(new CustomEvent('presence'));
        break;
    }
  }

  #addToFeed(ping) {
    if (this.feed.some(f => f.id === ping.id)) return;
    this.feed.unshift(ping);
    this.feed = this.feed.slice(0, FEED_CAP);
    store.set('feed', this.feed);
    this.dispatchEvent(new CustomEvent('feed', { detail: ping }));
  }

  /* ══════════ presence ══════════ */

  #identity() {
    return {
      handle: this.me?.handle || 'you',
      emoji: this.me?.emoji || '🌷',
      color: this.me?.color || '#C4694A',
      tab: this.tabId,
    };
  }

  #heartbeat() {
    if (!net.online) return;
    this.#broadcast({ t: 'beat' });
  }

  #broadcast(msg) {
    const packet = { ...msg, from: this.#identity(), at: Date.now(), n: Math.random() };
    try { this.#bc?.postMessage(packet); } catch {}
    try { localStorage.setItem(LS_BEACON, JSON.stringify(packet)); } catch {}
  }

  #prunePeers() {
    const cut = Date.now() - 13000;
    let changed = false;
    for (const [k, p] of this.peers) if (p.lastSeen < cut) { this.peers.delete(k); changed = true; }
    if (changed) this.dispatchEvent(new CustomEvent('presence'));
  }

  /** Everyone visible: real peers first, then ambient explorers. */
  roster() {
    const real = [...this.peers.values()].map(p => ({ ...p, real: true }));
    if (!net.online) return real;
    if (!this.ambientOn) return real;
    const r = rng(Math.floor(Date.now() / 60000));   // rotates once a minute
    const n = 2 + Math.floor(r() * 3);
    const amb = AMBIENT.slice().sort(() => r() - 0.5).slice(0, n).map(a => ({ ...a, real: false }));
    return [...real, ...amb];
  }

  /* ══════════ ambient explorers (demo peers) ══════════ */

  #scheduleAmbient() {
    clearTimeout(this.#ambientTimer);
    const wait = 9000 + Math.random() * 13000;
    this.#ambientTimer = setTimeout(() => {
      if (net.online && this.ambientOn && this.spots.length) {
        const person = AMBIENT[Math.floor(Math.random() * AMBIENT.length)];
        const spot = this.spots[Math.floor(Math.random() * this.spots.length)];
        const pool = NOTES[spot.kind] || NOTES.cafe;
        this.#addToFeed({
          kind: 'ping', id: uid(), at: Date.now(), from: person, mine: false, ambient: true,
          spotId: spot.id, note: pool[Math.floor(Math.random() * pool.length)],
        });
      }
      this.#scheduleAmbient();
    }, wait);
  }

  #onNetChange() {
    if (net.online) {
      this.#heartbeat();
      if (this.outbox.length) this.flush();
    } else {
      this.peers.clear();
      this.dispatchEvent(new CustomEvent('presence'));
    }
  }

  /** Age of the newest thing we know about — powers the honest staleness label. */
  freshness() {
    return this.feed.length ? Date.now() - this.feed[0].at : null;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export const sync = new Sync();
export { AMBIENT };
