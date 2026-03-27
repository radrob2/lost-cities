# Achievement & Progression Design for Venture

## Current Achievements (10)

| # | Achievement | Condition | Difficulty | Notes |
|---|------------|-----------|------------|-------|
| 1 | First Victory | Win 1 game | Trivial | Onboarding; ~100% of players |
| 2 | Streak Master | 5 wins in a row | Medium | Requires consistency, not just skill |
| 3 | High Roller | 100+ points | Medium-Hard | Needs strong expeditions + some luck |
| 4 | Color Master | All 5 colors positive | Hard | Conflicts with normal strategy (focus 3-4 colors) |
| 5 | Wager King | 3 wagers + positive in one expedition | Hard | Rare hand + risky play required |
| 6 | Speed Run | Win with 20+ cards in deck | Hard | Unusual; game rarely ends that early |
| 7 | Comeback Kid | Win when opponent scored 30+ more on expeditions | Medium | Threshold of 30 is somewhat low |
| 8 | Beat the Seer | Beat The Seer | Hard | Boss AI sees your hand |
| 9 | Beat the Oracle | Beat The Oracle | Very Hard | Boss AI has perfect information |
| 10 | Century Club | Play 100 games | Time gate | Pure persistence |

---

## Achievement Unlock Feel

### Current State

The unlock is a gold-bordered toast at the bottom of the screen. It shows the icon, "Achievement Unlocked:", and the name. It stays for 3 seconds, then fades. Multiple unlocks queue with 3.5-second gaps.

### What Is Working

- Gold color is thematically correct (expedition/treasure feel).
- Non-blocking -- does not interrupt the game-over screen.
- Queuing handles the edge case of multiple simultaneous unlocks.

### What Is Missing

**The unlock has no distinct sound.** Currently it triggers `SFX.error()` because it reuses the generic `toast()` path indirectly. An achievement unlock should have its own celebratory sound -- a short ascending chime (two or three notes, ~0.3 seconds). This is the single highest-impact change for unlock feel.

**No haptic pulse.** A medium haptic on unlock would reinforce the moment. One line of code.

**No visual distinction from error toasts.** The gold border helps, but the toast element is the same one used for "Can't draw from pile you just discarded to." Achievement unlocks should feel categorically different from error messages.

### Recommendations for Unlock Feel

1. **Dedicated achievement sound** (`SFX.achievement()`): Three ascending tones -- e.g., C5-E5-G5 played as quick arpeggiated sine waves over 0.4 seconds. Distinct from every other sound in the game. Add a medium haptic burst. Implementation: ~15 lines in sound.js, one call in `showAchievementToast()`. This is the single most important change.

2. **Gold shimmer animation on the toast**: Add a CSS keyframe that sweeps a diagonal highlight across the toast background once (like a gold bar catching light). Pure CSS, no JS. Makes the toast visually distinct from error toasts without being disruptive.

   ```css
   @keyframes achievement-shimmer {
     0% { background-position: -200% 0; }
     100% { background-position: 200% 0; }
   }
   .toast.achievement {
     background: linear-gradient(
       110deg,
       rgba(30,20,10,.92) 30%,
       rgba(255,215,0,.12) 50%,
       rgba(30,20,10,.92) 70%
     );
     background-size: 200% 100%;
     animation: achievement-shimmer 1.2s ease-out;
   }
   ```

3. **Particle burst -- skip it.** Particles require either a canvas overlay or dozens of DOM elements. The cost/benefit is poor for a toast notification. The shimmer + sound + haptic combination is enough.

4. **Rare achievements should NOT have a different ceremony.** With only 10 achievements, splitting into "common" and "rare" tiers adds complexity without payoff. Every unlock should feel good. If the roster grows past 25, revisit this.

5. **"New!" badge on the Stats button**: Yes, add this. After an achievement unlocks, set a flag in localStorage (`expedition-achievements-unseen: true`). On the lobby screen, if the flag is set, show a small gold dot (6px circle) on the top-right corner of the Stats button. Clear the flag when the user opens the stats screen. This is a gentle nudge that costs almost nothing to implement and gives the achievement a second moment of recognition.

