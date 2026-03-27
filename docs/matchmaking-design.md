# Matchmaking UX Design

Analysis of the online matchmaking experience for Venture, with practical recommendations for a small indie game.

---

## Current Implementation

The matchmaking system uses Firebase RTDB as a lightweight queue:

- **Entry point**: "Find Opponent" button on the lobby screen.
- **Queue path**: `matchmaking/{variant}/{playerId}` -- each player writes an entry with their name, ID, and a server timestamp.
- **Matching logic**: Both players listen on the variant queue via `on('value')`. The first player to detect a second entry creates a room and writes the `roomCode` back to their matchmaking entry. The second player reads that code and joins.
- **Cleanup**: `onDisconnect().remove()` handles abandoned entries. Both entries are removed after a successful match.
- **Timeout**: 60 seconds, with a visible countdown ("Timeout in 42s"). On timeout, the entry is removed and the player returns to the lobby with a "No opponents found" toast.
- **Cancel**: A cancel button removes the entry and returns to the lobby.

**What works well**: The core mechanics are sound. Firebase handles the real-time signaling cleanly, and `onDisconnect` prevents ghost entries. The 60-second timeout is reasonable for a small player base.

**What feels rough**: The searching screen is static and lifeless. "Searching for an opponent..." with a countdown timer feels like watching a loading bar. There is no transition moment when matched -- you jump straight into the game. No opponent info is shown.

---

## UX Flow Improvements

### 1. Make the Searching Screen Feel Alive

The current screen is a static compass emoji, a text line, a timer, and a cancel button. For a card game about expeditions, this is a missed opportunity.

**Recommended approach -- animated card shuffle**:
- Replace the static compass with a CSS animation of 2-3 cards gently fanning and shuffling (use the existing card back styling, just animate `transform: rotate()` and `translateX()` on a loop).
- Add a subtle pulsing glow behind the cards (CSS `box-shadow` animation on a 2s ease-in-out cycle).
- Replace "Searching for an opponent..." with rotating flavor text (see below).
- Move the countdown timer to small muted text at the bottom -- it should be visible but not the focus.

**Rotating tips/flavor text** (cycle every 4 seconds with a fade transition):
- "Shuffling the deck..."
- "Scouting for expeditions..."
- "Wagers multiply your risk AND reward"
- "Tip: You can draw from discard piles"
- "8+ cards on an expedition = 20 point bonus"
- "Tip: Watch what your opponent picks up"
- "Charting unknown territory..."

This keeps the screen from feeling frozen without being annoying. Four-second intervals are long enough to read, short enough to feel dynamic. Implementation: a simple `setInterval` that fades between strings in the `matchmaking-text` element.

**Cost to implement**: ~30 minutes. CSS keyframes for the card animation, a string array with setInterval for the text rotation.

### 2. The "Found Opponent!" Moment

Right now, matching dumps you straight into the game. This is jarring. Players need a beat to mentally transition from "waiting" to "playing."

**Recommended flow**:
1. Match detected -> text changes to "Opponent found!" with a brief SFX (`SFX.play()` or a new match-found sound).
2. Show opponent's name for 1.5 seconds: "Playing against **Marcus**"
3. Auto-transition to the game screen.

Total added delay: ~2 seconds. This is not wasted time -- it builds anticipation and gives the player a moment to focus. It also confirms the match worked, which builds trust in the system.

**Do NOT add**: A "ready check" screen at this stage. With a small player base, adding friction between matching and playing will cause drop-offs. Ready checks are for games with consistent 5-second queue times, not 30-second ones.

### 3. Estimated Wait Time

**Do not show estimated wait time.** Here is why:

- With a small player base, wait times are unpredictable. Showing "Estimated: 2 minutes" when nobody is online is worse than showing nothing.
- The 60-second timeout already sets expectations.
- Estimated wait times that are wrong erode trust faster than no estimate at all.

Instead, if the player base grows to the point where queue data is meaningful, consider showing "X players online" as a subtle indicator. This can be derived from a Firebase presence counter (`connections/` path with `onDisconnect` cleanup). But this is a post-launch optimization.

### 4. Disconnect During First Few Seconds

If a player disconnects in the first few seconds of a match, the remaining player should not be stuck staring at a frozen game board.

**Recommended handling**:
- The existing turn timer (if implemented) or a Firebase `.info/connected` listener should detect when the opponent goes offline.
- If the opponent disconnects within the first 10 seconds AND no moves have been made, show: "Opponent disconnected. Returning to lobby..." with a 3-second delay, then auto-return to lobby.
- If moves have been made, treat it as a normal mid-game disconnect (opponent can reconnect via session recovery).
- Do NOT count early disconnects as wins/losses (relevant for future ranked mode).

---

## Anti-abuse / Edge Cases

### Queue-and-Leave Griefing

Someone queues, gets matched, then immediately closes the tab.

**Current mitigation**: `onDisconnect().remove()` cleans up the matchmaking entry, so at least the queue stays clean. But the matched opponent gets dumped into a game with nobody.

**Recommended approach**:
- Track a simple counter in localStorage: `matchmaking_abandons`. Increment it any time a player is matched but disconnects within 15 seconds without making a move.
- If `matchmaking_abandons >= 3` within the last hour, add a 30-second cooldown before they can queue again. Show: "Please wait 30s before searching again."
- This is entirely client-side and trivially bypassable, but it handles accidental/casual griefing without needing a backend. Determined griefers are not a realistic threat for a small card game.

**Do NOT build**: Server-side ban lists, reputation systems, or report buttons. Overkill for the current scale.

### Simultaneous Cancel Race Condition

Both players cancel at the exact same moment -- what happens?

