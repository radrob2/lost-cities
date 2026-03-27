# AI Development Notes

History, architecture, and lessons learned from building the Expedition Card Game AI.

---

## v1: Greedy Policy

The first AI was a simple greedy heuristic:

- Enumerate all legal (play/discard, draw) pairs.
- Score each pair with hand-tuned weights (card value, expedition progress, discard danger).
- Pick the highest-scoring pair.

**Problems:**
- No lookahead. Couldn't evaluate multi-turn consequences.
- Weights required manual tuning and never felt right.
- Easily exploitable by human players who understood its patterns.

---

## v2: 59-Gene Genome + Monte Carlo Evaluation

### The Genome

A genome is a set of 59 continuous-valued genes across 8 strategic dimensions:

| Category | Genes | Examples |
|----------|-------|---------|
| Game Phase Awareness | 7 | `earlyPlayThresh`, `latePhaseBound`, `endgameUrgency` |
| Portfolio / Expedition Management | 10 | `maxExpeditions`, `eightCardWeight`, `focusVsSpread` |
| Wager Strategy | 8 | `wagerMinProjected`, `wagerRiskTolerance`, `wagerStackBonus` |
| Opponent Modeling | 10 | `oppAwareness`, `oppDiscardDanger`, `oppDenyDrawWeight` |
| Draw Strategy | 8 | `drawDiscardThresh`, `drawExpBonus`, `drawDenyBonus` |
| Risk / Variance | 6 | `riskSeekWhenBehind`, `variancePreference`, `safeDiscardBias` |
| Tempo Control | 5 | `rushWhenAheadBy`, `tempoAwareness`, `drawSourceTempo` |
| Information / Card Counting | 5 | `cardCountingWeight`, `deckRichnessWeight`, `perfectInfoEndgame` |

Each gene has a defined range (e.g., `wagerRiskTolerance` from 0 to 1, `maxExpeditions` from 1.5 to 5). The genome drives all AI decisions through a rich sensory system that evaluates board state, hand composition, opponent activity, and game phase.

### Monte Carlo Evaluation

For each legal (play/discard, draw) pair:

1. **Generate random opponent hand.** Shuffle all unseen cards, deal the appropriate number to the opponent.
2. **Rollout.** Play the game to completion using the genome-driven policy for both players.
3. **Repeat** for `simCount` simulations (default passed from the UI, typically several hundred).
4. **Pick the pair with the highest win rate.**

**Early stopping:** After a minimum number of simulations, if the gap between the best and second-best move exceeds 4 standard errors, stop early to save time.

**Key insight:** The rollout uses the evolved genome for both players, not random play. This means the simulation models reasonably intelligent play, not worst-case or average-case.

### The Fundamental MC Problem: Opponent Modeling

Monte Carlo evaluation with random opponent hands has a critical blind spot: **it underestimates discard danger.**

When you discard a high card in a color your opponent is collecting, a real opponent will grab it immediately. But in MC simulations, the opponent's hand is random -- they probably don't have that color's expedition, so the discard looks safe.

This means MC consistently recommends discards that a human would never make. The AI might discard a 9 of red when the opponent has a red expedition with wagers, because in 80% of random hand assignments, the opponent "can't" pick it up.

**Why evolution couldn't fix this:** The opponent-awareness genes (10 genes in the `opponent` category) should compensate, but evolution had no signal to optimize them. MC evaluation is the fitness function, and MC doesn't model real opponent behavior. The genes that evolution could optimize were self-play genes (portfolio management, wager timing, tempo). The opponent-modeling genes drifted randomly.

---

## Evolution Setup

### Standard Evolution (`evolve-v2.js`)

- Population of genomes competing in round-robin tournaments.
- Each match plays multiple games (both sides) to reduce variance.
- Selection: top performers survive, crossover + mutation produces offspring.
- Crossover: 30% gene swap, 70% weighted blend between parents.
- Mutation: each gene has a chance to shift within its range, with configurable rate and strength.
- Parallelized across CPU cores via `worker_threads`.
- Diversity preservation via genomic distance measurement.

### Island Model (`islands.js`)

The island-model evolution produces 5 distinct AI personalities:

- **5 islands**, each seeded with a different archetype (Explorer, Scholar, Collector, Spy, Gambler).
- **Island size: 15 genomes** per island.
- **60 generations** of independent evolution.
- **60 games per match** in round-robin tournament within each island.
- **Migration every 10 generations:** top 2 genomes from each island migrate to adjacent islands, introducing genetic diversity without homogenizing play styles.
- **Archetype seeding:** 60% of initial population is mutations of the archetype seed; 40% is random genomes for diversity.

