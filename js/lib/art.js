/**
 * Procedural cover art.
 *
 * WHY THIS EXISTS: the brief's hardest requirement is "works great with no
 * signal". A pretty, image-heavy Pinterest grid that pulls 40 photos from a
 * CDN is exactly the thing that dies on a dead connection. So Daydream draws
 * every cover itself: deterministic SVG generated from the spot's id, meaning
 * zero image requests, ~0 bytes, identical art on every device and reload,
 * and a grid that looks the same in a basement as it does on fibre.
 */
import { rng, hash, clamp } from './dom.js';

const PALETTES = {
  cafe:     [['#F6DFCB', '#E5B08A', '#8C4A2F'], ['#F2D5C4', '#D99B79', '#7E3F27'], ['#F7E7D6', '#DFAE86', '#8A5334']],
  dessert:  [['#FBE2DC', '#EEB2A8', '#A4544A'], ['#F9DDE4', '#E7A9BA', '#9C4A5E'], ['#FDEAE2', '#F0BBA9', '#A85B45']],
  photo:    [['#E7DAEC', '#C3AACD', '#5D4361'], ['#EADEE8', '#BFA3C4', '#57395C'], ['#E2DCEE', '#AFA6CF', '#4C4272']],
  art:      [['#E9DCEF', '#C2A9CE', '#5A4062'], ['#EFE0E6', '#D0A8B8', '#71405A']],
  activity: [['#DFEAD6', '#B4C8A4', '#4F6642'], ['#E4EDD9', '#A9C199', '#47603C'], ['#DCEAE0', '#A6C4AD', '#3F6350']],
  nature:   [['#DDEBD8', '#A8C69C', '#456038'], ['#E3EFDD', '#B7D0A6', '#4E6A40']],
  view:     [['#DEE9F1', '#A6C1D6', '#3F5F79'], ['#E4EDF3', '#9FBBD2', '#375570'], ['#E9E4F0', '#B0B6D8', '#3F4A75']],
  market:   [['#FBEDD2', '#EFCE95', '#8C6224'], ['#FAE8CE', '#E9C089', '#82571F']],
};

const SCENES = ['arch', 'sun', 'vessels', 'polaroid', 'arcs', 'skyline', 'fronds', 'swirl', 'windowpane'];

/** Scenes that suit each kind, in preference order. */
const KIND_SCENES = {
  cafe:     ['arch', 'swirl', 'windowpane', 'vessels'],
  dessert:  ['swirl', 'arcs', 'vessels'],
  photo:    ['polaroid', 'arch', 'sun', 'arcs'],
  art:      ['arcs', 'polaroid', 'vessels', 'windowpane'],
  activity: ['vessels', 'arcs', 'windowpane'],
  nature:   ['fronds', 'sun', 'arcs'],
  view:     ['skyline', 'sun', 'arcs'],
  market:   ['arcs', 'windowpane', 'fronds'],
};

/**
 * @param {{id:string, kind:string}} spot
 * @returns {string} SVG markup, viewBox 0 0 100 100, slice-fitted.
 */
export function coverSVG(spot, { ratio = 1 } = {}) {
  const seed = hash(spot.id + '|' + spot.kind);
  const r = rng(seed);
  const pool = PALETTES[spot.kind] || PALETTES.cafe;
  const p = pool[seed % pool.length];
  const choices = KIND_SCENES[spot.kind] || SCENES;
  const scene = choices[Math.floor(r() * choices.length) % choices.length];
  const id = 'g' + seed.toString(36);
  const H = Math.round(100 * ratio);

  const body = ({
    arch, sun, vessels, polaroid, arcs, skyline, fronds, swirl, windowpane,
  }[scene] || arch)(p, r, id, H);

  return `<svg viewBox="0 0 100 ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${scene} illustration">
  <defs>
    <linearGradient id="${id}bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/>
    </linearGradient>
    <linearGradient id="${id}gl" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100" height="${H}" fill="url(#${id}bg)"/>
  ${body}
  <rect width="100" height="${H}" fill="url(#${id}gl)" opacity=".35"/>
  ${speckles(r, H)}
</svg>`;
}

/** Turn markup into a live node. */
export function svgNode(markup) {
  const t = document.createElement('div');
  t.innerHTML = markup.trim();
  return t.firstElementChild;
}

export const cover = (spot, opts) => svgNode(coverSVG(spot, opts));

/* ────────────────────────── scenes ────────────────────────── */

function arch(p, r, id, H) {
  const w = 46 + r() * 12, x = 50 - w / 2;
  const top = H * (0.18 + r() * 0.08);
  const rad = w / 2;
  return `
  <g opacity=".95">
    <path d="M${x} ${H} V${top + rad} A${rad} ${rad} 0 0 1 ${x + w} ${top + rad} V${H} Z" fill="${p[2]}" opacity=".16"/>
    <path d="M${x + 5} ${H} V${top + rad + 3} A${rad - 5} ${rad - 5} 0 0 1 ${x + w - 5} ${top + rad + 3} V${H} Z" fill="#fff" opacity=".5"/>
    <circle cx="50" cy="${top + rad - 4}" r="${5 + r() * 3}" fill="${p[2]}" opacity=".3"/>
  </g>
  <path d="M0 ${H} Q25 ${H - 14} 50 ${H - 4} T100 ${H - 12} V${H} Z" fill="${p[2]}" opacity=".18"/>`;
}

