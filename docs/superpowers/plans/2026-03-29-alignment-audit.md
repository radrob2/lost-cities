# Alignment Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply docs/terminology-and-conventions.md alignment conventions universally across all rendering code — fix vertical centering, remove column gap, eliminate stack container wrapper, ensure one centering authority per element.

**Architecture:** Three files change: layout.js (remove column gap from horizontal calculation, export stackContentH), index.html CSS (remove expedition-stack and card-slot classes, simplify card-col, remove gap-col from grid), rendering.js (eliminate expedition-stack wrapper, position cards directly in columns, unify centering logic for N=0 through N=12).

**Tech Stack:** Vanilla JS, CSS Grid, φ layout system

**Reference:** docs/terminology-and-conventions.md (the spec for this work)

---

### Task 1: Remove column gap from layout system

The column gap (`--gap-col` at n=7) is being removed. Column width already provides breathing room around cards. Inter-card space comes from the column content space, not a separate gap.

**Files:**
- Modify: `public/src/layout.js`

- [ ] **Step 1: Remove colGapR from horizontal constraint**

In `public/src/layout.js`, change the horizontal width calculations to remove column gap references:

```js
// Line 64: remove colGapR definition (keep for midR portrait for now — deck spacing)
// Line 90-93: remove colGapR from horizontal constraint
```

Replace lines 89-93:
```js
  // Horizontal constraint
  const colWR = 1 / PHI + slotPadR;  // cardW + slotPad
  const totalWR = numColors * colWR + (numColors - 1) * colGapR + 2 * marginR;
  const totalWR_land = totalWR + colGapR + colWR; // 6th col for deck in landscape
  const cardH_h = Math.floor(vw / (isLandscape ? totalWR_land : totalWR));
```

With:
```js
  // Horizontal constraint — no column gap, column width IS the content space
  const colWR = 1 / PHI + slotPadR;  // cardW + card padding
  const totalWR = numColors * colWR + 2 * marginR;
  const totalWR_land = totalWR + colWR; // 6th col for draw pile in landscape
  const cardH_h = Math.floor(vw / (isLandscape ? totalWR_land : totalWR));
```

Note: keep `colGapR` definition for now — it's still used in `midR` portrait calculation for deck spacing below discards. We can clean that up later.

- [ ] **Step 2: Remove --gap-col CSS property**

In `public/src/layout.js`, remove the `--gap-col` CSS property setter (line 157):
```js
  // DELETE this line:
  root.setProperty('--gap-col', gapCol + 'px');
```

Also remove `gapCol` from the result object (line 172).

- [ ] **Step 3: Remove gap from card-row CSS**

In `public/index.html`, change `.card-row`:
```css
/* Before: */
.card-row{display:grid;grid-template-columns:repeat(var(--num-colors),var(--col-w));justify-content:center;gap:var(--gap-col);padding:0 var(--board-margin);overflow:visible;width:100%;flex-shrink:0}

/* After: */
.card-row{display:grid;grid-template-columns:repeat(var(--num-colors),var(--col-w));justify-content:center;padding:0 var(--board-margin);overflow:visible;width:100%;flex-shrink:0}
```

- [ ] **Step 4: Audit remaining --gap-col references**

Search all files for `--gap-col` and `gap-col` and `gapCol`. Replace remaining references:
- CSS references to `var(--gap-col)` in index.html → replace with appropriate φ-derived values or remove
- `#deck-slot` margin-top uses `var(--gap-col)` → change to `var(--slot-pad)` or remove
- Any JS references to `gapCol` → remove or replace
- `target-pulse` keyframe uses `var(--gap-col)` → use `var(--border-w)` or small fixed value
- Landscape discard row gap references → remove

- [ ] **Step 5: Run tests**

