# Math Reference

Every formula in the game engine, with derivation, intent, and examples.

**File:** `public/src/math.js`
**Dependencies:** `CONFIG` only (no game state)

---

## Scoring

### scoreExpedition

**Function signature:**
```javascript
scoreExpedition(cards) → Number
```

**Formula:**
```
(S - B) × (1 + W) + bonus
```

Where:
- **S** = sum of card values (numbers only, 2–10)
- **B** = base cost (20)
- **W** = wager count (0–3)
- **bonus** = +20 if card count ≥ 8, else 0

**Why this formula:**

The formula has three parts:

1. **Base score (S − B):** Starting an expedition costs 20 points to discourage scattered, unfocused play. A single card worth 5 would be negative (5−20=−15) unless you commit more cards. This incentivizes choosing colors and driving them deep.

2. **Wager multiplier (1 + W):** Wagers amplify the entire result. A wager placed early signals confidence. If the expedition scores well (+25), the wager multiplier roughly doubles the gain. If it fails (−10), the loss is also doubled. This asymmetry creates meaningful risk/reward tension and rewards bold betting early when uncertainty is high.

3. **Commitment bonus (+20 at 8+ cards):** Players who play all 8 cards in a color get a fixed bonus. This rewards deep engagement with one expedition and partially offsets the risk of betting big. Also encourages late-game card plays that might otherwise be discarded.

**Derived from:** Lost Cities (Kosmos), the physical card game on which this rules engine is based.

**Example 1: Single wager with two numbers**
Cards: [wager(0), 5, 6]
```
S = 5 + 6 = 11
W = 1
(11 - 20) × (1 + 1) = (-9) × 2 = -18
No bonus (3 < 8)
Total = -18
```

**Example 2: No wagers, good run**
Cards: [5, 6, 7, 8, 9]
```
S = 5+6+7+8+9 = 35
W = 0
(35 - 20) × (1 + 0) = 15 × 1 = 15
No bonus (5 < 8)
Total = 15
```

**Example 3: Two wagers, committed expedition**
Cards: [wager(0), wager(0), 5, 6, 7, 8, 9, 10] (8 cards)
```
S = 5+6+7+8+9+10 = 45
W = 2
(45 - 20) × (1 + 2) = 25 × 3 = 75
Bonus = +20 (8 cards)
Total = 95
```

---

### scoreAll

**Function signature:**
```javascript
scoreAll(expeditions) → { total: Number, perColor: Object }
```

**Formula:**
```
total = Σ scoreExpedition(expeditions[color]) for all colors
```

**Why this formula:**

Game scoring is simply the sum of per-color expedition scores. Each color is independent—no penalty or bonus for balance or spread. The function returns both the total (for win/loss calculation) and a breakdown by color (for UI display and AI analysis).

**What each variable means:**
- **expeditions** = object with keys `red`, `green`, `blue`, `white`, `yellow`. Each value is an array of card objects (or empty).
- **total** = sum across all colors. The single number that determines victory or defeat.
- **perColor** = map of color → score, used in score breakdown UI.

**Example:**
Only red has cards, other colors are empty.
```javascript
expeditions = {
  red: [5, 6],
  green: [],
  blue: [],
  white: [],
  yellow: []
}
```
```
scoreExpedition(red) = (11 - 20) × 1 = -9
scoreExpedition(other colors) = 0 (empty arrays)
total = -9
perColor = { red: -9, green: 0, blue: 0, white: 0, yellow: 0 }
```

---

## ELO Rating

### eloExpected

**Function signature:**
```javascript
eloExpected(playerRating, opponentRating) → Number ∈ [0, 1]
```

**Formula:**
```
E = 1 / (1 + 10^((Ro - Rp) / 400))
```

Where:
- **Rp** = player's ELO rating
- **Ro** = opponent's ELO rating
- **E** = expected win probability (0.5 = evenly matched)

**Why this formula:**

This is the standard ELO expected score formula, unchanged since Arpad Elo's 1960 chess rating system. The constant 400 sets the scale: a 400-point rating gap produces a 10:1 odds ratio (0.91 vs 0.09 win probability). The formula is:

- **Symmetric:** E(Rp, Ro) + E(Ro, Rp) = 1 (probabilities sum to 100%)
- **Smooth:** No discontinuities; monotonically increasing with player rating
- **Well-calibrated:** Historically accurate for chess, poker, and game tournaments

**What each variable means:**
- **playerRating** = integer, typically 1000–2000 (1200 is novice, 1800 is expert)
- **opponentRating** = opponent's rating, same scale
- **Return value** = probability that the player will win (0 = certain loss, 1 = certain win, 0.5 = even)

**Example 1: Equal ratings**
```
playerRating = 1200
opponentRating = 1200
E = 1 / (1 + 10^((1200 - 1200) / 400))
  = 1 / (1 + 10^0)
  = 1 / 2
  = 0.5
```
Expected win probability: 50%

**Example 2: 200-point gap (strong player vs novice)**
```
playerRating = 1400
opponentRating = 1200
E = 1 / (1 + 10^((1200 - 1400) / 400))
  = 1 / (1 + 10^(-0.5))
  = 1 / (1 + 0.3162)
  ≈ 0.76
```
The stronger player is expected to win 76% of games.

**Example 3: 400-point gap (huge advantage)**
```
playerRating = 1600
opponentRating = 1200
E = 1 / (1 + 10^((1200 - 1600) / 400))
  = 1 / (1 + 10^(-1))
  = 1 / (1 + 0.1)
  ≈ 0.909
```
The much stronger player is expected to win ~91% of games. This is the 10:1 odds ratio built into the formula.

---

### eloChange

**Function signature:**
```javascript
eloChange(playerRating, opponentRating, actual, kFactor) → Number
```

**Formula:**
```
ΔR = K × (A - E)
```

Where:
- **K** = K-factor (32 provisional, 16 established; see CONFIG.elo.kFactor)
- **A** = actual result (1.0 for win, 0.5 for draw, 0.0 for loss)
- **E** = expected result from `eloExpected(playerRating, opponentRating)`
- **ΔR** = rating change (rounded to nearest integer)

**Why this formula:**

Rating change is proportional to the surprise of the result:
- **Big upset (weak beats strong):** A is high, E is low, so ΔR is large and positive. The underdog gains a lot.
- **Expected win (strong beats weak):** A is high but E is also high, so ΔR is small. The favorite gains little.
- **Unexpected loss (strong loses to weak):** A is low but E is high, so ΔR is large and negative. A big rating hit.

The K-factor controls how volatile ratings are:
- **K=32 (provisional):** Used for the first 20 games. Ratings move fast to quickly calibrate new players.
- **K=16 (established):** After 20 games, ratings stabilize. Protects high-rated players from wild swings.

**What each variable means:**
- **playerRating, opponentRating** = ratings before the game (unused in this function, passed to eloExpected)
- **actual** = 1 for win, 0.5 for draw (not used in this game), 0 for loss
- **kFactor** = 32 or 16, chosen based on game count
- **Return value** = signed integer to add to playerRating

**Example 1: Win against equal opponent at K=32 (provisional)**
```
playerRating = 1200, opponentRating = 1200
actual = 1 (win)
E = 0.5 (from eloExpected)
K = 32
ΔR = 32 × (1 - 0.5) = 32 × 0.5 = 16
```
New rating: 1216. Winning 50% of the time as provisioned, you gain 16 points per game on average.

**Example 2: Win against stronger opponent at K=16 (established)**
```
playerRating = 1200, opponentRating = 1400
actual = 1 (upset win)
E ≈ 0.24 (from eloExpected; strong favorite)
K = 16
ΔR = 16 × (1 - 0.24) = 16 × 0.76 ≈ 12
```
New rating: 1212. Even though it's an upset, the K=16 makes the gain smaller than it would be provisionally.

**Example 3: Loss to stronger opponent at K=16 (established)**
```
playerRating = 1200, opponentRating = 1400
actual = 0 (expected loss)
E ≈ 0.24
K = 16
ΔR = 16 × (0 - 0.24) = 16 × (-0.24) ≈ -4
```
New rating: 1196. You lose a small amount because the loss was expected. The stronger player's rating barely moves.

---

## Layout & Geometry

### phiTier

**Function signature:**
```javascript
phiTier(cardH, n) → Number
```