Each archetype seed biases specific genes. For example:
- Explorer: low `earlyPlayThresh` (-15), high `maxExpeditions` (4.5), negative `holdVsPlayBias` (-2).
- Scholar: high `wagerMinProjected` (15), high `wagerMinHandCards` (4), high `riskAvoidWhenAhead` (1.5).
- Gambler: high `wagerRiskTolerance` (0.95), high `riskSeekWhenBehind` (1.5), high `variancePreference` (0.7).

The champion from each island is saved and becomes a selectable AI personality in the game. Separate champions are evolved for Classic and Single Pile variants (`champions.json` and `champions-single.json`).

---

## Ablation Results

The ablation study (`ablation.js`) resets one gene at a time to its default value and measures win rate drop over 1000 games.

**Key finding:** Only about 15 of the 59 genes actually matter. The rest can be reset to defaults with minimal performance impact.

**Genes that matter most (high sensitivity):**
- Portfolio genes: `maxExpeditions`, `eightCardWeight`, `focusVsSpread`
- Wager genes: `wagerMinProjected`, `wagerLatePenalty`
- Draw genes: `drawDiscardThresh`, `drawExpBonus`
- Phase genes: `earlyPlayThresh`, `endgameUrgency`

**Genes with low/no sensitivity:**
- Most opponent-modeling genes (as predicted by the MC blind spot)
- Risk/variance genes (card game variance swamps these signals)
- Tempo control genes (effects are too subtle for evolution to capture)
- `drawInfoLeakPenalty`, `oppMirrorPenalty`, `oppExpCountFear`

**Implication:** A simpler genome with ~15-20 genes would perform nearly as well and evolve faster. The extra genes add expressiveness for personality differentiation but not raw strength.

---

## Post-MC Penalty (Band-Aid Fix)

Since MC underestimates discard danger, a post-evaluation correction is applied:

1. After MC scoring all move pairs, check each discard option.
2. If discarding to a color where the opponent has an active expedition:
   - Base penalty: card value x 2% win rate shift.
   - Multiplied by (1 + opponent wager count x 0.5).
   - Multiplied by (1 + opponent card count x 0.1).
   - Extra 1.5x if opponent can legally play the card immediately.
3. If discarding to a color the opponent has drawn from the discard pile (tracked via `oppDrawHistory`):
   - Lighter penalty: card value x 1.5% win rate shift (signal, not confirmation).

This shifts the win rate estimates enough to avoid the worst discard mistakes, but it's crude. The penalty magnitudes were hand-tuned, not evolved.

---

## Endgame Solver

When the deck has 6 or fewer cards remaining, Monte Carlo is replaced with minimax search:

- **Depth:** 2 plies (AI plays, opponent responds, evaluate).
- **Alpha-beta pruning** to reduce the search tree.
- **Evaluation:** Score differential (player2 score - player1 score).
- **Move generation** considers all legal (play/discard, draw) combinations.

At deck size 6, the remaining game is short enough that minimax gives near-perfect play. This is significantly stronger than MC for endgame decisions because it considers the opponent's best response rather than random play.

---

## Performance Stats

- Evolved AI wins approximately 75% of games against the default (un-evolved) genome.
- Different personalities have different strengths: Explorer is strongest in short games, Scholar in long games with complex scoring.
- The AI runs in a Web Worker (`ai-worker.js`) to avoid blocking the UI thread.
- Typical evaluation time: a few hundred milliseconds per move on modern hardware, with early stopping.

---

## Future Plans

### Genome-Direct Decisions
Use the evolved genome directly for opponent-aware moves (discard safety, deny draws) without running MC. MC would only be used for self-play optimization (which expedition to build, when to wager). This addresses the fundamental MC blind spot.

### MCTS (Monte Carlo Tree Search)
Replace flat MC evaluation with tree search. Build a game tree, expand promising nodes, backpropagate results. Would give better lookahead, especially in the midgame.

### Bayesian Opponent Hand Inference
Track opponent's plays, draws, and discards to build a probability distribution over their hand. Use this instead of random hand generation in MC simulations. Would dramatically improve discard safety evaluation.

### Neural Network Evaluation
Train a neural network on game positions and outcomes from thousands of evolved AI games. Use as a fast position evaluator instead of full rollouts. Would enable deeper search.

### Genome Pruning
Based on ablation results, reduce the genome to ~15-20 high-sensitivity genes. Faster evolution, clearer personality differentiation, and no dead weight.