Run: `node tools/test/run-all.js`
Expected: All tests pass (layout changes don't affect game logic)

- [ ] **Step 6: Commit**

```bash
git add public/src/layout.js public/index.html
git commit -m "Remove column gap: column width IS the content space"
```

---

### Task 2: Export layout values for renderBoard

renderBoard needs exact layout values without recomputing them. Pass them from renderGame via a shared object.

**Files:**
- Modify: `public/src/layout.js`
- Modify: `public/src/rendering.js`

- [ ] **Step 1: Add stackContentH and scoreLineH to layout result**

In `public/src/layout.js`, add computed pixel values to the result object. After the `sH` block (around line 127), add:

```js
  const stackContentH = Math.round(stackContentHeight(MAX_CARDS_PER_COLOR, cardH));
  const scoreLineH = Math.round(lineSm); // n=4, one step above score text at n=5
```

Add these to the result object:
```js
  const result = {
    cardW, cardH, isLandscape, sH, colW, boardMargin,
    bigGapPx, smallGapPx, slotPad, lift, borderW,
    textSm, textMd, textLg, lineSm, lineMd, lineLg,
    stackContentR, scoreLabelR, slotHR,
    stackContentH, scoreLineH,
    numColors, peekR, infoRowR, stackRowR, midR, handR,
  };
```

- [ ] **Step 2: Pass layout to renderBoard**

In `public/src/rendering.js`, in `renderGame()`, store layout for renderBoard:

Replace:
```js
  renderHand();
  renderBoard();
```

With:
```js
  renderHand();
  renderBoard(layout);
```

Change `renderBoard` function signature:
```js
function renderBoard(layout){
```

- [ ] **Step 3: Use layout values in renderBoard**

In `renderBoard()`, replace the independent computation block:

```js
  // Continuous stack offset: cardH × 0.367 / N^0.613 (3× ratio N=2 to N=12)
  const curCardH=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-h'))||78;
  function getStackOffset(count){
    return Math.round(stackOffset(count, curCardH));
  }
  // Score label line height: n=4 (one step above text at n=5)
  const scoreLinePx=Math.round(lvl(4, curCardH));
  // Section height for stack rows. Pile centers within cardContentH (excluding score line).
  // Score line is budgeted in the section but ignored for centering.
  const fixedStackContentH=Math.round(stackContentHeight(MAX_CARDS_PER_COLOR, curCardH));
  const sectionH=fixedStackContentH+scoreLinePx;
  const cardContentH=fixedStackContentH; // centering reference: section minus score line
  const fixedStackH=sectionH+'px';
```

With:
```js
  // Layout values — single source of truth from computeLayout()
  const curCardH = layout.cardH;
  const scoreLineH = layout.scoreLineH;
  const cardContentH = layout.stackContentH; // centering reference: excludes score line
  const sectionH = layout.sH.stackRow;       // full section height: includes score line budget
  function cardOffset(count){
    return Math.round(stackOffset(count, curCardH));
  }
```

- [ ] **Step 4: Update all references**

In renderBoard, rename throughout:
- `getStackOffset(` → `cardOffset(`
- `scoreLinePx` → `scoreLineH`
- `fixedStackH` → `sectionH+'px'` (inline where used)

- [ ] **Step 5: Run tests**

Run: `node tools/test/run-all.js`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add public/src/layout.js public/src/rendering.js
git commit -m "Single source of truth: pass layout values to renderBoard"
```

---

### Task 3: Eliminate expedition-stack wrapper, use columns directly

Remove the `expedition-stack` div. Cards position directly in the column (card-col) which serves as the `position:relative` context.

**Files:**
- Modify: `public/index.html`
- Modify: `public/src/rendering.js`

- [ ] **Step 1: Update card-col CSS**

In `public/index.html`, change `.card-col`:
```css
/* Before: */
.card-col{display:flex;flex-direction:column;align-items:center;justify-content:center}

/* After — position:relative for absolute children, flex for centering card spaces: */
.card-col{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center}
```

Remove `.expedition-stack` and `.expedition-stack .card` rules:
```css
/* DELETE these lines: */
.expedition-stack{position:relative;width:var(--col-w);overflow:visible}
.expedition-stack .card{position:static}
```

- [ ] **Step 2: Update opponent row rendering (N=0)**

In `renderBoard()`, the opponent empty slot currently wraps in expedition-stack. Remove the wrapper:

Replace:
```js
    if(cards.length===0){
      return `<div class="card-col" style="position:relative"><div class="expedition-stack" style="height:${fixedStackH};display:flex;align-items:center;justify-content:center"><div class="card empty-slot" style="border-bottom:var(--border-w) solid ${COLOR_HEX[c]}30;position:relative">${cbLabel(c)}</div></div></div>`;
    }
```

With:
```js
    if(cards.length===0){
      return `<div class="card-col" style="height:${sectionH}px"><div class="card empty-slot" style="border-bottom:var(--border-w) solid ${COLOR_HEX[c]}30">${cbLabel(c)}</div></div>`;
    }
```

Card space is flex-centered in the card-col (single element, CSS centering).

- [ ] **Step 3: Update opponent row rendering (N>=1)**

Remove expedition-stack wrapper from non-empty opponent columns:

Replace:
```js
    return `<div class="card-col" style="position:relative" onclick="toggleExpand('opp','${c}')"><div class="expedition-stack" style="height:${fixedStackH};overflow:visible">${inner}</div></div>`;
```

With:
```js
    return `<div class="card-col" style="height:${sectionH}px" onclick="toggleExpand('opp','${c}')">${inner}</div>`;
```

- [ ] **Step 4: Update player row rendering (N=0)**

Replace:
```js
    if(cards.length===0){
      const cls=canPlay?'card target':'card empty-slot';
      return `<div class="card-col" style="position:relative"><div class="expedition-stack" style="height:${fixedStackH};display:flex;align-items:center;justify-content:center"><div class="${cls}" style="${canPlay?'':`border-bottom:var(--border-w) solid ${COLOR_HEX[c]}30`};position:relative" onclick="playToExpedition('${c}')">${canPlay?'<span class="target-label">Play</span>':''}${canPlay?'':cbLabel(c)}</div></div></div>`;
    }
```

With:
```js
    if(cards.length===0){
      const cls=canPlay?'card target':'card empty-slot';
      return `<div class="card-col" style="height:${sectionH}px" onclick="playToExpedition('${c}')"><div class="${cls}" style="${canPlay?'':`border-bottom:var(--border-w) solid ${COLOR_HEX[c]}30`}">${canPlay?'<span class="target-label">Play</span>':''}${canPlay?'':cbLabel(c)}</div></div>`;
    }
```

- [ ] **Step 5: Update player row rendering (N>=1)**

Replace:
```js
    let html=`<div class="card-col" style="position:relative" onclick="${stackClick}"><div class="expedition-stack" style="height:${fixedStackH};overflow:visible">${inner}</div>`;
    return html+`</div>`;
```

With:
```js
    return `<div class="card-col" style="height:${sectionH}px" onclick="${stackClick}">${inner}</div>`;
```

- [ ] **Step 6: Update discard row — remove card-slot wrapper**

The discard row uses `card-slot` class. Remove it in favor of direct column content. In the non-expanded discard rendering, replace `card-slot` wrapper usage with direct column content. The card-col is already the positioning context.

For the basic discard card case, change the wrapping from:
```js
return `<div class="card-col" style="..."><div class="card-slot" onclick="..." style="position:relative;overflow:visible">${stackHTML}${labels}</div></div>`;
```

To:
```js
return `<div class="card-col" style="height:${sectionH}px;${isExp?'z-index:50':''}" onclick="${handler}">${stackHTML}${labels}</div>`;
```

Apply similar changes to undo-discard and empty-discard cases. Note: the discard row section height is `sH.mid`, not `sH.stackRow` — use the appropriate height or let the middle section handle it.

Actually, discard cards sit inside the middle section which has its own height. The discard row doesn't have an explicit section height like stack rows do — it inherits from the middle section. Keep the discard card-col height as implicit (from the grid track), and just remove the card-slot wrapper. The card-col should use flex centering for the single discard card.

- [ ] **Step 7: Remove card-slot CSS class**

In `public/index.html`, remove `.card-slot`:
```css
/* DELETE: */
.card-slot{width:var(--col-w);height:calc(var(--card-h) + var(--slot-pad));display:flex;align-items:center;justify-content:center;position:relative}
```

- [ ] **Step 8: Run tests**

Run: `node tools/test/run-all.js`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add public/index.html public/src/rendering.js
git commit -m "Eliminate expedition-stack and card-slot wrappers, use columns directly"
```

---

### Task 4: Fix vertical centering — one authority, correct formula

With wrappers removed, ensure all vertical centering follows the convention: pile centers within cardContentH (section minus score line), with the score line budget on the side toward the board middle.

**Files:**
- Modify: `public/src/rendering.js`

- [ ] **Step 1: Define centering helpers**

At the top of `renderBoard()`, after the layout values block, add centering helpers:

```js
  // Pile height for N cards with given card offset
  function pileH(n, co){ return n <= 0 ? 0 : curCardH + Math.max(0, n-1) * co; }

  // Stack origin: centers pile within cardContentH, offset for score line position
  // opponent: score line at bottom → pile in top portion
  // player: score line at top → pile in bottom portion
  function stackOrigin(n, co, side){
    const ph = pileH(n, co);
    const center = Math.round((cardContentH - ph) / 2);
    return side === 'opp' ? center : scoreLineH + center;
  }
```

- [ ] **Step 2: Update opponent row centering**

Replace the current opponent centering code:
```js
    const totalStackPx=((cards.length-1)*so)+curCardH;
    const topOffset=Math.max(0,Math.round((cardContentH-totalStackPx)/2));
```

With:
```js
    const origin = stackOrigin(cards.length, so, 'opp');
```

Update card positioning to use `origin` instead of `topOffset`:
```js
    let inner=cards.map((card,i)=>`<div style="position:absolute;top:${origin+i*so}px;left:calc(var(--slot-pad) / 2);z-index:${isExp?100+i:i};transition:top .25s ease;transform:${jitter(card,i)}">${cardHTML(card)}</div>`).join('');
    // Score label below last card
    const labelTop=origin+(cards.length-1)*so+curCardH;
    inner+=stackScoreLabelAt(cards, labelTop);
```

- [ ] **Step 3: Update player row centering**

Replace the current player centering code:
```js
    const totalStackPx=((withPlayCount-1)*so)+curCardH;
    const topOffset=Math.max(0,scoreLinePx+Math.round((cardContentH-totalStackPx)/2));
```

With:
```js
    const origin = stackOrigin(withPlayCount, so, 'my');
```

Update card positioning:
```js
    let inner=cards.map((card,i)=>{
      ...
      return `<div style="position:absolute;top:${origin+i*so}px;left:calc(var(--slot-pad) / 2);...
    }).join('');
    if(canPlay) inner+=`<div style="position:absolute;top:${origin+nextIdx*baseSo}px;left:calc(var(--slot-pad) / 2);...
    // Score label above first card
    const labelTop=origin-scoreLineH;
    inner+=stackScoreLabelAt(cards, labelTop);
```