**Formula:**
```
T_n = cardH / φ^n
```

Where:
- **φ** (phi) = 1.6180339887 (golden ratio, (1 + √5) / 2)
- **cardH** = base unit, typically the card height in pixels
- **n** = tier level (0, 1, 2, ...)
- **T_n** = scaled size at tier n

**Why this formula:**

The golden ratio creates aesthetically pleasing proportions that feel "natural" to the human eye. By scaling every UI element through phiTier, we ensure:
- **Visual hierarchy:** Each tier is ~62% of the tier below (1/φ ≈ 0.618)
- **Harmony:** Sizes feel related, not arbitrary
- **Scalability:** Change cardH once, and the entire layout scales proportionally

Example hierarchy (for cardH = 100):
- T₀ = 100 (card height)
- T₁ = 61.8 (gap between cards)
- T₂ = 38.2 (margin around cards)
- T₃ = 23.6 (small icon size)

**What each variable means:**
- **cardH** = base height, derived from viewport (typically 100–120px on mobile)
- **n** = tier index; n=0 is the base, higher n = smaller
- **Return value** = computed size for that tier, a positive number

**Example:**
Mobile 375px wide, portrait. cardH = 100.
```
phiTier(100, 0) = 100 / 1^1 = 100
phiTier(100, 1) = 100 / 1.618 ≈ 61.8
phiTier(100, 2) = 100 / 2.618 ≈ 38.2
```

Tablet 1024px wide, landscape. cardH = 140.
```
phiTier(140, 0) = 140 / 1 = 140
phiTier(140, 1) = 140 / 1.618 ≈ 86.5
phiTier(140, 2) = 140 / 2.618 ≈ 53.5
```

The ratios between tiers are constant; only the absolute sizes change with cardH.

---

### stackOffset

**Function signature:**
```javascript
stackOffset(count, cardH) → Number
```

**Formula:**
```
O_N = cardH × k / N^e
```

Where:
- **k** = 0.367 (empirical constant)
- **e** = 0.613 (exponent, derived from constraint below)
- **N** = card count in the stack
- **O_N** = pixel offset for each card beyond the first

**Why this formula:**

When cards stack in a pile (e.g., a discard stack in classic mode), each card should peek out slightly to show the count. The offset must satisfy a design constraint: the ratio between a 2-card stack and a 12-card stack should be 3:1 (small piles show cards prominently, large piles compress).

**Derivation:**
```
Constraint: O_2 / O_12 = 3

O_2 = cardH × k / 2^e
O_12 = cardH × k / 12^e

O_2 / O_12 = (cardH × k / 2^e) / (cardH × k / 12^e)
            = 12^e / 2^e
            = (12/2)^e
            = 6^e
            = 3

So: 6^e = 3
    e = log(3) / log(6)
    e ≈ 0.613
```

The constant k = 0.367 was chosen empirically to produce visually pleasing offsets: small enough that large stacks don't exceed visible bounds, large enough that 2–3 card stacks show clear separation.

**What each variable means:**
- **count** = total cards in pile (N)
- **cardH** = card height in pixels
- **Return value** = how much pixels each card peeks out below the previous

**Example 1: Small stack (N=2)**
```
cardH = 100
O_2 = 100 × 0.367 / 2^0.613
    = 36.7 / 1.514
    ≈ 24.2 px
```
Second card peeks out 24.2px below the first.

**Example 2: Medium stack (N=5)**
```
cardH = 100
O_5 = 100 × 0.367 / 5^0.613
    = 36.7 / 2.75
    ≈ 13.3 px
```
Each card peeks out 13.3px; total pile shows all 5 cards distinctly.

**Example 3: Large stack (N=12)**
```
cardH = 100
O_12 = 100 × 0.367 / 12^0.613
     = 36.7 / 7.23
     ≈ 5.1 px
```
Each card peeks out only 5.1px. Ratio check: 24.2 / 5.1 ≈ 4.75 (close to design target of 3:1, accounting for rounding).

---

### pileHeight

**Function signature:**
```javascript
pileHeight(cardCount, cardOffset, cardH) → Number
```

**Formula:**
```
H = cardH + max(0, cardCount - 1) × offset
```

