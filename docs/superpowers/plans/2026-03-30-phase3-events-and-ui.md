# Phase 3: Events & UI Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract UI helpers into ui.js and convert the showGameOver monkey-patch chain (4 wrappers deep across stats/elo/achievements/replay) to pub/sub events.

**Architecture:** Create ui.js from constants.js UI helpers. Add `emit('gameOver', data)` to the end of showGameOver in gamelogic.js. Convert each subscriber file's monkey-patch wrapper into an `on('gameOver', ...)` event handler. The fragile 4-deep wrapper chain becomes 4 independent subscribers. Pre-compute scores in the event data so subscribers don't duplicate calcScore calls.

**Tech Stack:** Vanilla JS browser globals, events.js pub/sub (Phase 1).

**Scope note:** This phase converts the showGameOver chain and related lifecycle wrappers. The action wrappers (replay.js wrapping playToExpedition etc., ai-game.js interceptors) remain unchanged — they have an AI-mode complication that requires engine.js extraction (Phase 4). Timer.js wrappers also deferred.

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-03-30-principles-and-architecture-design.md` (Section 5)
- Events system: `public/src/events.js` (on/off/emit/clear)

---

### Task 1: Create ui.js

**Files:**
- Create: `public/src/ui.js`
- Modify: `public/index.html`
- Modify: `public/src/constants.js`

- [ ] **Step 1: Create ui.js**

Create `public/src/ui.js` with the UI helper functions extracted from constants.js. These are pure DOM helpers — no game state dependencies (they read globals like `soundEnabled` but don't need them passed in).

```js
// ui.js — Screen transitions, toast, modal helpers.
// Pure DOM manipulation. No game logic dependencies.

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.classList.add('show');
  SFX.error();
  setTimeout(() => t.classList.remove('show'), 2200);
}

function showRules() { document.getElementById('rules-modal').classList.add('active'); }
function closeRules() { document.getElementById('rules-modal').classList.remove('active'); }
function openAIPersonalityModal() { document.getElementById('ai-personality-modal').classList.add('active'); }
function closeAIPersonalityModal() { document.getElementById('ai-personality-modal').classList.remove('active'); }

function showGameMenu() {
  document.getElementById('game-menu').classList.add('active');
  document.getElementById('menu-sound-btn').textContent = (typeof soundEnabled !== 'undefined' && !soundEnabled) ? 'Sound: OFF' : 'Sound: ON';
  document.getElementById('menu-colorblind-btn').textContent = colorblindMode ? 'Colorblind: ON' : 'Colorblind: OFF';
  document.getElementById('menu-contrast-btn').textContent = highContrastMode ? 'Hi-Contrast: ON' : 'Hi-Contrast: OFF';
  const lsBtn = document.getElementById('menu-livescore-btn');
  if (lsBtn) lsBtn.textContent = liveScoreEnabled ? 'Live Score: ON' : 'Live Score: OFF';
}

function closeGameMenu() { document.getElementById('game-menu').classList.remove('active'); }
function confirmQuit() { closeGameMenu(); document.getElementById('quit-confirm').classList.add('active'); }
function closeQuitConfirm() { document.getElementById('quit-confirm').classList.remove('active'); }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showScreen, toast, showRules, closeRules, openAIPersonalityModal, closeAIPersonalityModal, showGameMenu, closeGameMenu, confirmQuit, closeQuitConfirm };
}
```

- [ ] **Step 2: Add ui.js script tag to index.html**

Add `<script src="src/ui.js"></script>` after rules.js, before sound.js:

```html
<script src="src/config.js"></script>
<script src="src/events.js"></script>
<script src="src/math.js"></script>
<script src="src/rules.js"></script>
<script src="src/ui.js"></script>
<script src="src/sound.js"></script>
```

- [ ] **Step 3: Remove extracted functions from constants.js**

In `public/src/constants.js`, delete these function definitions (they're now in ui.js):
- `toast(msg){...}` (line 52)
- `showScreen(id){...}` (line 53)
- `showRules(){...}` (line 54)
- `closeRules(){...}` (line 55)
- `openAIPersonalityModal(){...}` (line 56)
- `closeAIPersonalityModal(){...}` (line 57)
- `showGameMenu(){...}` (lines 70-80)
- `closeGameMenu(){...}` (line 81)
- `confirmQuit(){...}` (line 101)
- `closeQuitConfirm(){...}` (line 102)

Keep everything else in constants.js (game state globals, getCards, genId, etc.).

- [ ] **Step 4: Run all tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS (ui.js is browser-only, no Node tests needed)

- [ ] **Step 5: Commit**

```bash
git add public/src/ui.js public/index.html public/src/constants.js
git commit -m "phase3: create ui.js, extract UI helpers from constants.js"
```

---

### Task 2: Convert showGameOver monkey-patch chain to events

**Files:**
- Modify: `public/src/gamelogic.js` — add event emission
- Modify: `public/src/stats.js` — remove wrapper, add subscriber
- Modify: `public/src/elo.js` — remove showGameOver wrapper, add subscriber
- Modify: `public/src/achievements.js` — remove showGameOver wrapper, add subscriber
- Modify: `public/src/replay.js` — remove showGameOver wrapper, add subscriber

**CRITICAL:** All changes in this task must be committed together. The monkey-patch chain is interconnected — removing one link without converting the others breaks the chain.

**How the chain currently works (load order: stats → elo → achievements → replay):**
```
showGameOver global = replay.wrapper
  → calls achievements.wrapper
    → calls elo.wrapper
      → calls stats.wrapper
        → calls original showGameOver (gamelogic.js)
