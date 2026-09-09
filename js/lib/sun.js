/**
 * Golden-hour engine.
 *
 * The client asked for "locations where you can take aesthetic photos".
 * A photo spot without light information is just a pin. So Daydream computes
 * real solar geometry (NOAA / SunCalc-style) on-device and schedules
 * photo-first stops into the light window they actually look good in.
 *
 * Everything is pure maths — it works at 30,000 ft with the radio off.
 */

const rad = Math.PI / 180;
const dayMs = 86400000;
const J1970 = 2440588, J2000 = 2451545;
const e = rad * 23.4397;      // obliquity of the Earth
const J0 = 0.0009;

const toJulian   = d => d.valueOf() / dayMs - 0.5 + J1970;
const fromJulian = j => new Date((j + 0.5 - J1970) * dayMs);
const toDays     = d => toJulian(d) - J2000;

const solarMeanAnomaly = d => rad * (357.5291 + 0.98560028 * d);

function eclipticLongitude(M) {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  return M + C + rad * 102.9372 + Math.PI;
}

const declination = L => Math.asin(Math.sin(e) * Math.sin(L));

const julianCycle   = (d, lw) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (Ht, lw, n) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

function hourAngle(hgt, phi, dec) {
  const x = (Math.sin(hgt) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  return Math.acos(Math.min(1, Math.max(-1, x)));
}

/**
 * Sun event times for a date/place.
 *
 * `date` supplies the calendar day (read from its *local* fields — pass a
 * cityNow()-style date and you get the city's day). `tz` is the city's UTC
 * offset in hours, which keeps the answer correct no matter where the browser
 * running this actually is. The solar day is anchored at local noon: anchoring
 * at "now" silently returns yesterday's sunset when you open the app at 00:10.
 *
 * @returns times in **minutes from local midnight of that day** (may exceed
 *          [0,1440] for high latitudes; the Dubai pack never does).
 */
export function sunTimes(date, lat, lng, tz = 0) {
  const yr = date.getFullYear(), mo = date.getMonth(), dy = date.getDate();
  const noon = new Date(Date.UTC(yr, mo, dy, 12 - tz));    // true instant of local noon
  const midnight = Date.UTC(yr, mo, dy, -tz);              // true instant of local midnight

  const lw = -lng * rad, phi = lat * rad;
  const d = toDays(noon);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const noonJ = solarTransitJ(ds, M, L);

  const at = (angleDeg, rise) => {
    const w = hourAngle(angleDeg * rad, phi, dec);
    const a = approxTransit(w, lw, n);
    const setJ = solarTransitJ(a, M, L);
    const j = rise ? noonJ - (setJ - noonJ) : setJ;
    return (fromJulian(j).getTime() - midnight) / 60000;
  };

  return {
    sunrise:      at(-0.833, true),
    sunset:       at(-0.833, false),
    goldenAM:    [at(-0.833, true), at(6, true)],    // sunrise → sun 6° up
    goldenPM:    [at(6, false), at(-0.833, false)],  // sun 6° up → sunset
    blueAM:      [at(-6, true), at(-0.833, true)],
    bluePM:      [at(-0.833, false), at(-6, false)],
    noon:         (fromJulian(noonJ).getTime() - midnight) / 60000,
  };
}

/** Fraction of overlap between [a1,a2] and [b1,b2], relative to the first span. */
export function overlap(a1, a2, b1, b2) {
  const lo = Math.max(a1, b1), hi = Math.min(a2, b2);
  return Math.max(0, hi - lo) / Math.max(1, a2 - a1);
}

/** Human label for the light a stop will get. */
export function lightAt(mins, t) {
  if (mins >= t.goldenPM[0] && mins <= t.goldenPM[1]) return { key: 'golden', label: 'golden hour', icon: '🌅' };
  if (mins >= t.goldenAM[0] && mins <= t.goldenAM[1]) return { key: 'golden', label: 'morning gold', icon: '🌄' };
  if (mins >= t.bluePM[0]  && mins <= t.bluePM[1])    return { key: 'blue',   label: 'blue hour',   icon: '🌃' };
  if (mins >= t.blueAM[0]  && mins <= t.blueAM[1])    return { key: 'blue',   label: 'blue hour',   icon: '🌌' };
  if (mins > t.sunrise && mins < t.sunset)            return { key: 'day',    label: 'daylight',    icon: '☀️' };
  return { key: 'night', label: 'after dark', icon: '🌙' };
}
