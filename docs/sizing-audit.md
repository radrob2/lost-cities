# Vertical & Horizontal Sizing Audit

**Date:** 2026-03-27
**Reference viewport:** iPhone (375x667), cardH=78, cardW=48
**Reference values at cardH=78:** `--font-base:13px`, `--gap-sm:4px`, `--gap-md:8px`, `--pad:8px`

---

## DOM Hierarchy of #game-screen

```
#game-screen (.screen)
  .top-bar                          ← OUTSIDE .board-area
  .board-area (flex:1, flex-col, justify-content:space-between)
    .row-label "Opponent"
    #opp-row (.card-row)
    .middle-row (flex-col, gap:gap-sm, padding:gap-sm 0)
      .row-label "Discard"
      #discard-row (.card-row)        [classic only]
      #single-pile-area               [single only]
      .deck-card
        #deck-stack (card-h x card-w landscape)
        .deck-num
    .row-label "Your Ventures"
    #my-row (.card-row)
    div (score + phase-bar wrapper)
      #my-total-score
      .phase-bar
    .hand-area
      .hand-cards (height set by JS)
```

---

## Vertical Layout Audit (top to bottom)

### Reference: `computeLayout()` totalFrac (line 722)

```
totalFrac = 0.6   (topBar)
          + 0.22  (oppLabel)
          + oppStackFrac  [1.0 + (n-1)*offFrac + 0.15 scoreLabel]
          + 0.1   (gap)
          + 0.22  (discLabel)
          + 1.15  (discardRow)
          + deckFrac [0.9 portrait, 0 landscape]
          + 0.1   (gap)
          + 0.22  (myLabel)
          + myStackFrac  [1.0 + (n-1)*offFrac + 0.15 scoreLabel]
          + 0.1   (gap)
          + 0.4   (phaseBar)
          + 1.35  (hand)
          + 0.25  (safeArea)
```

### Element-by-Element Table

