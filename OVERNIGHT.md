# Overnight Autonomous Work Plan

You are working on an expedition card game (Lost Cities clone) being prepared for App Store release. Read CLAUDE.md and ROADMAP.md first for full context.

**Repo:** /tmp/lost-cities
**Live:** https://lost-cities-dd1c0.web.app (auto-deploys from main via GitHub Actions)
**Key files:** public/index.html (~1800 lines), public/ai-worker.js (~950 lines)

Work through these tasks in order. After each task, commit, push, and verify tests pass (`node tools/test/run-all.js`). If a task is too large, break it into sub-commits. If something breaks, fix it before moving on.

---

## Task 1: Integration Test — Verify All Agent Work Merges Cleanly
The following were just committed by parallel agents. Verify nothing conflicts:
- Automated tests (tools/test/)
- Docs (docs/)
- Onboarding tutorial (in index.html)
- Stats tracking (in index.html)
- Offline AI mode (in index.html)
- AI discard fix (in ai-worker.js + index.html)

Run `node tools/test/run-all.js`. Load the game in a browser preview if possible. Check for JS errors. Fix anything broken.

---

## Task 2: Score Screen Polish
The score breakdown table has alignment issues. Fix:
- "You" and "Opp" column headers must align perfectly with the value columns below
- Card list row should not overflow — use smaller font or truncate gracefully
- Color totals in collapsed rows: negative=red, positive=gold for winner
- Separator hierarchy: thin within breakdown < medium between colors < bold gold before game total
- Total at bottom (natural math order), not top
- Test with the debug score screen (tap "Lost Cities" title 5 times on lobby)
- Test on mobile viewport (375px wide)

---

## Task 3: Animation QA Pass
Known animation issues:
- Some card movements don't animate (card appears in new position without sliding)
- Occasionally cards start from wrong position
- Rapid tapping can cause visual glitches
- AI moves sometimes don't animate at all

For each action, verify the FLIP system works:
1. Play card to expedition: should slide from hand to expedition
2. Discard card: should slide from hand to discard pile
3. Draw from deck: should slide from deck to hand
4. Draw from discard: should slide from discard to hand
5. AI plays: should slide AI's card to its destination

The system uses grabPos() before state change and slideFrom() after render. Debug by adding console.log to grabPos/slideFrom to verify they're called and the dx/dy values are reasonable (not 0,0 and not huge numbers).

If FLIP is fundamentally broken for certain cases, document which ones and why, but don't rip it out — just make the working cases work well.

---

## Task 4: AI Rework — Handcrafted Heuristic
The evolved genome + MC approach has fundamental issues (see CLAUDE.md "Known AI Issues"). Build a cleaner AI alongside the existing one:

Create a new function `heuristicEvaluate(gs, hand, genome, variant)` in ai-worker.js that:

### For PLAY decisions:
Score each playable card based on:
- Expedition investment: cards already played + wagers = commitment level
- Card efficiency: high cards in committed colors are great, low cards in uncommitted colors are bad
- 8+ card bonus potential: if expedition has 6+ cards, prioritize adding more
- Wager timing: wagers are only good early (deck > 30) with 3+ cards in that color in hand
- Don't start new expeditions late (deck < 20) unless you have 4+ cards in that color

### For DISCARD decisions:
Score each card's "safety to discard" based on:
- CRITICAL: Never discard to opponent's active expedition (check gs.expeditions.player1[color])
- CRITICAL: Never discard high cards (7+) in colors opponent has drawn from discard
- Prefer discarding: low cards in colors you're not pursuing
- Prefer discarding: cards in colors with few remaining unknowns (color is mostly played out)
- Prefer discarding: cards that don't connect to anything in your hand

### For DRAW decisions:
- Draw from discard if: card fits your expedition AND value > 5
- Draw from discard if: denying opponent a critical card
- Otherwise draw from deck (information advantage — opponent doesn't know what you got)
- NEVER draw from discard just because the card exists — it signals your intent

### Testing:
- Play 1000 games of heuristic vs default AI — target 65%+ win rate
- Play 1000 games of heuristic vs evolved genome AI — see who wins
- If heuristic wins, make it the new default
- Run `node tools/test/run-all.js` to verify no crashes

---

## Task 5: The Seer Boss AI
Implement the first cheating AI tier:
- When personality is "seer", pass actual opponent hand to the worker
- AI can see what you hold but not the deck order
- MC simulations use your actual hand instead of random sampling
- This alone should be dramatically stronger
- Add "The Seer" to the AI personality picker (with a distinct icon/label like an eye symbol)
- Label it clearly: "Warning: This AI can see your cards"

---

## Task 6: The Oracle Boss AI
Second cheating tier:
- Pass both opponent hand AND deck array to the worker
- AI knows the exact future — no randomness at all
- With perfect information, MC can calculate exact outcomes
- For deck ≤ 15 or so, could even do full minimax
- Add "The Oracle" to personality picker (crystal ball icon)
- Label: "Warning: This AI knows everything"
- Consider: should The Oracle be locked until you beat The Seer?

---

## Task 7: Colorblind Mode
Add accessibility option:
- Each color gets a unique pattern/symbol IN ADDITION to color:
  - Red: triangle/flame ▲
  - Green: circle/leaf ●
  - Blue: wave/water ≋
  - White: diamond/snow ◆
  - Yellow: star/sun ★
- Symbols appear on cards, expedition columns, and discard piles
- Toggle in the game menu: "Colorblind Mode" (stored in localStorage)
- Patterns should be subtle when colorblind mode is off (optional: always show them)

---

## Task 8: Turn Notifications
When it's your turn in multiplayer:
- If the browser tab is not focused, show a browser notification ("It's your turn!")
- Request notification permission on room join
- Also update the page title: "🟡 Your Turn — Expedition" vs "Expedition"
- This helps when you're tabbed away waiting for opponent

---

## Task 9: Game Rematch Flow
After a game ends:
- "Rematch" button that starts a new game with the same opponent (same room, no rejoin needed)
- Swap who goes first each game
- Keep a running series score (e.g., "You 2 — 1 Opp")
- Series score resets when someone leaves

---

## Task 10: Code Cleanup
- Remove any dead code, unused variables, commented-out blocks
- Remove debug console.log statements (keep the AI diagnostic ones behind a DEBUG flag)
- Ensure consistent formatting
- Check for any remaining `vibrate()` calls that should be `SFX.xxx()`
- Verify all localStorage keys are namespaced (use 'expedition-' prefix)
- Run tests one final time

---

## General Rules
- Read CLAUDE.md before starting
- Commit after each task (not after each sub-task)
- Push to main after each commit (auto-deploys)
- Run `node tools/test/run-all.js` after any game logic changes
- Don't break multiplayer — test both AI and multiplayer flows if touching shared code
- Mobile-first: test at 375px viewport width
- Use SFX.select() on any new interactive elements
- Keep index.html as one file for now (module split is a separate future task)
- If something is taking too long (>30 min stuck), document the issue and move on
