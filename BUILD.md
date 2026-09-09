<div align="center">

# ✿ Daydream — build notes

**How it works, what's real, and how to demo it.**
For the assumptions behind the product, see [README.md](README.md) and [DECISIONS.md](DECISIONS.md).

### ▶︎ [**Open the live demo**](https://daydream-ruby.vercel.app)

`zero dependencies` · `zero build step` · `zero backend` · `46 spots` · `~2.7ms to plan a day`

Works on a phone. Add it to your home screen and it runs as an app — including in flight mode.

</div>

---

## How the brief was resolved

Summary below; the short version is in [README.md](README.md), the long version in
[DECISIONS.md](DECISIONS.md).

| The brief said | The problem | What Daydream does |
|---|---|---|
| "work great with no signal" **and** "live updates when friends find something" | These are usually opposites | **Local-first.** The cache *is* the app. The live layer is an enhancement that's allowed to fail, and freshness is always labelled |
| "no fancy accounts system" **and** "their saved list should follow them" | Identity without accounts | **A handle, nothing else.** No password, no email, no server. Data is namespaced per handle; a Transfer Code moves it between devices |
| "cool stuff happening right now" **and** "plan my entire day with a budget" | Two different products | **Two modes, one data layer.** *Discover* answers "now"; *Plan* answers "today". Same 46 spots, same offline engine |
| "doesn't lose its stuff" | Said twice — clearly bitten before | **IndexedDB + a localStorage mirror + an in-memory cache**, timestamped for last-write-wins merging |
| "aesthetic photo spots" | A pin on a map isn't a photo spot | **A real solar engine.** Every spot knows the light it's for, and the planner *schedules* the photo stop into golden hour |

---

## 60-second demo

1. **Open it.** Pick a handle. You're in — no password, no email, no loading spinner.
2. **Discover.** The grid isn't alphabetical: it's ranked by what's *open*, what's *on today*, and where the light is about to be good. Note "golden in 2h 15m" on the photo spots.
3. **Plan a day.** Drag the budget to **AED 300** → *Make my day*. You get a real itinerary: times, walking legs, taxi fares, a budget bar, and a reason for every stop.
   Open **"adjustments the planner made"** — it shows its working: what it swapped, what it dropped, and why.
4. **Look at the ribbon.** The gold band is golden hour. One pin is deliberately inside it.
5. **Tap the "Live" chip** in the header. ✈️ **Airplane Mode.**
   Now: browse, save spots, plan a completely different day, make a poster. *Everything still works.* Saves stack up in a visible queue — "2 changes waiting for signal".
6. **Tap it again.** The queue drains, the feed thaws, and you get "Synced 2 queued changes ✨".
7. **Tap 🎨** in the header to cycle four palettes — Peach, Matcha, Lavender and a full Midnight dark mode. Every colour in the app is a token, so a whole new mood is ~20 lines of CSS.
8. **The kicker:** open the same URL in a second window. That's a real second device — share a find in one, it appears in the other, live, with no server involved.

**To prove the offline claim properly:** load the app once, then kill the server (`Ctrl+C`) and reload the page. It still opens, and still plans a full day. *(Verified — see below.)*

---

## Run it

**Easiest:** just open the [live demo](https://daydream-ruby.vercel.app). It's the
same build as this repo, served straight from GitHub Pages.

To run it locally — no Node, no npm, no build step.

**Windows:** double-click `start.bat`.

**Anything else:**

```bash
py serve.py
```

Then open **http://localhost:8000**. Any static server works (`npx serve`, VS Code Live
Server). It needs `http://` rather than `file://` because ES modules, service workers and
IndexedDB all require a real origin.

**Hosting:** the live demo runs on Vercel as a static deployment — there is no build
step, because there is nothing to build. Its build command simply pulls this repo, so
the deployed site always matches `main`. Being a real HTTPS origin, the service worker
registers and the app installs to a phone home screen as a PWA (verified: 30 files
precached on first load).

It deploys anywhere static. GitHub Pages also works with no configuration:
*Settings → Pages → Deploy from branch `main` / root*.

---

## What's real, and what's staged

A demo that quietly fakes its headline feature isn't worth much, so:

