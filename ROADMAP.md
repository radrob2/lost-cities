# Expedition Card Game — Roadmap

## Current State
- 2-player real-time multiplayer via Firebase RTDB + room codes
- 7 AI personalities: 5 evolved (Explorer, Scholar, Collector, Spy, Gambler) + Strategist (heuristic, default) + 2 boss AIs (Seer, Oracle)
- Strategist AI beats all evolved genomes (67-91% classic, 59-69% single pile)
- Classic (5 discard piles) + Single Pile variant
- Sound effects (Web Audio API) + Android haptics
- Score breakdown with polished per-expedition receipt-style detail
- FLIP animations for all card movements (player + AI)
- Colorblind mode with unique symbols per color
- Browser notifications for multiplayer turn changes
- Rematch flow with series score tracking
- 4-screen onboarding tutorial
- Reconnect on disconnect (localStorage)
- Undo support
- Offline AI mode (no Firebase dependency)
- Stats tracking (wins, losses, streaks, per-personality, per-variant)
- Mobile-first, works on iPhone Safari + Android Chrome
- Hosted at https://lost-cities-dd1c0.web.app
- GitHub repo with auto-deploy via GitHub Actions
- 47 automated tests (scoring, legal moves, game simulation)

---

## Phase 1: App Store Ready (Priority: HIGH)

### Rename & Rebrand
- [ ] Choose new name (e.g., "Expedition", "Five Peaks", "Uncharted Trails")
- [ ] New Firebase project with clean project ID
- [ ] New domain / hosting URL
- [ ] "Lost Cities" is trademarked by Kosmos — game mechanics are NOT copyrightable, but name/art are

### Original Card Art
- [ ] AI-generate 5 expedition themes: Volcano (red), Jungle (green), Ocean (blue), Arctic (white), Desert (yellow)
- [ ] Each card gets a unique illustration (not just solid colors)
- [ ] Card back design
- [ ] This is the #1 thing that makes it feel like a real app vs a hobby project
- [ ] AI-generated art is fine for original designs — no legal issues

### App Icon + Splash Screen
- [ ] Design a distinctive app icon (compass, expedition theme)
- [ ] Splash/loading screen with branding
- [ ] First impression matters enormously for App Store

### Capacitor Wrap
- [ ] Install Capacitor: `npm init` + `npm install @capacitor/core @capacitor/cli`
- [ ] `npx cap init` with new app name + bundle ID
- [ ] Add iOS + Android platforms
- [ ] iOS haptics via Capacitor Haptics plugin (finally works on iPhone!)
- [ ] Build + test on real devices
- [ ] One codebase deploys to both platforms

### Offline Single-Player
- [x] AI games run purely locally — no Firebase reads/writes
- [x] AI worker runs locally, Firebase dependency removed for AI mode
- [x] Multiplayer still uses Firebase

### Onboarding / Tutorial
- [x] 4-screen tutorial: basic rules, card values, scoring, tips
- [x] Shows on first launch, accessible from menu after

---

## Phase 2: Polish (Priority: MEDIUM)

### Animations
- [x] FLIP system QA pass — AI moves now animate with grabPos/slideFrom
- [x] AI play/discard/draw all have sound effects
- [ ] Consider fixed-slot system as alternative (every card position is a pre-defined DOM slot)
- [ ] Card game lives or dies on how satisfying the cards feel

### Sound Design
- [ ] Replace Web Audio synthesized tones with actual recorded sound effects
- [ ] Card slide, card place, shuffle, draw — real foley sounds
- [ ] Background ambient (campfire? wind?) — optional, toggleable
- [ ] Night and day difference in feel vs synthesized beeps

### AI Improvements
- [x] Heuristic AI ("Strategist") beats all evolved genomes — now default
- [x] Genome-direct discard danger scoring blended with MC win rates
- [x] Endgame solver for deck <= 6 cards (minimax with alpha-beta)
- [x] Boss AIs: The Seer (sees hand), The Oracle (sees hand + deck)
- [ ] MCTS (tree search) instead of flat Monte Carlo
- [ ] Bayesian opponent hand inference from observed plays/draws/discards
- [ ] Extend endgame solver depth for deck <= 10-12