| # | Element | CSS rule(s) | Resolved px (cardH=78) | As fraction of cardH | computeLayout frac | Match? | Notes |
|---|---------|-------------|----------------------|---------------------|-------------------|--------|-------|
| 1 | **.top-bar** | `padding: var(--pad) calc(var(--pad)*1.25)` + `padding-top: max(var(--pad), env(safe-area-inset-top))` | Content ~13px line + 8px top + 8px bottom = ~29px. With items like turn-indicator (padding ~3.5px top/bottom, font ~10px), actual flex item height is taller. Observed: ~37-44px | 0.47 - 0.56 | **0.6** | **APPROXIMATE** | Top-bar has no explicit `height`. Its height is determined by content (font-base=13px) + vertical padding (8px top + 8px bottom = 16px). Flex align-items:center means tallest child wins. Turn indicator has its own padding. Actual height ~29-37px = 0.37-0.47 of cardH. The 0.6 estimate (46.8px) is generous -- provides a small buffer, but on devices with safe-area-inset-top > 8px this will be wrong. |
| 2 | **.board-area** padding-top | `padding: var(--gap-md) 0` | 8px top | 0.103 | **Not in totalFrac** | **MISSING** | board-area adds 8px top padding -- not accounted for in totalFrac. |
| 3 | **.board-area** padding-bottom | `padding: var(--gap-md) 0` | 8px bottom | 0.103 | **Not in totalFrac** | **MISSING** | board-area adds 8px bottom padding -- not accounted for. |
| 4 | **Row label "Opponent"** | inline: `font-size: calc(var(--font-base) * .69)` = 8.97px. No explicit height. Default line-height ~1.2 | ~10.8px | 0.138 | **0.22** | **OVER-ESTIMATED** | The label has no margin, only horizontal padding. Actual rendered height is just one line of ~9px text with default line-height, so ~11px. The 0.22 frac (17.2px) over-estimates by ~6px. |
| 5 | **#opp-row** (expedition stacks) | `.card-row` has no explicit height. Children are `.card-col` > `.expedition-stack`. Stack default CSS height: `calc(var(--card-h) + 10px)` = 88px. JS overrides to `calc(var(--card-h) + ${(n-1)*baseSo+10}px)` | empty: 88px, 3 cards: 78+2*18+10=124px | 1.0 + (+10px offset = 0.128) + (n-1)*stackOff/78 | **1.0 + (n-1)*offFrac + 0.15** | **INCONSISTENCY** | See detailed analysis below. The +10px hard-coded offset in the inline style adds 0.128*cardH but computeLayout uses +0.15 for the "score label". The actual +10px is for the 5px top positioning of cards inside the stack (cards start at `top:${i*so+4}px`, so 4px offset) plus 6px bottom breathing room, NOT the score label. The score label is an *additional* element rendered by stackScoreLabel() with margin-top:1px, font-size ~9px, line-height ~1.2 = ~12px total. So actual stack col height = cardH + 10px + stackOffsets + ~12px score label = cardH*(1 + 0.128 + offsets + 0.154). The 0.15 in computeLayout appears to combine the +10px offset AND score label into one number, but 0.15*78 = 11.7px, while actual is 10+12 = 22px = 0.282*cardH. **This is under-counted by ~10px per row.** |
| 6 | **Gap opp-row to middle-row** | No explicit gap. `.board-area` uses `justify-content:space-between` so gaps are dynamic. | Dynamic (whatever is left over) | Dynamic | **0.1** | **N/A** | computeLayout assumes 0.1 fixed gaps but actual layout uses space-between, meaning gaps expand/shrink freely. The 0.1 values are not enforced by CSS -- they're just placeholders in the budget. This is actually correct behavior for sizing: the budget slightly over-estimates to leave room for space-between distribution. |
| 7 | **Row label "Discard"** | Same as opp-label: font-size ~9px, height ~11px | ~11px | 0.138 | **0.22** | **OVER-ESTIMATED** | Same issue as #4. |
| 8 | **#discard-row** (classic) | `.card-row` children are `.card-col > .card-slot`. card-slot CSS: `height:calc(var(--card-h)+10px)` = 88px | 88px | 1.128 | **1.15** | **CLOSE** | 1.128 vs 1.15 -- off by 0.022 (1.7px). Acceptable. |
| 9 | **#single-pile-area** (single variant) | `display:inline-block`, contains a single card (card-h x card-w) or empty-slot (card-w+10 x card-h+10). No additional height beyond card. | 78px (card) or 88px (empty-slot) | 1.0 or 1.128 | **Uses same 1.15 as discard-row** | **CLOSE** | In single variant, the discard row is hidden and the single-pile shows one card in the middle-row. The height is less than the 5-col discard row in classic mode. |
| 10 | **.middle-row** gap & padding | `gap:var(--gap-sm); padding:var(--gap-sm) 0` = gap:4px between children, padding:4px top and bottom | gap between discard-label and discard-row: 4px, between discard-row and deck: 4px. Padding: 4px top + 4px bottom. | 4 children inside middle-row, so 3 gaps of 4px = 12px + 8px padding = 20px total | 0.256 | **Not in totalFrac** | **PARTIALLY MISSING** | middle-row adds its own padding (4px top + 4px bottom = 8px) and gaps (3*4px = 12px for label+discard-row+deck = 12px). Total 20px = 0.256*cardH. computeLayout has no explicit line for middle-row padding/gaps. The discard-label 0.22 and discardRow 1.15 are counted, and deckFrac 0.9 is counted, but the middle-row's 4px top padding, 4px bottom padding, and 12px of inter-child gaps (totaling 20px) are NOT counted. |
| 11 | **.deck-card** | Contains #deck-stack (`height:var(--card-w)` = 48px) + .deck-num (font ~9px + margin-top:2px) | 48 + ~13 = 61px | 0.782 | **0.9** (deckFrac) | **OVER-ESTIMATED** | 0.9*78 = 70.2px vs actual ~61px. Over-estimated by ~9px. But the 0.9 also needs to cover the gap between deck and surrounding elements (middle-row gap-sm = 4px above), so effectively ~65px budget vs 70.2px allotted. Still 5px over. |
| 12 | **Row label "Your Ventures"** | Same as other labels | ~11px | 0.138 | **0.22** | **OVER-ESTIMATED** | Same as #4, #7. |
| 13 | **#my-row** (my expedition stacks) | Same structure as #opp-row. expedition-stack height inline from JS + stackScoreLabel | Same as opp-row | Same | **myStackFrac = 1.0 + (n-1)*offFrac + 0.15** | **Same issue as #5** | Score label height not fully accounted for. |
| 14 | **Score + phase-bar wrapper div** | inline: `padding:0 var(--gap-md)`. Children are #my-total-score and .phase-bar. | height = max(score-span, phase-bar). phase-bar: min-height calc(var(--font-base)*1.7) = 22.1px, padding: 3.04px top + 3.04px bottom, font ~11.05px. | ~22px | 0.282 | **0.4** | **OVER-ESTIMATED** | 0.4*78 = 31.2px vs actual ~22px. Over-estimate by ~9px. |
| 15 | **.hand-area** | `padding: var(--gap-sm) var(--gap-sm); padding-bottom: max(calc(var(--gap-md)*.88), env(safe-area-inset-bottom))` | padding-top: 4px, padding-bottom: max(7.04px, safe-area). Contains .hand-cards. | pad top 4 + pad bottom 7 = 11px of padding | 0.141 | **Included in hand 1.35** | See below. |
| 16 | **.hand-cards** container | Height set by JS: `Math.ceil(cardH + arcDrop + 16)` (line 870). arcDrop for 8 cards with stepDeg~3 = R*(1-cos(10.5deg)) where R~675 on 375px. arcDrop ~11.3px. Total: ceil(78+11.3+16) = 106px | ~106px | 1.359 | **1.35** | **MATCH** (just for hand-cards height, not including hand-area padding) | But hand-area also has padding: 4px top + 7px bottom = 11px. So total hand section = 106 + 11 = 117px = 1.5*cardH. computeLayout says 1.35 which only covers the hand-cards, not the hand-area padding. |
| 17 | **Safe area bottom** | env(safe-area-inset-bottom) absorbed into hand-area padding-bottom | 0px (non-notch), ~34px (iPhone notch) | 0-0.436 | **0.25** | **DEPENDS ON DEVICE** | For non-notch phones, safe-area is 0 and the 0.25 is pure over-estimate. For notch phones (~34px), 0.25*78=19.5px under-estimates the actual 34px. However, hand-area padding-bottom uses max(7px, safe-area), so on notch devices the padding grows from 7px to 34px, adding 27px not budgeted. |

