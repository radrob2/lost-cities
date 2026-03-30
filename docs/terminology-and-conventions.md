# Venture — Terminology & Conventions

Definitive reference for naming, layout conventions, and design rules.
All code, comments, and documentation should use these terms consistently.

---

## 1. Spatial Structure

### 1.1 Screen Hierarchy

```
Viewport               — CSS rendering area (vh × vw), includes notch/corners
└── Safe area           — viewport minus system intrusions (env(safe-area-inset-*))
    └── Board           — safe area minus board-margin on all sides
        ├── Section     — one of 7 vertical bands (see 1.2)
        ├── Section spacing — elastic space between sections (see 2.2)
        └── Section     — ...
```

- **Viewport**: what CSS `vh`/`vw` measure. On iPhones with notch/rounded corners, includes the full display area.
- **Safe area**: the viewport minus hardware intrusions (notch, home indicator, rounded corners). Defined by `env(safe-area-inset-*)`. The board lives here.
- **Board**: the game's playable area. Safe area minus `board-margin` (n=3) on all sides.

### 1.2 Board Sections (top to bottom)

```
Board
├── Section: opp-hand           clipped to peek height, perspective-projected
├── [section spacing: small]
├── Section: opp-info           name tag, status indicator, total score
├── [section spacing: small]
├── Section: opp-stacks         5-column grid of opponent expedition stacks
├── [section spacing: big]
├── Section: middle             5-column discard grid + draw pile
├── [section spacing: big]
├── Section: my-stacks          5-column grid of player expedition stacks
├── [section spacing: small]
├── Section: my-info            name tag, phase prompt, total score
├── [section spacing: small]
└── Section: my-hand            perspective-projected hand, floating above table
```

Each section has a **section ratio** (fraction of cardH), a **section formula** (ratio × cardH), and a **section height** (computed pixels).

### 1.3 Columns

Each stack/discard section contains a 5-column grid. Columns are section-independent — each section has its own grid instance, but they share the same column template for visual alignment.

```
Section: opp-stacks (grid)
├── Column: red          — width: col-w (a φ-derived content space)
├── Column: green
├── Column: blue
├── Column: white
└── Column: yellow
```

**Column width** is a content space sized as an expression of card width using a φ n-level. No explicit column gap — the space between cards comes from the column width being wider than the card. Cards center within their column; the visible inter-card space is the leftover breathing room.

In landscape mode, the draw pile becomes a 6th column in the discard section's grid.

### 1.4 Within a Column

```
Column
├── Card 0               at stack origin + 0 × card offset
├── Card 1               at stack origin + 1 × card offset
├── ...
├── Card N-1             at stack origin + (N-1) × card offset
└── Stack score           at label position (toward middle of board)
```

When the column has no cards:
```
Column
└── Pile space            printed placeholder (dashed outline)
```

- **Pile space**: the dashed-outline placeholder printed on the table surface showing where cards can be played. Visible when no cards are present. This is a board marking, not a card.
- **Stack score**: text displaying the live score for that stack. Positioned at the pile edge, toward the middle of the board.

---

## 2. Spacing Types

Three distinct types of spacing in the layout:

### 2.1 Gaps

Explicit empty space between elements, defined independently of content.

| Gap | What | Size |
|-----|------|------|
| **Board margin** | Space between safe area edge and board content | n=3 |
| **Section spacing (big)** | Between opp-stacks↔middle and middle↔my-stacks | Elastic, minimum n=3 |
| **Section spacing (small)** | Between hand↔info, info↔stacks | Elastic, minimum n=4 |

**Elastic section spacing**: after all section heights are computed, surplus viewport height is distributed proportionally into section spacing. Big spacing gets φ× more weight than small spacing. This ensures the board fills the screen without hardcoded pixel values.

### 2.2 Content Spaces

Areas sized for content. The space is defined; leading, padding, or breathing room is whatever remains after the content occupies its natural size.

| Content space | Defined as | Content | Remaining space becomes |
|--------------|-----------|---------|------------------------|
| **Column width** | cardW + φ-derived padding | Card (cardW) | Horizontal breathing room (card centered in column) |
| **Line-height** | Text size at n, line-height at n-1 | Text characters | Leading (text centered in line-height) |
| **Section height** | Sum of content ratios × cardH | Pile, cards, text lines | Vertical centering space (pile centered in section) |

The key principle: content spaces define how much room something gets. The content centers within that room. The leftover IS the spacing — it's not separately defined.

### 2.3 Offsets

Translation of content relative to other content. Offsets position things within a shared space.

