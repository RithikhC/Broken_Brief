/**
 * User identity + saved spots.
 *
 * "No fancy accounts system" but "once someone's logged in, their saved list
 * should follow them around" — so identity here is a handle you pick, nothing
 * more. Data is namespaced per handle (sign in as someone else and you get
 * their boards, not yours), and a Transfer Code moves the whole namespace to
 * another device without a server ever seeing it.
 */
import { store } from '../lib/store.js';
import { sync } from '../lib/sync.js';
import { uid } from '../lib/dom.js';
import { spots as ALL_SPOTS } from '../data/spots.js';

const K = {
  me: 'me',
  saves: h => `u:${h}:saves`,
  boards: h => `u:${h}:boards`,
  plans: h => `u:${h}:plans`,
};

const DEFAULT_BOARDS = [
  { id: 'want', name: 'Want to go', emoji: '🌷' },
  { id: 'photo', name: 'Photo spots', emoji: '🎞️' },
  { id: 'been', name: 'Been & loved', emoji: '🤍' },
];

class State extends EventTarget {
  me = null;
  saves = {};    // spotId → { at, board }
  boards = [];
  plans = [];

  load() {
    this.me = store.get(K.me, null);
    if (this.me) this.#loadUser();
    return this;
  }

  signIn({ handle, emoji, color, vibes }) {
    const clean = String(handle || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 18) || 'friend';
    this.me = { handle: clean, emoji: emoji || '🌷', color: color || '#C4694A', vibes: vibes || [], since: Date.now() };
    store.set(K.me, this.me);
    this.#loadUser();
    this.#emit('user');
    return this.me;
  }

  signOut() {
    // Boards stay on the device under their handle — signing back in restores them.
    this.me = null;
    store.del(K.me);
    this.saves = {}; this.boards = []; this.plans = [];
    this.#emit('user');
  }

  #loadUser() {
    const h = this.me.handle;
    this.saves = store.get(K.saves(h), {});
    this.boards = store.get(K.boards(h), null) || DEFAULT_BOARDS.slice();
    this.plans = store.get(K.plans(h), []);
    store.set(K.boards(h), this.boards);
  }

  /* ── saves ── */

  isSaved(id) { return !!this.saves[id]; }
  get savedCount() { return Object.keys(this.saves).length; }

  savedSpots(boardId = null) {
    return Object.entries(this.saves)
      .filter(([, v]) => !boardId || v.board === boardId)
      .sort((a, b) => b[1].at - a[1].at)
      .map(([id]) => ALL_SPOTS.find(s => s.id === id))
      .filter(Boolean);
  }

  boardOf(id) { return this.saves[id]?.board || null; }

  toggleSave(spot, boardId = 'want') {
    const on = !this.saves[spot.id];
    if (on) this.saves[spot.id] = { at: Date.now(), board: boardId };
    else delete this.saves[spot.id];

    this.#persist('saves');
    // Optimistic locally, queued for the world — works identically offline.
    sync.push({ kind: on ? 'save' : 'unsave', spotId: spot.id, board: boardId });
    this.#emit('saves', { spot, on });
    return on;
  }

  moveToBoard(spotId, boardId) {
    if (!this.saves[spotId]) return;
    this.saves[spotId].board = boardId;
    this.saves[spotId].at = Date.now();
    this.#persist('saves');
    this.#emit('saves');
  }

  addBoard(name, emoji = '📌') {
    const b = { id: uid(), name: String(name).slice(0, 28) || 'New board', emoji };
    this.boards.push(b);
    this.#persist('boards');
    this.#emit('boards');
    return b;
  }

  /* ── plans ── */

  savePlan(plan, title) {
    const rec = {
      id: uid(),
      at: Date.now(),
      title: title || `${plan.stops.length}-stop day`,
      budget: plan.opts.budget,
      spent: plan.totals.total,
      date: plan.opts.date.toISOString(),
      start: plan.opts.start,
      vibes: plan.opts.vibes,
      stops: plan.stops.map(s => ({ id: s.spot.id, arrive: s.arrive, depart: s.depart, cost: s.cost })),
    };
    this.plans.unshift(rec);
    this.plans = this.plans.slice(0, 20);
    this.#persist('plans');
    sync.push({ kind: 'plan', planId: rec.id, stops: rec.stops.length });
    this.#emit('plans');
    return rec;
  }

  deletePlan(id) {
    this.plans = this.plans.filter(p => p.id !== id);
    this.#persist('plans');
    this.#emit('plans');
  }

  /* ── device transfer ── */

  exportCode() {
    const h = this.me?.handle;
    if (!h) return '';
    const payload = { ...store.dump(`u:${h}:`), me: { v: this.me, at: Date.now() } };
    return 'DD1.' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }

  importCode(code) {
    const raw = String(code || '').trim();
    if (!raw.startsWith('DD1.')) throw new Error('That does not look like a Daydream code.');
    const json = decodeURIComponent(escape(atob(raw.slice(4))));
    const dump = JSON.parse(json);
    const n = store.restore(dump);
    this.me = store.get(K.me, this.me);
    if (this.me) this.#loadUser();
    this.#emit('user');
    return n;
  }

  #persist(what) {
    const h = this.me?.handle;
    if (!h) return;
    if (what === 'saves') store.set(K.saves(h), this.saves);
    if (what === 'boards') store.set(K.boards(h), this.boards);
    if (what === 'plans') store.set(K.plans(h), this.plans);
  }

  #emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
}

export const state = new State();