---

## Detailed: offFrac vs getStackOffset Mismatch

| Stack count | offFrac (computeLayout) | offFrac * 78 | getStackOffset (renderBoard) | Delta per card |
|-------------|------------------------|-------------|------------------------------|----------------|
| 1-3 | 0.24 | 18.72px | 18px | +0.72px |
| 4-5 | 0.19 | 14.82px | 14px | +0.82px |
| 6-7 | 0.14 | 10.92px | 10px | +0.92px |
| 8+ | 0.10 | 7.80px | 7px | +0.80px |

computeLayout's offFrac is slightly larger than actual px offsets, providing a small safety margin per card. With a max of ~11 cards, this gives up to ~10px of extra budget. **Acceptable but imprecise.**

Also note: the comment on line 710 says `count<=3: 0.23, <=5: 0.18, <=7: 0.13, 8+: 0.09` but the actual offFrac code on line 713 uses `0.24, 0.19, 0.14, 0.10`. **The comment is stale.**

---

## Detailed: Stack Column Actual Height

For an expedition with N cards, the actual rendered height of the card-col is:

```
expedition-stack height (from JS inline):  cardH + (N-1)*stackOffset + 10  px
  + stackScoreLabel (conditional):         ~12px  (9px font * 1.2 line-height + 1px margin)
  = cardH + (N-1)*stackOffset + 10 + 12
  = cardH + (N-1)*stackOffset + 22  px
```

In computeLayout terms:
```
oppStackFrac = 1.0 + (N-1)*offFrac + 0.15
             = 1.0 + (N-1)*offFrac + 0.15
```