| Offset | What | How computed |
|--------|------|-------------|
| **Card offset** | Vertical distance between consecutive card tops in a stack | `cardH × 0.367 / N^0.613` pixels. Decreases as more cards are added. |
| **Stack origin** | Vertical position of the first card's top edge | Centering: `(sectionH - pileH) / 2`, where sectionH is the full section height including the score line budget. Current code: centers against full `sectionH`. Target: same — centering against `sectionContentH` was an earlier design that was not implemented. |
| **Jitter** | Deterministic random rotation + displacement | Hash of card identity + position index. Visual variety, not layout. |
| **Label position** | Where the stack score text sits | At pile edge: below opponent piles (origin + pileH), above player piles (origin - lineH) |

---

## 3. Z-Layers

Physical and virtual layers from back to front. Each layer gets a thousands digit (999 levels within each):

| Layer | z-index range | What | Examples |
|-------|--------------|------|---------|
| **Table** | 0-999 | The surface itself | Background color, texture, patterns |
| **Printed** | 1000-1999 | Markings on the table surface | Pile spaces (dashed outlines), color indicators |
| **Resting** | 2000-2999 | Physical objects on the table | Cards in stacks (2000+i), hand cards (2000), hover (2002) |
| **Floating** | 3000-3999 | Objects held above the table | Selected card (3000), spread view (3000) |
| **Overlay** | 4000-4999 | Information projected onto the scene | Stack scores, pile counts, phase prompts, name tags |
| **Chrome** | 5000-5999 | UI outside the game world | Gear (5000), toast (5100), modals (5200), tutorial (5300), flip animation (5999) |

Within-card z-indices (0, 1) are relative to the card's stacking context and don't interact with board-level z-order.

### 3.1 Effects

Visual modifications applied to objects in any layer. Effects are not a layer — they render at the same z-position as their target object.

| Effect | Applied to | What it does |
|--------|-----------|-------------|
| **Highlight** | A card (resting or floating) | Modified border/glow indicating selection or interactivity |
| **Pulse** | A pile space or card | Animated glow indicating a valid target |
| **Shadow** | Floating objects | Elevation cue (e.g., selected card shadow on table) |
| **Edge glow** | Board edge | Turn indicator, screen-level visual cue |

Effects respect the z-order of their target. A highlighted resting card is still behind cards stacked above it.

### 3.2 Layer Transitions

Objects can move between layers:
- **Resting → floating**: selecting a card lifts it above the hand. Activating spread view promotes a stack's cards to floating above neighboring columns.
- **Floating → resting**: deselecting a card returns it to resting.

---

## 4. Game Object Terminology

### 4.1 Card Collections

**Pile** is the universal term for any collection of cards in a location on the board. All piles share the same data structure (array of cards) and flow through the same rendering code. The only parameter that differs is the card offset.

A **stack** is a pile where card offset > 0 (cards are fanned/visible). "Stack" and "pile" are not distinct in code — a stack is just a pile rendered with offset.

| Kind | Full name | Card offset | Visibility | Examples |
|------|-----------|-------------|-----------|---------|
| **Play** | Play pile / play stack | > 0 (fanned) | All cards visible | Player/opponent expedition cards |
| **Discard** | Discard pile | = 0 (not fanned) | Top card only | Per-color discard piles (classic), shared pile (single variant) |
| **Draw** | Draw pile | = 0 (not fanned) | Face-down | The face-down draw pile |

**Hand** is separate — cards held by a player, rendered via cone perspective projection. Not a pile.

**Spread view**: tapping a pile to see all cards fanned out. Uses card offset at N=2 (the maximum readable spacing) for consistent visual language.

### 4.2 Unified Pile Rendering (DRY)

All piles render through the same code path. The pile renderer takes:
- Cards array
- Card offset (0 for discard/draw, computed for play stacks)
- Position within the column
- Whether cards are face-up or face-down

This ensures:
- Adding offset to discards = changing one parameter
- Visual consistency across all pile types = guaranteed
- One centering formula = no alignment mismatches
- Pile spaces (empty pile placeholders) also flow through the same path (N=0 case)

This principle applies broadly: any elements with similar structure (text labels, pile spaces, info rows) should flow through shared rendering functions parameterized by their differences.

**Current code:** There is no standalone `renderPile` function. Pile rendering is done inline in `renderBoard` via helpers `pileLayout`, `pileSpaceHTML`, and `positionedCardHTML`. **Target:** extract a `renderPile(cards, opts)` function in `ui.js` (Phase 4). The term `renderPile` is used in this doc to describe the logical responsibility, not a current function name.

### 4.3 Board Markings

| Term | What | Layer |
|------|------|-------|
| **Pile space** | Dashed-outline placeholder where cards can be played | Printed |

---

## 5. Text Elements

### 5.1 Text Categories

