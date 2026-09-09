/**
 * Saved — boards of spots, plus the days you've built.
 *
 * "Users should be able to save spots they love … their saved list should
 * follow them around." Saves are written to IndexedDB *and* localStorage the
 * instant you tap, namespaced under your handle, and queued to the live layer
 * so your other windows/devices catch up. Nothing waits on a network call.
 */
import { h, mount, money, clock, ago } from '../lib/dom.js';
import { spots as ALL_SPOTS } from '../data/spots.js';
import { state } from '../core/state.js';
import { net } from '../lib/net.js';
import { spotCard } from '../ui/card.js';
import { toast } from '../ui/overlay.js';
import { DAY_NAMES } from '../core/clock.js';

let activeBoard = 'want';

export function renderBoards(host) {
  const grid = h('div.masonry');

  const bar = h('div.boardbar');
  const paintBar = () => mount(bar, [
    ...state.boards.map(b => {
      const n = state.savedSpots(b.id).length;
      return h('button.pill' + (activeBoard === b.id ? ' is-on' : ''), {
        onclick: () => { activeBoard = b.id; paintBar(); paintGrid(grid); },
        text: `${b.emoji} ${b.name} · ${n}`,
      });
    }),
    h('button.pill.pill--ghost', {
      onclick: () => {
        const name = prompt('Name this board (e.g. “rainy day”, “when mum visits”)');
        if (!name) return;
        const b = state.addBoard(name.trim(), '📌');
        activeBoard = b.id;
        paintBar(); paintGrid(grid);
        toast(`Board <b>${b.name}</b> created`, { tone: 'warm' });
      },
      text: '+ new board',
    }),
  ]);
  paintBar();

  mount(host,
    h('div.sec.sec--row', {}, [
      h('div', {}, [
        h('h2.sec__title', { text: 'Saved' }),
        h('p.sec__sub', { html: `Kept on this device under <b>@${state.me?.handle || 'you'}</b>${net.online ? '' : ' — offline, and still all here'}. Sign in with the same handle anywhere and it comes back.` }),
      ]),
    ]),
    bar,
    grid,
    plansSection(),
  );

  paintGrid(grid);

  state.addEventListener('saves', () => { paintBar(); paintGrid(grid); });
}

function paintGrid(grid) {
  const list = state.savedSpots(activeBoard);
  if (!list.length) {
    return mount(grid, [h('div.empty', { style: { gridColumn: '1/-1' } }, [
      h('div.empty__ico', { text: '❥' }),
      h('h3', { text: 'Nothing on this board yet' }),
      h('p', { text: 'Tap the heart on anything in Discover. It saves instantly — signal or not — and stays put.' }),
      h('button.btn.btn--primary', {
        onclick: () => document.dispatchEvent(new CustomEvent('dd:nav', { detail: 'discover' })),
        text: '✿  Find something to save',
      }),
    ])]);
  }

  mount(grid, list.map(s => {
    const card = spotCard(s);
    const move = h('div.stop__acts', { style: { padding: '0 12px 12px' } },
      state.boards.filter(b => b.id !== state.boardOf(s.id)).slice(0, 3).map(b =>
        h('button.pill.pill--tiny', {
          onclick: ev => {
            ev.stopPropagation();
            state.moveToBoard(s.id, b.id);
            toast(`Moved to <b>${b.name}</b>`, { tone: 'warm' });
          },
          text: `→ ${b.emoji}`,
          title: `Move to ${b.name}`,
        })));
    card.append(move);
    return card;
  }));
}

/* ── saved days ── */

function plansSection() {
  const wrap = h('div', { style: { marginTop: '34px' } });

  const paint = () => {
    if (!state.plans.length) {
      return mount(wrap, [
        h('div.sec', {}, [h('h2.sec__title', { text: 'Your days' })]),
        h('div.empty', {}, [
          h('div.empty__ico', { text: '✧' }),
          h('h3', { text: 'No days saved yet' }),
          h('p', { text: 'Build one in Plan, hit “Save day”, and it lives here — with the times, the stops and what it cost.' }),
        ]),
      ]);
    }

    mount(wrap,
      h('div.sec', {}, [
        h('h2.sec__title', { text: 'Your days' }),
        h('p.sec__sub', { text: `${state.plans.length} saved itinerar${state.plans.length > 1 ? 'ies' : 'y'}, stored locally.` }),
      ]),
      h('div', {}, state.plans.map(p => {
        const d = new Date(p.date);
        return h('div.stop', { style: { animation: 'none' } }, [
          h('div.stop__in', {}, [
            h('div.stop__main', {}, [
              h('div.stop__time', { text: `${DAY_NAMES[d.getDay()]} · ${clock(p.start)} · saved ${ago(p.at)}` }),
              h('h3.stop__name', { text: p.title }),
              h('div.stop__meta', {}, [
                h('span', { text: `${p.stops.length} stops` }),
                h('span', { text: '·' }),
                h('span', { text: `${money(p.spent)} of ${money(p.budget)}` }),
              ]),
              h('div.stop__why', { text: p.stops.map(s => ALL_SPOTS.find(x => x.id === s.id)?.name).filter(Boolean).join(' → ') }),
            ]),
          ]),
          h('div.stop__acts', {}, [
            h('button.btn.btn--ghost.btn--sm', {
              onclick: () => { state.deletePlan(p.id); paint(); toast('Day removed', { tone: 'mute' }); },
              text: 'Delete',
            }),
          ]),
        ]);
      })));
  };

  paint();
  state.addEventListener('plans', paint);
  return wrap;
}