**Current behavior**: Both call `cancelMatchmaking()`, which removes their own entry and returns to the lobby. This is actually fine. The Firebase listener might briefly see the other player's entry before it is removed, but since `cancelMatchmaking` cleans up the listener first, no room gets created. No action needed.

**One edge case to watch**: Player A cancels, but Player B's listener fires first and creates a room pointing to Player A. Player A is now gone. The room sits in Firebase with `status: 'waiting'` forever.

**Fix**: Add a `createdAt` timestamp to rooms and run a periodic cleanup (or a Firebase Cloud Function) that deletes rooms with `status: 'waiting'` older than 5 minutes. Alternatively, add `onDisconnect().remove()` to the room ref when Player A creates it -- if they disconnect before Player B joins, the room self-destructs.

### Rate Limiting on Queue Joins

- Client-side: Disable the "Find Opponent" button for 3 seconds after canceling or timing out. Prevents spam-clicking.
- Firebase security rules: Add a rate limit using a write counter. For example, allow writes to `matchmaking/` only if the last write by this user was more than 5 seconds ago. This prevents programmatic spam.
- Realistically, spam is not a launch concern. The 3-second client-side cooldown is sufficient for now.

### Bot/Spam in Queue

Not a realistic concern at launch scale. If it becomes one:
- Firebase Anonymous Auth (already likely in use) ties entries to auth UIDs.
- Add a simple challenge: require the player to have completed at least one AI game before matchmaking unlocks. This filters out bots and also ensures new players understand the rules before facing humans.

---

## Future: Ranked Matchmaking

### ELO with Firebase (No Backend)

This is the hard problem. ELO requires a trusted authority to update ratings -- if clients write their own ratings, they can cheat.

**Option A -- Firebase Cloud Functions (recommended)**:
- On game end, the client writes to `results/{gameId}` with the outcome.
- A Cloud Function triggers on write, validates the result against the game state, calculates new ELO for both players, and writes to `players/{uid}/rating`.
- Security rules make `players/{uid}/rating` read-only for clients.
- Cloud Functions are free for low volume (125K invocations/month on the Blaze plan's free tier).

**Option B -- Client-side honor system**:
- Both clients compute the new ELO and write it. If they disagree, flag the game for review.
- This is fragile and not recommended, but it works for a trusted small community.

**Option C -- Defer ranked entirely**:
- Launch with casual matchmaking only. Add ranked once the player base justifies it.
- This is the correct choice for launch.

### Casual vs. Ranked Queues

Yes, keep them separate. Casual players should never feel punished for experimenting. The lobby screen would show:

```
[Find Opponent]          -- casual, no rating impact
[Ranked Match] (locked)  -- unlocks after 10 casual games
```

Locking ranked behind 10 casual games prevents smurfing and ensures players know the rules.

### Rank Display

- Show a numerical rating (e.g., 1200) plus a tier name for flavor:
  - Below 1000: Novice
  - 1000-1199: Scout
  - 1200-1399: Explorer
  - 1400-1599: Cartographer
  - 1600+: Expedition Leader
- Display on the lobby screen next to the player name.
- Badges: Award for milestones (first win, 10-game streak, reached Explorer tier). Show on a simple profile screen. Keep the badge count under 10 to start -- badge inflation kills meaning.

### Season Resets

- Soft reset every 3 months: new_rating = (old_rating + 1200) / 2. This compresses everyone toward the middle without wiping progress entirely.
- Season history visible on profile: "Season 1: Explorer (peak 1342)."
- Only implement seasons if ranked mode proves popular. Do not build this for launch.

---

## Recommendations: Top 3 for Launch

### 1. Animate the Search Screen

**Impact**: High. This is the first impression of multiplayer. A lifeless waiting screen signals "this game is unpolished."

**Effort**: Low (~1 hour). CSS card animation + rotating text array.

**Specifics**: Add a `@keyframes shuffle` animation to 3 card-back divs. Cycle through 7-8 tip strings with a fade transition every 4 seconds. Move the countdown timer to small text at the bottom.

### 2. Add the "Opponent Found" Transition

**Impact**: High. The moment of matching should feel like something happened. Going from "Searching..." to a game board with no fanfare is deflating.

**Effort**: Low (~30 minutes). On match detection, update the text to show the opponent's name, play a sound, wait 1.5 seconds via `setTimeout`, then call `startGame()`.

**Specifics**: In the `matchmakingRef.on('value')` callback, when a roomCode is detected (player 2 path) or when joining the room (player 1 path), insert the transition before `startGame()`.

### 3. Handle Early Disconnects Gracefully

**Impact**: Medium-high. Nothing is more frustrating than getting matched and then staring at a dead game. This will happen regularly with a small player base (people on flaky mobile connections, people who accidentally hit back).

**Effort**: Medium (~2 hours). Add a Firebase `.info/connected` presence listener for the opponent. If they go offline within 10 seconds and no moves have been made, auto-return to lobby with a message.

**Specifics**: After `startGame()`, set a flag `gameStartedAt = Date.now()`. Monitor opponent's connection via their player node. If they disconnect and `Date.now() - gameStartedAt < 10000` and move count is 0, show a toast and return to lobby.

---

### What NOT to Build for Launch

- Ready checks (adds friction, small player base cannot afford it)
- Estimated wait times (unreliable with few players)
- Ranked mode (need casual player base first)
- Server-side anti-abuse (client-side cooldowns are sufficient)
- Player reporting (no moderation infrastructure to act on reports)
- "Players online" counter (depressing when it shows "1")

Build these when the player count justifies them. For now, make the 60-second wait feel delightful, make the match feel exciting, and handle the inevitable disconnects gracefully.
