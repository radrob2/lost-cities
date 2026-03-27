# Expedition Card Game — Roadmap

## Current State
- 2-player real-time multiplayer via Firebase RTDB + room codes
- 5 AI personalities evolved via genetic algorithm (Explorer, Scholar, Gambler, Trader, Guardian)
- Classic (5 discard piles) + Single Pile variant
- Sound effects (Web Audio API) + Android haptics
- Score breakdown with per-expedition receipt-style detail
- Reconnect on disconnect (localStorage)
- Undo support
- Mobile-first, works on iPhone Safari + Android Chrome
- Hosted at https://lost-cities-dd1c0.web.app
- GitHub repo with auto-deploy via GitHub Actions

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
- [ ] AI games currently run through Firebase — unnecessary
- [ ] Move AI game state to pure local (no Firebase reads/writes)
- [ ] AI worker already runs locally, just need to remove Firebase dependency for AI mode
- [ ] Multiplayer still uses Firebase

### Onboarding / Tutorial
- [ ] 3-screen tutorial: basic rules, card values, scoring
- [ ] Most people won't know the game — this is critical
- [ ] Show on first launch, accessible from menu after

---

## Phase 2: Polish (Priority: MEDIUM)

### Animations
- [ ] Current FLIP system works but has edge cases — needs QA pass
- [ ] Document known issues: occasional wrong starting position, cards from offscreen
- [ ] Consider fixed-slot system as alternative (every card position is a pre-defined DOM slot)
- [ ] Card game lives or dies on how satisfying the cards feel

### Sound Design
- [ ] Replace Web Audio synthesized tones with actual recorded sound effects
- [ ] Card slide, card place, shuffle, draw — real foley sounds
- [ ] Background ambient (campfire? wind?) — optional, toggleable
- [ ] Night and day difference in feel vs synthesized beeps

### AI Improvements
- [ ] Core issue: Monte Carlo search with random opponent hands underestimates discard danger
- [ ] Current fix: post-MC penalty for dangerous discards + opponent draw tracking
- [ ] Better fix: use evolved genome DIRECTLY for opponent-aware decisions, MC for self-play optimization
- [ ] Endgame solver for deck ≤ 6 cards (enumerate exact outcomes)
- [ ] MCTS (tree search) instead of flat Monte Carlo
- [ ] Bayesian opponent hand inference from observed plays/draws/discards
- [ ] Sensitivity analysis showed ~15 of 59 genes actually matter — prune the rest

### Score Screen
- [ ] Column alignment is close but not pixel-perfect in all cases
- [ ] Card list row can overflow on very long expeditions
- [ ] Consider removing card list from score and using "View Board" instead

---

## Phase 3: Growth Features (Priority: LOW)

### Stats & History
- [ ] Track wins, losses, win streaks per player
- [ ] Store locally (localStorage or IndexedDB)
- [ ] "Personal best" scores
- [ ] People love seeing their stats

### Online Matchmaking
- [ ] Play strangers, not just room codes
- [ ] Simple queue: "looking for opponent" → match when 2 people are waiting
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
- [ ] Colorblind mode: add patterns/symbols to cards, not just colors
- [ ] VoiceOver / TalkBack support
- [ ] Font size options

### Monetization
- [ ] Base app: $2.99 (both platforms)
- [ ] Free web version as funnel ("like it? get the app")
- [ ] Optional IAP: cosmetic card packs, themes
- [ ] No ads — pay once, play forever. Classier.

### Boss AI ("The Oracle")
- [ ] Cheating AI that sees your hand and knows the deck order
- [ ] Perfect information = near-perfect play. Basically unbeatable.
- [ ] Implementation: pass actual `hands.player1` and `deck` to AI worker instead of empty/hidden
- [ ] MC goes from random sampling to exact calculation — trivial code change
- [ ] AI knows: what you hold, what's coming next, optimal discard/block strategy
- [ ] Unlock after beating all 5 personalities: "You've conquered the explorers. Now face The Oracle."
- [ ] Could have multiple tiers: "The Seer" (sees your hand only), "The Oracle" (sees hand + deck)
- [ ] Fun challenge mode, not the default — clearly labeled as cheating AI
- [ ] Achievement/badge for anyone who beats The Oracle

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
- Some animations don't fire consistently
- Edge case: rapid tapping can cause visual glitches
- Documented, not blocking — needs dedicated QA pass

### AI
- Monte Carlo with random opponent hands is fundamentally flawed for opponent-awareness
- Post-MC penalty is a band-aid, not a fix
- Evolution optimized self-play genes well, but opponent-awareness genes had no signal
- AI still makes obviously bad discards in some games
- Endgame solver was added but may have edge cases

### Firebase
- Empty arrays stored as null/undefined by Firebase — handled with || [] everywhere
- Race conditions possible in multiplayer if both players act simultaneously
- No security rules — opponent could technically see your hand via dev tools

### iOS
- No haptic feedback (navigator.vibrate not supported in Safari)
- Capacitor wrap would fix this via native Haptics plugin
- AudioContext requires user interaction to start on iOS — handled with first tap