---

## Achievement Design Critique

### Balance Assessment

The current 10 achievements have a problem: **there is a gap in the middle of the difficulty curve.** The distribution is:

- Trivial (1): First Victory
- Medium (2): Streak Master, Comeback Kid
- Hard (4): High Roller, Color Master, Wager King, Speed Run
- Very Hard (2): Beat the Seer, Beat the Oracle
- Time gate (1): Century Club

Most players will unlock First Victory immediately, then hit a wall. There are no "exploration" achievements that reward trying things out, and no achievements in the 5-15 game range. A new player who beats one AI opponent has nothing to work toward until they get lucky enough for a 5-win streak.

### What Is Missing

#### Exploration Achievements (reward breadth of play)

| Achievement | Condition | Why |
|------------|-----------|-----|
| **Well Traveled** | Play at least one game against each of the 6 regular AI personalities | Encourages trying all opponents. Easy to track -- already have byPersonality in stats. |
| **Variant Explorer** | Win a game in both Classic and Single Pile variants | Costs one extra game. Encourages discovery. |
| **Social Butterfly** | Complete a multiplayer game (any result) | Rewards trying online play. Does not require winning. |

#### Mastery Achievements (reward skilled play)

| Achievement | Condition | Why |
|------------|-----------|-----|
| **Clean Sweep** | Win without any expedition scoring negative | Tests discipline -- only commit to colors you can finish. |
| **Bonus Collector** | Earn the 8-card bonus (+20) in two or more expeditions in one game | Rewards deep investment strategy. |
| **Shutout** | Win while opponent has a negative total score | Dominant performance. Memorable. |

#### Fun/Weird Achievements (memorable stories)

| Achievement | Condition | Why |
|------------|-----------|-----|
| **Zero Hero** | Finish a game with exactly 0 points | Mathematically unlikely. Players will remember this. |
| **All In** | Play all 3 wagers in a single expedition (regardless of score) | Rewards the emotional moment, not the outcome. Different from Wager King. |
| **Empty Handed** | Win a game without starting any expedition in one or more colors | Counterintuitive but valid strategy. |

#### Milestone Achievements (pacing over time)

| Achievement | Condition | Why |
|------------|-----------|-----|
| **Getting Started** | Play 10 games | Fills the gap between First Victory and Century Club. |
| **Veteran** | Play 50 games | Another waypoint. |
| **Streak Breaker** | Come back from a 3+ game losing streak to win | Consolation prize for struggling players. Emotionally resonant. |

### Achievements to Reconsider

- **Comeback Kid** (current): The condition "opponent scored 30+" is ambiguous and the threshold is low. A 30-point opponent score is common. Consider raising to 50+, or changing to "Win after being behind by 40+ points" for a clearer narrative.

- **Speed Run**: Winning with 20+ cards left in the deck is extremely unusual because the game rarely ends early enough. Most players will never see this. Consider lowering to 15 cards, or changing the concept to "Win in under 3 minutes" (would need a game timer, so probably not worth it).

### Daily/Weekly Challenges -- Not Recommended

Daily challenges require either a server (to sync the challenge seed) or deterministic date-based generation. They also create obligation anxiety ("I have to play today or I miss it"). For a small indie game with no server infrastructure, the cost is high and the benefit is marginal. Skip this for launch. If the game gets traction and you add Firebase Auth for accounts, revisit.

### Tiered Achievements (Bronze/Silver/Gold) -- Not Recommended for Launch

Tiers work well in games with 50+ achievements (Steam, Xbox). With 10-20 achievements, tiers just make everything feel incomplete. "Bronze: 1 win, Silver: 10 wins, Gold: 50 wins" is padding, not design. A flat list of distinct challenges is more satisfying at this scale.

### Recommended Final Roster (18 achievements)

Keep the original 10, add 8 from the categories above:

