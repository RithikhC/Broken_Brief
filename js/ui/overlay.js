/** Toasts + the bottom-sheet/modal. Shared chrome for every view. */
import { $, h, mount } from '../lib/dom.js';

/* ── toasts ── */
export function toast(msg, { tone = '', ms = 3000, icon = '' } = {}) {
  const host = $('#toasts');
  const el = h('div.toast' + (tone ? ` toast--${tone}` : ''), {}, [
    icon ? h('span', { text: icon }) : null,
    h('span', { html: msg }),
  ]);
  host.append(el);
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 320);
  }, ms);
  return el;
}

/* ── sheet ── */
let onClose = null;

export function sheet(nodes, { onDismiss } = {}) {
  const host = $('#sheet');
  onClose = onDismiss || null;

  const card = h('div.sheet__card', { role: 'document' }, [
    h('button.sheet__x', { 'aria-label': 'Close', onclick: closeSheet, text: '✕' }),
    ...[].concat(nodes),
  ]);

  mount(host, card);
  host.hidden = false;
  host.onclick = ev => { if (ev.target === host) closeSheet(); };
  document.body.style.overflow = 'hidden';
  card.focus?.();
  return card;
}

export function closeSheet() {
  const host = $('#sheet');
  if (host.hidden) return;
  host.hidden = true;
  host.replaceChildren();
  document.body.style.overflow = '';
  onClose?.();
  onClose = null;
}

addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