At cardH=78, the `0.15` covers `0.15*78 = 11.7px`, but actual extra is `22px` (10px offset + 12px score label).

**Missing: ~10.3px per expedition row = 0.132 * cardH. Total for both rows: ~20.6px = 0.264 * cardH.**

---

## Total Fraction Comparison (empty stacks, classic, portrait, cardH=78)

### computeLayout budget:
```
topBar:       0.60
oppLabel:     0.22
oppStack:     1.15  (1.0 + 0 + 0.15)
gap:          0.10
discLabel:    0.22
discardRow:   1.15
deckFrac:     0.90
gap:          0.10
myLabel:      0.22
myStack:      1.15  (1.0 + 0 + 0.15)
gap:          0.10
phaseBar:     0.40
hand:         1.35
safeArea:     0.25
--------------------
TOTAL:        8.31 * cardH
```

With 12% safety: `8.31 * 1.12 = 9.31`, so `cardH = 667 / 9.31 = 71.6`, capped at 78 -> **cardH = 71**

### Actual rendered budget (non-notch, empty stacks):
```
topBar:          ~37px  = 0.47  (no safe-area-inset)
board-area pad:  16px   = 0.21  (8px top + 8px bottom)
oppLabel:        11px   = 0.14
oppRow:          88px   = 1.13  (card-h + 10px, no score label when empty)
middle-row pad:  8px    = 0.10  (4px top + 4px bottom)
discLabel:       11px   = 0.14
discardRow:      88px   = 1.13
middle gaps:     12px   = 0.15  (3 * 4px gap-sm)
deckCard:        61px   = 0.78
myLabel:         11px   = 0.14
myRow:           88px   = 1.13  (no score label when empty)
phaseBarWrap:    22px   = 0.28
handArea:       117px   = 1.50  (106px hand-cards + 11px padding)
safeArea:         0px   = 0.00  (non-notch)
space-between:  dynamic
--------------------
SUM of measured: ~570px = 7.31 * cardH (at cardH=78)
Available:             667px
Leftover for space-between gaps: ~97px
```

### Actual rendered budget (non-notch, 5 cards per stack):
```
topBar:          ~37px  = 0.47
board-area pad:  16px   = 0.21
oppLabel:        11px   = 0.14
oppRow:          78+4*14+10+12 = 156px = 2.00
middle-row pad:  8px    = 0.10
discLabel:       11px   = 0.14
discardRow:      88px   = 1.13
middle gaps:     12px   = 0.15
deckCard:        61px   = 0.78
myLabel:         11px   = 0.14
myRow:           156px  = 2.00
phaseBarWrap:    22px   = 0.28
handArea:       117px   = 1.50
--------------------
SUM: ~764px = 9.79 * cardH
Available: 667px
```

At this point content exceeds viewport by ~97px! But computeLayout would compute:
```
oppStackFrac = 1.0 + 4*0.19 + 0.15 = 1.91
myStackFrac  = 1.91
totalFrac = 0.6+0.22+1.91+0.1+0.22+1.15+0.9+0.1+0.22+1.91+0.1+0.4+1.35+0.25 = 9.43
cardH = 667 / (9.43*1.12) = 63
```

At cardH=63: getStackOffset(5) = 14px (hardcoded, does NOT scale!)
So actual stack = 63 + 4*14 + 10 + 12 = 141px, but budget says 1.91*63 = 120px.
**Overflow of 21px per stack = 42px total from stacks alone.**

---

## Critical Inconsistencies Found

### 1. `getStackOffset()` returns HARDCODED pixel values (line 950-955)

```js
function getStackOffset(count){
    if(count<=3) return 18;
    if(count<=5) return 14;
    if(count<=7) return 10;
    return 7;
}
```

These values do NOT scale with cardH. When computeLayout shrinks cardH to fit everything, the stack offsets remain at 18/14/10/7px, but computeLayout's `offFrac` assumes they scale proportionally. **This is the root cause of potential overflow on small screens or large stacks.**

**Severity: HIGH** -- On a 667px tall phone with 5+ cards per stack, the actual stack px will exceed the budgeted fraction.

