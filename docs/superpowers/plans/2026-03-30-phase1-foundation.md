# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the foundation layer (config.js, math.js, events.js) and reference docs (file-index.md, dependency-table.md, math-reference.md) without changing any existing behavior. Existing code continues to work unchanged. New files are tested independently.

**Architecture:** Three new source files (config.js, math.js, events.js) define the project's foundation. Three new docs (file-index.md, dependency-table.md, math-reference.md) define the project's references. The existing test harness (`tools/test/game-rules.js`) is updated to import from the new files instead of duplicating logic, proving the new files work. The terminology doc is audited and expanded.

**Tech Stack:** Vanilla JS (browser globals via script tags), Node.js test runner (CommonJS require), no build tools.

**Key constraint:** All new source files must work both as browser globals (loaded via `<script>` tags, assigning to `window`) and as CommonJS modules (for the Node.js test runner). Use the standard dual-export pattern at the bottom of each file:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { /* exports */ };
}
```

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-03-30-principles-and-architecture-design.md`
- Terminology: `docs/terminology-and-conventions.md`
- Phi layout: memory file `project_phi_layout.md`

---

### Task 1: Create config.js

**Files:**
- Create: `public/src/config.js`
- Test: `tools/test/test-config.js`

- [ ] **Step 1: Write the test file**

Create `tools/test/test-config.js`:

```js
const CONFIG = require('../../public/src/config');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' — ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('\n=== Config Tests ===\n');

// Structure tests
test('CONFIG is an object', () => {
  assert(typeof CONFIG === 'object' && CONFIG !== null);
});

test('colors is an array of 5 strings', () => {
  assert(Array.isArray(CONFIG.colors));
  assert(CONFIG.colors.length === 5);
  CONFIG.colors.forEach(c => assert(typeof c === 'string'));
});

test('wagerCount is a positive integer', () => {
  assert(Number.isInteger(CONFIG.wagerCount) && CONFIG.wagerCount > 0);
});

test('numberRange is [min, max] with min < max', () => {
  assert(Array.isArray(CONFIG.numberRange));
  assert(CONFIG.numberRange.length === 2);
  assert(CONFIG.numberRange[0] < CONFIG.numberRange[1]);
});

test('handSize is a positive integer', () => {
  assert(Number.isInteger(CONFIG.handSize) && CONFIG.handSize > 0);
});

// Scoring config
test('scoring has baseCost, bonusThreshold, bonusPoints', () => {
  assert(typeof CONFIG.scoring.baseCost === 'number');
  assert(typeof CONFIG.scoring.bonusThreshold === 'number');
  assert(typeof CONFIG.scoring.bonusPoints === 'number');
});

// Derived values
test('cardsPerColor derivable from config', () => {
  const cardsPerColor = CONFIG.wagerCount + (CONFIG.numberRange[1] - CONFIG.numberRange[0] + 1);
  assert(cardsPerColor === 12, 'expected 12, got ' + cardsPerColor);
});

test('total cards derivable from config', () => {
  const cardsPerColor = CONFIG.wagerCount + (CONFIG.numberRange[1] - CONFIG.numberRange[0] + 1);
  const totalCards = CONFIG.colors.length * cardsPerColor;
  assert(totalCards === 60, 'expected 60, got ' + totalCards);
});

// Color display data
test('colorHex has entry for every color', () => {
  CONFIG.colors.forEach(c => assert(typeof CONFIG.colorHex[c] === 'string', 'missing hex for ' + c));
});

test('colorLabels has entry for every color', () => {
  CONFIG.colors.forEach(c => assert(typeof CONFIG.colorLabels[c] === 'string', 'missing label for ' + c));
});

test('colorSymbols has entry for every color', () => {
  CONFIG.colors.forEach(c => assert(typeof CONFIG.colorSymbols[c] === 'string', 'missing symbol for ' + c));
});

// AI personalities
test('personalities is an object with entries', () => {
  assert(typeof CONFIG.personalities === 'object');
  assert(Object.keys(CONFIG.personalities).length > 0);
});

test('each personality has name, emoji, rating', () => {
  for (const [key, p] of Object.entries(CONFIG.personalities)) {
    assert(typeof p.name === 'string', key + ' missing name');
    assert(typeof p.emoji === 'string', key + ' missing emoji');
    assert(typeof p.rating === 'number', key + ' missing rating');
  }
});

// Subsections exist
test('ai thresholds exist', () => {
  assert(typeof CONFIG.ai === 'object');
  assert(typeof CONFIG.ai.mcSimulations === 'number');
});

test('ui thresholds exist', () => {
  assert(typeof CONFIG.ui === 'object');
  assert(typeof CONFIG.ui.animMs === 'number');
});

test('elo config exists', () => {
  assert(typeof CONFIG.elo === 'object');
  assert(typeof CONFIG.elo.startRating === 'number');
});

test('timer config exists', () => {
  assert(typeof CONFIG.timer === 'object');
  assert(Array.isArray(CONFIG.timer.options));
});

test('achievement thresholds exist', () => {
  assert(typeof CONFIG.achievements === 'object');
  assert(typeof CONFIG.achievements.highRoller === 'number');
});

test('storagePrefix is a string', () => {
  assert(typeof CONFIG.storagePrefix === 'string');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test/test-config.js`
