/**
 * Dubai city pack.
 *
 * Districts, parks and landmarks are real and geocoded to ~district accuracy so
 * travel times and the golden-hour maths behave sensibly. Independent venues
 * (cafés, studios, pop-ups) are original to Daydream — a demo shouldn't put
 * invented prices or opening hours in a real small business's mouth. Costs are
 * per-person AED estimates; times are typical dwell times.
 *
 * The shape is deliberately portable: drop in another `city` + `spots` array
 * and the entire app — planner, golden hour, budget maths — re-targets.
 *
 * hours.days: 0 = Sunday … 6 = Saturday
 * light: which light the spot is *for* — drives golden-hour scheduling
 */

export const city = {
  id: 'dxb',
  name: 'Dubai',
  lat: 25.2048,
  lng: 55.2708,
  tz: 4,                    // UTC+4, so the day works out even if you demo abroad
  currency: 'AED',
};

const ALL = [0, 1, 2, 3, 4, 5, 6];
const h = (from, to, days = ALL) => ({ from, to, days });

export const spots = [
  /* ── cafés ─────────────────────────────────────────────── */
  {
    id: 'c-slowpour', name: 'The Slow Pour', area: 'Alserkal Avenue', kind: 'cafe',
    lat: 25.1449, lng: 55.2283, cost: 42, mins: 60, photo: 4, light: 'indoor', indoor: true,
    hours: h(450, 1320), vibes: ['soft', 'film', 'artsy'],
    blurb: 'Concrete, one long oak table and a filter bar that takes coffee far too seriously. Warehouse light through the roller door until about 4pm.',
    tip: 'Sit on the left bench around 3pm — the door light hits the table like a studio softbox.',
    tags: ['filter coffee', 'quiet', 'laptop-friendly'],
  },
  {
    id: 'c-mothmortar', name: 'Moth & Mortar', area: 'Al Fahidi', kind: 'cafe',
    lat: 25.2639, lng: 55.2975, cost: 35, mins: 55, photo: 5, light: 'golden', indoor: false,
    hours: h(480, 1290), vibes: ['soft', 'film', 'oldtown'],
    blurb: 'A courtyard café inside a wind-tower house. Cardamom lattes, low benches, and a fig tree that throws the prettiest shadows in the old town.',
    tip: 'The courtyard goes fully golden about 45 minutes before sunset. Ask for the corner table.',
    tags: ['courtyard', 'heritage', 'cardamom latte'],
  },
  {
    id: 'c-greenroom', name: 'Green Room Coffee', area: 'Al Quoz', kind: 'cafe',
    lat: 25.1421, lng: 55.2331, cost: 38, mins: 50, photo: 4, light: 'indoor', indoor: true,
    hours: h(450, 1260), vibes: ['soft', 'green', 'matcha'],
    blurb: 'Plant-wall café attached to a nursery. Ceramic cups, matcha soft serve, and the smell of wet soil in the best way.',
    tip: 'Matcha soft serve is only made until 5pm.',
    tags: ['plants', 'matcha', 'small'],
  },
  {
    id: 'c-latehours', name: 'Late Hours', area: 'Business Bay', kind: 'cafe',
    lat: 25.1862, lng: 55.2618, cost: 45, mins: 65, photo: 3, light: 'indoor', indoor: true,
    hours: h(600, 1500), vibes: ['buzzy', 'soft'],
    blurb: 'Open absurdly late. Half library, half listening bar — vinyl, mismatched lamps, very good affogato.',
    tip: 'After 10pm they turn the lamps down and the record volume up.',
    tags: ['late night', 'vinyl', 'affogato'],
  },
  {
    id: 'c-driftwood', name: 'Driftwood Coffee Cart', area: 'Kite Beach', kind: 'cafe',
    lat: 25.1826, lng: 55.2295, cost: 22, mins: 30, photo: 4, light: 'golden', indoor: false,
    hours: h(390, 1140), vibes: ['water', 'budget', 'soft'],
    blurb: 'A tiny cart on the sand with three stools and an unreasonably good cortado. You drink it looking at the water.',
    tip: 'Cheapest good coffee on this list — grab one and walk the beach.',
    tags: ['beach', 'cheap', 'takeaway'],
  },
  {
    id: 'c-paperhouse', name: 'Paper House', area: 'Dubai Design District', kind: 'cafe',
    lat: 25.1876, lng: 55.2955, cost: 40, mins: 55, photo: 5, light: 'indoor', indoor: true,
    hours: h(480, 1260, [0, 1, 2, 3, 4, 6]), vibes: ['artsy', 'soft', 'film'],
    blurb: 'Bookshop café with butter-yellow walls, a mezzanine and a reading nook that people queue for.',
    tip: 'Mezzanine window seat, mid-morning — soft north light, no harsh shadows.',
    tags: ['bookshop', 'mezzanine', 'pastries'],
  },

  /* ── sweet things ──────────────────────────────────────── */
  {
    id: 'd-rosegelato', name: 'Rosewater Gelato', area: 'City Walk', kind: 'dessert',
    lat: 25.2054, lng: 55.2617, cost: 28, mins: 25, photo: 4, light: 'any', indoor: true,
    hours: h(600, 1380), vibes: ['sweet', 'soft', 'buzzy'],
    blurb: 'Pistachio-rose, saffron-honey, and a mint-lime sorbet that fixes a hot afternoon.',
    tip: 'Two scoops in a cup photographs better than a cone. Trust.',
    tags: ['gelato', 'rose', 'quick'],
  },
  {
    id: 'd-kunafa', name: 'Ounce Kunafa Bar', area: 'Al Seef', kind: 'dessert',
    lat: 25.2601, lng: 55.2989, cost: 32, mins: 30, photo: 4, light: 'blue', indoor: false,
    hours: h(720, 1410), vibes: ['sweet', 'oldtown', 'water'],
    blurb: 'Cheese kunafa cut to order on the creek promenade, eaten standing up while abras chug past.',
    tip: 'Get it after sunset — the creek lights come on and the whole promenade goes blue-hour blue.',
    tags: ['kunafa', 'creek', 'street food'],
  },
  {
    id: 'd-butterfold', name: 'Butterfold Bakery', area: 'Jumeirah', kind: 'dessert',
    lat: 25.2201, lng: 55.2521, cost: 30, mins: 30, photo: 5, light: 'indoor', indoor: true,
    hours: h(420, 900), vibes: ['sweet', 'soft', 'film'],
    blurb: 'Laminated everything. Pistachio croissants come out at 8 and again at 11 and are gone within the hour.',
    tip: 'Be there for the 11am tray or make peace with a cinnamon knot.',
    tags: ['croissants', 'morning', 'sells out'],
  },

  /* ── photo spots ───────────────────────────────────────── */
  {
    id: 'p-fahidi', name: 'Al Fahidi Lanes', area: 'Al Fahidi', kind: 'photo',
    lat: 25.2637, lng: 55.2977, cost: 0, mins: 55, photo: 5, light: 'golden', indoor: false,
    hours: h(360, 1200), vibes: ['film', 'oldtown', 'budget', 'soft'],
    blurb: 'Sand-coloured walls, wind towers and lanes barely wide enough for two people. The most forgiving light in the city.',
    tip: 'Late afternoon the walls go peach and the shadows get long and graphic. Wear something plain.',
    tags: ['heritage', 'free', 'alleyways'],
  },
  {
    id: 'p-canalstairs', name: 'Water Canal Stairs', area: 'Dubai Water Canal', kind: 'photo',
    lat: 25.1883, lng: 55.2471, cost: 0, mins: 40, photo: 4, light: 'blue', indoor: false,
    hours: h(0, 1440), vibes: ['film', 'water', 'budget', 'sunset'],
    blurb: 'Wide amphitheatre steps down to the canal with the skyline stacked behind. Empty on weekday evenings.',
    tip: 'Blue hour, 20 minutes after sunset — city lights on, sky still holding colour.',
    tags: ['free', '24h', 'skyline'],
  },
  {
    id: 'p-frame', name: 'Dubai Frame Approach', area: 'Zabeel Park', kind: 'photo',
    lat: 25.2354, lng: 55.3005, cost: 50, mins: 70, photo: 5, light: 'golden', indoor: false,
    hours: h(540, 1290), vibes: ['film', 'buzzy'],
    blurb: 'Old city on one side, new city on the other, a giant gold rectangle in between. Even the walk up is a shot.',
    tip: 'Shoot from the park lawn before you go in — the frame catches the sun about an hour before it sets.',
    tags: ['landmark', 'ticketed', 'skyline'],
  },
  {
    id: 'p-palmwest', name: 'Palm West Boardwalk', area: 'Palm Jumeirah', kind: 'photo',
    lat: 25.1121, lng: 55.1382, cost: 0, mins: 50, photo: 4, light: 'golden', indoor: false,
    hours: h(0, 1440), vibes: ['water', 'sunset', 'budget', 'buzzy'],
    blurb: 'Palm-lined promenade facing straight west. Roller skaters, dogs, and the most reliable sunset in Dubai.',
    tip: 'Face the water 30 min before sunset for backlit hair-halo shots.',
    tags: ['free', 'sunset', 'boardwalk'],
  },
  {
    id: 'p-pinkwall', name: 'The Pink Wall, Satwa', area: 'Satwa', kind: 'photo',
    lat: 25.2298, lng: 55.2742, cost: 0, mins: 25, photo: 4, light: 'day', indoor: false,
    hours: h(420, 1140), vibes: ['film', 'budget', 'artsy'],
    blurb: 'A whole block of bubblegum-pink shopfronts and hand-painted signage. Two minutes of walking, twenty good frames.',
    tip: 'Overcast days are best — direct midday sun blows the pink out.',
    tags: ['free', 'street', 'colour'],
  },
  {
    id: 'p-bluesouk', name: 'Spice Souk Arcades', area: 'Deira', kind: 'photo',
    lat: 25.2681, lng: 55.2962, cost: 0, mins: 45, photo: 5, light: 'day', indoor: false,
    hours: h(540, 1320, [0, 1, 2, 3, 4, 6]), vibes: ['film', 'oldtown', 'budget', 'buzzy'],
    blurb: 'Wooden arcades, hanging sacks of saffron and dried lemon, light coming down in slats.',
    tip: 'Buy something small before you photograph a stall — it changes the whole interaction.',
    tags: ['free', 'market', 'texture'],
  },
  {
    id: 'p-creekharbour', name: 'Creek Harbour Promenade', area: 'Creek Harbour', kind: 'photo',
    lat: 25.1998, lng: 55.3452, cost: 0, mins: 45, photo: 4, light: 'blue', indoor: false,
    hours: h(0, 1440), vibes: ['water', 'sunset', 'budget', 'soft'],
    blurb: 'The whole downtown skyline reflected in flat water, with almost nobody in the frame.',
    tip: 'Weeknights are empty. Tripod-friendly if you have one.',
    tags: ['free', 'reflections', 'quiet'],
  },

  /* ── art & galleries ───────────────────────────────────── */
  {
    id: 'a-alserkal', name: 'Alserkal Avenue Galleries', area: 'Alserkal Avenue', kind: 'art',
    lat: 25.1447, lng: 55.2280, cost: 0, mins: 80, photo: 5, light: 'indoor', indoor: true,
    hours: h(600, 1200, [0, 1, 2, 3, 4, 6]), vibes: ['artsy', 'film', 'budget', 'soft'],
    blurb: 'A dozen converted warehouses of contemporary galleries. Free to walk into all of them, and the corridors between are half the appeal.',
    tip: 'Most galleries close Sundays. Concrete + skylights = beautiful diffuse light all day.',
    tags: ['free', 'galleries', 'warehouse'],
  },
  {
    id: 'a-d3', name: 'd3 Sculpture Walk', area: 'Dubai Design District', kind: 'art',
    lat: 25.1869, lng: 55.2960, cost: 0, mins: 45, photo: 4, light: 'golden', indoor: false,
    hours: h(0, 1440), vibes: ['artsy', 'budget', 'film'],
    blurb: 'Public sculpture and rotating murals between the design studios. Concrete plazas that go warm and long at the end of the day.',
    tip: 'The mural wall behind Building 6 changes every few months.',
    tags: ['free', 'sculpture', 'murals'],
  },
  {
    id: 'a-printroom', name: 'The Print Room', area: 'Al Quoz', kind: 'art',
    lat: 25.1465, lng: 55.2312, cost: 25, mins: 50, photo: 4, light: 'indoor', indoor: true,
    hours: h(660, 1200, [1, 2, 3, 4, 5, 6]), vibes: ['artsy', 'hands', 'film'],
    blurb: 'Risograph studio and zine shop. Ink-stained tables, flat files you can flip through, prints from AED 25.',
    tip: 'They let you watch the riso run if you ask nicely.',
    tags: ['riso', 'zines', 'cheap prints'],
  },

  /* ── make-something ────────────────────────────────────── */
  {
    id: 'x-ceramichour', name: 'Ceramic Hour Studio', area: 'Al Quoz', kind: 'activity',
    lat: 25.1438, lng: 55.2352, cost: 165, mins: 105, photo: 5, light: 'indoor', indoor: true, book: true,
    hours: h(600, 1260), vibes: ['hands', 'soft', 'artsy'],
    blurb: 'Wheel-throwing taster. Two hours, an apron, and one wobbly bowl you will love unreasonably. Firing and glazing included.',
    tip: 'Book the 4pm slot — quieter, and the studio light is gorgeous by then. Pieces are ready in ~3 weeks.',
    tags: ['pottery', 'booking', '2 hours'],
  },
  {
    id: 'x-clayandco', name: 'Clay & Co. Hand-Building', area: 'Jumeirah', kind: 'activity',
    lat: 25.2168, lng: 55.2489, cost: 120, mins: 90, photo: 4, light: 'indoor', indoor: true, book: true,
    hours: h(630, 1230), vibes: ['hands', 'soft'],
    blurb: 'No wheel, no pressure — pinch pots, coil vases and a table full of people quietly making things.',
    tip: 'The cheaper pottery option, and easier if it is your first time.',
    tags: ['pottery', 'beginner', 'no wheel'],
  },
  {
    id: 'x-paintsip', name: 'Palette & Pour', area: 'City Walk', kind: 'activity',
    lat: 25.2039, lng: 55.2631, cost: 140, mins: 120, photo: 4, light: 'indoor', indoor: true, book: true,
    hours: h(900, 1320), vibes: ['hands', 'buzzy', 'artsy'],
    blurb: 'Guided paint night — canvas, easel, someone talking you through it, and everyone ends up with a different painting anyway.',
    tip: 'Evening sessions only. Wear something you do not mind ruining.',
    tags: ['painting', 'evening', 'group'],
  },
  {
    id: 'x-candlebar', name: 'The Candle Bar', area: 'Al Barsha', kind: 'activity',
    lat: 25.1104, lng: 55.1978, cost: 95, mins: 60, photo: 4, light: 'indoor', indoor: true, book: true,
    hours: h(660, 1290), vibes: ['hands', 'soft', 'sweet'],
    blurb: 'Pick a vessel, blend a scent, pour it yourself. Sets in 40 minutes while you have a tea.',
    tip: 'Cheapest make-something on the list and you walk out holding it.',
    tags: ['candles', 'scent', 'short'],
  },
  {
    id: 'x-filmlab', name: 'Grain Film Lab', area: 'Al Quoz', kind: 'activity',
    lat: 25.1471, lng: 55.2288, cost: 60, mins: 45, photo: 5, light: 'indoor', indoor: true,
    hours: h(660, 1200, [0, 1, 2, 3, 4, 6]), vibes: ['film', 'artsy', 'hands'],
    blurb: 'Drop off a roll, browse the used-camera case, come back for scans. The counter is a museum of point-and-shoots.',
    tip: 'Same-day dev if you drop before noon — perfect bookend to a photo walk.',
    tags: ['film', 'develop', 'cameras'],
  },
  {
    id: 'x-potteryglaze', name: 'Glaze Night', area: 'Alserkal Avenue', kind: 'activity',
    lat: 25.1452, lng: 55.2271, cost: 85, mins: 75, photo: 4, light: 'indoor', indoor: true, book: true,
    hours: h(1020, 1320, [1, 2, 3, 4, 5]), vibes: ['hands', 'soft', 'artsy'],
    blurb: 'Paint a bisque piece someone else threw. All the fun of the glaze, none of the centring.',
    tip: 'Weekday evenings only. Pieces fired and collectable in a week.',
    tags: ['pottery', 'evening', 'no skill needed'],
  },

  /* ── views ─────────────────────────────────────────────── */
  {
    id: 'v-burjpark', name: 'Burj Park Lawn', area: 'Downtown', kind: 'view',
    lat: 25.1955, lng: 55.2739, cost: 0, mins: 45, photo: 5, light: 'blue', indoor: false,
    hours: h(0, 1440), vibes: ['budget', 'sunset', 'buzzy', 'water'],
    blurb: 'Grass, the fountain, and the tower going up forever. Free, and better than most of the paid views.',
    tip: 'Fountain shows every 30 min after sunset. Sit on the far lawn edge to get the whole tower in.',
    tags: ['free', 'fountain', 'skyline'],
  },
  {
    id: 'v-marinawalk', name: 'Marina Walk Bridges', area: 'Dubai Marina', kind: 'view',
    lat: 25.0803, lng: 55.1402, cost: 0, mins: 40, photo: 4, light: 'blue', indoor: false,
    hours: h(0, 1440), vibes: ['water', 'buzzy', 'budget', 'sunset'],
    blurb: 'Towers curving around black water, yachts, and pedestrian bridges that make a decent frame.',
    tip: 'The second bridge from the north has the cleanest reflection angle.',
    tags: ['free', 'reflections', 'evening'],
  },
  {
    id: 'v-blueearth', name: 'Bluewaters Sunset Deck', area: 'Bluewaters', kind: 'view',
    lat: 25.0787, lng: 55.1206, cost: 0, mins: 35, photo: 4, light: 'golden', indoor: false,
    hours: h(0, 1440), vibes: ['water', 'sunset', 'budget'],
    blurb: 'A west-facing timber deck under the wheel. Sunset lands straight into it.',
    tip: 'Arrive 25 min early on weekends — the good rail spots go.',
    tags: ['free', 'sunset', 'boardwalk'],
  },

  /* ── nature & green ────────────────────────────────────── */
  {
    id: 'n-flamingo', name: 'Ras Al Khor Flamingo Hide', area: 'Ras Al Khor', kind: 'nature',
    lat: 25.1866, lng: 55.3322, cost: 0, mins: 50, photo: 4, light: 'golden', indoor: false,
    hours: h(450, 1080, [0, 1, 2, 3, 4, 6]), vibes: ['green', 'budget', 'soft', 'film'],
    blurb: 'Wooden hides at the edge of a lagoon where hundreds of flamingos stand around being pink against a skyline.',
    tip: 'Early morning is the busy feeding window. Bring anything with a zoom.',
    tags: ['free', 'birds', 'morning'],
  },
  {
    id: 'n-safapark', name: 'Safa Park Picnic Lawn', area: 'Al Safa', kind: 'nature',
    lat: 25.1846, lng: 55.2452, cost: 3, mins: 70, photo: 4, light: 'golden', indoor: false,
    hours: h(480, 1380), vibes: ['green', 'soft', 'budget'],
    blurb: 'Old trees, real shade, and a lake loop. AED 3 entry, which is essentially free.',
    tip: 'The north-west corner has the best late-afternoon dappled light for picnic photos.',
    tags: ['picnic', 'shade', 'cheap'],
  },
  {
    id: 'n-hillspark', name: 'Dubai Hills Park Loop', area: 'Dubai Hills', kind: 'nature',
    lat: 25.1032, lng: 55.2487, cost: 0, mins: 60, photo: 3, light: 'golden', indoor: false,
    hours: h(360, 1380), vibes: ['green', 'budget', 'soft'],
    blurb: 'A wide landscaped loop with a skate park, a splash pad and a lot of very content dogs.',
    tip: 'Free, huge, and rarely crowded before 4pm.',
    tags: ['free', 'walk', 'wide open'],
  },
  {
    id: 'n-mushrifshade', name: 'Mushrif Ghaf Grove', area: 'Mirdif', kind: 'nature',
    lat: 25.2202, lng: 55.4188, cost: 5, mins: 65, photo: 4, light: 'golden', indoor: false,
    hours: h(480, 1320), vibes: ['green', 'budget', 'film', 'soft'],
    blurb: 'Native ghaf forest — thin twisting trunks, sand underfoot, light coming through in threads. Feels nothing like the rest of the city.',
    tip: 'Worth the drive out. Last hour of sun is the entire point.',
    tags: ['forest', 'cheap', 'far'],
  },

  /* ── markets & pop-ups (time-bound) ────────────────────── */
  {
    id: 'm-ripe', name: 'Ripe Farmers Market', area: 'Al Safa', kind: 'market',
    lat: 25.1839, lng: 55.2440, cost: 45, mins: 70, photo: 4, light: 'day', indoor: false,
    hours: h(480, 780, [6]), isEvent: true, vibes: ['green', 'buzzy', 'sweet', 'budget'],
    blurb: 'Saturday-morning produce, small-batch everything, and a coffee queue worth standing in.',
    tip: 'Saturday mornings only, and it winds down by 1pm.',
    tags: ['saturday', 'morning', 'market'],
  },
  {
    id: 'm-d3night', name: 'd3 Night Market', area: 'Dubai Design District', kind: 'market',
    lat: 25.1881, lng: 55.2949, cost: 60, mins: 80, photo: 5, light: 'blue', indoor: false,
    hours: h(1080, 1380, [4, 5]), isEvent: true, vibes: ['artsy', 'buzzy', 'sweet', 'film'],
    blurb: 'Fri–Sat evenings: independent makers, warm string lights, food trucks and a DJ nobody asked for but everybody enjoys.',
    tip: 'Thursday and Friday evenings only. Go at 7 for the light, stay for the food.',
    tags: ['weekend', 'evening', 'makers'],
  },
  {
    id: 'm-fleamirdif', name: 'Courtyard Flea', area: 'Mirdif', kind: 'market',
    lat: 25.2166, lng: 55.4171, cost: 40, mins: 65, photo: 4, light: 'day', indoor: false,
    hours: h(540, 840, [5, 6]), isEvent: true, vibes: ['film', 'budget', 'artsy'],
    blurb: 'Second-hand cameras, old cassettes, someone always selling exactly one perfect jacket.',
    tip: 'Bring cash and small notes. Weekend mornings only.',
    tags: ['vintage', 'weekend', 'cash'],
  },
  {
    id: 'm-goldsouk', name: 'Gold & Textile Souk Walk', area: 'Deira', kind: 'market',
    lat: 25.2697, lng: 55.2961, cost: 15, mins: 70, photo: 5, light: 'day', indoor: false,
    hours: h(600, 1320, [0, 1, 2, 3, 4, 6]), vibes: ['oldtown', 'buzzy', 'budget', 'film'],
    blurb: 'Shopfront after shopfront of gold under warm bulbs, then bolts of fabric in every colour. Cross by abra for AED 1.',
    tip: 'Take the abra across the creek — one dirham, and the best five minutes in Dubai.',
    tags: ['abra', 'souk', 'cheap'],
  },
  {
    id: 'm-alseef', name: 'Al Seef Boardwalk', area: 'Al Seef', kind: 'market',
    lat: 25.2586, lng: 55.2996, cost: 25, mins: 70, photo: 5, light: 'golden', indoor: false,
    hours: h(600, 1380), vibes: ['oldtown', 'water', 'sweet', 'soft'],
    blurb: 'Restored creek-side stretch of coral-stone facades, lantern light and small shops. Absurdly photogenic at dusk.',
    tip: 'Start on the heritage end and walk toward the modern end as the light drops.',
    tags: ['creek', 'lanterns', 'walkable'],
  },

  /* ── evening events ────────────────────────────────────── */
  {
    id: 'e-openair', name: 'Creek Open-Air Cinema', area: 'Creek Harbour', kind: 'market',
    lat: 25.2012, lng: 55.3439, cost: 55, mins: 130, photo: 3, light: 'blue', indoor: false,
    hours: h(1140, 1380, [3, 4, 5]), isEvent: true, vibes: ['soft', 'sweet', 'water'],
    blurb: 'Beanbags on grass, skyline behind the screen, popcorn included in the ticket.',
    tip: 'Wed–Fri nights. Bring a layer, it gets breezy off the water.',
    tags: ['cinema', 'evening', 'beanbags'],
  },
  {
    id: 'e-sunsetyoga', name: 'Kite Beach Sunset Yoga', area: 'Kite Beach', kind: 'activity',
    lat: 25.1837, lng: 55.2266, cost: 50, mins: 60, photo: 4, light: 'golden', indoor: false,
    hours: h(1020, 1140, [1, 3, 6]), isEvent: true, vibes: ['water', 'green', 'soft', 'sunset'],
    blurb: 'Mats on the sand, facing the water, timed to end as the sun goes down.',
    tip: 'Mon / Wed / Sat. Mats provided, come 10 minutes early.',
    tags: ['yoga', 'beach', 'sunset'],
  },
  {
    id: 'e-alserkallate', name: 'Alserkal Late Night', area: 'Alserkal Avenue', kind: 'art',
    lat: 25.1443, lng: 55.2276, cost: 0, mins: 90, photo: 4, light: 'indoor', indoor: true,
    hours: h(1080, 1380, [4]), isEvent: true, vibes: ['artsy', 'buzzy', 'budget', 'film'],
    blurb: 'Thursday late openings — galleries stay open past 10, everyone spills into the courtyards.',
    tip: 'Thursdays only, and the best free night out in the city.',
    tags: ['free', 'thursday', 'openings'],
  },

  /* ── beach & water ─────────────────────────────────────── */
  {
    id: 'w-lamer', name: 'La Mer Beachfront', area: 'Jumeirah', kind: 'view',
    lat: 25.2312, lng: 55.2545, cost: 0, mins: 60, photo: 5, light: 'golden', indoor: false,
    hours: h(0, 1440), vibes: ['water', 'film', 'budget', 'buzzy', 'sunset'],
    blurb: 'Painted timber walls, striped umbrellas and a wide flat beach. Colour-blocked backgrounds everywhere you turn.',
    tip: 'The pastel wall behind the north lifeguard tower is the one everyone photographs.',
    tags: ['free', 'beach', 'colour'],
  },
  {
    id: 'w-kitebeach', name: 'Kite Beach Sandbar', area: 'Kite Beach', kind: 'view',
    lat: 25.1830, lng: 55.2280, cost: 0, mins: 70, photo: 4, light: 'golden', indoor: false,
    hours: h(0, 1440), vibes: ['water', 'budget', 'buzzy', 'sunset'],
    blurb: 'Long soft-sand beach with the Burj Al Arab sitting in the corner of every single frame.',
    tip: 'Walk 10 minutes south for the same view with a tenth of the people.',
    tags: ['free', 'beach', 'burj view'],
  },
  {
    id: 'w-abra', name: 'Creek Abra Crossing', area: 'Bur Dubai', kind: 'view',
    lat: 25.2637, lng: 55.2949, cost: 2, mins: 20, photo: 5, light: 'golden', indoor: false,
    hours: h(360, 1440), vibes: ['oldtown', 'water', 'budget', 'film'],
    blurb: 'A wooden boat across the creek for one dirham. Low to the water, engine chugging, everyone quietly delighted.',
    tip: 'Sit at the back for the wake-and-skyline shot. Cash only.',
    tags: ['1 dirham', 'boat', 'iconic'],
  },

  /* ── cheap eats ────────────────────────────────────────── */
  {
    id: 'f-karama', name: 'Karama Lunch Lanes', area: 'Karama', kind: 'cafe',
    lat: 25.2456, lng: 55.3041, cost: 25, mins: 55, photo: 4, light: 'day', indoor: true,
    hours: h(660, 1380), vibes: ['budget', 'buzzy', 'film'],
    blurb: 'A dense block of tiny restaurants where AED 25 is a genuinely large lunch and the signage is a photo subject in itself.',
    tip: 'The cheapest proper meal in this whole app.',
    tags: ['cheap eats', 'lunch', 'busy'],
  },
  {
    id: 'f-satwaroll', name: 'Satwa Paratha Counter', area: 'Satwa', kind: 'cafe',
    lat: 25.2312, lng: 55.2726, cost: 18, mins: 35, photo: 3, light: 'any', indoor: false,
    hours: h(420, 1440), vibes: ['budget', 'buzzy'],
    blurb: 'Standing-room counter, egg parathas folded in front of you, plastic chairs on the pavement.',
    tip: 'Open absurdly early and absurdly late. Under AED 20, always.',
    tags: ['cheap', 'street', 'late'],
  },
  {
    id: 'f-jumeirahdeli', name: 'Beach Road Deli', area: 'Jumeirah', kind: 'cafe',
    lat: 25.2098, lng: 55.2461, cost: 55, mins: 60, photo: 4, light: 'indoor', indoor: true,
    hours: h(480, 1200), vibes: ['soft', 'green', 'sweet'],
    blurb: 'Big sandwiches, a salad counter, and a courtyard with a lemon tree. Sensible lunch before an afternoon of walking.',
    tip: 'Order at the counter and take it to the courtyard table under the tree.',
    tags: ['lunch', 'courtyard', 'salads'],
  },
];

