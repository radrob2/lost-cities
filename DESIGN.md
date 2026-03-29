# Venture — Design Document

Master reference for all design decisions, feature plans, and ship requirements.
Organized by category and priority. Updated 2026-03-29.

---

## Table of Contents
0. [Brand Identity & Theme](#0-brand-identity--theme)
1. [Ship-Blocking (v1.0)](#1-ship-blocking-v10)
2. [Menu & Navigation Rework](#2-menu--navigation-rework)
3. [Visual Polish & Consistency](#3-visual-polish--consistency)
4. [Achievement System](#4-achievement-system)
5. [Gameplay Features](#5-gameplay-features)
6. [AI Improvements](#6-ai-improvements)
7. [Sound & Feel](#7-sound--feel)
8. [App Store Publishing](#8-app-store-publishing)
9. [Post-Launch / Growth](#9-post-launch--growth)
10. [Idea Index](#10-idea-index)

---

## 0. Brand Identity & Theme

### 0.1 The Direction: "Venture" as Explorer Slang (Option C — Hybrid)

"Venture" means "to dare to go somewhere dangerous." This naturally bridges expedition visuals with risk/investment mechanics. We keep the visual richness of biome-based expeditions (jungles, volcanoes, oceans — these make great card art) while the name and mechanics frame them as financial risks you're funding.

**Core identity:**
- Each color is a **venture** — a risky expedition you're funding
- Playing cards = investing deeper into a venture
- Wagers = doubling down before you know the payoff
- The -20 cost per venture = "it costs money to fund an expedition"
- Tagline "Risk the Unknown" already nails this perfectly

**What this means for card art:**
- Keep biome themes (Pandora/orange=volcanic, Guacamole/green=jungle, Blue-green/teal=ocean, Cute Gold/yellow=desert, Scampi/purple=mountains or ruins)
- Frame them as locations you're funding ventures into, not just landscapes
- The progressive 2-10 visual story can show the venture developing (early exploration → base camp → discovery → treasure)

**What this means for language:**
- "Ventures" not "expeditions" in all player-facing text
- "Fund a venture" not "start an expedition"
- "Wager" stays — it's already perfect for this framing
- "Venture cost" for the -20 (already used in score screen)
- Keep explorer/compass imagery — ventures are still journeys into the unknown

### 0.2 In-Game Emblem: Compass-V

A **compass rose with a "V" integrated into the north needle.** Simple, distinctive, ties the brand together.

**Usage:**
- **Splash screen** — large, centered, gold on dark
- **Card backs** — replaces the current ✦ symbol
- **Loading/waiting states** — spinning compass animation (already have spin keyframe)
- **Achievement badges** — as a watermark or frame element
- **Favicon / browser tab**

**Design constraints:**
- Must read clearly at 16x16 (favicon) through 512x512 (store)
- Gold (#ffcb3e) on dark (#333333 or #120c07) is the primary rendering
- The compass points should be subtle — the "V" is the hero
- North needle = the V, with small E/S/W ticks
- Can be rendered as SVG for infinite scaling

### 0.3 Splash Screen

- Background: #120c07 (app bg color)
- "Venture" in Cinzel Decorative, centered, gold (#ffcb3e)
- Compass-V emblem above or below the text, smaller
- Subtle golden glow behind the text (not the emblem — text is the hero)
- Optional: compass spins slowly during load, stops when ready
- Static version for Capacitor launch screen, animated version for in-app loading

### 0.4 App Icon (confirmed)

- Capital "V" in Cinzel Decorative on #333333 square
- #ffcb3e gold border, rounded corners
- This is the **app store / home screen** icon — simple, bold, recognizable at 60x60
- The compass-V emblem is for **in-app use** — different purpose, different design

### 0.5 Two Symbols, Two Roles

| Symbol | Where | Purpose |
|--------|-------|---------|
| **"V" lettermark** | App icon, store listing, home screen | Brand recognition at tiny sizes, app identity |
| **Compass-V emblem** | Card backs, splash, achievements, loading | In-game identity, thematic depth, world-building |

---

## 1. Ship-Blocking (v1.0)

These must be done before submitting to any app store.

### 1.1 Capacitor Wrap
- **Type:** Technical / Infrastructure
- **Depends on:** Nothing
- **Effort:** Medium (1-2 sessions)
- `npm init` + Capacitor install + iOS/Android platforms
- iOS haptics via Capacitor Haptics plugin (Safari `navigator.vibrate` doesn't work)
- Build + test on real devices
- One codebase → web + iOS + Android

### 1.2 App Icon
- **Type:** Asset
- **Depends on:** Nothing (design exists)
- **Spec:** Capital "V" in Cinzel Decorative (not bold) on #333333 square, optional #ffcb3e gold border, rounded corners
- Need 1024x1024 master + all required sizes for iOS/Android
- App icon IS the brand — must look sharp at 60x60 and 180x180

### 1.3 Splash / Load Screen
- **Type:** Asset
- **Depends on:** Compass-V emblem design (Section 0.2)
- **Spec:** See Section 0.3 — "Venture" in Cinzel Decorative, Compass-V emblem, gold on dark
- Required for native app launch experience
- Capacitor generates from a single source image (static version)
- In-app animated version with spinning compass during load

### 1.4 Original Card Art
- **Type:** Asset / Visual
- **Depends on:** Nothing (can be done in parallel)
- **Effort:** Large
- **Branding colors:**
  - Pandora #E67F3A (orange, replaces red)
  - Guacamole #98C253 (green)
  - Classic Blue-green #2FA6A6 (teal, replaces blue)
  - Cute Gold #E8CE7B (yellow/cream, replaces white)
  - Scampi #6A5FA8 (purple, replaces yellow)
- **Card specs:** 8:13 aspect ratio, 0.5" reference width
  - Center number: Cinzel semi-bold 24pt white, subtle shadow
  - Corner number: Cinzel 8pt bold italic black, white shadow
  - Shapes per color: purple=oval, green=corner circles, orange=plain, yellow=diamond, teal=puzzle/cloud
  - Each color has unique handshake skin tone pair for wager cards
  - Cards have lighter bg with full-color shape overlay
  - Cards are ~1cm on phone — patterns must be dead simple
  - Progressive visual story through 2-10
- Current SVG landscapes are placeholders — the branded art is the #1 thing that makes this feel like a real product

### 1.5 Store Listing Assets
- See [Section 8: App Store Publishing](#8-app-store-publishing)

---

## 2. Menu & Navigation Rework

### 2.1 Problem
Current lobby is a vertical stack of 7 buttons + input fields. It's bulky, especially on first entry. A new player sees: name input, variant picker, Play vs AI, Create Room, Join Room, Find Opponent, How to Play, Stats, Sound toggle. That's overwhelming.

### 2.2 Design Principles
- **First entry = minimal.** Player wants to play. One tap to start.
- **Progressive disclosure.** Show options as needed, not all at once.
- **φ scaling on all screens.** Use `var(--text-*)`, `var(--line-*)`, `var(--gap-*)` for lobby, modals, menus, gameover, stats — consistent hierarchy everywhere.
- **Visual hierarchy.** Primary action is huge and obvious. Secondary actions are smaller and grouped.

### 2.3 Proposed Structure

**First Launch:**
```
[Venture logo + compass]
[Your name: ___________]
[   ▶ PLAY   ]          ← big, gold, impossible to miss
[multiplayer]  [how to play]  ← small text links, not buttons
```

**Returning Player (name saved):**
```
[Venture logo]
[Welcome back, {name}]
[   ▶ PLAY   ]          ← goes straight to AI personality picker
[multiplayer]  [stats]  [⚙]  ← compact bottom row
```

**Multiplayer sub-menu (slides in or modal):**
```
[Create Room]
[Join Room]
[Find Opponent]
[← Back]
```

**Settings (gear icon → modal):**
```
Sound, Colorblind, High Contrast, How to Play, variant picker
```

### 2.4 Key Changes
- **Type:** Rework (integrated, touches lobby HTML + CSS)
- **Depends on:** φ system on lobby screens (2.5)
- **Effort:** Medium
- Move variant picker and timer to AI modal / settings (not lobby surface)
- Move How to Play to settings or first-launch-only
- Stats accessible from gear menu or bottom row, not a primary button
- Name input persists — don't show if already saved

### 2.5 φ Scaling on Non-Game Screens
- **Type:** Visual polish (pluggable)
- **Depends on:** Nothing (φ CSS vars already exist)
- **Effort:** Small-Medium
- Lobby, modals, gameover, stats, tutorial, achievements — all should use φ text/gap/line-height vars
- This gives proper typographic hierarchy across the entire app
- The lobby text should use `--text-lg` / `--text-md` / `--text-sm` for heading/body/caption
- Buttons, inputs, modals use `--gap-lg` / `--gap-sm` / `--gap-col` for consistent spacing
- Currently these screens have hardcoded px — the CSS vars exist from `computeLayout()` fallback values

---

## 3. Visual Polish & Consistency

### 3.1 Turn Indicator (HIGHEST PRIORITY UX FIX)
- **Type:** UX / Mechanic-adjacent
- **Depends on:** Nothing
- **Effort:** Small
- **Problem:** Most consistent playtester feedback — hard to notice when it's your turn
- **Solution:**
  - Big, bold, gold "YOUR TURN" text replacing/augmenting subtle phase bar
  - Brief flash/pulse animation on turn change
  - Screen edge glow already exists but isn't enough alone
- **Idle notification (30s):**
  - Full-screen overlay with huge "YOUR TURN" text
  - Brighter/larger gold glow
  - Tap anywhere to dismiss
  - Catches players who tabbed away or set phone down

### 3.2 Golden Glow from Cone Circle
- **Type:** Aesthetic (pluggable)
- **Depends on:** Nothing
- **Effort:** Small
- When it's your turn, golden glow originates from center of cone's rim circle
- Glow radius matches cone radius
- The circumference itself must NOT be visible — only the emanating glow
- Replaces current box-shadow edge glow with something more organic

### 3.3 Alignment Conventions (established 2026-03-29)

All board elements follow these conventions:

| Element | Vertical | Horizontal | Method |
|---------|----------|------------|--------|
| Card stacks (opp & player) | Centered in row, ignoring score label | Centered in column | JS absolute positioning (needed for overlap) |
| Empty slots | Centered in row (actual element size) | Centered in column | Flex centering (no overlap) |
| Score labels | Float at card edge — below opp stacks, above player stacks (toward middle) | Centered in column | JS absolute, positioned relative to cards |
| Discard cards | Centered in row | Centered in column | Same convention as stacks (flex ok since single card) |
| Info rows | Flex vertical center | Name left, hint center, score right | CSS flex |
| Deck | Centered in middle section | Centered | Flex/absolute per layout mode |

**Growth direction:** Currently both sides grow downward (card 0 at top, newest at bottom). Keep as-is for now.

**Future: bottom-right corner numbers** — Add card value in bottom-right corner (in addition to top-left) so cards remain readable when stacked in either direction. This enables opponent stacks to grow upward (away from middle) without flipping cards, making the board more natural. The opponent's cards would show their bottom-right number peeking above each card below.

**Convention rules:**
- One centering authority per element — either JS or CSS, never both
- Overlapping cards → JS absolute positioning with computed offsets
- Single cards → flex centering (simpler, same visual result)
- Score labels never affect centering calculations
- All centering computed against the actual row/section height

### 3.4 Discard vs Stack Visual Distinction
- **Type:** Aesthetic + UX
- **Depends on:** Nothing
- **Effort:** Small
- More visual distinction between player stacks and discard piles
- Different styling/spacing to make roles clearer at a glance

### 3.5 Layout Structural Ideas (for discussion)
- **Total live score in stack row** — center vertically with stack row instead of info row
- **Discard as 6th column** — even in portrait, append as column instead of below
- **Player info row alternatives** — move below hand or to side, freeing vertical space
- These are structural changes that affect the whole layout system — discuss before implementing

### 3.6 Margins & Breathing Room
- **Type:** Aesthetic
- **Depends on:** φ system
- More padding so text/elements aren't so close to screen edges
- The φ system now handles this but may need tuning after playtesting

---

## 4. Achievement System

### 4.1 Architecture
- **Type:** Feature module (mostly pluggable)
- **Depends on:** Game engine hooks for detection
- **Effort:** Large (many achievements to define and detect)

**Display design:**
- Achievements organized into **categories** with progress counts (e.g., "Stack Mastery: 3/12")
- **Hidden achievements** show as "???" with cryptic hint until unlocked
- Categories collapse/expand — impractical to show all in one flat list
- **Toast notification** when achievement unlocked during gameplay (non-blocking)
- **Achievement browser** as a dedicated screen with tab/filter navigation
- Rarity indicators (common / uncommon / rare / legendary)
- Total completion percentage

**Technical:**
- Detection hooks in game engine (post-play, post-draw, game-over)
- Achievement definitions in data file, not hardcoded in logic
- localStorage for unlocked state (with timestamps)
- Hidden flag per achievement

### 4.2 Achievement Categories

**Stack Mastery** (visible)
- 8, 9, 10, 11, 12 cards in a single stack
- Per-color best score achievements
- High score on single stack
- Multiple 8-card bonuses in one round
- Complete color (all 12 cards)
- Play all five 10s in one game
- Wager in every color (single/double/triple)
- Play every wager card in the game (legendary)

**Break-Even Feats** (mix visible/hidden)
- Score exactly 0 on a stack with 8+ cards
- Score 0 overall while going in on every venture
- Have a venture worth -80 and still win

**Winning Under Constraints** (mostly hidden)
- Win with only 2, 1, or 0 ventures
- Win with negative points
- Win without playing any cards above 5
- Win without wagering anything
- Win without discarding a single card

**Margin of Victory** (visible)
- Win by 20+, 50+, 100+
- Win with 100+ while opponent below 0
- Comeback by 20-60 to win on last turn

**Last Turn Heroics** (hidden)
- Play a 10 on THE last turn of the game
- Go from losing to winning on the last turn
- Play a card worth +60 on the last turn (10 on 3-wager stack)

**Deck Manipulation** (hidden)
- Draw from discard on last N turns to stretch the game
- Get positive points in a venture with only 3 cards

**Meta / Progression** (visible)
- ELO milestones: 1500, 2000, 2500, 3000
- Win streaks: 5, 10, 25, 50, 100
- Beat every AI personality
- Beat every AI in each variant
- Beat every AI in ALL variants
- Play a multiplayer game / Host a game

**Painful Losses / Badges of Shame** (hidden, unlock after first occurrence)
- Score 100+ points and still lose
- Lose by 100+
- Score positive in every venture and still lose

**Easter Eggs** (always hidden)
- "The Producer": enter name "Robert Hadfield"
- Others TBD

### 4.3 Design Notes
- Many achievements have positive/negative mirrors (win by 100 vs lose by 100)
- Per-color variants multiply count significantly
- "With a win" vs "at all" creates two tiers for many achievements
- Estimate: 80-120 total achievements across all categories
- Hidden achievements should be ~40% of total — discovery is part of the fun

---

## 5. Gameplay Features

### 5.1 Hand Management
- **Type:** Feature (pluggable module)
- **Depends on:** Nothing
- **Effort:** Medium
- **Drag-and-drop card sorting** — player reorders cards in hand manually
- Drawn card placement: goes to logical position in sort order or right end
- Requires touch drag handling on cone-projected cards

### 5.2 Game Setup Variations
- **Type:** Feature (integrated with game engine)
- **Depends on:** Nothing
- **Effort:** Medium
- **Venture count** — configurable 4-6 colors (currently fixed at 5)
- **Card count per venture** — variation option
- **Competitive vs friendly mode:**
  - Competitive: locked settings, live score forced on
  - Friendly: allows in-game toggles
- Settings locked at game creation, can't change mid-game
- Goes in the settings/game-creation flow, not lobby surface

### 5.3 Play-All-Cards Variant
- **Type:** Mechanic variant
- **Depends on:** Game engine changes
- **Effort:** Small
- Game ends when every card has been played or discarded (not just when deck is empty)
- Cards in both players' hands must be dealt with
- Simple rule change, interesting strategic implications

### 5.4 Venture Rivalry Bonus
- **Type:** Scoring variant
- **Depends on:** Scoring engine
- **Effort:** Small
- If both players go in on the same color, higher scorer gets +10 bonus
- Incentivizes head-to-head competition on colors
- Could be a toggle in game settings

### 5.5 User Identity & Data Persistence
- **Type:** Feature (infrastructure, integrated)
- **Depends on:** Firebase Auth (or similar)
- **Effort:** Medium-Large
- **Problem:** Currently data (stats, ELO, achievements) lives in localStorage only. It's device-specific, tied to browser, lost on clear/reinstall. The name input is a display name with no account behind it.

**Identity layers:**
- **Username** — unique account identifier, persistent across devices. Created once, used for login.
- **Display name** — what other players see. Defaults to username but can be changed.
- **Session name** — optional override for a specific game (e.g., silly name in friendly mode). Not saved.

**Mode enforcement:**
- **Competitive mode** — requires account, uses official display name/username. Stats and ELO count.
- **Friendly mode / AI mode** — can use any display name. Stats still track if logged in.

**Data persistence:**
- With account: stats, ELO, achievements, preferences sync across devices via Firebase
- Without account: localStorage only (current behavior), prompt to create account periodically
- Migration: when creating an account, offer to import existing localStorage data

**Current state:** The name input is just a display name stored in localStorage. No account system. All data is device-local.

---

## 6. AI Improvements

### 6.1 Goals (priority order)
1. **Strongest possible legal AI** — winning is #1
2. **Boss AIs with extra info** — Seer (sees hand), Oracle (sees hand + deck)
3. **Distinct personalities** — specific strategies but still strong

### 6.2 Current State
- Heuristic "Strategist" beats all evolved genomes 67-91% classic
- Boss AIs (Seer, Oracle) working with cheating mechanics
- MC evaluation + evolved genomes exist but are weaker

### 6.3 Future Work
- **Type:** Technical (pluggable, runs in Web Worker)
- **Depends on:** Nothing (isolated in ai-worker.js)
- MCTS (tree search) instead of flat Monte Carlo
- Bayesian opponent hand inference from observed plays/draws/discards
- Extend endgame solver to deck <= 10-12
- Hybrid: heuristic for discard safety + MC for play optimization

### 6.4 Success Metrics
- **Win rate** — primary objective
- **Dominance** — margin of victory, suppressing opponent score
  - -10 to 20 (dominant) > 100 to 130 (same margin, opponent thrived)
  - Incentivizes blocking and opponent-aware strategies

---

## 7. Sound & Feel

### 7.1 Real Sound Effects
- **Type:** Asset replacement (pluggable)
- **Depends on:** Nothing
- **Effort:** Small-Medium
- Replace Web Audio synthesized tones with recorded foley sounds
- Card slide, card place, shuffle, draw — real tactile sounds
- Night-and-day improvement in feel vs synthesized beeps

### 7.2 Background Ambient
- **Type:** Aesthetic (pluggable)
- **Depends on:** Nothing
- Optional ambient audio: campfire, wind, nature sounds
- Toggleable, off by default
- Adds atmosphere for longer sessions

---

## 8. App Store Publishing

### 8.1 App Icon
- **Design:** Capital "V" in Cinzel Decorative on #333333, #ffcb3e gold border, rounded corners
- **Sizes needed:**
  - iOS: 1024x1024 (App Store), 180x180, 120x120, 87x87, 80x80, 60x60, 58x58, 40x40, 29x29
  - Android: 512x512 (Play Store), adaptive icon (foreground + background layers)
- Must look sharp at every size — test at 60x60 before finalizing

### 8.2 Splash / Load Screen
- **Design:** [TODO — user has design, needs to re-share]
- Capacitor generates launch screens from a single 2732x2732 source
- Should feel like a natural transition into the lobby

### 8.3 Screenshots for Store Listing
Need 4-8 screenshots showing the best of the app. Recommended shots:

1. **The hand** — cone perspective card fan, your turn glow active, looks premium
2. **Mid-game board** — full board with stacks, discards, opponent peek, score labels
3. **Score screen** — expanded color breakdown showing the polish of the scoring UI
4. **AI personality picker** — shows variety of opponents (Explorer, Scholar, Seer, Oracle...)
5. **Achievement unlock** — toast notification + achievement browser (once built)
6. **Multiplayer room code** — shows the social/multiplayer angle
7. **Tutorial slide** — one of the cleaner tutorial screens ("Your Turn" or "Scoring")
8. **Stats screen** — shows depth with ELO, win rates, per-personality records

**Format:** iPhone 6.7" (1290x2796) and 6.5" (1242x2688) for iOS. Android: phone + 7" tablet.

### 8.4 Store Listing Copy

**App Name:** Venture

**Subtitle (iOS, 30 chars):** Risk the Unknown

**Short Description (Play Store, 80 chars):**
Strategic card game for 2 players. Build ventures, outscore your rival.

**Full Description (draft):**
```
Venture is a strategic card game where two explorers compete
to build the most profitable expeditions.

PLAY YOUR CARDS RIGHT
- 5 ventures, 60 cards, endless strategy
- Play cards in ascending order to build value
- Wager cards multiply your score — but the risk is real
- 8+ cards in one venture earns a bonus

CHALLENGE THE AI
- 6 unique AI personalities from cautious Scholar to reckless Gambler
- Face the Strategist — a tournament-grade opponent
- Dare to challenge the Boss AIs who can see your cards

PLAY WITH FRIENDS
- Real-time multiplayer with room codes
- Online matchmaking to find opponents
- Turn timer options for competitive play

TRACK YOUR JOURNEY
- ELO rating system tracks your skill
- Detailed stats per AI personality and game variant
- 100+ achievements from common to legendary
- Hidden achievements waiting to be discovered

No ads. No loot boxes. Pay once, play forever.
```

### 8.5 Pricing Strategy
- **Base app:** $2.99 (iOS + Android)
- **Web version:** Free at venture-game.web.app (marketing funnel)
- **Optional IAP:** Cosmetic card packs, themes (post-launch)
- **No ads** — pay once, play forever

### 8.6 Launch Order
1. **Google Play first** ($25 one-time) — test the market
2. **If 50+ Android sales** → add iOS ($99/year)
3. **Web version stays free** as marketing funnel

### 8.7 Keywords / ASO
- card game, strategy, 2 player, board game, expedition, multiplayer, offline, AI opponent
- Competitor keywords: Lost Cities, Keltis, Schotten Totten, Jaipur, 7 Wonders Duel

---

## 9. Post-Launch / Growth

### 9.1 Online Matchmaking Polish
- Simple queue-based matching via Firebase
- Abuse/moderation considerations
- Rank-based matching once ELO population exists

### 9.2 Multiple Themes
- Dark (current), Light, Classic Parchment, Seasonal
- Purchasable via IAP

### 9.3 Accessibility
- VoiceOver / TalkBack support
- Font size options (already partially handled by φ system)

### 9.4 Spectator Mode
- Watch ongoing games
- Useful for tournaments or learning

### 9.5 Chat / Emotes
- Quick emotes during multiplayer (predefined, no free text for safety)

### 9.6 Competitive Features
- Persistent user accounts (Firebase Auth)
- Leaderboard
- Seasonal rankings

---

## 10. Idea Index

Every idea categorized for quick reference.

### By Type
| Category | Ideas |
|----------|-------|
| **Ship-blocking** | Capacitor wrap, app icon, splash screen, card art, store listing |
| **Rework** | Menu/lobby redesign, φ on all screens |
| **Pluggable module** | Achievements, hand drag-sort, sound replacement, ambient audio, themes |
| **Mechanic variant** | Play-all-cards, rivalry bonus, venture count, card count |
| **Aesthetic only** | Cone glow, discard styling, margins, high-contrast polish |
| **UX fix** | Turn indicator (!!), idle notification |
| **AI/Technical** | MCTS, Bayesian inference, endgame solver extension |
| **Post-launch** | Matchmaking, spectator, chat, leaderboard, IAP themes |

### By Effort
| Effort | Ideas |
|--------|-------|
| **Small** (< 1 session) | Turn indicator, cone glow, play-all-cards variant, rivalry bonus, discard styling |
| **Medium** (1-2 sessions) | Capacitor wrap, menu rework, φ on all screens, hand sorting, game setup variations, sound replacement |
| **Large** (3+ sessions) | Card art, achievement system (full), AI MCTS, online matchmaking |

### By Independence
| Type | Ideas |
|------|-------|
| **Fully independent** | Card art, sound replacement, ambient audio, achievements, AI work, Capacitor wrap, app icon, splash screen |
| **Sequential** | Menu rework → φ on all screens. Capacitor → device testing → store submission |
| **Integrated** | Game setup variations (touches engine + UI + multiplayer sync). Turn indicator (touches rendering + timer + notification) |

### By Priority
| Priority | Ideas |
|----------|-------|
| **P0 — Ship blocking** | Capacitor, icon, splash, card art, store listing, menu rework |
| **P1 — High impact** | Turn indicator, achievements (basic set), φ on all screens, sound effects |
| **P2 — Nice to have** | Hand sorting, game variants, cone glow, AI improvements |
| **P3 — Post-launch** | Matchmaking polish, themes, spectator, chat, leaderboard |

---

## Missing / Gaps Identified

Things not covered by any existing design note that should be addressed before ship:

1. **Onboarding for returning players** — currently tutorial only shows on first launch. Consider contextual tips (e.g., first time seeing wager card, first time timer runs out)
2. **Error states** — what happens when Firebase disconnects mid-game? Currently handled but not gracefully communicated
3. **App review compliance** — Apple requires privacy policy URL, age rating, content description
4. **Analytics** — no tracking of user behavior. Even basic Firebase Analytics would help understand retention
5. **Deep linking** — multiplayer room codes should work as shareable links (venture-game.web.app/join/ABCD)
6. **Landscape tablet layout** — iPad landscape is handled by φ system but hasn't been playtested
7. **Card art transition plan** — how to swap from current SVG landscapes to branded art without breaking layout
8. **Version numbering** — need semver for store submissions (1.0.0)
9. **Changelog / What's New** — required for store updates
10. **Offline indicator** — show when network is unavailable (matters for multiplayer)
11. **Rate/review prompt** — tasteful prompt after N games (not on first launch)
12. **Share results** — "I scored 147 in Venture!" with screenshot/card for social sharing
13. **Undo confirmation** — currently one-tap undo with no confirmation, which is fine, but consider for tournament mode
14. **Game replay** — replay.js exists but UI for browsing/watching replays isn't built
15. **Notification sound** — browser notifications are silent, should have audio cue option
