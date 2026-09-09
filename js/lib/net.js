/**
 * Connectivity model.
 *
 * The brief wants an app that is great with no signal AND live with friends.
 * Those only fight each other if you treat "online" as a precondition. Here
 * it's just a mode the UI reflects, and the app is fully usable in every one:
 *
 *   live     — connected, live layer streaming
 *   syncing  — reconnected, flushing the outbox
 *   offline  — no signal (or Airplane Mode); reads from cache, writes queue
 *
 * Airplane Mode is a first-class in-app switch, not a devtools trick, so the
 * offline story can be demoed on stage in one tap.
 */
import { store } from './store.js';

class Net extends EventTarget {
  #forcedOffline = false;
  #syncing = false;

  init() {
    this.#forcedOffline = !!store.get('net:airplane', false);
    addEventListener('online',  () => this.#emit());
    addEventListener('offline', () => this.#emit());
    return this;
  }

  get airplane() { return this.#forcedOffline; }
  get online() { return !this.#forcedOffline && navigator.onLine !== false; }

  get state() {
    if (!this.online) return 'offline';
    return this.#syncing ? 'syncing' : 'live';
  }

  get label() {
    if (this.#forcedOffline) return 'Airplane';
    if (!this.online) return 'No signal';
    return this.#syncing ? 'Syncing…' : 'Live';
  }

  setAirplane(on) {
    if (this.#forcedOffline === on) return;
    this.#forcedOffline = on;
    store.set('net:airplane', on);
    this.#emit();
  }

  toggleAirplane() { this.setAirplane(!this.#forcedOffline); }

  setSyncing(on) {
    if (this.#syncing === on) return;
    this.#syncing = on;
    this.#emit();
  }

  #emit() {
    this.dispatchEvent(new CustomEvent('change', { detail: { state: this.state, online: this.online } }));
  }

  /** Simulated round-trip so "syncing" reads as real work, not a fake spinner. */
  latency() { return 260 + Math.random() * 420; }
}

export const net = new Net();
