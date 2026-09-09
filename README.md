<div align="center">

# ✯ Daydream

**Cute days, planned properly — even with no signal.**

### ▶︎ [**Open the live demo**](https://rithikhc.github.io/Broken_Brief/)

[Build notes](BUILD.md) · [Full reasoning](DECISIONS.md) · Run locally: `py serve.py`

</div>

---

## The assumptions we made

The brief argues with itself. Our calls:

1. **"No signal" outranks "live".** Local-first — the cache *is* the app; the live
   layer is an enhancement allowed to fail. Writes land locally, queue in a visible
   outbox, and sync on reconnect. The UI always labels how fresh its data is.

2. **"No fancy accounts" is meant literally.** Identity is a handle you type — no
   password, email or server. Data is namespaced per handle; a Transfer Code moves it
   between devices.

3. **"What's on now" and "plan my whole day" are one product.** *Discover* answers
   *now*, *Plan* answers *today* — same 46 spots, same offline engine.

4. **A budget should produce a plan, not a filter.** The planner is a real scheduler:
   opening hours, day-of-week, travel time, taxi fares and dwell times, plus repair
   passes when it doesn't fit.

5. **A photo spot is a place plus its light.** Solar geometry runs on-device, so the
   photo stop is deliberately scheduled into golden hour.

6. **"Feels social" means presence, not a social network.** Cross-window peers are
   genuinely real; ambient explorers are simulated and labelled.

7. **Offline rules out remote images.** Every cover is generated SVG, so the grid
   looks the same with the radio off.
