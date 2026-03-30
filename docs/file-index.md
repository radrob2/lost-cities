# File Index

This is the authoritative directory map for the project. It must be updated whenever files are added, removed, or change responsibility. It documents both the current state and the target state after all refactoring phases are complete.

---

## public/src/ — Source Files

| Path | Responsibility | Status |
|------|----------------|--------|
| src/config.js | Game rule variables, thresholds, display data, AI personality definitions | new |
| src/events.js | Pub/sub event bus for decoupled communication | new |
| src/math.js | Every named formula as a pure function | new |
| src/layout.js | Phi-based spatial system: card sizing, section heights, CSS vars | current |
| src/constants.js | Global state, utility functions, UI modal helpers (to be split) | to-eliminate |
| src/gamelogic.js | Game state, turn flow, play/discard/draw actions (to be split) | to-eliminate |
| src/rendering.js | HTML generation, board rendering, scoring display | current |
| src/geometry.js | Cone projection math for hand rendering | current |
| src/text.js | Text rendering utility with phi-based sizing | current |
| src/animations.js | FLIP animation system | current |
| src/sound.js | Web Audio SFX and haptic feedback | current |
| src/elo.js | ELO rating calculation and persistence | current |
| src/achievements.js | Achievement definitions and unlock checking | current |
| src/stats.js | Game statistics persistence | current |
| src/replay.js | Move logging and playback | current |
| src/timer.js | Turn timer with configurable durations | current |
| src/ai-game.js | AI mode orchestration: worker management, turn execution | current |
| src/multiplayer.js | Firebase sync, rooms, matchmaking, reconnection | current |
| src/tutorial.js | Onboarding slides | current |

### Target Files (Future Phases)

| Path | Responsibility | Status |
|------|----------------|--------|
| src/rules.js | Card legality checks and deck construction (pure functions) | new |
| src/engine.js | Game state, turn flow, actions, emits events | target |
| src/ui.js | showScreen, toast, modal helpers | target |

---

## public/ — Other Files

| Path | Responsibility | Status |
|------|----------------|--------|
| public/index.html | HTML shell, CSS, script loading | current |
| public/ai-worker.js | AI evaluation in web worker (MC, heuristic, endgame) | current |

---

## tools/test/ — Test Files

| Path | Responsibility | Status |
|------|----------------|--------|
| tools/test/run-all.js | Test runner | current |
| tools/test/game-rules.js | Test harness: imports from config + math | current |
| tools/test/test-config.js | Config structure tests (19 tests) | new |
| tools/test/test-events.js | Event bus tests (7 tests) | new |
| tools/test/test-math.js | Formula tests (27 tests) | new |
| tools/test/test-scoring.js | Scoring edge case tests (17 tests) | current |
| tools/test/test-legal-moves.js | Card play legality tests (20 tests) | current |
| tools/test/test-edge-cases.js | Edge case tests (14 tests) | current |
| tools/test/test-game-sim.js | Game simulation tests (10 tests) | current |
| tools/test/test-ai-playtest.js | AI stress tests (8 tests) | current |
| tools/test/test-rules.js | Rules tests (17 tests) | new |

---

## docs/ — Documentation

| Path | Responsibility | Status |
|------|----------------|--------|
| docs/math-reference.md | Formula derivations and documentation | new |
| docs/file-index.md | This file: authoritative directory map | new |
| docs/dependency-table.md | Structured dependency table | new |
| docs/terminology-and-conventions.md | Naming authority for the project | current |
| docs/BACKLOG.md | Pending/deferred work items | current |

---

## Status Key

| Status | Meaning |
|--------|---------|
| `current` | Exists now, staying as-is |
| `new` | Created in Phase 1 |
| `target` | To be created in a future phase |
| `to-eliminate` | Will be removed in a future phase once its responsibilities are extracted |
