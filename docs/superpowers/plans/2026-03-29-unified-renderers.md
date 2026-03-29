# Unified Renderers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build unified rendering functions (text, pile, info row) that enforce phi-scale conventions and DRY, then sweep the entire codebase to use them.

**Reference:** docs/terminology-and-conventions.md (the spec)

**Architecture:** Add shared renderer functions to rendering.js, then refactor all rendering code (rendering.js, gamelogic.js, elo.js, stats.js, timer.js, index.html CSS) to use them. The text formatter is the foundation — everything else depends on it.

---

## Context

### What exists now
- `cardHTML(card, extra)` — renders a single card div (works fine, keep)
- `stackScoreLabelAt(cards, topPx)` — renders score label with inline font-size/line-height (should use text formatter)
- `cbLabel(c)` — colorblind label with inline styles (should use text formatter)
- `stackOrigin(n, co, side)` — centering helper (keep, used by pile renderer)
- `pileH(n, co)` — pile height helper (keep)
- `cardOffset(count)` — card offset calculator (keep)
- Play stacks, discard piles rendered through separate code paths with different HTML structure
- Text elements scattered across files with individual inline font-size/line-height pairs
- Info rows rendered with manual DOM queries and inline style assignments

### What we're building
1. `renderText(content, tier, opts)` — text formatter, always enforces phi-scale n/n-1
2. `renderPile(cards, opts)` — unified pile renderer for play/discard/draw/empty
3. `renderInfoRow(name, center, score)` — unified info row
4. Full sweep of all files to use these functions

---

## Task A: Text Formatter

**Files:** `public/src/rendering.js`

The foundation. Every text element on the board should flow through this.

### Function signature:
```js
// Renders text with phi-scale sizing: font-size at tier n, line-height at tier n-1
// Returns an HTML string (inline element)
function renderText(content, tier, opts={}){
  // tier: phi-scale tier number (3=lg, 4=md, 5=sm)
  // opts.font: 'cinzel' (default) or 'crimson'
  // opts.color: CSS color value
  // opts.opacity: 0-1
  // opts.weight: font-weight (default: inherit)
  // opts.align: text-align
  // opts.tabular: true for tabular-nums
  // opts.uppercase: true for text-transform:uppercase
  // opts.letterSpacing: CSS letter-spacing value
  // opts.extraStyle: additional inline CSS string
  // opts.tag: HTML tag (default: 'span')
  // opts.block: true to use display:block (for div-like behavior in a span)

  const fonts = { cinzel: "'Cinzel',serif", crimson: "'Crimson Text',serif" };
  const sizes = { 3: '--text-lg', 4: '--text-md', 5: '--text-sm' };
  const lines = { 3: '--line-lg', 4: '--line-md', 5: '--line-sm' };
  // line-height is always one tier up (n-1)
  const sizeVar = sizes[tier] || '--text-md';
  const lineVar = lines[tier] || '--line-md';

  let style = `font-size:var(${sizeVar});line-height:var(${lineVar})`;
  style += `;font-family:${fonts[opts.font||'cinzel']}`;
  if(opts.color) style += `;color:${opts.color}`;
  if(opts.opacity!==undefined) style += `;opacity:${opts.opacity}`;
  if(opts.weight) style += `;font-weight:${opts.weight}`;
  if(opts.align) style += `;text-align:${opts.align}`;
  if(opts.tabular) style += `;font-variant-numeric:tabular-nums`;
  if(opts.uppercase) style += `;text-transform:uppercase`;
  if(opts.letterSpacing) style += `;letter-spacing:${opts.letterSpacing}`;
  if(opts.block) style += `;display:block`;
  if(opts.extraStyle) style += `;${opts.extraStyle}`;

  const tag = opts.tag || 'span';
  return `<${tag} style="${style}">${content}</${tag}>`;
}
```

### Key principle:
You CANNOT set font-size without line-height. The formatter enforces this. If you need text, you call renderText. Period.

### What this replaces:
- All inline `font-size:var(--text-sm);line-height:var(--line-sm)` pairs
- All inline `font-size:var(--text-md);line-height:var(--line-md)` pairs
- The `stackScoreLabelAt` function's text styling
- The `cbLabel` function's text styling
- The `countLabel` text in draw pile rendering
- Phase bar text styling (partially — CSS class handles some)
- Score screen text in gamelogic.js
- ELO display text in elo.js
- Stats display text in stats.js
- Timer display text in timer.js
- Action prompts (target-label, undo-label) — these use CSS classes which should also follow the convention

### CSS classes that set font-size should also set line-height:
- `.player-label` — has font-size:var(--text-sm) but NO line-height
- `.total-score` — has font-size:var(--text-md) but NO line-height
- `.phase-bar` — has both (correct)
- `.target-label` — has font-size:var(--text-sm) but NO line-height
- `.undo-label` — has font-size:var(--text-sm) but NO line-height
- `.r-line` — has font-size:var(--text-md) with line-height:1.6 (should use var(--line-md))
- `.r-color-total` — has font-size:var(--text-lg) but NO line-height
- `.sc-cards` — has font-size:var(--text-md) but NO line-height
- `.stats-section h3` — has font-size but NO line-height
- `.stat-row` — has font-size but NO line-height
- `.stats-record-row` — has font-size but NO line-height

