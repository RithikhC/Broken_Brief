/**
 * City time.
 *
 * "Cool stuff happening around them RIGHT NOW" only means anything if the app
 * knows what time it is *there*. Everything open/closed, every "happening now"
 * badge and all the golden-hour maths runs on the city's clock (UTC+4 for the
 * Dubai pack), so the demo behaves correctly from any timezone.
 */
import { city } from '../data/spots.js';
import { sunTimes } from '../lib/sun.js';

/** A Date whose *local fields* read as the city's wall clock. */
export function cityNow(base = Date.now()) {
  const d = new Date(base);
  return new Date(d.getTime() + (city.tz * 60 + d.getTimezoneOffset()) * 60000);
}

export const nowMins = () => {
  const d = cityNow();
  return d.getHours() * 60 + d.getMinutes();
};

export const today = () => cityNow();
export const dayIdx = () => cityNow().getDay();

export const sunToday = (date = cityNow()) => sunTimes(date, city.lat, city.lng, city.tz);

export function isOpenNow(spot, t = nowMins(), d = dayIdx()) {
  if (!spot.hours.days.includes(d)) return false;
  return t >= spot.hours.from && t < Math.min(spot.hours.to, 1440);
}

export function opensLater(spot, t = nowMins(), d = dayIdx()) {
  return spot.hours.days.includes(d) && t < spot.hours.from;
}

/** Minutes until a spot's golden-hour window starts (null if not today / passed). */
export function goldenIn(spot, sun = sunToday(), t = nowMins()) {
  if (spot.light !== 'golden' && spot.light !== 'blue') return null;
  const win = spot.light === 'blue' ? sun.bluePM : sun.goldenPM;
  if (t > win[1]) return null;
  return Math.max(0, Math.round(win[0] - t));
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