| Term | What | Layer | Examples |
|------|------|-------|---------|
| **Name tag** | Player identification | Overlay | "You", "Opponent" |
| **Phase prompt** | Tells the player what to do | Overlay | "Select a card", "Draw a card", "Waiting..." |
| **Status indicator** | Shows opponent state | Overlay | "thinking..." |
| **Stack score** | Live score per expedition stack | Overlay | "+15", "-4" |
| **Total score** | Running total in info row | Overlay | "42" |
| **Pile count** | Number of cards remaining | Printed | "32 left" |
| **Action prompt** | Interactive text tied to game state | Overlay | "Play", "Draw", "Discard", "undo" |

### 5.2 Text Sizing Convention

All text uses the φ tier system. Text at size n has line-height at n-1. The text centers within its line-height; the extra space is leading. No additional gaps or margins around single-line text — the line-height IS the space.

| Tier | Size | Line-height | Usage |
|------|------|-------------|-------|
| n=3 | --text-lg | --line-lg (n=2) | Headings, large UI |
| n=4 | --text-md | --line-md (n=3) | Body text, primary labels |
| n=5 | --text-sm | --line-sm (n=4) | Secondary labels, stack scores, captions |

---

## 6. Alignment Conventions

### 6.1 Centering Rules

- **Horizontal**: cards center within their column. The column width is the content space; leftover is breathing room on both sides.
- **Vertical**: card piles center within the full section height (including score line budget). The centering formula is `(sectionH - pileH) / 2`. Current code: this is what `centerTop(ph, sectionH)` computes. Note: an earlier design described centering against `sectionContentH` (score excluded) — that was not implemented; the full `sectionH` is used.
- **One authority per element**: either JS computes the position (for overlapping cards) or CSS flex centers it (for single elements). Never both on the same element.

### 6.2 Centering Method

| Situation | Method | Why |
|-----------|--------|-----|
| Overlapping cards in a stack (N ≥ 1) | JS absolute positioning with computed card offsets | Cards overlap, need exact pixel positions |
| Single elements (pile spaces, single discard top cards) | CSS flex centering | No overlap, simpler, same visual result |
| Text in line-height | CSS (text naturally centers in its line-height) | Standard typography |

N=0 (empty column) shows the pile space marker, centered via flex. N=1 through N=12 use the same JS positioning formula. No special cases.

### 6.3 Score Label Positioning

- **Opponent stacks**: score below the pile (toward the middle of the board)
- **Player stacks**: score above the pile (toward the middle of the board)
- Score is one line of text (size n=5, line-height n=4), positioned at the pile edge
- Score position is per-column — each column's label floats at that column's pile edge regardless of differing stack heights
- The section height budgets one score line, but the pile centering ignores it

### 6.4 Growth Direction

Both opponent and player stacks currently grow downward (card 0 at top, newest at bottom). The pile as a whole centers within the section.

**Future**: add card values in the bottom-right corner (in addition to top-left). This enables opponent stacks to grow upward (away from the middle) without flipping cards — the bottom-right number peeks above each card below, making the opponent's board more natural to read.

---

## 7. Phi-Scale (φ-scale)

The **phi-scale** is the hierarchical sizing system based on the golden ratio. Every measurement derives from `cardH / φ^n` for integer n. The tier number is n.

In conversation: "phi-scale 4" means tier n=4. In code/docs: φ-scale or `n=4`.

| Tier | Size = cardH / φ^n | Role | Used for |
|------|-------------------|------|----------|
| 0 | cardH | Base unit | Card height |
| 1 | cardH / φ | Object minor | Card width |
| 2 | cardH / φ² | Major content space | Peek height, card overlap visible strip |
| 3 | cardH / φ³ | Primary | text-lg, board margin, big section spacing minimum |
| 4 | cardH / φ⁴ | Standard | text-md, card padding, small section spacing minimum |
| 5 | cardH / φ⁵ | Secondary | text-sm (floor: 9px) |
| 7 | cardH / φ⁷ | Micro | --space-micro |
| 9 | cardH / φ⁹ | Hairline | Border width |

**Text convention:** text at tier n gets line-height at tier n-1. The text centers within its line-height; the extra space is leading.

**cardH** is solved from viewport dimensions to guarantee all sections fit. It's the minimum of vertical and horizontal constraints. No hardcoded pixel caps except an absolute usability floor of 12px.

### 7.1 Unified Rendering Principle

Elements with similar structure should flow through shared code parameterized by their differences. This enforces phi-scale consistency and follows DRY:

| Element type | Shared renderer | Parameters |
|-------------|----------------|------------|
| All piles (play, discard, draw) | Pile renderer | cards, card offset, face-up/down |
| All text labels | Text renderer | content, tier, position |
| All pile spaces | Pile renderer (N=0 case) | color, interactivity |
| All info rows | Info row renderer | name, status/hint, score |