Expected: FAIL — cannot find module `../../public/src/config`

- [ ] **Step 3: Create config.js**

Create `public/src/config.js` with the full CONFIG object as defined in the spec (Section 4). Include all sections: card rules, scoring, variants, color display, AI personalities, AI thresholds, UI thresholds, ELO, timer, achievements, storage, multiplayer.

Source values from the current codebase:
- `constants.js` lines 3-4: COLORS, COLOR_HEX, COLOR_LABELS, COLOR_SYMBOLS
- `constants.js` AI_PERSONALITIES object
- `elo.js` lines 6-17: ELO_START, ELO_HISTORY_MAX, AI_RATINGS, K-factor values
- `achievements.js` lines 73-102: threshold values
- `timer.js` lines 13-15: timer options
- `rendering.js` line 6: IDLE_MS
- `animations.js` line 8: ANIM_MS
- `ai-worker.js` lines 479-502: minimax/MC thresholds
- `multiplayer.js` line 158: matchmaking timeout

End with dual-export:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/test/test-config.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add public/src/config.js tools/test/test-config.js
git commit -m "phase1: create config.js with all game rule variables and thresholds"
```

---

### Task 2: Create events.js

**Files:**
- Create: `public/src/events.js`
- Test: `tools/test/test-events.js`

- [ ] **Step 1: Write the test file**

Create `tools/test/test-events.js`:

```js
const { on, off, emit, clear } = require('../../public/src/events');