- [ ] **Step 4: Update spread view offset**

The expanded stack uses hardcoded `18` for spread spacing. Per conventions, spread view should use card offset at N=2:

Replace all instances of `isExp?18:baseSo` with:
```js
    const spreadOffset = cardOffset(2); // max readable spacing, used for spread view
    const so = isExp ? spreadOffset : baseSo;
```

- [ ] **Step 5: Run tests**

Run: `node tools/test/run-all.js`
Expected: All tests pass

- [ ] **Step 6: Visual verification**

Start a game against AI and verify:
- Empty columns show card space centered in section
- Stacks with 1-3 cards are visually centered (ignoring score label)
- Score labels float at pile edge, toward middle of board
- Opponent and player stacks mirror each other symmetrically
- Spread view uses consistent spacing

- [ ] **Step 7: Commit**

```bash
git add public/src/rendering.js
git commit -m "Fix vertical centering: pile in cardContentH, score line excluded"
```

---

### Task 5: Clean up remaining inconsistencies

Final audit pass for anything that still uses old conventions.

**Files:**
- Modify: `public/index.html`
- Modify: `public/src/rendering.js`
- Modify: `public/src/layout.js`

- [ ] **Step 1: Audit CSS for removed classes**

Search index.html for any remaining references to `expedition-stack`, `card-slot`, `gap-col`. Remove orphaned rules.