```

**After conversion:**
```
showGameOver = original (gamelogic.js) + emit('gameOver', data) at the end
stats.js: on('gameOver', handler)
elo.js: on('gameOver', handler)
achievements.js: on('gameOver', handler)
replay.js: on('gameOver', handler)
```

- [ ] **Step 1: Add event emission to showGameOver in gamelogic.js**

In `public/src/gamelogic.js`, at the END of the `showGameOver` function (after the `SFX.win()/SFX.gameOver()` calls, before the closing `}`), add:

```js
  // Emit event for subscribers (stats, elo, achievements, replay)
  const myScores = mySlot === 'player1' ? s1 : s2;
  const oppScores = mySlot === 'player1' ? s2 : s1;
  emit('gameOver', {
    myScore: myScores.total,
    oppScore: oppScores.total,
    myBreakdown: myScores.breakdown,
    oppBreakdown: oppScores.breakdown,
    won: myScores.total > oppScores.total,
    personality: isAIGame ? aiPersonality : null,
    variant: variant,
  });
```

Note: `s1` and `s2` are already computed at the top of showGameOver as `calcScore(gameState.expeditions.player1)` and `calcScore(gameState.expeditions.player2)`. We reuse them — no duplicate calcScore call.

- [ ] **Step 2: Convert stats.js**

In `public/src/stats.js`, replace the monkey-patch block (lines 69-83):

**DELETE:**
```js
// Hook into showGameOver to record stats (once per game)
let _statsRecordedForGame=false;
const _origShowGameOver=showGameOver;
showGameOver=function(){
  if(gameState&&gameState.status==='finished'&&!_statsRecordedForGame){
    _statsRecordedForGame=true;
    const s1=calcScore(gameState.expeditions.player1);
    const s2=calcScore(gameState.expeditions.player2);
    const myScore=mySlot==='player1'?s1.total:s2.total;
    const oppScore=mySlot==='player1'?s2.total:s1.total;
    const pers=isAIGame?aiPersonality:null;
    recordGameResult(myScore,oppScore,pers,variant);
  }
  _origShowGameOver();
};
```

**REPLACE WITH:**
```js
// Subscribe to gameOver event to record stats (once per game)
let _statsRecordedForGame = false;
on('gameOver', function(data) {
  if (!_statsRecordedForGame) {
    _statsRecordedForGame = true;
    recordGameResult(data.myScore, data.oppScore, data.personality, data.variant);
  }
});
```

Note: No more calcScore call — scores come from the event data. No more gameState status check — the event only fires when the game is finished.

- [ ] **Step 3: Convert elo.js showGameOver wrapper**

In `public/src/elo.js`, replace the showGameOver monkey-patch block (lines 74-103):

**DELETE:**
```js
// Hook into showGameOver to show ELO change
let _eloRecordedForGame = false;
let _lastEloChange = null;
const _origShowGameOverElo = showGameOver;
showGameOver = function() {
  // Record ELO before rendering game over screen
  if (gameState && gameState.status === 'finished' && !_eloRecordedForGame && isAIGame) {
    _eloRecordedForGame = true;
    const s1 = calcScore(gameState.expeditions.player1);
    const s2 = calcScore(gameState.expeditions.player2);
    const myScore = mySlot === 'player1' ? s1.total : s2.total;
    const oppScore = mySlot === 'player1' ? s2.total : s1.total;
    const result = myScore > oppScore ? 1 : myScore < oppScore ? 0 : 0.5;
    const oppRating = getAIRating(aiPersonality);
    _lastEloChange = recordEloResult(oppRating, result);
  }
  // Call the previous showGameOver (which may be the stats-wrapped version)
  _origShowGameOverElo();
  // Inject ELO change display after the game over screen renders
  if (_lastEloChange) {
    const el = document.getElementById('elo-change-display');
    if (el) {
      const sign = _lastEloChange.change >= 0 ? '+' : '';
      const color = _lastEloChange.change >= 0 ? '#4caf50' : '#e07060';
      const elo = loadElo();
      el.innerHTML = renderText(sign+_lastEloChange.change, 3, {color:color, weight:700}) + ' ' + renderText('Rating: '+elo.rating, 5, {color:'var(--parchment-dark)'});
      el.style.display = 'block';
    }
  }
};
```

**REPLACE WITH:**
```js
// Subscribe to gameOver event to record and display ELO change
let _eloRecordedForGame = false;
let _lastEloChange = null;
on('gameOver', function(data) {
  if (!_eloRecordedForGame && isAIGame) {
    _eloRecordedForGame = true;
    const result = data.myScore > data.oppScore ? 1 : data.myScore < data.oppScore ? 0 : 0.5;
    const oppRating = getAIRating(aiPersonality);
    _lastEloChange = recordEloResult(oppRating, result);
  }
  if (_lastEloChange) {
    const el = document.getElementById('elo-change-display');
    if (el) {
      const sign = _lastEloChange.change >= 0 ? '+' : '';
      const color = _lastEloChange.change >= 0 ? '#4caf50' : '#e07060';
      const elo = loadElo();
      el.innerHTML = renderText(sign + _lastEloChange.change, 3, {color: color, weight: 700}) + ' ' + renderText('Rating: ' + elo.rating, 5, {color: 'var(--parchment-dark)'});
      el.style.display = 'block';
    }
  }
});
```

- [ ] **Step 4: Convert achievements.js showGameOver wrapper**

In `public/src/achievements.js`, replace the showGameOver monkey-patch block (lines 187-204):

**DELETE:**
```js
// Hook into showGameOver to check achievements (runs after stats.js hook)
const _origShowGameOverAch = showGameOver;
showGameOver = function() {
  _origShowGameOverAch();
  // Check achievements after stats have been recorded
  if (gameState && gameState.status === 'finished') {
    const s1 = calcScore(gameState.expeditions.player1);
    const s2 = calcScore(gameState.expeditions.player2);
    const myScore = mySlot === 'player1' ? s1.total : s2.total;
    const oppScore = mySlot === 'player1' ? s2.total : s1.total;
    const pers = isAIGame ? aiPersonality : null;
    const newlyUnlocked = checkAchievements(myScore, oppScore, gameState, pers);
    if (newlyUnlocked.length > 0) {
      // Small delay so game over screen renders first
      setTimeout(() => showAchievementToasts(newlyUnlocked), 800);
    }
  }
};
```

**REPLACE WITH:**
```js
// Subscribe to gameOver event to check achievements
on('gameOver', function(data) {
  const newlyUnlocked = checkAchievements(data.myScore, data.oppScore, gameState, data.personality);
  if (newlyUnlocked.length > 0) {
    setTimeout(() => showAchievementToasts(newlyUnlocked), 800);
  }
});
```

Note: `checkAchievements` still reads `gameState` for expedition details — that's fine, gameState is still a global. But the scores come from the event data.

- [ ] **Step 5: Convert replay.js showGameOver wrapper**

In `public/src/replay.js`, replace the showGameOver monkey-patch block (lines 189-201):

**DELETE:**
```js
// ===== SAVE REPLAY ON GAME OVER =====
const _replayOrigShowGameOver = showGameOver;
let _replaySavedForGame = false;
showGameOver = function() {
  if (gameState && gameState.status === 'finished' && !_replaySavedForGame) {
    _replaySavedForGame = true;
    stopReplayRecording();
    saveReplay();
  }
  _replayOrigShowGameOver();
  // Inject replay button if not present
  _injectReplayButton();
};
```

**REPLACE WITH:**
```js
// ===== SAVE REPLAY ON GAME OVER =====
let _replaySavedForGame = false;
on('gameOver', function(data) {
  if (!_replaySavedForGame) {
    _replaySavedForGame = true;
    stopReplayRecording();
    saveReplay();
  }
  _injectReplayButton();
});
```

- [ ] **Step 6: Run all tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add public/src/gamelogic.js public/src/stats.js public/src/elo.js public/src/achievements.js public/src/replay.js
git commit -m "phase3: convert showGameOver monkey-patch chain to gameOver event — 4 subscribers replace 4-deep wrapper chain"
```