let passed = 0, failed = 0;
function test(name, fn) {
  clear();
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' — ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('\n=== Events Tests ===\n');

test('on + emit calls listener', () => {
  let called = false;
  on('test', () => { called = true; });
  emit('test');
  assert(called, 'listener not called');
});

test('emit passes data to listener', () => {
  let received = null;
  on('test', (data) => { received = data; });
  emit('test', { value: 42 });
  assert(received && received.value === 42, 'data not passed');
});

test('multiple listeners all called', () => {
  let count = 0;
  on('test', () => { count++; });
  on('test', () => { count++; });
  emit('test');
  assert(count === 2, 'expected 2, got ' + count);
});

test('different events are independent', () => {
  let a = false, b = false;
  on('a', () => { a = true; });
  on('b', () => { b = true; });
  emit('a');
  assert(a === true, 'a not called');
  assert(b === false, 'b should not be called');
});

test('emit with no listeners does not throw', () => {
  emit('nonexistent', { data: 1 });
});

test('off removes a specific listener', () => {
  let count = 0;
  const fn = () => { count++; };
  on('test', fn);
  emit('test');
  assert(count === 1, 'should be called once');
  off('test', fn);
  emit('test');
  assert(count === 1, 'should still be 1 after off');
});

test('clear removes all listeners', () => {
  let called = false;
  on('test', () => { called = true; });
  clear();
  emit('test');
  assert(called === false, 'should not be called after clear');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test/test-events.js`
Expected: FAIL — cannot find module

- [ ] **Step 3: Create events.js**

Create `public/src/events.js`:

```js
// Event bus — pub/sub replacing monkey-patching.
// Engine emits named events, subscribers react independently.
// No wrapper chains, no load-order dependency.

const _listeners = {};

function on(name, fn) {
  (_listeners[name] ||= []).push(fn);
}

function off(name, fn) {
  const list = _listeners[name];
  if (!list) return;
  const index = list.indexOf(fn);
  if (index >= 0) list.splice(index, 1);
}

function emit(name, data) {
  (_listeners[name] || []).forEach(fn => fn(data));
}

function clear() {
  for (const key in _listeners) delete _listeners[key];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { on, off, emit, clear };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/test/test-events.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add public/src/events.js tools/test/test-events.js
git commit -m "phase1: create events.js pub/sub bus"
```

---

### Task 3: Create math.js — scoring and ELO formulas

**Files:**
- Create: `public/src/math.js`
- Test: `tools/test/test-math.js`

This task covers scoring and ELO formulas. Task 4 covers layout math.

- [ ] **Step 1: Write the test file**

Create `tools/test/test-math.js`:

```js
const CONFIG = require('../../public/src/config');
const MATH = require('../../public/src/math');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' — ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function approx(a, b, eps) { return Math.abs(a - b) < (eps || 0.01); }

console.log('\n=== Math Tests ===\n');

// --- Scoring ---

test('scoreExpedition: empty returns 0', () => {
  assert(MATH.scoreExpedition([]) === 0);
});

test('scoreExpedition: null/undefined returns 0', () => {
  assert(MATH.scoreExpedition(null) === 0);
  assert(MATH.scoreExpedition(undefined) === 0);
});

test('scoreExpedition: single number card', () => {
  const cards = [{ value: 5 }];
  assert(MATH.scoreExpedition(cards) === -15, 'expected -15, got ' + MATH.scoreExpedition(cards));
});

test('scoreExpedition: numbers 5,6,7,8,9,10 = 25', () => {
  const cards = [5, 6, 7, 8, 9, 10].map(v => ({ value: v }));
  assert(MATH.scoreExpedition(cards) === 25);
});

test('scoreExpedition: 1 wager + 5,6,7 = -4', () => {
  const cards = [{ value: 0 }, { value: 5 }, { value: 6 }, { value: 7 }];
  assert(MATH.scoreExpedition(cards) === -4);
});

test('scoreExpedition: 3 wagers + 5,6,7,8,9 = 60', () => {
  const cards = [{ value: 0 }, { value: 0 }, { value: 0 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }];
  assert(MATH.scoreExpedition(cards) === 80, 'expected 80 (60 + 20 bonus), got ' + MATH.scoreExpedition(cards));
});

test('scoreExpedition: 8 cards get bonus', () => {
  const cards = [{ value: 0 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }];
  const score = MATH.scoreExpedition(cards);
  const withoutBonus = (2 + 3 + 4 + 5 + 6 + 7 + 8 - 20) * 2;
  assert(score === withoutBonus + 20, 'expected ' + (withoutBonus + 20) + ', got ' + score);
});

test('scoreExpedition: 7 cards no bonus', () => {
  const cards = [{ value: 0 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }, { value: 7 }];
  const score = MATH.scoreExpedition(cards);
  const expected = (2 + 3 + 4 + 5 + 6 + 7 - 20) * 2;
  assert(score === expected, 'expected ' + expected + ', got ' + score);
});

test('scoreAll: scores all colors', () => {
  const expeditions = {};
  CONFIG.colors.forEach(c => { expeditions[c] = []; });
  expeditions[CONFIG.colors[0]] = [{ value: 5 }, { value: 6 }];
  const result = MATH.scoreAll(expeditions);
  assert(typeof result.total === 'number');
  assert(result.total === -9, 'expected -9, got ' + result.total);
});

// --- ELO ---

test('eloExpected: equal ratings = 0.5', () => {
  assert(approx(MATH.eloExpected(1200, 1200), 0.5));
});

test('eloExpected: higher rating > 0.5', () => {
  assert(MATH.eloExpected(1400, 1200) > 0.5);
});

test('eloExpected: lower rating < 0.5', () => {
  assert(MATH.eloExpected(1000, 1200) < 0.5);
});

test('eloChange: win against equal returns positive', () => {
  const change = MATH.eloChange(1200, 1200, 1, 32);
  assert(change > 0, 'expected positive, got ' + change);
});

test('eloChange: loss against equal returns negative', () => {
  const change = MATH.eloChange(1200, 1200, 0, 32);
  assert(change < 0, 'expected negative, got ' + change);
});

// --- Phi ---

test('phiTier: n=0 returns cardH', () => {
  assert(MATH.phiTier(100, 0) === 100);
});

test('phiTier: n=1 returns cardH / phi', () => {
  assert(approx(MATH.phiTier(100, 1), 61.80, 0.1));
});

test('phiTier: higher n = smaller value', () => {
  assert(MATH.phiTier(100, 2) < MATH.phiTier(100, 1));
  assert(MATH.phiTier(100, 3) < MATH.phiTier(100, 2));
});

// --- Stack offset ---

test('stackOffset: returns positive number', () => {
  const offset = MATH.stackOffset(5, 100);
  assert(offset > 0, 'expected positive, got ' + offset);
});

test('stackOffset: more cards = smaller offset', () => {
  const offset5 = MATH.stackOffset(5, 100);
  const offset10 = MATH.stackOffset(10, 100);
  assert(offset10 < offset5, 'offset10 should be < offset5');
});

// --- Pile height ---

test('pileHeight: 0 cards = 0', () => {
  assert(MATH.pileHeight(0, 10, 100) === 0);
});

test('pileHeight: 1 card = cardH', () => {
  assert(MATH.pileHeight(1, 10, 100) === 100);
});

test('pileHeight: n cards = cardH + (n-1) * offset', () => {
  assert(MATH.pileHeight(5, 10, 100) === 100 + 4 * 10);
});

// --- Centering ---

test('center: content smaller than container', () => {
  assert(MATH.center(50, 100) === 25);
});

test('center: content equals container', () => {
  assert(MATH.center(100, 100) === 0);
});

test('center: content larger than container returns 0', () => {
  assert(MATH.center(150, 100) === 0);
});

// --- Jitter ---

test('jitter: returns rotation and x/y offsets', () => {
  const j = MATH.jitter('red_5', 3);
  assert(typeof j.rotation === 'number');
  assert(typeof j.x === 'number');
  assert(typeof j.y === 'number');
});

test('jitter: deterministic for same inputs', () => {
  const a = MATH.jitter('red_5', 3);
  const b = MATH.jitter('red_5', 3);
  assert(a.rotation === b.rotation);
  assert(a.x === b.x);
  assert(a.y === b.y);
});

test('jitter: different for different inputs', () => {
  const a = MATH.jitter('red_5', 3);
  const b = MATH.jitter('blue_8', 1);
  assert(a.rotation !== b.rotation || a.x !== b.x || a.y !== b.y);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test/test-math.js`
Expected: FAIL — cannot find module `../../public/src/math`

- [ ] **Step 3: Create math.js**

Create `public/src/math.js`. Source each formula from the current codebase:

**Scoring** — from `tools/test/game-rules.js:11-18` (the canonical version):
```js
function scoreExpedition(cards) {
  if (!cards || cards.length === 0) return 0;
  let wagers = 0, sum = 0;
  for (const c of cards) {
    if (c.value === 0) wagers++;
    else sum += c.value;
  }
  return (sum - CONFIG.scoring.baseCost) * (1 + wagers)
    + (cards.length >= CONFIG.scoring.bonusThreshold ? CONFIG.scoring.bonusPoints : 0);
}

function scoreAll(expeditions) {
  let total = 0;
  const perColor = {};
  for (const color of CONFIG.colors) {
    const score = scoreExpedition(expeditions[color] || []);
    perColor[color] = score;
    total += score;
  }
  return { total, perColor };
}
```

**ELO** — from `public/src/elo.js:44-50`:
```js
function eloExpected(playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

function eloChange(playerRating, opponentRating, actual, kFactor) {
  return Math.round(kFactor * (actual - eloExpected(playerRating, opponentRating)));
}
```

**Phi tier** — from `public/src/layout.js:17-19`:
```js
const PHI = 1.6180339887;

function phiTier(cardH, n) {
  return cardH / Math.pow(PHI, n);
}
```

**Stack offset** — from `public/src/layout.js:23-28`:
```js
const STACK_K = 0.367;
const STACK_EXP = 0.613;

function stackOffset(count, cardH) {
  if (count <= 1) return 0;
  return cardH * STACK_K / Math.pow(count, STACK_EXP);
}
```

**Pile height** — from `public/src/rendering.js:378`:
```js
function pileHeight(cardCount, cardOffset, cardH) {
  if (cardCount <= 0) return 0;
  return cardH + Math.max(0, cardCount - 1) * cardOffset;
}
```

**Centering** — from `public/src/rendering.js:417`:
```js
function center(contentHeight, containerHeight) {
  return Math.max(0, Math.round((containerHeight - contentHeight) / 2));
}
```

**Jitter** — from `public/src/rendering.js:358-365`:
```js
function jitter(cardId, index) {
  const s = cardId + ':' + index;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const rotation = (h % 100) / 100 * CONFIG.ui.jitter.degrees * 2 - CONFIG.ui.jitter.degrees;
  const x = ((h >> 4) % 100) / 100 * CONFIG.ui.jitter.px * 2 - CONFIG.ui.jitter.px;
  const y = ((h >> 8) % 100) / 100 * CONFIG.ui.jitter.px * 2 - CONFIG.ui.jitter.px;
  return { rotation, x, y };
}
```

Export all functions. Dual-export pattern at bottom.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/test/test-math.js`
Expected: All tests PASS

- [ ] **Step 5: Run existing tests to verify no regression**

Run: `node tools/test/run-all.js`
Expected: All 69 tests PASS (new file doesn't touch existing code)

- [ ] **Step 6: Commit**

```bash
git add public/src/math.js tools/test/test-math.js
git commit -m "phase1: create math.js with all project formulas"
```

---

### Task 4: Update test harness to use new foundation

**Files:**
- Modify: `tools/test/game-rules.js`
- Modify: `tools/test/run-all.js`

- [ ] **Step 1: Update game-rules.js to import from config and math**

Replace `tools/test/game-rules.js` with:

```js
// Test harness — imports from production config and math.
// No duplicated logic. Single source of truth.
const CONFIG = require('../../public/src/config');
const MATH = require('../../public/src/math');

module.exports = {
  COLORS: CONFIG.colors,
  calculateScore: MATH.scoreExpedition,
  canPlayOnExpedition: function(card, expedition) {
    // This will move to rules.js in Phase 2.
    // For now, keep the implementation here — it's the only copy.
    if (!expedition || expedition.length === 0) return true;
    const top = expedition[expedition.length - 1];
    if (card.value === 0) return top.value === 0;
    return card.value > top.value;
  },
  createDrawPile: function() {
    // This will move to engine.js in Phase 3.
    // For now, keep the implementation here — it's the only copy.
    const drawPile = [];
    CONFIG.colors.forEach(c => {
      for (let i = 0; i < CONFIG.wagerCount; i++)
        drawPile.push({ color: c, value: 0, id: c + '_w' + i });
      for (let v = CONFIG.numberRange[0]; v <= CONFIG.numberRange[1]; v++)
        drawPile.push({ color: c, value: v, id: c + '_' + v });
    });
    for (let i = drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [drawPile[i], drawPile[j]] = [drawPile[j], drawPile[i]];
    }
    return drawPile;
  }
};
```

- [ ] **Step 2: Add new test files to run-all.js**

In `tools/test/run-all.js`, add the new test files to the `tests` array:

```js
const tests = [
  'test-config.js',
  'test-events.js',
  'test-math.js',
  'test-scoring.js',
  'test-legal-moves.js',
  'test-edge-cases.js',
  'test-game-sim.js',
  'test-ai-playtest.js'
];
```

- [ ] **Step 3: Run all tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS — existing tests still work because game-rules.js exports the same interface, now backed by config.js and math.js.

- [ ] **Step 4: Commit**

```bash
git add tools/test/game-rules.js tools/test/run-all.js
git commit -m "phase1: test harness imports from config.js and math.js — single source of truth"
```

---

### Task 5: Create docs/math-reference.md

**Files:**
- Create: `docs/math-reference.md`

- [ ] **Step 1: Write the math reference**

Create `docs/math-reference.md` documenting every formula in math.js. For each formula, include:
- Name (matches the function name in math.js)
- The formula in mathematical notation
- What each variable means
- Why this formula (derivation, intent, history)
- Example with concrete numbers

Formulas to document:

1. **scoreExpedition** — `(sum - baseCost) * (1 + wagerCount) + bonus`. Derived from Lost Cities scoring. baseCost=20 penalizes starting an expedition. Wagers multiply the whole result (risk/reward). Bonus at 8+ cards rewards commitment.

2. **scoreAll** — sums scoreExpedition across all colors. Returns total and per-color breakdown.

3. **phiTier** — `cardH / phi^n`. The golden ratio hierarchy. Every measurement in the UI traces to this. n=0 is the base unit (card height). Higher n = smaller values. The phi ratio (1.618...) creates aesthetically proportioned sizes.

4. **stackOffset** — `cardH * 0.367 / N^0.613`. How much each card peeks out in a stack of N cards. k=0.367 and exp=0.613 were derived from the constraint: 3x ratio between N=2 and N=12, so exp = log(3)/log(6). See `docs/terminology-and-conventions.md` Section 2.3 for context.

5. **pileHeight** — `cardH + (n-1) * offset`. Total visual height of a pile. First card shows fully, each additional card adds one offset.

6. **center** — `max(0, round((container - content) / 2))`. Vertical centering. Clamps at 0 when content exceeds container.

7. **eloExpected** — `1 / (1 + 10^((opponentR - playerR) / 400))`. Standard ELO expected score. 400-point gap = 10:1 expected ratio.

8. **eloChange** — `K * (actual - expected)`. Standard ELO update. K=32 for first 20 games (provisional), K=16 after (established).

9. **jitter** — deterministic pseudo-random rotation and displacement from card identity hash. Creates natural card scatter without actual randomness. Ranges from config (degrees, px).

- [ ] **Step 2: Commit**

```bash
git add docs/math-reference.md
git commit -m "phase1: add math-reference.md documenting all project formulas"
```

---

### Task 6: Create docs/file-index.md and docs/dependency-table.md

**Files:**
- Create: `docs/file-index.md`
- Create: `docs/dependency-table.md`

- [ ] **Step 1: Create file-index.md**

Create `docs/file-index.md` — the authoritative directory map. Document both the CURRENT state and the TARGET state (from the spec). Mark files that will be created, eliminated, or changed.

Format: one row per file, columns: path, responsibility (one sentence), status (current / target / new / to-eliminate).

Include every file in `public/src/`, `public/index.html`, `public/ai-worker.js`, `tools/test/`, and `docs/`.

- [ ] **Step 2: Create dependency-table.md**

Create `docs/dependency-table.md` — the dependency table from spec Section 3. Use the exact table from the spec. Add a header explaining that this table is the authority and an automated test will enforce it.

Include both the CURRENT state (for reference) and the TARGET state (what we're building toward).

- [ ] **Step 3: Commit**

```bash
git add docs/file-index.md docs/dependency-table.md
git commit -m "phase1: add file-index.md and dependency-table.md reference docs"
```

---

### Task 7: Audit and expand terminology doc

**Files:**
- Modify: `docs/terminology-and-conventions.md`

- [ ] **Step 1: Audit existing terms against current code**

Read every term defined in `docs/terminology-and-conventions.md`. For each term, verify it matches what the code actually does. Note any mismatches.

Key areas to check:
- Section 1.4 "Within a Column" — does "stack origin" match the code's `stackOrigin` function?
- Section 4.2 "Unified Pile Rendering" — does the description match the actual `renderPile` / `renderBoard` code?
- Section 6.1 "Centering Rules" — does "pile centers as if score line doesn't exist" match the code after today's `stackScoreH` change?

- [ ] **Step 2: Add new sections**

Add to the terminology doc:
1. **Section 8: Code Conventions** — camelCase, no abbreviations, descriptive names, file naming
2. **Section 9: Architecture Terms** — config, math, rules, engine, events (replacing L0-L4 labels)
3. **Section 10: Config & Event Terminology** — config key paths, event names (past tense), storage key derivation
4. **Section 11: Math Reference Terms** — function names matching math.js exports

- [ ] **Step 3: Fix any mismatches found in Step 1**

Update the doc to match reality. If reality is wrong (will be fixed in later phases), add a note: "Current code: X. Target: Y. See Phase N."

- [ ] **Step 4: Commit**

```bash
git add docs/terminology-and-conventions.md
git commit -m "phase1: audit and expand terminology doc with code conventions and architecture terms"
```

---

### Task 8: Add config.js to index.html script loading

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add config.js script tag**

Add `<script src="src/config.js"></script>` as the FIRST script in the load order, before all other src/ scripts. This makes CONFIG available as a global for all subsequent scripts.

Add `<script src="src/events.js"></script>` after config.js.

Add `<script src="src/math.js"></script>` after events.js.

The existing scripts continue to work — they don't read from these new files yet (that's Phase 2+).

- [ ] **Step 2: Run existing tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS

- [ ] **Step 3: Test in browser**

Open the game in a browser. Verify:
- No console errors from the new script tags
- `CONFIG` is accessible in the console
- `on`, `off`, `emit` are accessible in the console
- Game plays normally — no behavior change

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "phase1: load config.js, events.js, math.js in index.html"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run all tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS (existing 69 + new config/events/math tests)

- [ ] **Step 2: Verify file inventory**

New files created:
- `public/src/config.js`
- `public/src/events.js`
- `public/src/math.js`
- `tools/test/test-config.js`
- `tools/test/test-events.js`
- `tools/test/test-math.js`
- `docs/math-reference.md`
- `docs/file-index.md`
- `docs/dependency-table.md`

Modified files:
- `tools/test/game-rules.js` — now imports from config + math
- `tools/test/run-all.js` — includes new test files
- `public/index.html` — loads new scripts
- `docs/terminology-and-conventions.md` — expanded

- [ ] **Step 3: Verify no behavior change**

Open the game in a browser. Play a full AI game. Verify everything works identically to before Phase 1.

- [ ] **Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "phase1: foundation complete — config, math, events, reference docs"
```