- [ ] **Step 2: Audit JS for old variable names**

Search rendering.js for `fixedStackH`, `fixedStackContentH`, `sectionH` (old usage), `scoreLinePx`, `getStackOffset`. All should be gone, replaced by the Task 2 naming.

- [ ] **Step 3: Update landscape discard row**

The landscape layout code (lines 412-430 in rendering.js) references `gap-sm` for column spacing calculations. With column gap removed, update the landscape grid calculation:

Replace:
```js
      const totalGridW=`calc(${COLORS.length} * var(--col-w) + ${COLORS.length-1} * var(--gap-sm))`;
```

With:
```js
      const totalGridW=`calc(${COLORS.length} * var(--col-w))`;
```

Also update the landscape grid-template-columns to not use gap:
```js
      discardRow.style.gridTemplateColumns=`repeat(${COLORS.length},var(--col-w)) var(--col-w)`;
```

- [ ] **Step 4: Update comments to use convention terminology**

Quick pass through rendering.js comments to use the terminology from docs/terminology-and-conventions.md:
- "stack offset" → "card offset"
- "score label" → "stack score"
- "empty slot" → "card space" (in comments, not CSS class names yet)
- "deck" → "draw pile" (in comments)
- "gap" → appropriate specific term

- [ ] **Step 5: Run full test suite**

Run: `node tools/test/run-all.js`
Expected: All 69 tests pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Alignment audit complete: conventions applied universally"
```