---

### Task 3: Convert remaining lifecycle wrappers to events

**Files:**
- Modify: `public/src/gamelogic.js` — add 'rematch' and 'newGame' event emissions
- Modify: `public/src/stats.js` — add 'newGame' subscriber to reset flag
- Modify: `public/src/elo.js` — remove rematch/leaveGame/renderStats/doResetStats wrappers
- Modify: `public/src/achievements.js` — remove showStats wrapper
- Modify: `public/src/replay.js` — remove rematch wrapper

These are isolated wrappers (not chained like showGameOver), so they can be converted independently. But doing them together is cleaner.

- [ ] **Step 1: Add 'rematch' and 'newGame' emissions to gamelogic.js**

In `public/src/gamelogic.js`, add at the end of the `rematch` function (line ~353):
```js
  emit('rematch');
```

In `public/src/gamelogic.js`, add at the end of the `playAgain` function (line ~369):
```js
  emit('newGame');
```

- [ ] **Step 2: Add 'statsShown' emission to stats.js**

In `public/src/stats.js`, at the end of the `showStats` function, add:
```js
  emit('statsShown');
```

Add at the end of `renderStats` function:
```js
  emit('statsRendered');
```

Add at the end of `doResetStats` function:
```js
  emit('statsReset');
```

- [ ] **Step 3: Convert elo.js remaining wrappers**