1. First Victory (trivial)
2. Getting Started -- 10 games (easy)
3. Well Traveled -- all 6 AI personalities (easy-medium)
4. Variant Explorer -- win both variants (easy-medium)
5. Social Butterfly -- complete a multiplayer game (easy)
6. Streak Master -- 5 wins in a row (medium)
7. Comeback Kid -- win when behind 40+ (medium, revised threshold)
8. Clean Sweep -- no negative expeditions (medium)
9. High Roller -- 100+ points (medium-hard)
10. Color Master -- all 5 positive (hard)
11. Wager King -- 3 wagers + positive (hard)
12. Bonus Collector -- two 8-card bonuses (hard)
13. Speed Run -- win with 15+ deck cards (hard, revised threshold)
14. Shutout -- win vs negative opponent (hard)
15. Beat the Seer (hard)
16. Beat the Oracle (very hard)
17. Veteran -- 50 games (time gate)
18. Century Club -- 100 games (time gate)

This gives a much smoother difficulty curve. A new player will unlock 3-5 achievements in their first session (First Victory, Getting Started after 10 games, possibly Social Butterfly or Variant Explorer). That early momentum is critical for retention.

---

## Progression System

### Should Achievements Unlock Anything?

**Not for launch.** Unlockable content (themes, card backs, titles) requires building those assets first. The achievements themselves are the reward. A badge wall where you can see your collection fill up is sufficient for a card game.

However, design the system to support unlocks later. In the achievement data structure, add an optional `reward` field:

```js
{ id: 'beat_oracle', name: 'Beat the Oracle', ..., reward: { type: 'title', value: 'Oracle Slayer' } }
```

Leave it unused for now. When you add card art or themes post-launch, you have a natural monetization split: some cosmetics from achievements (free), some from IAP (paid).

### Badge Wall Design

The current `renderAchievements()` is a vertical list. This works, but a grid layout (3 columns on mobile, 4 on tablet) would be more visually compelling -- you can see the "shape" of your collection at a glance. Locked badges should show as dark silhouettes with "???" descriptions, not the actual description. This creates curiosity.

### Progress Indicators

For countable achievements (Century Club, Getting Started, Veteran, Well Traveled), show a progress bar or fraction below the locked badge:

```
[============-------] 37/100
```

Implementation: `checkAchievementProgress()` function that reads stats and returns progress data for each countable achievement. Called by `renderAchievements()`. No new localStorage keys needed -- all data is already in `expedition-stats`.

Achievements with boolean conditions (Beat the Oracle, Clean Sweep) should not show progress -- just locked/unlocked.

### Total Achievement Points -- Skip

Point values add another number to track without changing behavior. "12/18 achievements" is a clearer signal than "47/100 points." Keep it simple.

---

## Boss AI Progression

### Should Bosses Be Locked?

**The Seer: no.** Locking content behind skill gates frustrates casual players who just want to see what the game offers. The Seer is already labeled with a warning ("Can see your cards"). Let anyone try. The achievement for beating it is the reward.

**The Oracle: soft lock, not hard lock.** Show The Oracle in the picker but with a lock icon overlay. Tooltip: "Beat The Seer to unlock." This creates a visible goal without hiding the existence of the content. One win against The Seer unlocks The Oracle permanently (stored in localStorage).

Rationale: The Oracle is the hardest challenge in the game. Making the player prove they can handle The Seer first prevents frustration from a player who jumps straight to the hardest opponent and bounces off. But it is only one gate, not a long chain.

### Making Boss Victories Feel Special

When the player beats a boss AI for the first time:

1. **Delay the game-over screen by 1.5 seconds.** Show a full-screen flash/overlay with the boss icon, the text "THE SEER DEFEATED" (or "THE ORACLE DEFEATED"), and a gold border. This is a 2-3 second interstitial before the normal score screen appears.

2. **Unique sound.** A longer, more dramatic version of the achievement sound -- perhaps a 1-second fanfare with a bass note underneath. Only plays once (first time beating each boss).

