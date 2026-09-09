/**
 * Profile sheet — identity, the offline switch, and device transfer.
 *
 * "No fancy accounts system" is taken literally: no password, no email, no
 * server. A handle namespaces your data; a Transfer Code moves it.
 */
import { h } from '../lib/dom.js';
import { state } from '../core/state.js';
import { store } from '../lib/store.js';
import { net } from '../lib/net.js';
import { sync } from '../lib/sync.js';
import { sheet, closeSheet, toast } from './overlay.js';

export function openProfile() {
  const me = state.me;

  const airplane = h('button.switch' + (net.airplane ? ' is-on' : ''), {
    role: 'switch', 'aria-checked': String(net.airplane),
    onclick: ev => {
      net.toggleAirplane();
      ev.currentTarget.classList.toggle('is-on', net.airplane);
      ev.currentTarget.setAttribute('aria-checked', String(net.airplane));
      toast(net.airplane
        ? 'Airplane Mode on — everything still works, changes queue up ✈️'
        : 'Back online — flushing anything you queued ✨',
        { tone: net.airplane ? 'mute' : 'warm' });
    },
  });

  const ambient = h('button.switch' + (sync.ambientOn ? ' is-on' : ''), {
    role: 'switch', 'aria-checked': String(sync.ambientOn),
    onclick: ev => {
      sync.setAmbient(!sync.ambientOn);
      ev.currentTarget.classList.toggle('is-on', sync.ambientOn);
      toast(sync.ambientOn ? 'Ambient explorers on' : 'Ambient explorers off — only real windows now', { tone: 'mute' });
    },
  });

  const codeBox = h('div.code', { text: 'Tap “Show my transfer code” to reveal it.' });

  sheet([
    h('div.sheet__pad', {}, [
      h('div.prof__hero', {}, [
        h('div.prof__av', { style: { background: (me?.color || '#E7A99F') + '33' }, text: me?.emoji || '🌷' }),
        h('div', {}, [
          h('h2', { text: '@' + (me?.handle || 'you') }),
          h('p.u-sm.u-mut', { text: `Exploring since ${me ? new Date(me.since).toLocaleDateString() : 'today'}` }),
        ]),
      ]),

      h('div.prof__stats', {}, [
        statBox(state.savedCount, 'saved spots'),
        statBox(state.plans.length, 'days built'),
        statBox(sync.feed.filter(f => f.mine).length, 'finds shared'),
      ]),

      h('div.row-tog', {}, [
        h('div', {}, [
          h('div.row-tog__t', { text: '✈️  Airplane Mode' }),
          h('div.row-tog__s', { text: 'Cut the signal on purpose. Browse, plan, save — all of it keeps working, and your changes queue until you switch it back.' }),
        ]),
        airplane,
      ]),

      h('div.row-tog', {}, [
        h('div', {}, [
          h('div.row-tog__t', { text: '◉  Ambient explorers' }),
          h('div.row-tog__s', { text: 'Simulated people finding things nearby, so a single window still feels alive. Other browser windows are real peers either way.' }),
        ]),
        ambient,
      ]),

      h('div.row-tog', { style: { display: 'block' } }, [
        h('div.row-tog__t', { text: '📦  Where your stuff lives' }),
        h('div.row-tog__s', {
          html: `Primary store: <b>${store.mode}</b>, mirrored to localStorage. ${sync.outbox.length ? `<b>${sync.outbox.length}</b> change(s) queued.` : 'Nothing queued — everything is saved.'}`,
        }),
      ]),

      h('div.row-tog', { style: { display: 'block' } }, [
        h('div.row-tog__t', { text: '🔑  Move to another device' }),
        h('div.row-tog__s', { text: 'No account, no upload. Copy this code, paste it on the other device, and your boards and days come with you.' }),
        h('div.u-row.u-wrap', { style: { margin: '12px 0' } }, [
          h('button.btn.btn--ghost.btn--sm', {
            onclick: async () => {
              const code = state.exportCode();
              codeBox.textContent = code;
              try { await navigator.clipboard.writeText(code); toast('Transfer code copied', { icon: '🔑' }); }
              catch { toast('Code shown below — copy it manually', { tone: 'mute' }); }
            },
            text: 'Show my transfer code',
          }),
          h('button.btn.btn--ghost.btn--sm', { onclick: importFlow, text: 'Paste a code' }),
        ]),
        codeBox,
      ]),

      h('div.u-row', { style: { marginTop: '20px' } }, [
        h('button.btn.btn--ghost', {
          onclick: () => {
            if (!confirm('Sign out? Your boards stay on this device and come back when you sign in with the same handle.')) return;
            state.signOut();
            closeSheet();
            location.reload();
          },
          text: 'Sign out',
        }),
      ]),
    ]),
  ]);
}

const statBox = (n, label) => h('div.prof__stat', {}, [h('b', { text: String(n) }), h('span', { text: label })]);

function importFlow() {
  const ta = h('textarea.input', { rows: '4', placeholder: 'DD1.…' });
  sheet([
    h('div.sheet__pad', {}, [
      h('h2', { text: 'Paste a transfer code' }),
      h('p.u-sm.u-mut', { style: { margin: '6px 0 14px' }, text: 'This merges the incoming boards with whatever is already here — newest edit of each item wins.' }),
      h('div.field', {}, [ta]),
      h('button.btn.btn--primary', {
        onclick: () => {
          try {
            const n = state.importCode(ta.value);
            closeSheet();
            toast(`Restored ${n} item${n === 1 ? '' : 's'} ✨`, { tone: 'warm' });
            setTimeout(() => location.reload(), 900);
          } catch (err) {
            toast(err.message || 'That code did not parse', { tone: 'mute' });
          }
        },
        text: 'Bring it over',
      }),
    ]),
  ]);
}