### 2. Board-area padding not in totalFrac (lines 61, 722)

`.board-area` has `padding: var(--gap-md) 0` = 8px top + 8px bottom = 16px. This is not accounted for in totalFrac.

**Severity: LOW** -- Absorbed by the 12% safety margin and space-between flexibility.

### 3. Middle-row internal gaps and padding not in totalFrac (line 68)

`.middle-row` has `padding: var(--gap-sm) 0` (8px total) and 3 inter-child gaps of `var(--gap-sm)` each (12px). Total 20px unbudgeted.

**Severity: MEDIUM** -- 20px is significant on small viewports.

### 4. Stack score label height under-counted (lines 715-716, 965)

computeLayout uses `+0.15` for score label, but actual is `+10px` (inline offset in expedition-stack height) + `~12px` (score label div) = 22px = 0.282*cardH. Missing ~10px per row.

**Severity: MEDIUM** -- 20px total across both rows.

### 5. Hand-area padding not separately budgeted (lines 124-125, 722)

hand-area has padding-top: 4px (gap-sm) and padding-bottom: max(7px, safe-area-inset-bottom). The 1.35 frac only covers the JS-computed hand-cards height (cardH + arcDrop + 16). The additional 11px of padding is unbudgeted.

**Severity: LOW** -- Partially absorbed by safety margin.

### 6. Safe-area-inset-bottom double-counted / mismodeled (lines 124, 722)

computeLayout adds 0.25*cardH for safeArea. But the actual safe-area is applied via `.hand-area { padding-bottom: max(calc(var(--gap-md)*.88), env(safe-area-inset-bottom)) }`. On non-notch devices, this is just 7px, and the 0.25 (19.5px) is wasted budget. On iPhone 14 (~34px safe area), the 0.25 (19.5px) under-estimates.

**Severity: LOW** -- The 12% safety margin covers most of this.

### 7. Phase-bar wrapper div has no class, no explicit height (line 373)

The wrapper containing #my-total-score + .phase-bar uses inline styles only. Its height depends on .phase-bar's min-height: `calc(var(--font-base) * 1.7)` = 22.1px. computeLayout budgets 0.4*78 = 31.2px. Over-estimated by ~9px.

**Severity: NONE** (over-estimation is safe).

### 8. Stale comment on line 710

Comment says offFrac values are `0.23, 0.18, 0.13, 0.09` but actual code on line 713 uses `0.24, 0.19, 0.14, 0.10`.

**Severity: COSMETIC**

### 9. deck-num has hardcoded `margin-top: 2px` (line 137)

This 2px does not scale with cardH.

**Severity: NEGLIGIBLE**

### 10. expedition-stack cards positioned with hardcoded `+4px` top offset (lines 978, 1030)

Cards inside stacks use `top:${i*so+4}px` -- the 4px starting offset is hardcoded.

**Severity: LOW** -- Accounted for in the +10px of the stack height formula.

### 11. Stack height inline formula has hardcoded `+10` (lines 977, 1025)

`calc(var(--card-h) + ${(cards.length-1)*baseSo+10}px)` -- the 10px is hardcoded and does not scale.

**Severity: MEDIUM** -- Combined with hardcoded getStackOffset(), this means the entire stack height calculation is semi-fixed even when cardH shrinks.

---

## Horizontal Sizing Audit

### Card column width

```css
.card-col {
    width: calc(20% - 6px);
    min-width: calc(var(--card-w) + 10px);    /* 48+10 = 58px */
    max-width: calc(var(--card-w) + 10px);     /* 58px */
}
```

5 columns at max-width: 5 * 58px = 290px
`.card-row` gap: `var(--gap-sm)` = 4px, 4 gaps = 16px
`.card-row` padding: `0 calc(var(--pad) * 1.5)` = 0 12px = 24px total

**Total: 290 + 16 + 24 = 330px** -- fits in 375px with 45px to spare.

At smaller viewports (320px): card-w would scale down (computeLayout), so `min-width` still governs. At cardH=60, cardW=37, min-width=47px, 5*47+16+24 = 275px. Fits in 320px.