### Score Screen
- [x] Column alignment fixed with consistent flex layout
- [x] Card list overflow handled with text-overflow:ellipsis
- [x] Color coding: negative=red, positive=gold, winner gets glow
- [x] Separator hierarchy: thin within < medium between colors < bold gold before total

---

## Phase 3: Growth Features (Priority: LOW)

### Stats & History
- [x] Track wins, losses, win streaks per player
- [x] Stored in localStorage (expedition-stats)
- [x] Per-personality and per-variant breakdowns
- [ ] "Personal best" scores display

### Online Matchmaking
- [ ] Play strangers, not just room codes
- [ ] Simple queue: "looking for opponent" -> match when 2 people are waiting
- [ ] Firebase RTDB can handle this with a "waiting" node
- [ ] Consider abuse/moderation

### ELO / Ranking
- [ ] Competitive ladder
- [ ] Requires persistent user accounts (Firebase Auth)
- [ ] Leaderboard

### Multiple Themes
- [ ] Dark (current), Light, Classic Parchment
- [ ] Seasonal themes?
- [ ] Purchasable via IAP

### Accessibility
- [x] Colorblind mode: unique symbols per color (triangle, circle, waves, diamond, star)
- [x] Toggle in game menu, persisted in localStorage
- [ ] VoiceOver / TalkBack support
- [ ] Font size options

### Monetization
- [ ] Base app: $2.99 (both platforms)
- [ ] Free web version as funnel ("like it? get the app")
- [ ] Optional IAP: cosmetic card packs, themes
- [ ] No ads — pay once, play forever. Classier.

### Boss AI
- [x] The Seer: sees opponent's hand, MC uses real hand instead of random sampling
- [x] The Oracle: sees hand + deck, near-perfect play with perfect information
- [x] Both in personality picker under "Boss AI" section with warning labels
- [ ] Achievement/badge for anyone who beats The Oracle
- [ ] Unlock progression (beat Seer to unlock Oracle?)

### Multiplayer Polish
- [x] Browser notifications when it's your turn (tab unfocused)
- [x] Page title updates with turn state
- [x] Rematch button with alternating first player
- [x] Running series score (resets on leave)
- [ ] Spectator mode
- [ ] Chat / emotes

---

## Platform & Cost Summary

| Platform | Cost | Notes |
|----------|------|-------|
| Web (current) | Free | Firebase free tier: 100 simultaneous connections, 1GB/month |
| Google Play | $25 one-time | 15% commission on sales (first $1M) |
| Apple App Store | $99/year | 30% commission. Need ~48 sales at $2.99 to break even |
| Firebase Blaze | Pay-as-you-go | Only needed if thousands of concurrent users |

### Recommended Launch Order
1. Google Play first ($25) — test the market
2. If 50+ Android sales, add iOS ($99/year)
3. Web version stays free as marketing funnel

---

## Maintenance

Almost zero:
- Firebase RTDB: Google maintains it, been stable 10+ years
- Capacitor: bump version ~once/year, rebuild, resubmit (~3 hours)
- Apple requires occasional updates to avoid removal — yearly Capacitor bump handles this
- No backend, no APIs, no database migrations
- If Firebase ever deprecated RTDB (unlikely, years of notice): migrate to Firestore

---

## Known Issues / Tech Debt

### Animations
- FLIP system occasionally has cards starting from wrong position
- Edge case: rapid tapping can cause visual glitches (mitigated by phase guards)

### AI
- MC with random opponent hands still has blind spots for opponent-awareness
- Genome-direct discard safety blending helps but isn't perfect
- Heuristic AI is strong but doesn't use MC at all — potential hybrid approach

### Firebase
- Empty arrays stored as null/undefined by Firebase — handled with getCards() helper
- Race conditions possible in multiplayer if both players act simultaneously
- Security rules needed to prevent reading opponent's hand via dev tools

### iOS
- No haptic feedback (navigator.vibrate not supported in Safari)
- Capacitor wrap would fix this via native Haptics plugin
- AudioContext requires user interaction to start on iOS — handled with first tap

### Code Structure
- index.html is ~2000 lines (monolith) — module split planned
- Target: rules.js, engine.js, ai-worker.js, firebase.js, ui.js, animations.js, sound.js