---

## 8. Code Conventions

### 8.1 Naming

- **camelCase** for all JS variables and functions: `cardOffset`, `pileHeight`, `sectionHeights`
- **No abbreviations that require tribal knowledge.** Use full descriptive names:
  - `pileHeight` not `ph`
  - `sectionHeights` not `sH`
  - `cardOffset` not `co`
  - `stackOrigin` not `so` (when used as a variable, not a local scope shorthand)
- **Names must match domain terminology** from this document. If the doc says "stack origin", the variable is `stackOrigin`.
- **Files are named for their single responsibility**: `math.js` for pure formula functions, `config.js` for game rule variables, `events.js` for the pub/sub bus.

### 8.2 Structure

- No abstraction until a pattern appears twice.
- Three similar lines are preferable to one premature helper that obscures intent.
- Functions that are pure (no side effects, no DOM access) live in `math.js` or `rules.js`, not in rendering files.

---

## 9. Architecture Terms

The new module names replace the old L0–L4 layer labels from CLAUDE.md. The new terms describe **responsibility**, not hierarchy.

| Module | Responsibility | File | Status |
|--------|---------------|------|--------|
| **config** | Game rule variables, thresholds, display data. The root of all derived values. All other modules read from config, never write to it. | `config.js` | Phase 1 — exists |
| **math** | Pure formula functions. No DOM, no state, no side effects. Reads config only. | `math.js` | Phase 1 — exists |
| **events** | Pub/sub bus for decoupled communication between modules. No dependencies on other modules. | `events.js` | Phase 1 — exists |
| **rules** | Legal move checks, card definitions, game constraints. Reads config and math. | `rules.js` | Phase 2 — planned |
| **engine** | Game state, turn flow, play/discard/draw actions. Emits events on state changes. | `engine.js` | Phase 3 — planned |
| **ui** | Rendering, DOM manipulation, animations. Reads engine state via events. | `ui.js` | Phase 4 — planned |

**Direction of dependency:** config ← math ← rules ← engine ← ui. Events flows sideways (any module can emit or subscribe). No module reaches up the chain.

---

## 10. Config & Event Terminology

### 10.1 Config Key Paths

Config values are referenced using dot-notation paths:

| Path | What |
|------|------|
| `config.scoring.baseCost` | The expedition investment cost (20) |
| `config.colors` | Array of color names: `['red','green','blue','white','yellow']` |
| `config.ai.mcSimulations` | Number of Monte Carlo simulations per move |
| `config.storagePrefix` | Prefix for all localStorage keys (currently `"expedition"`) |

When documenting a config value, always use its full dot-notation path.

### 10.2 Event Names

Event names use **past tense** — they describe something that already happened:

| Event | When emitted |
|-------|-------------|
| `cardPlayed` | A card was played to an expedition |
| `cardDiscarded` | A card was discarded |
| `cardDrawn` | A card was drawn from the deck or discard pile |
| `turnChanged` | The active turn changed from one player to another |
| `gameOver` | The deck was emptied and the game ended |
| `phaseChanged` | The turn phase changed (play → draw) |

Pattern: `noun + past-tense-verb`. Not `onCardPlay`, not `CARD_PLAYED`, not `card:play`.

### 10.3 Storage Keys

All localStorage keys are derived from `config.storagePrefix`. No module hardcodes a raw string key like `"expedition_elo"` — keys are always constructed as `config.storagePrefix + '_' + suffix`.

---

## 11. Math Reference Terms

Every formula has a canonical function name in `math.js`. That function name IS the name for the formula throughout all code, comments, and documentation.

| Function | Formula | What it computes |
|----------|---------|-----------------|
| `scoreExpedition` | `(sum − 20) × (1 + wagers) + (n≥8 ? 20 : 0)` | Score for a single expedition |
| `scoreAll` | Sum of `scoreExpedition` across all active colors | Total score for one player |
| `eloExpected` | `1 / (1 + 10^((oppRating − myRating) / 400))` | Expected win probability (ELO) |
| `eloChange` | `K × (actual − expected)` | ELO rating update after a game |
| `phiTier` | `cardH / φ^n` | Golden ratio size at tier n |
| `stackOffset` | `cardH × 0.367 / N^0.613` | Card peek-out distance in a pile of N cards |
| `pileHeight` | `cardH + max(0, N−1) × stackOffset` | Total visual height of a pile of N cards |
| `center` | `(containerH − contentH) / 2` | Top offset to center content in container |
| `jitter` | Hash of card identity + position index → rotation + translation | Deterministic card scatter |

For full derivations, constants, and rationale see `docs/math-reference.md`.