3. **Persistent badge in the AI picker.** After beating The Seer, the Seer button in the personality picker gets a small gold checkmark. Same for The Oracle. This is a quiet trophy that the player sees every time they open the picker.

4. **No special badge design needed.** The achievement badges for "Beat the Seer" and "Beat the Oracle" are sufficient. Adding a separate boss badge system creates confusion about where to look.

---

## Recommendations: Top 5 Changes for Launch

Prioritized by impact (how much it improves the player experience) vs effort (lines of code, testing, design time).

### 1. Add `SFX.achievement()` sound + haptic
**Impact: High. Effort: 15 minutes.**
Three ascending tones + medium haptic. Call it from `showAchievementToast()`. This single change transforms achievement unlocks from "oh, a message" to "I earned something." Currently the toast reuses the error sound path, which actively undermines the moment.

### 2. Add 5 "easy win" achievements (Getting Started, Well Traveled, Variant Explorer, Social Butterfly, Streak Breaker)
**Impact: High. Effort: 1-2 hours.**
The current roster gives new players exactly one early unlock (First Victory), then nothing for potentially dozens of games. Five approachable achievements in the 1-15 game range give players reasons to explore features (all AI personalities, both variants, multiplayer) and feel progress. All the data needed is already tracked in `expedition-stats`.

### 3. Add "New!" indicator on Stats button after achievement unlock
**Impact: Medium. Effort: 20 minutes.**
One boolean in localStorage, one 6px gold dot via CSS, clear on stats screen open. Gives the achievement a second moment and pulls players into the stats screen where they see their full collection.

### 4. Add progress bars for countable achievements
**Impact: Medium. Effort: 1 hour.**
"37/100 games" under the Century Club badge transforms it from "this will never happen" to "I'm making progress." Read from existing stats data. Apply to: Getting Started, Veteran, Century Club, Well Traveled (X/6 personalities), Streak Master (current streak X/5).

### 5. Soft-lock The Oracle behind a Seer victory
**Impact: Medium. Effort: 30 minutes.**
One localStorage check. Lock icon overlay on the Oracle button. Unlock on first Seer win. Adds a clear two-step boss progression without hiding content. The visible-but-locked Oracle button is a goal that pulls players forward.

---

## Implementation Notes

### localStorage Keys (new)

| Key | Type | Purpose |
|-----|------|---------|
| `expedition-achievements-unseen` | boolean | True when achievements unlocked but stats screen not yet visited |
| `expedition-boss-progress` | JSON | `{ seerDefeated: bool, oracleDefeated: bool }` |

No new keys needed for achievement progress -- all derived from existing `expedition-stats` and `expedition-achievements` data.

### New Achievement Check Functions

The 5 new achievements need these checks added to `checkAchievements()`:

- **Getting Started**: `stats.totalGames >= 10`
- **Veteran**: `stats.totalGames >= 50`
- **Well Traveled**: `Object.keys(stats.byPersonality).length >= 6` (exclude boss keys)
- **Variant Explorer**: `stats.byVariant.classic?.w > 0 && stats.byVariant.single?.w > 0`
- **Social Butterfly**: Check if game was multiplayer (not AI) -- needs `isAIGame` passed to checker
- **Streak Breaker**: Needs a `worstStreak` field added to stats (track lowest negative streak)
- **Clean Sweep**: All expeditions with cards have score >= 0 (already have breakdown data)
- **Bonus Collector**: Count expeditions with 8+ cards in breakdown
- **Shutout**: `won && oppScore < 0`

### Files to Modify

- `/public/src/sound.js` -- add `SFX.achievement()` and `SFX.bossDefeat()`
- `/public/src/achievements.js` -- expand ACHIEVEMENTS array, add new checks, add progress functions, add unseen flag logic, add boss interstitial
- `/public/src/stats.js` -- add `worstStreak` tracking
- `/public/index.html` -- CSS for shimmer animation, "new" dot on Stats button, Oracle lock overlay in personality picker
