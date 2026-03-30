# Phase 2: Extract Rules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `rules.js` with card legality and deck construction functions, then eliminate all duplicated game-rule logic from the codebase. No behavior change.

**Architecture:** `rules.js` joins config.js/math.js/events.js as a foundation file. It exports three pure functions: `canPlayOnExpedition`, `createDrawPile`, `allCards`. Browser-side callers use it as a global; ai-worker.js loads it via `importScripts`. The duplicated COLORS/canPlayCard/scoreColor/scoreAll/allCards definitions in ai-worker.js are replaced with aliases to the canonical implementations.

**Tech Stack:** Vanilla JS (browser globals via script tags), Node.js test runner (CommonJS require), Web Worker (`importScripts`).

**Key constraint:** Same dual-export pattern as Phase 1 files. Must work as browser global AND CommonJS module.

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-03-30-principles-and-architecture-design.md`
- Dependency table: `docs/dependency-table.md` — rules.js reads config, math only
- Phase 1 plan: `docs/superpowers/plans/2026-03-30-phase1-foundation.md`

---

### Task 1: Create rules.js

**Files:**
- Create: `public/src/rules.js`
- Test: `tools/test/test-rules.js`

- [ ] **Step 1: Write the test file**

Create `tools/test/test-rules.js`:

```js
const CONFIG = require('../../public/src/config');
const RULES = require('../../public/src/rules');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' — ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('\n=== Rules Tests ===\n');

// --- canPlayOnExpedition ---

test('canPlayOnExpedition: anything on empty', () => {
  assert(RULES.canPlayOnExpedition({ value: 5 }, []) === true);
});

test('canPlayOnExpedition: wager on empty', () => {
  assert(RULES.canPlayOnExpedition({ value: 0 }, []) === true);
});

test('canPlayOnExpedition: higher number on number', () => {
  assert(RULES.canPlayOnExpedition({ value: 7 }, [{ value: 5 }]) === true);
});

test('canPlayOnExpedition: lower number rejected', () => {
  assert(RULES.canPlayOnExpedition({ value: 3 }, [{ value: 5 }]) === false);
});

test('canPlayOnExpedition: equal number rejected', () => {
  assert(RULES.canPlayOnExpedition({ value: 5 }, [{ value: 5 }]) === false);
});

test('canPlayOnExpedition: wager on wager allowed', () => {
  assert(RULES.canPlayOnExpedition({ value: 0 }, [{ value: 0 }]) === true);
});

test('canPlayOnExpedition: wager after number rejected', () => {
  assert(RULES.canPlayOnExpedition({ value: 0 }, [{ value: 5 }]) === false);
});

test('canPlayOnExpedition: number after wager allowed', () => {
  assert(RULES.canPlayOnExpedition({ value: 2 }, [{ value: 0 }]) === true);
});

test('canPlayOnExpedition: null/undefined expedition treated as empty', () => {
  assert(RULES.canPlayOnExpedition({ value: 5 }, null) === true);
  assert(RULES.canPlayOnExpedition({ value: 5 }, undefined) === true);
});

// --- createDrawPile ---

test('createDrawPile: returns 60 cards', () => {
  const pile = RULES.createDrawPile();
  assert(pile.length === 60, 'expected 60, got ' + pile.length);
});

test('createDrawPile: each card has color, value, id', () => {
  const pile = RULES.createDrawPile();
  pile.forEach(c => {
    assert(typeof c.color === 'string', 'missing color');
    assert(typeof c.value === 'number', 'missing value');
    assert(typeof c.id === 'string', 'missing id');
  });
});

test('createDrawPile: 3 wagers per color', () => {
  const pile = RULES.createDrawPile();
  for (const color of CONFIG.colors) {
    const wagers = pile.filter(c => c.color === color && c.value === 0);
    assert(wagers.length === CONFIG.wagerCount, color + ' has ' + wagers.length + ' wagers');
  }
});

