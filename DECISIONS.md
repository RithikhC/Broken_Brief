# Reading the brief

The challenge wasn't building. It was working out *what* to build from a brief that
argues with itself. This is the reasoning — every gap we filled, and why.

---

## 1. The headline contradiction

> "it has to work great even with no signal … but ALSO I want people to see live
> updates when friends nearby find something cool"

Most teams will read this as *"pick one, or bolt a cache onto an online app."*
Both are wrong, and the second is worse: a cache bolted on late is how you get an
app that shows stale data as if it were live.

**The resolution: the cache is not a fallback, it's the product.**

Every read comes from local storage. Every write lands locally and is *instantly*
true for the user, then joins an outbox. The network only decides whether other
people have seen it yet.

```
   user acts ──▶ local state (instant, always) ──▶ outbox ──▶ peers
                       ▲                             │
                       └── never blocked by ─────────┘
                              the network
```

That makes the two requirements complementary instead of contradictory:

- **No signal?** Everything works. The outbox visibly holds your changes — "2 changes saved here, waiting for signal" — and drains itself the moment you're back.
- **Signal?** Same code path, the queue just drains immediately, so friends see it live.

**The part we think actually matters:** the UI never lies about which state it's in.
Offline, the feed doesn't quietly show old pings as though they were current — it
freezes, says so, and timestamps what it's showing: *"Showing 30 cached finds,
newest from 12 min ago."* Honesty about freshness is the whole difference between
"offline support" and offline-*first*.

And because you can't demo a dead connection on a stage with good wifi, **Airplane
Mode is a switch in the app** — one tap in the header. That's a product decision as
much as a demo one: users who know they're heading somewhere with no reception
should be able to say so.

---

## 2. "No fancy accounts system" vs. "their saved list should follow them"

Taken literally, both. Identity here is a **handle you type once** — no password,
no email, no verification, no server. It exists purely to name the box your data
lives in:

- Your boards are stored under `u:<handle>:saves`.
- Sign in with the same handle on that device and they come back.
- To move devices, copy a **Transfer Code** (your data, base64'd) and paste it on
  the other one. It merges by timestamp — newest edit of each item wins.

Nothing is uploaded, so there's nothing to breach, nothing to consent to, and no
login screen between the user and the app. "Effortless" was in the brief; this is
what effortless actually costs to build.

---

## 3. The mid-brief product change

The brief starts as *"show me cool stuff nearby right now"* and ends as
*"plan my entire day, Pinterest-style, to a budget, with cafés and pottery."*
Those are different products — but only if you build them as different apps.

**Both, sharing one engine:**

- **Discover** answers *now*: ranked live by what's open, what's on today, and where the light is about to be good.
- **Plan** answers *today*: the same 46 spots, run through a constraint solver.

The same dataset, the same offline guarantees, the same save model. The client
never has to choose, because the second product is the first one with a scheduler
on top.

---

## 4. What the brief didn't say (and we decided)

| Gap | Our call | Why |
|---|---|---|
| **Which city?** | Dubai, as a swappable "city pack" | The team is in Dubai, the golden-hour maths gets to be real, and `data/spots.js` is a drop-in file — the whole app re-targets by replacing it |
| **What's "cool stuff"?** | 8 kinds: cafés, sweets, photo spots, art, make-something, views, green, markets | Directly from the second brief: "aesthetic photos, cute cafes, painting and pottery" |
| **How does a budget "give you a plan"?** | An actual constrained scheduler, not a price filter | A filtered list is what you'd get from a search box. A plan has times, an order, and travel costs in it |
| **Does travel cost count?** | Yes — taxi fares are budgeted line items | Leaving them out is how a "AED 300 day" quietly becomes AED 430. The budget bar breaks out *doing things / food / getting around / left over* |
| **What is a "photo spot", exactly?** | A place *plus* the light it works in | Otherwise it's just a pin. This is where the solar engine came from |
| **How social is "social"?** | Ambient presence + shared finds. No profiles, no follows, no DMs | The brief says *"feels social and current"* — a feeling, not a social network. Presence and live finds deliver the feeling at a fraction of the scope |
| **Images?** | Generated on-device as SVG. Zero image requests | A Pinterest grid that pulls 40 photos from a CDN is precisely what dies with no signal. So the art is drawn, deterministically, from each spot's id |

---

## 5. Things we deliberately did *not* build

Scope discipline was part of the brief too — *"scrappy"*, *"a weekend"*, *"nothing complicated"*.

- **No map view.** Geography is used for routing maths; a rendered map would be a tile dependency that breaks offline, for decoration.
- **No real accounts, no backend, no database.** Explicitly ruled out by the brief, and everything the brief asks for is achievable without them.
- **No live venue API.** It would make the data real and the app fragile. Curated data with honest labelling beats a fetch that fails in the demo.
- **No dark mode, no i18n, no onboarding tour.** Not asked for. A weekend is a weekend.

---

## 6. Where we'd push back on the client

Two things worth saying out loud, since a good agency says them:

1. **"Live updates from friends nearby" needs friends nearby.** Cross-window sync is
   genuinely serverless and genuinely live, but a real product needs a relay
   (WebRTC or a small server) for people on different networks. That's a real
   backend decision, and it should be made deliberately — not discovered in week three.

2. **"Nothing complicated" and "live social" don't co-exist for long.** Presence is
   cheap; a social graph is not. We built the version that delivers the *feeling*
   the brief asked for. If the client actually wants a network, that's a different
   project with a different budget, and they should hear that before it's built.

---

## 7. Scorecard, honestly

| Criterion | Where to look |
|---|---|
| **Interpretation** | This document, and §1 in particular. The offline/live contradiction is resolved architecturally, not fudged |
| **Functionality** | Full flow works end-to-end, offline included — verified with the server killed, not just claimed |
| **Technical execution** | `core/planner.js` (constraint solver + repair passes), `lib/sun.js` (real solar geometry), `lib/store.js` (three-layer durable storage), `lib/sync.js` (outbox + serverless peer mesh) — no framework, no build, ~2.7ms per plan |
| **Creativity** | Golden-hour scheduling · procedurally drawn covers so the aesthetic grid survives with no signal · in-app Airplane Mode · a planner that shows its working · the day-poster export |