### Lobby/modal text still using hardcoded px:
- `.lobby-title` — font-size:clamp(28px,8vw,48px) — keep clamp for responsive but base on phi-scale
- `.lobby-subtitle` — font-size:clamp(14px,3.5vw,18px)
- `.btn` — font-size:16px
- `.input-group label` — font-size:14px
- `.input-group input` — font-size:24px
- `.back-btn` — font-size:24px
- `.name-input` — font-size:18px
- `.error-msg` — font-size:14px
- `.variant-btn` — font-size:11px
- `.modal h3` — font-size:14px
- `.modal p,.modal li` — font-size:14px
- `.game-menu h2` — font-size:20px
- `.game-menu .save-note` — font-size:12px
- `.toast` — font-size:12px
- `.stats-header` — font-size:clamp(22px,6vw,32px)
- `.tutorial-*` — various hardcoded sizes
- `.achievement-*` — various hardcoded sizes
- `.high-contrast .card-value` — uses calc which is fine

---

## Task B: Unified Pile Renderer

**Files:** `public/src/rendering.js`

One function renders ALL piles: play stacks (offset > 0), discard piles (offset = 0), draw pile (face-down), and the N=0 card space.

### Function signature:
```js
// Renders a pile of cards within a column
// Returns HTML string for the column's inner content
function renderPileColumn(cards, opts){
  // cards: array of card objects (can be empty)
  // opts.offset: card offset in px (0 for discard/draw, computed for play stacks)
  // opts.origin: top position of first card (from stackOrigin)
  // opts.color: expedition color (for card space border tint)
  // opts.faceUp: true for visible cards, false for draw pile backs
  // opts.jitter: jitter function or null
  // opts.handlers: { card: fn(card,i), space: fn } — onclick generators
  // opts.extras: { card: fn(card,i) } — extra CSS classes per card
  // opts.scoreLabel: { show, score, top } or null
  // opts.expanded: boolean (spread view active)
  // opts.spreadOffset: spread offset value

  if(cards.length === 0){
    // N=0: render card space (dashed placeholder)
    // Centered via flex in parent card-col
    ...
  }

  // N>=1: render cards with absolute positioning
  const so = opts.expanded ? opts.spreadOffset : opts.offset;
  let html = '';
  for(let i = 0; i < cards.length; i++){
    const card = cards[i];
    const top = opts.origin + i * so;
    const extra = opts.extras?.card?.(card, i) || '';
    const handler = opts.handlers?.card?.(card, i) || '';
    const j = opts.jitter ? opts.jitter(card, i) : '';
    const cardContent = opts.faceUp ? cardHTML(card, extra) : '<div class="card card-back"></div>';
    html += `<div style="position:absolute;top:${top}px;left:calc(var(--slot-pad)/2);z-index:${opts.expanded?3000+i:i};transition:top .25s ease;${j?'transform:'+j:''}"${handler}>${cardContent}</div>`;
  }

  // Score label if provided
  if(opts.scoreLabel) html += stackScoreLabelAt(cards, opts.scoreLabel.top);

  return html;
}
```

### What this replaces:
- Opponent row card rendering (lines 349-363)
- Player row card rendering (lines 454-481)
- Discard pile card rendering (lines 366-397)
- The three separate code paths converge into one

### Column wrapper stays in the caller:
The caller still wraps in `<div class="card-col" style="height:...">`. The pile renderer only produces the INNER content.

---

## Task C: Unified Info Row Renderer

**Files:** `public/src/rendering.js`

Both info rows (opp and player) have identical structure: name left, center content, score right.

### Function signature:
```js
function renderInfoRow(nameEl, centerContent, scoreEl){
  // Already mostly handled by CSS .info-row class
  // This is more about ensuring both rows use identical construction
}
```

This may end up being a cleanup of renderGame rather than a new function — both rows already use the same HTML structure from index.html. The main fix is ensuring the text elements within use renderText.

---

## Task D: Sweep All Files — Apply Text Formatter

### Files to sweep:
1. `public/index.html` — CSS classes that set font-size must also set line-height (phi-scale n-1)
2. `public/src/rendering.js` — all inline text → renderText()
3. `public/src/gamelogic.js` — score screen inline text → renderText()
4. `public/src/elo.js` — ELO display inline text → renderText()
5. `public/src/stats.js` — stats display inline text → renderText()
6. `public/src/timer.js` — timer UI inline text → renderText()
7. `public/src/achievements.js` — achievement display text

### CSS fixes needed in index.html:
Every CSS rule with font-size must also have line-height at phi-scale n-1. Add missing line-heights to:
- `.player-label` — add line-height:var(--line-sm)
- `.total-score` — add line-height:var(--line-md)
- `.target-label` — add line-height:var(--line-sm)
- `.undo-label` — add line-height:var(--line-sm)
- `.r-line` — change line-height:1.6 to line-height:var(--line-md)
- `.r-color-total` — add line-height:var(--line-lg)
- `.sc-cards` — add line-height:var(--line-md)
- `.stats-section h3` — add line-height:var(--line-md)
- `.stat-row` — add line-height:var(--line-md)
- `.stats-record-row` — add line-height:var(--line-md)
- `.stats-record-row .rec-name` — add line-height:var(--line-sm)
- `.stats-record-row .rec-wr` — add line-height:var(--line-sm)

---

## Task E: Phi-Scale on Lobby/Modal CSS

Convert remaining hardcoded px font-sizes in lobby, modal, tutorial, achievement CSS to phi-scale vars. These screens don't have the game board's computed cardH, but they DO have the CSS var fallbacks from :root.

This is the lowest priority task — the game board is more important. But it ensures visual consistency across the whole app.

---

## Execution Order

1. **Task A** first (text formatter) — everything depends on it
2. **Task B** next (pile renderer) — fixes the alignment bugs
3. **Task D** (sweep) — applies text formatter everywhere, fixes missing line-heights
4. **Task C** (info rows) — small cleanup
5. **Task E** (lobby/modals) — last, lowest priority

## Testing

After each task: `node tools/test/run-all.js` (all 69 tests must pass)

After Task B: visual verification that play stacks and discard piles align, card spaces center properly, spread view works.
