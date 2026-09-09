/**
 * Day poster — the shareable artefact at the end of the flow.
 *
 * Drawn on a <canvas> from the plan object, so it works offline and needs no
 * screenshot, no server and no export service. Saves as a PNG.
 */
import { h, money, clock } from '../lib/dom.js';
import { sheet, toast } from './overlay.js';
import { DAY_NAMES } from '../core/clock.js';
import { KIND_LABEL, city } from '../data/spots.js';

const W = 1080, H = 1440;

export function makePoster(plan) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  draw(canvas.getContext('2d'), plan);

  const dl = h('button.btn.btn--primary', {
    onclick: () => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daydream-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast('Poster saved to your downloads', { tone: 'warm', icon: '🖼' });
      }, 'image/png');
    },
    text: '⬇  Save as PNG',
  });

  sheet([
    h('div.sheet__pad.poster', {}, [
      h('h2', { style: { marginBottom: '4px' }, text: 'Your day, as a poster' }),
      h('p.u-sm.u-mut', { style: { marginBottom: '18px' }, text: 'Drawn on your device. No upload, no screenshot.' }),
      canvas,
      h('div.u-row', { style: { marginTop: '18px', justifyContent: 'center' } }, [
        dl,
        h('button.btn.btn--ghost', {
          onclick: async () => {
            const txt = asText(plan);
            try { await navigator.clipboard.writeText(txt); toast('Plan copied — paste it to a friend', { icon: '📋' }); }
            catch { toast('Clipboard blocked by the browser', { tone: 'mute' }); }
          },
          text: '📋  Copy as text',
        }),
      ]),
    ]),
  ]);
}

/* ── drawing ─────────────────────────────────────────────── */

function draw(ctx, plan) {
  const stops = plan.stops;
  const date = plan.opts.date;

  // ground
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#FDF3EA'); g.addColorStop(0.55, '#F8E9E1'); g.addColorStop(1, '#F1EBDF');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // sun arc
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#E7A99F'; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(W - 120, 190, 150 + i * 46, 0, Math.PI * 2);
    ctx.globalAlpha = 0.26 - i * 0.07;
    ctx.stroke();
  }
  ctx.globalAlpha = 0.55; ctx.fillStyle = '#F0C579';
  ctx.beginPath(); ctx.arc(W - 120, 190, 92, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // header
  ctx.fillStyle = '#C4694A';
  ctx.font = '600 30px Georgia, serif';
  ctx.fillText('daydream', 84, 116);

  ctx.fillStyle = '#2C2521';
  ctx.font = '600 76px Georgia, serif';
  wrap(ctx, `A day in ${city.name}`, 84, 220, 760, 82);

  ctx.fillStyle = '#5C524B';
  ctx.font = '400 30px system-ui, sans-serif';
  ctx.fillText(`${DAY_NAMES[date.getDay()]} · ${clock(stops[0].arrive)} – ${clock(stops[stops.length - 1].depart)} · ${stops.length} stops`, 84, 292);

  // stops
  let y = 400;
  const rowH = Math.min(126, Math.floor((H - 620) / stops.length));
  stops.forEach((st, i) => {
    ctx.strokeStyle = '#E0D3C7'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(84, y - 34); ctx.lineTo(W - 84, y - 34); ctx.stroke();

    ctx.fillStyle = '#C4694A';
    ctx.font = '600 26px ui-monospace, Consolas, monospace';
    ctx.fillText(clock(st.arrive), 84, y);

    ctx.fillStyle = '#2C2521';
    ctx.font = '600 40px Georgia, serif';
    ctx.fillText(clip(ctx, st.spot.name, 560), 240, y + 4);

    ctx.fillStyle = '#928579';
    ctx.font = '400 24px system-ui, sans-serif';
    ctx.fillText(`${st.spot.area} · ${KIND_LABEL[st.spot.kind]}${st.light?.key === 'golden' ? ' · golden hour' : ''}`, 240, y + 40);

    ctx.fillStyle = '#5C524B';
    ctx.font = '600 30px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(st.cost === 0 ? 'free' : money(st.cost), W - 84, y + 4);
    ctx.textAlign = 'left';

    y += rowH;
  });

  // footer card
  const fy = H - 200;
  round(ctx, 84, fy - 60, W - 168, 150, 26);
  ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fill();

  ctx.fillStyle = '#2C2521';
  ctx.font = '600 44px Georgia, serif';
  ctx.fillText(money(plan.totals.total), 124, fy + 2);

  ctx.fillStyle = '#928579';
  ctx.font = '400 24px system-ui, sans-serif';
  ctx.fillText(`of a ${money(plan.totals.budget)} budget · ${money(plan.totals.travel)} of that was getting around`, 124, fy + 44);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#C4694A';
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText(`🌅 sunset ${clock(plan.sun.sunset)}`, W - 124, fy + 2);
  ctx.fillStyle = '#928579';
  ctx.font = '400 22px system-ui, sans-serif';
  ctx.fillText('planned offline, on a phone', W - 124, fy + 44);
  ctx.textAlign = 'left';
}

function round(ctx, x, y, w, hgt, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + hgt, r);
  ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
  ctx.arcTo(x, y + hgt, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = t;
  }
  ctx.fillText(line, x, yy);
}

function clip(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 4 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function asText(plan) {
  const lines = plan.stops.map(st =>
    `${clock(st.arrive)}  ${st.spot.name} (${st.spot.area}) — ${st.cost === 0 ? 'free' : money(st.cost)}`);
  return [
    `A day in ${city.name} — planned with Daydream`,
    ...lines,
    ``,
    `Total ${money(plan.totals.total)} of ${money(plan.totals.budget)} · sunset ${clock(plan.sun.sunset)}`,
  ].join('\n');
}