/** Unique areas, for the "starting from" picker. */
export const areas = [...new Set(spots.map(s => s.area))].sort();

export const KIND_LABEL = {
  cafe: 'café', dessert: 'sweet', photo: 'photo spot', art: 'art',
  activity: 'make something', view: 'view', market: 'market', nature: 'green',
};

export const VIBES = [
  { id: 'soft',    emoji: '🤍', label: 'Soft & slow',   sub: 'quiet corners, no rush' },
  { id: 'film',    emoji: '🎞️', label: 'Film camera',    sub: 'texture, shadows, colour' },
  { id: 'hands',   emoji: '🏺', label: 'Make something', sub: 'clay, paint, candles' },
  { id: 'sweet',   emoji: '🍰', label: 'Sweet tooth',    sub: 'dessert-led day' },
  { id: 'green',   emoji: '🌿', label: 'Green & outside',sub: 'parks, shade, birds' },
  { id: 'water',   emoji: '🌊', label: 'By the water',   sub: 'beach, creek, marina' },
  { id: 'oldtown', emoji: '🕌', label: 'Old Dubai',      sub: 'souks, wind towers, abras' },
  { id: 'artsy',   emoji: '🎨', label: 'Gallery hop',    sub: 'shows, murals, prints' },
  { id: 'buzzy',   emoji: '✨', label: 'Busy & buzzy',   sub: 'people-watching' },
  { id: 'sunset',  emoji: '🌅', label: 'Chasing sunset', sub: 'golden hour first' },
  { id: 'budget',  emoji: '🪙', label: 'Barely spend',   sub: 'free and nearly-free' },
];
