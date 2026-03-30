# Principles & Architecture Restructure — Design Spec

Definitive design for universal project principles, file architecture, and migration strategy.

---

## 1. Universal Principles

These govern every line of code in the project.

**P1 — Single source of truth.** Every value is defined once, in one place. Everything else derives from it. If you change a game rule, a color, a threshold, or a measurement, you change it in one place.

**P2 — Config at the root.** Game rules (colors, card values, hand size, scoring formula, bonus thresholds) are configurable variables in one config object. The whole game adapts when config changes. Layout derives from config + viewport + phi. Everything else derives from those.

**P3 — Derive, don't define.** No magic numbers in logic or rendering. Every numeric value either comes from config, is computed from phi, or is a standard constant (0, 1, true/false). If a value exists, you can trace it to its source.

**P4 — One job per file.** Each file has one clear responsibility. Scoring doesn't live in rendering. Rendering doesn't do math. Logic doesn't build HTML. If you can't describe what a file does in one sentence, it's doing too much.

**P5 — Explicit flow.** When something happens (game ends, card played, turn changes), there's one clear orchestration point. No hidden wrapper chains. Events are visible and traceable.

**P6 — Standard conventions.** camelCase for JS. Descriptive names that match domain terminology. Files named for their responsibility. No abbreviations that require tribal knowledge. `docs/terminology-and-conventions.md` is the single authority for all naming.

**P7 — Phi-driven layout.** Every spatial value = `cardH / phi^n`. One ruler. The tier table is the spec. CSS consumes layout vars, never defines its own sizes.

**P8 — All math in math.js.** Every named formula (scoring, phi tiers, ELO, pile height, centering, offsets, jitter) is a pure function in `math.js`. No other file performs arithmetic beyond trivial operations (`i + 1`, `array.length - 1`). If you find a formula outside math.js, it's a bug.

---

## 2. File Structure & Responsibilities

The authoritative file index lives at `docs/file-index.md` — a structured table with one sentence per file, maintained as files change. This spec defines the target state; the file index is the living reference.

### Target structure

```text
src/
  config.js          — Game rule variables, thresholds, display data, AI personality defs
  math.js            — Every named formula as a pure function (reads config only)
  events.js          — Pub/sub event bus, no dependencies
  layout.js          — Phi system + all spatial math (reads config, math, viewport)
  rules.js           — Pure functions: legal moves, card definitions (reads config, math)
  engine.js          — Game state, turn flow, actions, pre-computed scores, emits events
  ai-worker.js       — AI evaluation in web worker (receives config + state via postMessage)
  ai-game.js         — AI mode orchestration: worker management, turn execution
  multiplayer.js     — Firebase sync, rooms, reconnection
  rendering.js       — HTML generation: consumes pre-computed positions, zero math
  geometry.js        — Cone projection, homography (reads layout)
  text.js            — Text rendering utility (reads layout vars)
  ui.js              — showScreen, toast, modal helpers
  sound.js           — Web Audio SFX + haptics (self-contained)
  animations.js      — FLIP animation system (self-contained)
  stats.js           — Game stats persistence (subscribes to events)
  elo.js             — ELO rating system (subscribes to events)
  achievements.js    — Achievement definitions + checking (subscribes to events)
  replay.js          — Move logging + playback (subscribes to events)
  timer.js           — Turn timer (subscribes to events)
  tutorial.js        — Onboarding slides

public/
  index.html         — HTML shell + CSS (all sizes from layout vars, zero px literals)

docs/
  file-index.md      — Authoritative directory map: file, responsibility, dependencies
  dependency-table.md — Structured dependency table (testable, see Section 3)
  math-reference.md  — Formula derivations, intent, the "why" behind math.js
  terminology-and-conventions.md — Single authority for all naming (existing, to be expanded)
```

### Key changes from current state

