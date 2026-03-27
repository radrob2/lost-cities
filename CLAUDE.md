# Expedition Card Game

## What This Is
A 2-player card game (based on Lost Cities mechanics) with real-time multiplayer and AI opponents. Web-first, mobile-optimized, targeting App Store release under an original name.

**Live:** https://lost-cities-dd1c0.web.app
**Repo:** https://github.com/radrob2/lost-cities

## Core Principles

1. **Mobile-first** — iPhone Safari and Android Chrome are the primary targets. Every UI decision starts with a 375px screen.
2. **Single-source game engine** — One set of game rules used by multiplayer, AI, and scoring. Never duplicate game logic.
3. **Data over code** — Card definitions, genome weights, color schemes, and scoring constants belong in config/data, not hardcoded in logic.
4. **Fail loudly** — No silent state corruption. If something is wrong, toast it or console.error it. Firebase empty-array issues bit us hard; always use `getCards()` helper with `|| []` fallback.
5. **Keep it simple** — No abstractions until you need them twice. Three similar lines > one premature helper.
6. **Sound and feel matter** — Every tap should have audio + haptic feedback. Card games live or die on tactile satisfaction.

## Architecture

### Layer Structure

```
L0 — Constants & Rules
     Card definitions, colors, scoring formula, legal move checks
     No dependencies. Pure functions.

L1 — Game Engine
     State management, turn flow, play/discard/draw actions
     Depends on: L0

L2 — AI
     Monte Carlo evaluation, evolved genomes, endgame solver
     Depends on: L0, L1
     Runs in a Web Worker (ai-worker.js)

L3 — Multiplayer
     Firebase RTDB sync, room codes, reconnection
     Depends on: L1

L4 — UI
     Rendering, animations (FLIP), sound (Web Audio), haptics
     Depends on: L0, L1, L3
```

**Rule:** Each layer reads only from layers below it. UI never modifies game rules. AI never touches Firebase. Multiplayer never renders.

### Current File Structure (monolith — to be split)

```
public/
  index.html          — Everything (UI, engine, multiplayer, ~1600 lines)
  ai-worker.js        — AI evaluation + evolved genomes (~900 lines)
evolve-v2.js          — Genetic algorithm for AI evolution
islands.js            — Island-model evolution (5 archetypes)
ablation.js           — Sensitivity analysis for genome genes
champions.json        — Best evolved genomes (single-pile variant)
champions-single.json — Best evolved genomes (classic variant)
ROADMAP.md            — Full product roadmap
```

### Target File Structure (for app release)

```
src/
  rules.js            — L0: Card defs, scoring, legal moves
  engine.js            — L1: Game state, turn flow
  ai-worker.js         — L2: MC evaluation, genomes
  firebase.js          — L3: Multiplayer sync
  ui.js                — L4: Rendering
  animations.js        — L4: FLIP system
  sound.js             — L4: Web Audio SFX
data/
  genomes.json         — Evolved AI personalities
  cards.json           — Card definitions (colors, values)
public/
  index.html           — Shell + CSS
  assets/              — Card art, icons, splash
docs/
  roadmap.md
  ai-notes.md          — Evolution experiments, what worked/didn't
  design-decisions.md
```

## Game Rules Reference

- **60 cards**: 5 colors × 12 cards (3 wagers + numbers 2–10)
- **Hand size**: 8 cards
- **Turn**: Play or discard a card, then draw from deck or a discard pile
- **Constraint**: Cards in expeditions must be ascending. Wagers before numbers.
- **Constraint**: Can't draw from the discard pile you just discarded to
- **Scoring per expedition**: (sum of numbers − 20) × (1 + wager count). Bonus +20 if 8+ cards.
- **Game ends**: When deck is empty
- **Variants**: Classic (5 discard piles, one per color) and Single Pile (one shared discard)

## AI Architecture

