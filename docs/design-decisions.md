# Design Decisions

Record of major architectural and design choices for the Expedition Card Game.

---

## Why Firebase Realtime Database

Firebase RTDB was chosen over alternatives (Firestore, custom WebSocket server, peer-to-peer) for several reasons:

- **Zero backend code.** RTDB is a fully managed real-time sync layer. No server to write, deploy, or maintain.
- **Built-in real-time.** The `onValue` listener model maps perfectly to a card game where both players need to see state changes instantly.
- **Free tier is generous.** 100 simultaneous connections and 1 GB/month of transfer is more than enough for a hobby project scaling to hundreds of users.
- **Battle-tested.** RTDB has been stable for 10+ years. No risk of sudden deprecation (and if it were deprecated, Google gives years of notice; Firestore is the migration path).
- **Reconnection handled automatically.** Firebase SDK detects disconnects and re-syncs state, which is critical for mobile users switching apps or losing signal.

**Tradeoff:** No security rules are enforced yet. Technically, an opponent could read your hand via browser dev tools. This is acceptable for now but must be addressed before any competitive mode.

**Gotcha learned the hard way:** Firebase stores empty arrays `[]` as `null`/`undefined`. Every array access must use a `getCards()` helper with `|| []` fallback. This caused silent state corruption early on.

---

## Why Single HTML File (Initially)

The entire game started as a single `index.html` file (~1600 lines) containing UI, game engine, multiplayer sync, animations, and sound.

- **Iteration speed.** With everything in one file, you can search, edit, and test without build tools or module resolution.
- **No build step.** Open the file in a browser and it works. Firebase Hosting serves it as-is.
- **Prototype-first.** The goal was to get a playable game fast, not to build architecture.

**When this stops working:** The file is now large enough that navigation is painful. The target structure splits into `src/rules.js`, `src/engine.js`, `src/ai-worker.js`, `src/firebase.js`, `src/ui.js`, `src/animations.js`, and `src/sound.js`, following the L0-L4 layer model defined in CLAUDE.md.

---

## Why Web Audio API for Sound

Synthesized tones via Web Audio API rather than audio file playback:

- **Zero asset downloads.** No `.mp3` or `.wav` files to load, cache, or bundle.
- **Instant playback.** OscillatorNode plays with no latency, unlike `<audio>` elements which can have buffering delays on mobile.
- **Tiny footprint.** Sound effects are a few lines of code each (`SFX.select()`, `SFX.play()`, `SFX.discard()`, `SFX.drawCard()`).
- **iOS compatibility.** AudioContext requires a user interaction to start on iOS Safari. This is handled by resuming the context on the first tap.

**Future plan:** Replace synthesized tones with recorded foley sounds (card slide, card place, shuffle, draw). The difference in feel is significant, but synthesized tones were the right choice for rapid prototyping.

---

## Why Evolved AI via Genetic Algorithm

The AI uses a 59-gene genome evolved through a genetic algorithm rather than hand-tuned heuristics or neural networks.

- **Richer than hand-tuning.** 59 continuous parameters across 8 strategic dimensions (phase awareness, portfolio management, wager strategy, opponent modeling, draw strategy, risk/variance, tempo control, information/card counting) create a strategy space too large to explore manually.
- **Automatic balance.** Evolution finds strategies that actually win games, not strategies that seem clever to a human designer.
- **Multiple personalities.** The island-model approach (see below) naturally produces 5 distinct play styles from the same genome structure.
- **Interpretable.** Unlike a neural network, you can read the genome and understand what the AI values: "this genome has high `wagerRiskTolerance` and low `oppDiscardDanger`" tells you something meaningful.

**Tradeoff:** Evolution is slow (hours of CPU time) and the fitness signal is noisy (card games have high variance). Some genes, particularly opponent-awareness genes, couldn't be optimized because Monte Carlo evaluation with random opponent hands provides no signal for opponent modeling.

---

## Why FLIP Animations (and the Problems)

FLIP (First, Last, Invert, Play) is used for card movement animations:

1. **`grabPos(cardId)`** — Record the card's current screen position before a state change.
2. State change happens (card moves in the data model).
3. Re-render the UI (card appears in its new position).
4. **`slideFrom(saved)`** — Calculate the delta between old and new positions, apply a CSS transform to start the card at the old position, then animate to the new position.

**Why FLIP over clone-based animation:**
- No DOM clones cluttering the page.
- The card is always the real element in its real position.
- Works with any layout change, not just predefined animation paths.

**Known problems:**
- Occasional wrong starting position (the `grabPos` captures stale layout in some race conditions).
- Cards sometimes appear to come from offscreen when the source element isn't visible.
- Rapid tapping can cause visual glitches where animations overlap.
- The `slideFromEl(sourceEl, cardId)` variant (for deck draws) has edge cases with element visibility.

**Considered alternative:** A fixed-slot system where every possible card position is a pre-defined DOM slot. This would eliminate position-calculation bugs but requires knowing all possible positions upfront, which is complex with variable hand sizes and expedition lengths.

---

## Classic vs Single Pile Variants

Two game variants are supported:

- **Classic:** 5 discard piles, one per color. Drawing from a discard pile only gives you cards of that color.
- **Single Pile:** One shared discard pile. Drawing from the pile gives you whatever is on top.

**Why both:**
- Classic is the traditional ruleset, familiar to existing players.
- Single Pile creates more interesting discard decisions (you can't safely dump cards in an unused color because the opponent might want the card below yours).
- Single Pile has different strategic dynamics, which required evolving separate champion genomes (`champions.json` vs `champions-single.json`).

**Implementation impact:** The variant flag (`classic` | `single`) flows through the game engine, AI evaluation, Firebase state, and rendering. The discard area UI layout changes significantly between variants.

---

## Score Breakdown: Receipt-Style

The score screen shows a per-expedition breakdown in a receipt-style format:

- Each expedition shows: cards played, raw sum, minus the 20-point cost, wager multiplier, and 8-card bonus (if applicable).
- This format was chosen because Lost Cities scoring is non-obvious to new players. Seeing "sum 35 - 20 cost = 15 x 2 wagers = 30" teaches the scoring formula through repeated exposure.
- Column alignment is close but not pixel-perfect in all cases (known issue).
- Card list rows can overflow on very long expeditions (known issue).

---

## 5 AI Personalities via Island Model

Rather than evolving one best AI, an island-model genetic algorithm produces 5 distinct personalities:

| Personality | Archetype | Key Traits |
|-------------|-----------|------------|
| Explorer | Aggressive | Starts many expeditions, plays fast, high tempo |
| Scholar | Conservative | Deep focus on few colors, values 8-card bonus, cautious wagers |
| Gambler | High variance | Loves wagers, risk-seeking when behind, score-sensitive |
| Trader (Spy) | Adaptive | High opponent awareness, blocks and denies, tempo control |
| Guardian (Collector) | Defensive | Focused on 2-3 colors, chases 8-card bonus, avoids dangerous discards |

**How it works:**
- 5 islands of 15 genomes each, seeded with different archetype biases.
- Each island evolves independently for 60 generations with 60 games per match.
- Every 10 generations, the top 2 genomes migrate between adjacent islands.
- The champion from each island becomes a personality.

**Why this matters for the player experience:** Playing against 5 different styles keeps the game fresh. The Explorer feels aggressive and fast; the Scholar feels methodical and safe. Players develop preferences and strategies for each opponent.

---

## Mobile-First Philosophy

Every UI decision starts with a 375px screen (iPhone SE). This is a core principle, not an afterthought.

- **Touch targets are large.** Cards, buttons, and discard piles are sized for finger taps, not mouse clicks.
- **Haptic feedback on every action.** `navigator.vibrate()` on Android (iOS requires Capacitor native plugin).
- **Sound on every tap.** Audio feedback compensates for the lack of physical card feel.
- **No hover states for critical interactions.** Everything works with tap only.
- **Vertical layout.** Opponent's area at top, your hand at bottom, board in middle. No landscape mode needed.
- **iPhone Safari and Android Chrome are primary targets.** Desktop is supported but not optimized for.

**iOS limitation:** `navigator.vibrate()` is not supported in Safari. Wrapping the app with Capacitor and using the native Haptics plugin would fix this.
