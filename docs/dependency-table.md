# Dependency Table

This is the TARGET dependency structure — what we are building toward. It does not describe the current state of the codebase.

## Rules

- Arrows point downward only. No file reads from a file above it in the stack.
- Peers at the same level never read from each other directly.
- Events are the only way peers communicate (via `events.js`).
- An automated test will enforce this table against actual code once migration is complete.

---

## Target Dependency Table

| File | Reads from | Never reads from |
|------|------------|------------------|
| config.js | (none) | everything else |
| math.js | config | everything except config |
| events.js | (none) | everything else |
| layout.js | config, math | rules, engine, rendering, and everything above them |
| rules.js | config, math | layout, engine, rendering, and everything above them |
| engine.js | rules, config, math, events | rendering, ai-game, multiplayer, subscribers |
| rendering.js | layout, engine (state only), events, geometry, text, ui | rules, math, config (indirectly via engine state) |
| geometry.js | layout | everything except layout |
| text.js | layout (vars) | everything except layout |
| ui.js | (none) | everything (pure DOM helpers) |
| sound.js | (none) | everything (self-contained) |
| animations.js | (none) | everything (self-contained) |
| ai-game.js | engine, events | rendering, multiplayer, subscribers |
| multiplayer.js | engine, events | rendering, ai-game, subscribers |
| stats.js | events, config | engine, rendering, other subscribers |
| elo.js | events, config, math | engine, rendering, other subscribers |
| achievements.js | events, config | engine, rendering, other subscribers |
| replay.js | events | engine, rendering, everything else |
| timer.js | events, config | engine, rendering, everything else |
| ai-worker.js | (postMessage only) | all files (isolated web worker) |

---

## Current State

Current dependencies do not match this table. `constants.js` and `gamelogic.js` are monolithic files that mix concerns from multiple target layers (config, rules, engine, UI helpers). Migration to the target structure happens in Phases 2–5:

- **Phase 2**: Extract `rules.js` from `gamelogic.js`
- **Phase 3**: Extract `engine.js` from `gamelogic.js`; wire event bus
- **Phase 4**: Split `constants.js` into `config.js`, `ui.js`, and remaining helpers
- **Phase 5**: Enforce dependency table via automated tests; delete `constants.js` and `gamelogic.js`

Until migration is complete, treat this table as the contract to build toward — not a description of today's code.