In `public/src/elo.js`:

**DELETE the rematch wrapper (lines 105-115):**
```js
const _origRematchElo = typeof rematch === 'function' ? rematch : null;
if (_origRematchElo) {
  rematch = function() {
    _eloRecordedForGame = false;
    _lastEloChange = null;
    const el = document.getElementById('elo-change-display');
    if (el) el.style.display = 'none';
    _origRematchElo();
  };
}
```

**REPLACE WITH:**
```js
on('rematch', function() {
  _eloRecordedForGame = false;
  _lastEloChange = null;
  const el = document.getElementById('elo-change-display');
  if (el) el.style.display = 'none';
});
```

**DELETE the renderStats wrapper (lines 117-155):**
```js
const _origRenderStats = renderStats;
renderStats = function() {
  _origRenderStats();
  // ... inject ELO section ...
};
```

**REPLACE WITH:**
```js
on('statsRendered', function() {
  const container = document.getElementById('stats-content');
  if (!container) return;
  const elo = loadElo();
  let html = '';
  // ... exact same HTML generation code as current wrapper body ...
  html += '</div>';
  container.innerHTML = html + container.innerHTML;
});
```

The implementer should copy the exact HTML generation code from the current wrapper body (lines 123-154).

**DELETE the doResetStats wrapper (lines 157-162):**
```js
const _origDoResetStats = doResetStats;
doResetStats = function() {
  localStorage.removeItem(ELO_KEY);
  _origDoResetStats();
};
```

**REPLACE WITH:**
```js
on('statsReset', function() {
  localStorage.removeItem(ELO_KEY);
});
```

**DELETE the leaveGame wrapper (lines 164-172):**
```js
const _origLeaveGameElo = typeof leaveGame === 'function' ? leaveGame : null;
if (_origLeaveGameElo) {
  leaveGame = function() {
    _eloRecordedForGame = false;
    _lastEloChange = null;
    _origLeaveGameElo();
  };
}
```

**REPLACE WITH:**
```js
on('newGame', function() {
  _eloRecordedForGame = false;
  _lastEloChange = null;
});
```

Note: We use the 'newGame' event (emitted from playAgain) instead of a separate 'gameLeft' event, since the flag reset is needed for any new game start.