test('createDrawPile: numbers 2-10 per color', () => {
  const pile = RULES.createDrawPile();
  for (const color of CONFIG.colors) {
    for (let v = CONFIG.numberRange[0]; v <= CONFIG.numberRange[1]; v++) {
      const found = pile.filter(c => c.color === color && c.value === v);
      assert(found.length === 1, color + '_' + v + ' count: ' + found.length);
    }
  }
});

test('createDrawPile: is shuffled (two calls differ)', () => {
  const a = RULES.createDrawPile();
  const b = RULES.createDrawPile();
  let same = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id === b[i].id) same++;
  }
  assert(same < 55, 'piles too similar: ' + same + '/60 same positions');
});

// --- allCards ---

test('allCards: returns 60 cards', () => {
  const cards = RULES.allCards();
  assert(cards.length === 60, 'expected 60, got ' + cards.length);
});

test('allCards: not shuffled (deterministic order)', () => {
  const a = RULES.allCards();
  const b = RULES.allCards();
  for (let i = 0; i < a.length; i++) {
    assert(a[i].id === b[i].id, 'order differs at index ' + i);
  }
});

test('allCards: same card set as createDrawPile', () => {
  const all = RULES.allCards().map(c => c.id).sort();
  const pile = RULES.createDrawPile().map(c => c.id).sort();
  for (let i = 0; i < all.length; i++) {
    assert(all[i] === pile[i], 'mismatch at ' + i);
  }
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test/test-rules.js`
Expected: FAIL — cannot find module `../../public/src/rules`

- [ ] **Step 3: Create rules.js**

Create `public/src/rules.js`:

```js
// rules.js — Card legality checks and deck construction.
// Pure functions. Reads CONFIG only.

if (typeof CONFIG === 'undefined') {
  var CONFIG = require('./config');
}

function canPlayOnExpedition(card, expedition) {
  if (!expedition || expedition.length === 0) return true;
  const top = expedition[expedition.length - 1];
  if (card.value === 0) return top.value === 0;
  return card.value > top.value;
}

function allCards() {
  const cards = [];
  for (const c of CONFIG.colors) {
    for (let i = 0; i < CONFIG.wagerCount; i++)
      cards.push({ color: c, value: 0, id: c + '_w' + i });
    for (let v = CONFIG.numberRange[0]; v <= CONFIG.numberRange[1]; v++)
      cards.push({ color: c, value: v, id: c + '_' + v });
  }
  return cards;
}

function createDrawPile() {
  const drawPile = allCards();
  for (let i = drawPile.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [drawPile[i], drawPile[j]] = [drawPile[j], drawPile[i]];
  }
  return drawPile;
}

const RULES = { canPlayOnExpedition, createDrawPile, allCards };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RULES;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/test/test-rules.js`
Expected: All 17 tests PASS

- [ ] **Step 5: Run all tests to verify no regression**

Run: `node tools/test/run-all.js`
Expected: All existing tests PASS

- [ ] **Step 6: Commit**

```bash
git add public/src/rules.js tools/test/test-rules.js
git commit -m "phase2: create rules.js with canPlayOnExpedition, createDrawPile, allCards"
```

---

### Task 2: Update test harness to import from rules.js

**Files:**
- Modify: `tools/test/game-rules.js`
- Modify: `tools/test/run-all.js`

- [ ] **Step 1: Update game-rules.js**

Replace `tools/test/game-rules.js` with:

```js
// Test harness — imports from production modules.
// No duplicated logic. Single source of truth.
const CONFIG = require('../../public/src/config');
const MATH = require('../../public/src/math');
const RULES = require('../../public/src/rules');

module.exports = {
  COLORS: CONFIG.colors,
  calculateScore: MATH.scoreExpedition,
  canPlayOnExpedition: RULES.canPlayOnExpedition,
  createDrawPile: RULES.createDrawPile,
};
```

- [ ] **Step 2: Add test-rules.js to run-all.js**

In `tools/test/run-all.js`, add `'test-rules.js'` to the tests array, after `'test-math.js'`:

```js
const tests = [
  'test-config.js',
  'test-events.js',
  'test-math.js',
  'test-rules.js',
  'test-scoring.js',
  'test-legal-moves.js',
  'test-edge-cases.js',
  'test-game-sim.js',
  'test-ai-playtest.js'
];
```

- [ ] **Step 3: Run all tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS — existing tests work because game-rules.js exports the same interface.

- [ ] **Step 4: Commit**

```bash
git add tools/test/game-rules.js tools/test/run-all.js
git commit -m "phase2: test harness imports from rules.js — zero duplicated logic"
```

---

### Task 3: Wire rules.js into browser, remove old definitions

**Files:**
- Modify: `public/index.html` — add rules.js script tag
- Modify: `public/src/gamelogic.js` — remove canPlayOnExpedition definition
- Modify: `public/src/constants.js` — remove createDrawPile definition

This is the migration step. After this, the browser uses rules.js globals instead of the per-file definitions. All callers (gamelogic.js, ai-game.js, rendering.js) continue to call `canPlayOnExpedition()` and `createDrawPile()` — they're now globals from rules.js instead of globals from gamelogic.js/constants.js.

- [ ] **Step 1: Add rules.js script tag to index.html**

Add `<script src="src/rules.js"></script>` after math.js, before sound.js. The script block should now read:

```html
<script src="src/config.js"></script>
<script src="src/events.js"></script>
<script src="src/math.js"></script>
<script src="src/rules.js"></script>
<script src="src/sound.js"></script>
```

- [ ] **Step 2: Remove canPlayOnExpedition from gamelogic.js**

In `public/src/gamelogic.js`, delete lines 3-8 (the canPlayOnExpedition function definition):

```js
// DELETE this:
function canPlayOnExpedition(card, expedition){
  if(expedition.length===0) return true;
  const top=expedition[expedition.length-1];
  if(card.value===0) return top.value===0; // wager only before numbers
  return card.value > top.value;
}
```

The function is now provided by rules.js (loaded earlier). All call sites in gamelogic.js:25, ai-game.js:54, rendering.js:524 continue to work — they call the global.

- [ ] **Step 3: Remove createDrawPile from constants.js**

In `public/src/constants.js`, delete lines 104-112 (the createDrawPile function definition):

```js
// DELETE this:
function createDrawPile(){
  let drawPile=[];
  COLORS.forEach(c=>{
    for(let i=0;i<3;i++)drawPile.push({color:c,value:0,id:c+'_w'+i});
    for(let v=2;v<=10;v++)drawPile.push({color:c,value:v,id:c+'_'+v});
  });
  for(let i=drawPile.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[drawPile[i],drawPile[j]]=[drawPile[j],drawPile[i]]}
  return drawPile;
}
```

The function is now provided by rules.js. All call sites (ai-game.js:26, gamelogic.js:363, multiplayer.js:50) continue to work.

- [ ] **Step 4: Run all tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/src/gamelogic.js public/src/constants.js
git commit -m "phase2: wire rules.js into browser, remove duplicated definitions from gamelogic and constants"
```

---

### Task 4: Update ai-worker.js to use importScripts

**Files:**
- Modify: `public/ai-worker.js`

This eliminates four duplicated definitions from ai-worker.js (COLORS, canPlayCard, scoreColor, scoreAll, allCards/ALL_CARDS) by loading the canonical implementations via `importScripts`.

**Strategy:** Use aliases to minimize diff. The worker's internal code calls `COLORS`, `canPlayCard`, `scoreColor`, `scoreAll`, `ALL_CARDS` in ~30+ places. Rather than renaming every call site, we alias the canonical functions to the old names.

- [ ] **Step 1: Add importScripts and aliases at top of ai-worker.js**

Replace lines 1-55 (the duplicated definitions block) with:

```js
// Monte Carlo AI Worker for Lost Cities — v2 Genome-Driven
// Uses evolved champion genomes for rollout policy instead of greedy heuristics.
// Accepts a `personality` parameter to select which genome drives decisions.

importScripts('src/config.js', 'src/math.js', 'src/rules.js');

// Aliases — canonical implementations, local names for zero-diff on 30+ call sites
const COLORS = CONFIG.colors;
const canPlayCard = canPlayOnExpedition;
const scoreColor = MATH.scoreExpedition;
const ALL_CARDS = allCards();

function scoreAll(exps) {
  let t = 0;
  for (const c of COLORS) t += scoreColor(exps[c] || []);
  return t;
}
```

Note: `scoreAll` remains a local function because the ai-worker's version returns a number, while `MATH.scoreAll` returns `{total, perColor}`. The local wrapper uses `scoreColor` (aliased to `MATH.scoreExpedition`) as its building block — no formula duplication.

Keep the `shuffle` function (line 57-62 in current file) — it's a local utility not worth extracting.

Keep the GENOMES and GENOMES_SINGLE objects exactly as they are.

- [ ] **Step 2: Verify the removed block**

The following definitions should no longer exist in ai-worker.js (they were in lines 5-55):
- `const COLORS = [...]` (line 5) — replaced by `CONFIG.colors`
- `function allCards()` (lines 27-34) — now from rules.js
- `const ALL_CARDS = allCards()` (line 35) — now uses rules.js allCards
- `function canPlayCard()` (lines 37-42) — aliased from rules.js
- `function scoreColor()` (lines 44-49) — aliased from math.js
- `function scoreAll()` (lines 51-55) — rewritten as thin wrapper

Everything below (GENOMES, shuffle, genome functions, heuristic, MC, endgame, message handler) stays exactly the same.

- [ ] **Step 3: Run existing tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS (ai-worker.js is not tested by the Node test suite — it runs in a Web Worker)

- [ ] **Step 4: Commit**

```bash
git add public/ai-worker.js
git commit -m "phase2: ai-worker.js imports from config/math/rules via importScripts, removes duplicated logic"
```

---

### Task 5: Update reference docs

**Files:**
- Modify: `docs/file-index.md`
- Modify: `docs/dependency-table.md`

- [ ] **Step 1: Update file-index.md**

Add rules.js entry and test-rules.js entry. Change rules.js status from `target` to `current`.

- [ ] **Step 2: Update dependency-table.md**

Add a "Current State" note: "As of Phase 2, config.js, math.js, events.js, and rules.js match the target dependency structure. ai-worker.js now loads these via importScripts."

- [ ] **Step 3: Commit**

```bash
git add docs/file-index.md docs/dependency-table.md
git commit -m "phase2: update reference docs for rules.js"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run all tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS (existing + new rules tests)

- [ ] **Step 2: Verify file inventory**

New files created:
- `public/src/rules.js`
- `tools/test/test-rules.js`

Modified files:
- `public/index.html` — loads rules.js
- `public/src/gamelogic.js` — canPlayOnExpedition removed
- `public/src/constants.js` — createDrawPile removed
- `public/ai-worker.js` — uses importScripts, aliases replace duplication
- `tools/test/game-rules.js` — imports from rules.js
- `tools/test/run-all.js` — includes test-rules.js
- `docs/file-index.md` — rules.js added
- `docs/dependency-table.md` — updated

- [ ] **Step 3: Verify in browser**

Open the game. Verify:
- No console errors
- `canPlayOnExpedition` accessible in console (from rules.js)
- `createDrawPile` accessible in console (from rules.js)
- `allCards` accessible in console (from rules.js)
- Play an AI game — verify AI still works (importScripts in worker)
- Play moves — verify card legality checks work
- Both classic and single-pile variants work

- [ ] **Step 4: Verify duplication eliminated**

After Phase 2, `canPlayOnExpedition` logic exists in exactly ONE place: `rules.js`. Scoring formula exists in exactly ONE place: `math.js`. Card construction exists in exactly ONE place: `rules.js`.

Remaining duplication (out of scope, tracked in backlog):
- Evolution scripts (evolve-v2.js, evolve-parallel.js, etc.) still have their own copies — standalone dev tools, not production code
- `calcScore` in rendering.js still wraps scoring for UI — migrates in Phase 3 (engine)