### Potential horizontal issues

| Issue | Severity | Details |
|-------|----------|---------|
| `min-width` forces card-col to at least `card-w + 10px` | LOW | If viewport extremely narrow AND cardW is large, could overflow. But computeLayout caps cardH based on viewport, so cardW stays proportional. |
| `.card-row` padding uses `calc(var(--pad) * 1.5)` | NONE | Scales with pad. |
| `card-row` gap uses `var(--gap-sm)` | NONE | Scales. |
| `.expedition-stack` width: `calc(var(--card-w) + 10px)` -- the 10px is hardcoded | LOW | Does not scale, but at worst adds 50px total (5 stacks). Acceptable. |
| `.card-slot` width: `calc(var(--card-w) + 10px)` -- same hardcoded 10px | LOW | Same as above. |
| `.card.empty-slot` width: `calc(var(--card-w) + 10px)` -- same | LOW | Same. |
| Turn indicator has hardcoded `border-radius:14px` | NEGLIGIBLE | Visual only. |
| Card border: `1.5px` hardcoded | NEGLIGIBLE | Visual only. |
| `.card` border-radius: `4px` hardcoded | NEGLIGIBLE | Visual only. |
| Sound button inline `font-size:16px` (line 354) | LOW | Hardcoded, does not scale with font-base. |
| `letter-spacing:1.5px` on row-labels (inline) | NEGLIGIBLE | Does not affect layout significantly. |

### Landscape / iPad (horizontal)

On landscape iPad (1024x768): computeLayout caps cardH to 88px, cardW=54px.
5 * (54+10) + 16 + 24 = 360px. Plenty of room in 1024px.

Middle-row becomes `flex-direction:row` at `min-width:768px and landscape` (line 263-265), placing discard-row and deck side-by-side. This changes vertical budget (deck no longer stacks vertically), which is why deckFrac=0 in landscape.

---

## Summary of All Hardcoded px That Should Scale

| Location | Value | What it affects | Should be |
|----------|-------|-----------------|-----------|
| `getStackOffset()` (line 950-954) | 18, 14, 10, 7 px | Card overlap in stacks | `Math.round(frac * cardH)` |
| expedition-stack height inline (line 977, 1025) | `+10` px | Stack container extra height | `+ Math.round(0.13 * cardH)` or similar |
| Card positioning `+4px` (line 978, 1030) | 4px | Top offset of first card in stack | Scale with cardH |
| `.deck-num margin-top` (line 137) | 2px | Space below deck | `calc(var(--gap-sm) * 0.5)` |
| hand-cards height `+16` (line 870) | 16px | Bottom padding of hand arc | Scale with cardH |
| `.target-label bottom:-14px` (line 111) | -14px | "Play"/"Draw" label position | Use calc with font-base |
| `.undo-label bottom:-12px` (line 120) | -12px | "Undo" label position | Use calc with font-base |
| `stackScoreLabel margin-top:1px` (line 965) | 1px | Score label spacing | Negligible |

---

## Recommendations (Priority Order)

1. **Make `getStackOffset()` scale with cardH** -- This is the single biggest source of potential overflow. Return `Math.round(frac * cardH)` instead of fixed px. Use the same fractions as `offFrac()` in computeLayout.

2. **Add middle-row padding/gaps to totalFrac** -- Add ~0.26 to totalFrac to account for middle-row's own padding and inter-child gaps.

3. **Fix score label budget** -- Change `+0.15` in oppStackFrac/myStackFrac to `+0.28` to cover both the +10px stack offset and the ~12px score label. Or better: make the +10px scale too.

4. **Scale the `+10` in stack height formula** -- Replace the hardcoded 10px in the inline style with a value derived from cardH.

5. **Scale the `+16` in hand-cards height** -- Replace `Math.ceil(cardH + arcDrop + 16)` with `Math.ceil(cardH + arcDrop + cardH * 0.2)`.

6. **Model safe-area-inset-bottom properly** -- Read actual `env(safe-area-inset-bottom)` value and add it to the budget instead of using a fixed 0.25 frac.