- [ ] **Step 4: Convert achievements.js showStats wrapper**

In `public/src/achievements.js`:

**DELETE the showStats wrapper (lines 180-185):**
```js
const _origShowStats = showStats;
showStats = function() {
  _origShowStats();
  renderAchievements();
};
```

**REPLACE WITH:**
```js
on('statsShown', function() {
  renderAchievements();
});
```

- [ ] **Step 5: Convert replay.js rematch and startAIGame wrappers**

In `public/src/replay.js`:

**DELETE the rematch wrapper (lines 568-573):**
```js
const _replayOrigRematch = rematch;
rematch = function() {
  _replaySavedForGame = false;
  _replayOrigRematch();
  startReplayRecording();
};
```

**REPLACE WITH:**
```js
on('rematch', function() {
  _replaySavedForGame = false;
  startReplayRecording();
});
```

**DELETE the startAIGame wrapper (lines 183-187):**
```js
const _replayOrigStartAIGame = startAIGame;
startAIGame = function() {
  _replayOrigStartAIGame();
  startReplayRecording();
};
```

**REPLACE WITH:**
```js
on('newGame', function() {
  _replaySavedForGame = false;
  startReplayRecording();
});
```

Note: This also covers the replay flag reset that the rematch wrapper did.

- [ ] **Step 6: Add flag reset for stats.js on new games**

In `public/src/stats.js`, add after the existing `on('gameOver', ...)` subscriber:
```js
on('newGame', function() {
  _statsRecordedForGame = false;
});

on('rematch', function() {
  _statsRecordedForGame = false;
});
```

- [ ] **Step 7: Add leaveGame event emission**

Find the `leaveGame` function (in `public/src/multiplayer.js` or wherever it's defined). Add `emit('newGame');` at the start of the function body, so ELO/replay flags reset when leaving.

If leaveGame is hard to find or modify safely, skip this step — the flag reset on 'newGame' event covers the main case (playing again). The leaveGame wrapper was a defensive reset.

- [ ] **Step 8: Run all tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add public/src/gamelogic.js public/src/stats.js public/src/elo.js public/src/achievements.js public/src/replay.js
git commit -m "phase3: convert remaining lifecycle wrappers to events — elo, achievements, replay, stats all use pub/sub"
```

---

### Task 4: Update reference docs and final verification

**Files:**
- Modify: `docs/file-index.md`
- Modify: `docs/dependency-table.md`

- [ ] **Step 1: Update file-index.md**

Add ui.js entry with status `new`.

- [ ] **Step 2: Update dependency-table.md**

Add a note: "As of Phase 3: stats.js, elo.js, achievements.js, and replay.js subscribe to events instead of monkey-patching showGameOver. ui.js created with DOM helpers extracted from constants.js."

- [ ] **Step 3: Run all tests**

Run: `node tools/test/run-all.js`
Expected: All tests PASS

- [ ] **Step 4: Verify monkey-patches eliminated**

Grep for the old pattern — there should be NO more `const _orig.*= showGameOver` patterns:
```bash
grep -n "_orig.*showGameOver\|_orig.*ShowGameOver" public/src/*.js
```
Expected: No matches (all converted to event subscribers)

- [ ] **Step 5: Commit**

```bash
git add docs/file-index.md docs/dependency-table.md
git commit -m "phase3: update reference docs for ui.js and event conversion"
```

---

## Deferred to Phase 4

The following monkey-patches are NOT converted in Phase 3:

1. **replay.js action wrappers** (playToExpedition, discardTo, etc. — 8 wrappers) — These need events to fire in both AI and multiplayer modes, requiring ai-game.js coordination.
2. **ai-game.js interceptors** (6 wrappers) — These are mode switches, not subscribers. They fundamentally change behavior in AI mode. Better handled when engine.js is created.
3. **timer.js wrappers** (renderGame, createRoom, joinRoom, startGame — 4 wrappers) — Isolated, low priority, can be converted when we have more event infrastructure.
4. **replay.js selectCard wrapper** — Guard pattern (blocks interaction during replay). Should become a flag check in selectCard itself.

**What Phase 3 accomplishes:**
- Eliminates the worst monkey-patching: the 4-deep showGameOver chain
- Converts 13 total wrappers to event subscribers
- Creates ui.js (preparing for constants.js elimination)
- Establishes the pub/sub pattern that Phase 4 extends