1. **New: `config.js`** — single home for all game rule variables. Currently scattered across constants.js, inline in gamelogic.js, duplicated in ai-worker.js.
2. **New: `math.js`** — every named formula as a pure function. Currently duplicated across rendering.js, gamelogic.js, ai-worker.js, elo.js.
3. **New: `rules.js`** — `canPlayOnExpedition`, card definitions. Currently split between rendering.js and gamelogic.js. Scoring moves to math.js.
4. **New: `events.js`** — replaces monkey-patching (see Section 5). Engine emits events, subscribers react.
5. **New: `ui.js`** — DOM utilities extracted from constants.js.
6. **`constants.js` eliminated** — game rules to config.js, UI helpers to ui.js, global state to engine.js.
7. **`gamelogic.js` eliminated** — rules to rules.js, actions to engine.js, showGameOver HTML to rendering.js.
8. **Layout consolidated** — pile geometry (pileLayout, pileH, centerTop, cardOffset) moves into layout.js via math.js functions. rendering.js does zero spatial math.
9. **ai-worker.js** — receives config via postMessage instead of duplicating COLORS/scoring/thresholds.

### Reference docs created during restructure

- **`docs/file-index.md`** — one row per file: path, one-sentence responsibility, dependencies. The authoritative map. Updated whenever files change.
- **`docs/dependency-table.md`** — structured table (see Section 3) that can be algorithmically tested against the actual codebase for enforcement.

---

## 3. Dependency Graph

The authoritative dependency table lives at `docs/dependency-table.md` — a structured table designed for automated auditing. An algorithmic test parses actual globals/imports and compares them against this table. Violations fail the test.

### Table format

| File | Reads from | Never reads from |
| ---- | ---------- | ---------------- |
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

### Rules

