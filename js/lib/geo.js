/** Distance + travel estimation. All local maths — no routing API to lose. */

const R = 6371; // km

export function km(a, b) {
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Estimate a hop between two spots.
 * Street distance ≈ 1.25× crow-fly. Walk 4.6 km/h. Taxi ≈ 26 km/h in traffic,
 * fare modelled on Dubai's meter (AED 12 flagfall, ~AED 2.1/km, AED 12 minimum).
 */
export function leg(a, b, { preferWalk = true } = {}) {
  const d = km(a, b) * 1.25;
  if (d < 0.05) return { mode: 'stay', km: 0, mins: 0, cost: 0 };

  const walkMins = (d / 4.6) * 60;
  const rideMins = 6 + (d / 26) * 60;
  const rideCost = Math.max(12, Math.round(12 + d * 2.1));

  const walkable = d <= (preferWalk ? 1.5 : 0.9);
  return walkable
    ? { mode: 'walk', km: d, mins: Math.round(walkMins), cost: 0 }
    : { mode: 'ride', km: d, mins: Math.round(rideMins), cost: rideCost };
}

export const legLabel = l => ({
  walk: `${Math.round(l.mins)} min walk`,
  ride: `${Math.round(l.mins)} min ride · ~AED ${l.cost}`,
  stay: 'right there',
}[l.mode]);

export const legIcon = l => ({ walk: '🚶', ride: '🚕', stay: '📍' }[l.mode]);