function sun(p, r, id, H) {
  const cy = H * (0.36 + r() * 0.1);
  const rad = 15 + r() * 9;
  const rings = 2 + Math.floor(r() * 3);
  let out = `<circle cx="50" cy="${cy}" r="${rad}" fill="#fff" opacity=".62"/>`;
  for (let i = 1; i <= rings; i++) {
    out += `<circle cx="50" cy="${cy}" r="${rad + i * (5 + r() * 4)}" fill="none" stroke="#fff" stroke-opacity="${0.3 - i * 0.06}" stroke-width="1.2"/>`;
  }
  const h1 = H * 0.72, h2 = H * 0.82;
  out += `<path d="M0 ${h1} Q30 ${h1 - 13} 55 ${h1 + 2} T100 ${h1 - 6} V${H} H0 Z" fill="${p[2]}" opacity=".22"/>`;
  out += `<path d="M0 ${h2} Q35 ${h2 - 11} 68 ${h2 + 3} T100 ${h2} V${H} H0 Z" fill="${p[2]}" opacity=".4"/>`;
  return out;
}

function vessels(p, r, id, H) {
  const base = H * 0.8;
  let out = `<rect x="0" y="${base}" width="100" height="${H - base}" fill="${p[2]}" opacity=".2"/>`;
  const n = 2 + Math.floor(r() * 2);
  const span = 100 / (n + 1);
  for (let i = 1; i <= n; i++) {
    const cx = span * i + (r() * 8 - 4);
    const hgt = H * (0.2 + r() * 0.22);
    const wid = 11 + r() * 9;
    const neck = wid * (0.3 + r() * 0.25);
    const y = base - hgt;
    out += `<g opacity=".9">
      <path d="M${cx - neck} ${y} h${neck * 2} l${wid - neck} ${hgt * 0.45} q0 ${hgt * 0.55} ${-wid} ${hgt * 0.55} q${-wid} 0 ${-wid} ${-hgt * 0.55} Z"
        fill="${i % 2 ? '#fff' : p[2]}" opacity="${i % 2 ? '.72' : '.34'}"/>
      <ellipse cx="${cx}" cy="${y}" rx="${neck}" ry="${neck * 0.35}" fill="${p[2]}" opacity=".28"/>
    </g>`;
  }
  return out;
}

function polaroid(p, r, id, H) {
  const tilt = (r() * 12 - 6).toFixed(1);
  const w = 58, hh = Math.min(H * 0.68, 70);
  const x = 50 - w / 2, y = (H - hh) / 2 - 2;
  const iw = w - 8, ih = hh - 14;
  const ix = x + 4, iy = y + 4;
  const horizon = iy + ih * 0.62;
  return `
  <defs>
    <linearGradient id="${id}pol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p[2]}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${p[2]}" stop-opacity=".12"/>
    </linearGradient>
  </defs>
  <g transform="rotate(${tilt} 50 ${H / 2})">
    <rect x="${x - 1}" y="${y - 1}" width="${w + 2}" height="${hh + 2}" rx="2.5" fill="${p[2]}" opacity=".14"/>
    <rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="2" fill="#fff" opacity=".95"/>
    <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#${id}pol)"/>
    <circle cx="${ix + iw * 0.68}" cy="${iy + ih * 0.3}" r="${ih * 0.16}" fill="#fff" opacity=".85"/>
    <path d="M${ix} ${horizon} q${iw * 0.28} ${-ih * 0.24} ${iw * 0.55} ${ih * 0.05} t${iw * 0.45} ${-ih * 0.12} V${iy + ih} H${ix} Z" fill="${p[2]}" opacity=".5"/>
    <path d="M${ix} ${horizon + ih * 0.2} q${iw * 0.35} ${-ih * 0.16} ${iw * 0.7} ${ih * 0.04} t${iw * 0.3} ${-ih * 0.06} V${iy + ih} H${ix} Z" fill="${p[2]}" opacity=".72"/>
    <rect x="${x + 8}" y="${y + hh - 6.5}" width="${w * 0.4}" height="1.8" rx="0.9" fill="${p[2]}" opacity=".32"/>
  </g>`;
}

function arcs(p, r, id, H) {
  const cy = H * (0.86 + r() * 0.06);
  let out = '';
  const n = 3 + Math.floor(r() * 3);
  for (let i = n; i >= 1; i--) {
    const rad = 14 + i * (7 + r() * 4);
    out += `<path d="M${50 - rad} ${cy} a${rad} ${rad} 0 0 1 ${rad * 2} 0" fill="none"
      stroke="${i % 2 ? '#fff' : p[2]}" stroke-opacity="${i % 2 ? '.6' : '.3'}" stroke-width="${5 + r() * 3}" stroke-linecap="round"/>`;
  }
  out += `<circle cx="${18 + r() * 12}" cy="${H * 0.22}" r="${4 + r() * 4}" fill="#fff" opacity=".55"/>`;
  return out;
}