- Arrows point downward only — no file reads from something above it
- Peers at the same level never read from each other (stats doesn't import elo)
- Events are the only way peers communicate
- Config and events are the only things everything can read
- The dependency test checks actual code against this table and fails on violations

---

## 4. Config System

`config.js` exports a single object. Everything reads from it.

```js
const CONFIG = {
  // Card rules
  colors: ['red', 'green', 'blue', 'white', 'yellow'],
  wagerCount: 3,
  numberRange: [2, 10],
  handSize: 8,

  // Scoring
  scoring: {
    baseCost: 20,
    bonusThreshold: 8,
    bonusPoints: 20,
  },

  // Variants
  variants: {
    classic: { discardPiles: 'perColor' },
    single:  { discardPiles: 'shared' },
  },

  // Color display
  colorHex: { red: '#e74c3c', green: '#2ecc71', blue: '#3498db', white: '#ecf0f1', yellow: '#f1c40f' },
  colorLabels: { red: 'Red', green: 'Green', blue: 'Blue', white: 'White', yellow: 'Yellow' },
  colorSymbols: { red: '\u2666', green: '\u2663', blue: '\u2660', white: '\u2661', yellow: '\u2605' },

  // AI personalities
  personalities: {
    explorer:  { name: 'Explorer',  emoji: '\ud83e\udded', rating: 1100 },
    scholar:   { name: 'Scholar',   emoji: '\ud83d\udcda', rating: 1150 },
    collector: { name: 'Collector', emoji: '\ud83d\uddbc',  rating: 1100 },
    spy:       { name: 'Spy',       emoji: '\ud83d\udd75',  rating: 1050 },
    gambler:   { name: 'Gambler',   emoji: '\ud83c\udfb2', rating: 1000 },
    heuristic: { name: 'Strategist', emoji: '\u265f\ufe0f', rating: 1300 },
    seer:      { name: 'The Seer',  emoji: '\ud83d\udc41',  rating: 1500 },
    oracle:    { name: 'The Oracle', emoji: '\ud83d\udd2e', rating: 1800 },
  },

  // AI thresholds
  ai: {
    endgameDeckSize: 6,
    minimaxDeckThresholds: [4, 8, 12],
    mcSimulations: 500,
    heuristicDeckPhases: { early: 35, mid: 25, late: 15 },
  },

  // UI thresholds
  ui: {
    idleMs: 30000,
    turnFlashMs: 2000,
    animMs: 300,
    maxDrawPileShow: 10,
    jitter: { degrees: 3, px: 2.5 },
  },

  // ELO
  elo: {
    startRating: 1200,
    historyMax: 50,
    kFactor: { provisional: 32, established: 16, threshold: 20 },
  },

  // Timer
  timer: {
    options: [30, 60, 90],
    warningAt: 10,
    criticalAt: 5,
  },

  // Achievement thresholds
  achievements: {
    highRoller: 100,
    streakMaster: 5,
    speedRun: 20,
    comebackGap: 30,
    centuryClub: 100,
  },

  // Storage
  storagePrefix: 'expedition',

  // Multiplayer
  matchmakingTimeoutMs: 60000,
};
```

Derived values (like `cardsPerColor = wagerCount + (numberRange[1] - numberRange[0] + 1)`) are computed from config, not stored in config. Config is raw inputs only.

The AI worker receives the config subset it needs via `postMessage` — specifically: `colors`, `wagerCount`, `numberRange`, `scoring`, and `ai` thresholds. Not the full CONFIG object.

---

## 5. Event System

Replaces the current monkey-patching pattern. Currently, stats.js, elo.js, achievements.js, replay.js, and timer.js each grab a core function (like `showGameOver`), replace it with a wrapper that calls the original plus their own logic, and rely on script load order to chain correctly. This is fragile, invisible, and order-dependent.

The replacement is pub/sub: the engine emits named events, and any file can subscribe independently. No wrapping, no chains, no load-order dependency.

```js
const events = {};

function on(name, fn) {
  (events[name] ||= []).push(fn);
}

function emit(name, data) {
  (events[name] || []).forEach(fn => fn(data));
}
```

### Events emitted by engine.js

| Event | When | Data |
| ----- | ---- | ---- |
| `cardPlayed` | Card placed on expedition | `{ player, card, color }` |
| `cardDiscarded` | Card discarded | `{ player, card, color, pile }` |
| `cardDrawn` | Card drawn | `{ player, source }` |
| `turnChanged` | Turn switches | `{ player, phase }` |
| `gameOver` | Deck empty | `{ state, scores }` |
| `gameStarted` | New game begins | `{ state, variant }` |
| `undone` | Move undone | `{ player, card }` |

### Subscribers

| Subscriber | Listens to | Does what |
| ---------- | ---------- | --------- |
| stats.js | `gameOver` | Records win/loss |
| elo.js | `gameOver` | Updates rating |
| achievements.js | `gameOver` | Checks unlock conditions |
| replay.js | `cardPlayed`, `cardDiscarded`, `cardDrawn` | Logs moves |
| timer.js | `turnChanged`, `gameStarted`, `gameOver` | Starts/stops timer |
| rendering.js | `turnChanged` | Triggers re-render |
| multiplayer.js | action events | Syncs to Firebase |

---

## 6. Naming & Terminology

**`docs/terminology-and-conventions.md` is the single authority** for all naming in the project. Code, comments, docs, and conversation use its terms. If code disagrees with the terminology doc, the code is wrong.

### Already covered by the terminology doc

- Spatial hierarchy (viewport, safe area, board, section, column)
- Spacing types (gaps, content spaces, offsets)
- Z-layers with defined ranges
- Game objects (pile, stack, hand, spread view, pile space)
- Text elements and sizing convention
- Alignment rules
- Phi-scale tier table

### To be added to the terminology doc during this restructure

1. **Code variable conventions** — camelCase, no abbreviations (`pileHeight` not `ph`, `sectionHeights` not `sH`, `cardOffset` not `co`)
2. **File naming** — named for responsibility, one sentence description per file
3. **Config terminology** — `config.scoring.baseCost`, `config.colors`, `config.ai.mcSimulations`
4. **Event names** — past tense (`cardPlayed`, `gameOver`, `turnChanged`)
5. **Storage keys** — derived from `config.storagePrefix`
6. **Architecture terms** — config, rules, engine, events (replacing L0/L1/L2/L3/L4 layer labels)
7. **Math reference terms** — formulas referenced by name (`scoringFormula`, `stackOffsetCurve`, `centeringFormula`)

### Terminology doc audit needed before code restructure

- Verify every term in the doc matches current code
- Identify terms in code not covered by the doc
- Check for concepts that have changed or no longer exist

---

## 7. Math Reference

`math.js` is the single implementation of every named formula in the project. No other file performs arithmetic beyond trivial operations (`i + 1`, `array.length - 1`, loop counters). If a computation has a name, it lives in math.js. If you find a formula outside math.js, it's a bug.

`docs/math-reference.md` documents the derivations and intent — the "why" behind each formula.

### Formulas to include

| Name | Formula | Currently lives in |
| ---- | ------- | ------------------ |
| Scoring | `(sum - baseCost) * (1 + wagerCount)`, bonus if cards >= threshold | rendering.js, gamelogic.js, ai-worker.js |
| Phi tier | `cardH / phi^n` | layout.js |
| Stack offset | `cardH * k / N^exp` | layout.js, rendering.js |
| Pile height | `cardH + (n-1) * offset` | rendering.js |
| Centering | `max(0, round((container - content) / 2))` | rendering.js (twice) |
| ELO change | `K * (actual - expected)` where expected = `1 / (1 + 10^((opponentR - playerR) / 400))` | elo.js |
| Card jitter | Hash of card identity, degree/px ranges from config | rendering.js |

Note: cone projection math stays in geometry.js — it's spatial math specific to hand rendering, not a general formula. geometry.js calls math.js for any sub-formulas it needs.

---

## 8. Migration Strategy

### Approach

**Write forward, don't salvage — but use judgment per file.** Some code is clean and just needs to move (layout.js, geometry.js, text.js, sound.js). Some needs a rewrite (constants.js). Per-file decision: move, rewrite, or blend — whatever gets to clean code fastest.

### Phases

**Phase 1 — Foundation (no behavior change)**

- Create `config.js` — extract all hardcoded game rules, thresholds, display data
- Create `events.js` — the pub/sub utility
- Create `math.js` + `docs/math-reference.md` — extract and document every formula
- Create `docs/file-index.md` and `docs/dependency-table.md`
- Audit and expand `docs/terminology-and-conventions.md`

**Phase 2 — Extract rules (no behavior change)**

- Create `rules.js` — move canPlayOnExpedition, card definitions
- All read from config + math. Every file that called these now imports from rules.js
- ai-worker.js receives config + formulas via postMessage

**Phase 3 — Engine + events (behavior change, carefully)**

- Create `engine.js` — game state, actions (play/discard/draw), pre-computed scores
- Engine emits events instead of calling globals
- Convert monkey-patching: stats, elo, achievements, replay, timer subscribe to events
- Create `ui.js` — extract showScreen, toast, modal helpers from constants.js
- Delete constants.js (state to engine, config to config.js, UI helpers to ui.js)

**Phase 4 — Layout consolidation**

- Move pile geometry (pileLayout, pileH, centerTop, cardOffset) into layout.js via math.js
- rendering.js calls layout.js for all spatial math, does zero inline computation
- Eliminate all magic px values from index.html CSS — replace with layout vars
- Rename abbreviated variables throughout (sH to sectionHeights, etc.)

**Phase 5 — Cleanup & verification**

- Remove all dead code, unused variables, orphaned functions
- Variable naming pass — ensure everything matches terminology doc
- Final audit: every value traceable to config or phi
- Run full test suite after each phase
- Run dependency table test — verify no violations

### Safety net

- 69 existing tests run after every phase
- Each phase is independently committable
- Game stays functional between phases
- Dependency table test added in Phase 1, enforced from Phase 2 onward

---

## 9. Current State Audit Summary

Included for reference — what the restructure addresses.

### DRY violations

- Score formula duplicated in rendering.js, gamelogic.js, ai-worker.js
- COLORS array duplicated in constants.js and ai-worker.js
- Pile geometry math duplicated between rendering.js and layout.js
- Game rule numbers (5 colors, 3 wagers, 8-card bonus, -20 base cost) hardcoded in multiple files

### Misplaced responsibilities

- `calcScore()` in rendering.js (game logic)
- `canPlayOnExpedition()` in gamelogic.js (rule, should be rules layer)
- `createDrawPile()` in constants.js (engine logic)
- `showGameOver()` in gamelogic.js builds HTML (mixing rendering into logic)
- Pile layout math in rendering.js (pure math)

### Magic numbers

- ~50+ hardcoded px values in index.html CSS
- 375px fallback in rendering.js
- AI thresholds scattered as literals in ai-worker.js
- Timing values (300ms, 30s, 2s, 60s) as inline literals
- Achievement/ELO thresholds as inline literals

### Monkey-patching

- showGameOver wrapped by 3 files (stats, elo, achievements) — order-dependent
- renderGame wrapped by timer.js
- All game actions wrapped by replay.js and ai-game.js

### Dependency hotspots

- constants.js read by every file (global state hub)
- gamelogic.js read by 8+ files, reads from 7+
- rendering.js owns calcScore which 6+ files need