| | |
|---|---|
| ✅ **Really works** | Offline-first storage, the outbox queue, the full planner, golden-hour maths, opening hours, budget solving, the poster export |
| ✅ **Really works** | Cross-window live sync — two browser windows are two genuine devices, talking over `BroadcastChannel` with a `localStorage` fallback. No server |
| ⚠️ **Simulated, and labelled as such** | "Ambient explorers" — pseudo-users who find things nearby, so a single window still feels alive on stage. Tagged `ambient` in the feed and switchable off in Profile |
| 📋 **Curated demo data** | Districts, parks and landmarks are real and geocoded. Independent venues are original to Daydream — a demo shouldn't invent prices and opening hours for a real small business. Costs are per-person AED estimates |

**Verified with the server killed:** app boots from the service-worker cache, onboarding completes, and the planner builds a 6-stop, AED 259 day. Not a claim — a test we ran.

---

## How it's built

```
index.html            app shell
sw.js                 precaches the whole app — offline on the second visit too
serve.py              dev server (keep-alive; the stock one drops parallel module loads)

css/                  tokens → base → components → views → fun
                      (fun.css is the personality layer: gradients, stickers,
                       springs, confetti — all CSS, so it survives offline)
js/
  app.js              boot, identity gate, router
  lib/
    store.js          IndexedDB + localStorage mirror + memory cache, timestamped
    net.js            connectivity model, incl. in-app Airplane Mode
    sync.js           outbox queue + BroadcastChannel peer mesh + ambient peers
    sun.js            NOAA solar geometry — sunrise, sunset, golden & blue hour
    geo.js            haversine, walk/taxi split, Dubai fare model
    art.js            procedural SVG cover art (9 scenes, seeded per spot)
    dom.js            ~90 lines of helpers instead of a framework
  core/
    planner.js        the constraint solver ← the interesting one
    state.js          identity, boards, saved days, transfer codes
    clock.js          city time, so "open now" is right from any timezone
  data/spots.js       the Dubai city pack (swap it to re-target the whole app)
  views/              discover · plan · live · boards
  ui/                 cards, sheets, poster canvas, profile
    delight.js        palettes, floating stickers, confetti
```

### Why no framework

The hard requirement is *"works great with no signal"*. A build step and 200KB of
runtime are things that can fail between the user and the app. Vanilla ES modules
means the entire product is a folder of files a service worker precaches in one go,
it starts instantly, and it deploys anywhere static. The constraint drove the
architecture, which is the point of the exercise.

### The planner, briefly

Not a filter — a scheduler. It picks the *shape* of a day (the coffee one, the
make-something one, the golden-hour one), fills each slot with the best spot that
fits the money and minutes left, orders them geographically around a golden-hour
anchor, lays them on a clock with real travel legs, then repairs:

```
closed stops → gap filling → tail extension → budget → time
```

Each repair re-lays the entire clock, so the itinerary is never half-updated, and
every adjustment is surfaced to the user instead of hidden. It reasons about
opening hours, day-of-week (so Thursday-only night markets only show on Thursdays),
travel time *and* taxi fares, dwell times, vibe matching, and light.

### Look and feel

Four palettes — **Peach**, **Matcha**, **Lavender** and a full **Midnight** dark
mode — behind the 🎨 button. Every colour in the app resolves from CSS custom
properties, so a whole new mood is about twenty lines and nothing is hardcoded.
Cards, tags, timeline markers and shadows all tint themselves to the *kind* of
place (café orange, photo purple, pottery green) from the same token set.

No web fonts, no icon library, no images: the covers are generated SVG, the
background is an animated CSS gradient mesh, the confetti is CSS keyframes.
The whole aesthetic ships in the precache and renders identically offline.

### The bit we're proudest of

`sun.js` computes real solar geometry on-device. Every photo spot declares the
light it's *for* — golden, blue, indoor, overcast — and the planner **holds you
back on purpose** so you arrive in it:

> *"Held back 38 min on purpose so you arrive in golden hour."*

That's a feature you can only build if you take "aesthetic photo spots" literally.

---

## Known limits

- One city pack (Dubai). The data layer is portable; a second pack is a JSON file.
- No real map view — the geography is used for routing maths, not rendered.
- Ambient peers are simulated (labelled, and switchable off). Real peers need a
  relay server to cross networks; cross-window is genuinely serverless today.
- Costs are estimates, not live prices.

## If we had another weekend

Real venue data via an open API with offline snapshotting · a second city pack ·
group planning (merge two people's saved boards into one day) · WebRTC so the
peer mesh crosses networks, not just windows · calendar export.

---

<div align="center">

Built for the **Vibe Coding Tournament** · the brief was broken, so we fixed it first.

</div>