function skyline(p, r, id, H) {
  const base = H * 0.86;
  let out = `<circle cx="${68 + r() * 20}" cy="${H * 0.24}" r="${8 + r() * 5}" fill="#fff" opacity=".6"/>`;
  let x = -4;
  while (x < 104) {
    const w = 7 + r() * 13;
    const hgt = (0.18 + r() * 0.5) * H;
    out += `<rect x="${x}" y="${base - hgt}" width="${w}" height="${hgt}" rx="1.5" fill="${p[2]}" opacity="${(0.2 + r() * 0.26).toFixed(2)}"/>`;
    x += w + 1.5 + r() * 3;
  }
  out += `<rect x="0" y="${base}" width="100" height="${H - base}" fill="${p[2]}" opacity=".34"/>`;
  return out;
}

function fronds(p, r, id, H) {
  let out = '';
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const bx = r() * 100, by = H + 4;
    const tx = bx + (r() * 46 - 23), ty = H * (0.16 + r() * 0.4);
    out += `<path d="M${bx} ${by} Q${(bx + tx) / 2 + 10} ${(by + ty) / 2} ${tx} ${ty}"
      fill="none" stroke="${i % 2 ? '#fff' : p[2]}" stroke-opacity="${i % 2 ? '.55' : '.3'}" stroke-width="2.4" stroke-linecap="round"/>`;
    for (let k = 1; k <= 6; k++) {
      const t = k / 7;
      const px = bx + (tx - bx) * t + 6 * Math.sin(t * 3);
      const py = by + (ty - by) * t;
      const len = 9 * (1 - Math.abs(t - 0.5));
      out += `<ellipse cx="${px}" cy="${py}" rx="${len}" ry="2.4" transform="rotate(${-30 + t * 20} ${px} ${py})"
        fill="${i % 2 ? '#fff' : p[2]}" opacity="${i % 2 ? '.42' : '.26'}"/>`;
    }
  }
  return out;
}

function swirl(p, r, id, H) {
  const cy = H * 0.5;
  let out = `<circle cx="50" cy="${cy}" r="${26 + r() * 6}" fill="#fff" opacity=".55"/>`;
  let d = `M50 ${cy}`;
  const turns = 3.2 + r();
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * turns * Math.PI * 2;
    const rad = (i / 120) * (20 + r() * 3);
    d += ` L${(50 + rad * Math.cos(t)).toFixed(2)} ${(cy + rad * Math.sin(t) * 0.92).toFixed(2)}`;
  }
  out += `<path d="${d}" fill="none" stroke="${p[2]}" stroke-opacity=".4" stroke-width="2.2" stroke-linecap="round"/>`;
  out += `<circle cx="50" cy="${cy}" r="${29 + r() * 6}" fill="none" stroke="${p[2]}" stroke-opacity=".22" stroke-width="2.5"/>`;
  return out;
}

function windowpane(p, r, id, H) {
  const cols = 2 + Math.floor(r() * 2), rows = 2 + Math.floor(r() * 2);
  const m = 12, w = (100 - m * 2) / cols, hh = (H - m * 2) / rows;
  let out = `<rect x="${m - 3}" y="${m - 3}" width="${100 - (m - 3) * 2}" height="${H - (m - 3) * 2}" rx="4" fill="${p[2]}" opacity=".2"/>`;
  for (let c = 0; c < cols; c++) {
    for (let rw = 0; rw < rows; rw++) {
      const x = m + c * w + 1.6, y = m + rw * hh + 1.6;
      const topRow = rw === 0;
      out += topRow
        ? `<path d="M${x} ${y + hh - 3.2} V${y + (w - 3.2) / 2} a${(w - 3.2) / 2} ${(w - 3.2) / 2} 0 0 1 ${w - 3.2} 0 V${y + hh - 3.2} Z" fill="#fff" opacity="${(0.4 + r() * 0.35).toFixed(2)}"/>`
        : `<rect x="${x}" y="${y}" width="${w - 3.2}" height="${hh - 3.2}" rx="1.5" fill="#fff" opacity="${(0.35 + r() * 0.4).toFixed(2)}"/>`;
    }
  }
  return out;
}

/** Light dust so flat gradients don't look plasticky. */
function speckles(r, H) {
  let out = '';
  for (let i = 0; i < 14; i++) {
    out += `<circle cx="${(r() * 100).toFixed(1)}" cy="${(r() * H).toFixed(1)}" r="${(0.4 + r() * 0.9).toFixed(2)}" fill="#fff" opacity="${(0.12 + r() * 0.25).toFixed(2)}"/>`;
  }
  return out;
}

/* ── card heights: a masonry grid needs varied aspect ratios ── */
export function cardRatio(spot) {
  const r = rng(hash(spot.id) ^ 0x9e37);
  return clamp(0.78 + Math.round(r() * 5) * 0.11, 0.78, 1.35);
}