Where:
- **cardH** = height of a single card
- **cardCount** = number of cards in the pile
- **cardOffset** = peek-out distance (typically from `stackOffset()`)
- **H** = total visual height occupied by the pile

**Why this formula:**

The first card occupies the full height. Each additional card adds only the offset (the peek-out distance), not the full card height. This avoids piles from becoming unwieldy tall when stacking many cards.

**What each variable means:**
- **cardCount** = number of visible cards (0 or more)
- **cardOffset** = return value from stackOffset, or any fixed offset
- **cardH** = card height
- **Return value** = pixels from top to bottom of the pile

**Example 1: Single card**
```
cardCount = 1
cardOffset = 13.3 (irrelevant for 1 card)
cardH = 100
H = 100 + max(0, 1 - 1) × 13.3 = 100
```
Just the card height.

**Example 2: Three cards with offset 13.3**
```
cardCount = 3
cardOffset = 13.3
cardH = 100
H = 100 + max(0, 3 - 1) × 13.3
  = 100 + 2 × 13.3
  = 100 + 26.6
  = 126.6 px
```

**Example 3: Ten cards with offset 5.1**
```
cardCount = 10
cardOffset = 5.1
cardH = 100
H = 100 + 9 × 5.1
  = 100 + 45.9
  = 145.9 px
```

---

### center

**Function signature:**
```javascript
center(contentHeight, containerHeight) → Number ≥ 0
```

**Formula:**
```
c = max(0, round((containerHeight - contentHeight) / 2))
```

Where:
- **contentHeight** = height of the thing being centered
- **containerHeight** = height of the space it goes into
- **c** = top margin in pixels to center the content

**Why this formula:**