### How It Works
1. **Monte Carlo evaluation**: Try every (play, draw) pair. For each, run 500 simulations with random opponent hands. Pick the highest win rate.
2. **Evolved genome**: 59 genes controlling play style — aggression, wager timing, focus, opponent awareness, tempo, risk tolerance. Evolved via genetic algorithm with island-model speciation.
3. **Post-MC correction**: Penalize discards to opponent's active expeditions and colors they've drawn from. This compensates for MC's blind spot (random hands don't model real opponent behavior).
4. **Endgame solver**: When deck ≤ 6, use minimax instead of MC for exact calculation.

### AI Personalities
**Evolved genome (MC-driven):**
- **Explorer**: Aggressive, starts many expeditions, plays fast
- **Scholar**: Conservative, deep focus on few colors, values 8+ bonus
- **Collector**: Focused, high concentration, avoids spreading
- **Spy**: High opponent awareness, strategic blocking
- **Gambler**: High wager willingness, high risk tolerance

**Heuristic (rule-based):**
- **Strategist** (default): Handcrafted heuristic using projected score deltas, opponent expedition awareness, and discard safety scoring. Beats all evolved genomes 67-91% in classic. No MC overhead.

**Boss AIs (cheating):**
- **The Seer**: MC AI with known opponent hand — no random sampling for opponent cards
- **The Oracle**: Perfect information — sees opponent hand AND deck order

### Known AI Issues
- MC with random opponent hands still has blind spots for opponent-awareness
- Heuristic AI is fast but doesn't consider multi-turn sequences
- Potential hybrid: heuristic for discard safety + MC for play optimization

## Firebase Structure

```
rooms/{roomCode}/
  players/
    player1: { name, id }
    player2: { name, id }
  game/
    deck: [cards...]
    hands/
      player1: [cards...]
      player2: [cards...]
    expeditions/
      player1: { red: [], blue: [], ... }
      player2: { red: [], blue: [], ... }
    discards: { red: [], blue: [], ... }
    singlePile: [cards...]
    currentTurn: "player1" | "player2"
    phase: "play" | "draw"
    status: "waiting" | "playing" | "finished"
    variant: "classic" | "single"
  settings/
    variant: "classic" | "single"
```

**Firebase gotcha:** Empty arrays `[]` are stored as null/undefined. Always use `getCards()` helper which handles this with `|| []`.

## Conventions

- **Naming**: camelCase everywhere (JS variables, function names, Firebase keys)
- **Colors**: red, green, blue, white, yellow (lowercase strings)
- **Card values**: 0 = wager, 2–10 = number cards
- **Player slots**: "player1" (room creator / human in AI mode), "player2" (joiner / AI)
- **Vibrate/Sound**: Use `SFX.select()`, `SFX.play()`, `SFX.discard()`, `SFX.drawCard()` etc. — never raw `vibrate()` in new code
- **Animations**: Use `grabPos()` before state change, `slideFrom()` after render. No clones ever.

## Testing

**47 automated tests** in `tools/test/`:
- `test-scoring.js`: 17 tests — scoring edge cases (empty, wagers, bonus, max)
- `test-legal-moves.js`: 20 tests — card play legality
- `test-game-sim.js`: 10 tests — deck construction, 100-game random simulation, card accounting
- Run all: `node tools/test/run-all.js`

**Benchmark scripts:**
- `test-heuristic.js`: Heuristic AI vs all evolved genomes (1000 games each)
- `test-vs-default.js`: Evolved genomes vs default genome
- `test-ai.js`: AI crash/stress testing

**Debug tools:**
- Tap "Lost Cities" title 5x on lobby to open debug score screen
- Set `window.EXPEDITION_DEBUG=true` in console for AI decision logging

## Legal Notes

- **Game mechanics are not copyrightable** (established law)
- **"Lost Cities" is trademarked by Kosmos** — must rename before release
- **Card art must be original** — AI-generated is fine
- **Rulebook text must be original** — can't copy Kosmos's wording