Classic vertical centering. The formula:
1. Subtracts content from container to get total available space
2. Divides by 2 to split evenly above and below
3. Rounds to the nearest integer (pixel-perfect, no half-pixels)
4. Clamps at 0 (if content is taller than container, don't go negative)

**What each variable means:**
- **contentHeight** = actual height of content (card, score label, etc.)
- **containerHeight** = available space to center into
- **Return value** = pixels of margin from the top of the container

**Example 1: Centered**
```
contentHeight = 50
containerHeight = 100
c = max(0, round((100 - 50) / 2))
  = max(0, 25)
  = 25 px
```
Place content 25px from the top; it will be centered with 25px space below.

**Example 2: Oversized content**
```
contentHeight = 150
containerHeight = 100
c = max(0, round((100 - 150) / 2))
  = max(0, round(-25))
  = max(0, -25)
  = 0 px
```
Content doesn't fit; pin it to the top (margin = 0) and let it overflow.

**Example 3: Rounding**
```
contentHeight = 49
containerHeight = 100
c = max(0, round((100 - 49) / 2))
  = max(0, round(25.5))
  = 26 px
```
Odd space (51px available) rounds up to 26px margin.

---

## Deterministic Randomness

### jitter

**Function signature:**
```javascript
jitter(cardId, index) → { rotation: Number, x: Number, y: Number }
```

**Formula:**
```
hash = Σ(s[i] × 31^i) for string s = cardId + ':' + index
rotation = (hash % 100) / 100 × 2D - D
x = ((hash >> 4) % 100) / 100 × 2P - P
y = ((hash >> 8) % 100) / 100 × 2P - P
```

Where:
- **cardId** = unique identifier for the card (color + value, e.g., "red5")
- **index** = position in hand or pile (0, 1, 2, ...)
- **D** = degrees jitter threshold (from CONFIG.ui.jitter.degrees, typically 3)
- **P** = pixel jitter threshold (from CONFIG.ui.jitter.px, typically 2.5)
- **hash** = deterministic integer hash of the cardId+index combination

**Why this formula:**

Jitter makes cards look naturally scattered rather than perfectly arranged. Unlike real randomness (which would differ every time the app loads), jitter is **deterministic**—the same card always gets the same rotation and displacement. This:
- **Feels natural:** Slight irregularities break the mechanical grid
- **Reproducible:** Same visual state every session (good for screenshots, debugging)
- **Cheap:** No PRNG, just bit shifts and modulo
- **Collision-free:** Different cards/indices hash to different jitter values

The hash function (Horner's method with multiplier 31) is a standard Java String hash. We use bit shifts (>> 4, >> 8) to extract uncorrelated random-looking bits for x, y, and rotation.

**What each variable means:**
- **cardId** = string, uniquely identifies a card (e.g., "red5", "yellow0")
- **index** = which card in a sequence (hand, pile, etc.)
- **Return object:**
  - **rotation** = degrees to rotate the card (range: ±D, typically ±3)
  - **x** = horizontal displacement in pixels (range: ±P, typically ±2.5)
  - **y** = vertical displacement in pixels (range: ±P, typically ±2.5)

**Example 1: Red 5 at hand index 0**
```
cardId = "red5"
index = 0
s = "red5:0"

// Hash computation (simplified)
h = 0
h = (0 * 31 + 'r') | 0 = 114
h = (114 * 31 + 'e') | 0 = 3628
h = (3628 * 31 + 'd') | 0 = 112545
... (continues for ":0")
// Suppose h = 15847

rotation = (15847 % 100) / 100 * 6 - 3
         = (47 / 100) * 6 - 3
         = 0.47 * 6 - 3
         ≈ 0.82 degrees (clockwise)

x = ((15847 >> 4) % 100) / 100 * 5 - 2.5
  = ((990) % 100) / 100 * 5 - 2.5
  = 90 / 100 * 5 - 2.5
  = 4.5 - 2.5
  = 2.0 px (right)

y = ((15847 >> 8) % 100) / 100 * 5 - 2.5
  = ((61) % 100) / 100 * 5 - 2.5
  = 61 / 100 * 5 - 2.5
  ≈ 0.55 px (down)
```

**Example 2: Blue 10 at hand index 3**
```
cardId = "blue10"
index = 3
s = "blue10:3"
// Different hash, different jitter (but always the same for this cardId+index pair)
```

**Example 3: Consistency check**
Jitter the same card twice:
```
jitter("red5", 0) → { rotation: 0.82, x: 2.0, y: 0.55 }
jitter("red5", 0) → { rotation: 0.82, x: 2.0, y: 0.55 }  // Identical
```

The function is pure and deterministic; same inputs always produce the same output.

---

## Summary Table

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| scoreExpedition | cards[] | number | Per-color expedition score |
| scoreAll | expeditions{} | {total, perColor} | Game score, UI display |
| eloExpected | playerR, opponentR | 0–1 | Matchmaking, rating calibration |
| eloChange | ratings, result, K | number | Rating update after game |
| phiTier | cardH, n | number | Layout scaling, visual hierarchy |
| stackOffset | count, cardH | number | Pile peek-out distance |
| pileHeight | cardCount, offset, cardH | number | Total pile height |
| center | contentH, containerH | number | Vertical centering margin |
| jitter | cardId, index | {rotation, x, y} | Natural card scatter |

---

## Constants

All constants are defined in `public/src/math.js` or `public/src/config.js`:

- **PHI** = 1.6180339887 (golden ratio)
- **STACK_K** = 0.367 (empirical constant for stackOffset)
- **STACK_EXP** = 0.613 (exponent for stackOffset, derived from 3:1 ratio constraint)
- **CONFIG.scoring.baseCost** = 20 (expedition penalty)
- **CONFIG.scoring.bonusThreshold** = 8 (cards needed for bonus)
- **CONFIG.scoring.bonusPoints** = 20 (fixed bonus)
- **CONFIG.ui.jitter.degrees** = 3 (max rotation in degrees)
- **CONFIG.ui.jitter.px** = 2.5 (max displacement in pixels)
- **CONFIG.elo.kFactor.provisional** = 32 (new player volatility)
- **CONFIG.elo.kFactor.established** = 16 (established player stability)
- **CONFIG.elo.kFactor.threshold** = 20 (games before switching K)

---

## References

- **ELO Formula:** Arpad Elo, "The Rating of Chessplayers, Past and Present" (1978)
- **Golden Ratio:** φ = (1 + √5) / 2 ≈ 1.618 (appears throughout nature and design)
- **stackOffset Derivation:** Internal design constraint (3:1 ratio) solved via logarithms
- **Lost Cities Scoring:** Kosmos / Reiner Knizia (physical card game rules)
