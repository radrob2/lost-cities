# Venture — Launch & Monetization Strategy

*Last updated: 2026-03-27*

---

## Product Summary

Venture is a 2-player expedition card game with deep AI opponents and real-time online multiplayer. It is a complete, original implementation of classic Lost Cities mechanics under a new brand.

**What ships at launch:**
- 5 evolved AI personalities (Explorer, Scholar, Collector, Spy, Gambler) + 1 heuristic AI (Strategist) + 2 boss AIs (The Seer, The Oracle)
- Real-time online multiplayer via room codes
- Two game variants: Classic (5 discard piles) and Single Pile
- Colorblind mode, undo support, stats tracking, onboarding tutorial
- FLIP card animations, Web Audio sound effects, haptic feedback
- Cross-platform: web (free), iOS (paid), Android (paid)

**What is NOT ready yet (must complete before app submission):**
- Original card art (currently solid colors — this is the single biggest gap)
- App icon and splash screen
- Capacitor wrap + real device testing
- Rename from "Lost Cities" to "Venture" throughout codebase and Firebase

---

## Pricing Strategy

### Recommended: $2.99 one-time purchase (no ads, no subscription)

| Price | Pros | Cons |
|-------|------|------|
| $1.99 | Impulse buy, lowest friction, more downloads | Revenue per sale is only ~$1.40 after Apple's 30%. Feels "throwaway." |
| **$2.99** | **Sweet spot for indie card games. Signals quality. $2.09 net per sale. Matches competitors (Onirim $0.99-$2.99, Star Realms $0.99 base).** | **Slightly more friction than $1.99.** |
| $4.99 | Better margin ($3.49 net). Works if art/polish is outstanding. | Too expensive for an unknown indie with no reviews. Conversion drops sharply above $2.99 for new titles. |

**$2.99 is the answer.** It is the standard price for quality indie card/board game apps. It signals "this is a real game, not shovelware" without scaring off casual buyers.

### Free tier on mobile: No

Do not offer a free mobile version with ads. Here is why:

1. **Ad integration is engineering work** — AdMob SDK, mediation, GDPR consent flows, testing. That is days of work that does not improve the game.
2. **Ads destroy the feel** — This is a tactile, immersive card game. A banner ad between rounds kills the premium vibe instantly.
3. **Free-to-paid conversion is terrible** — Industry average is 2-5%. You would need 50-100x the downloads to match paid revenue.
4. **The web version IS the free tier** — Anyone can play for free at venture-game.web.app. That is the try-before-you-buy funnel.

### In-App Purchases: Later, cosmetic only

Do not ship IAP at launch. It adds App Store review complexity and code overhead. After launch, if there is demand:

- **Card back designs** — $0.99 each or $2.99 pack. Low effort to create (one image per back).
- **Visual themes** — Dark (default), Parchment, Ocean, Forest. $0.99-$1.99 each.
- **Do NOT sell AI personalities as IAP.** All gameplay content should be included. Locking AI behind a paywall feels bad and generates negative reviews.

### Subscription: No

Subscriptions are wrong for this game. There is no server cost per user (Firebase free tier), no content treadmill, and no social features that justify recurring payment. Subscription fatigue is real — players will resent $2.99/month for a card game. One-time purchase builds goodwill and gets better reviews.

---

## Platform Strategy

### Launch order: Google Play first, then iOS

| Factor | Google Play | Apple App Store |
|--------|-------------|-----------------|
| Developer fee | $25 one-time | $99/year |
| Review time | Hours to 2 days | 1-3 days (sometimes longer) |
| Commission | 15% (first $1M/year) | 30% (15% if under $1M AND enrolled in Small Business Program) |
| Break-even | ~2 sales | ~48 sales/year |
| Risk | $25 sunk cost, trivial | $99/year ongoing. Must sell ~48 copies/year just to not lose money. |

**Step 1: Google Play ($25).** Ship it, get real user feedback, fix bugs, read reviews. The $25 is negligible risk.

**Step 2: Evaluate after 30 days.** If you hit 50+ Android sales OR have strong web traffic suggesting iOS demand, pay the $99 and submit to Apple. If sales are near zero, save the $99 and focus on improving the game.

**Step 3: Apply for Apple's Small Business Program** immediately when you enroll. It drops commission from 30% to 15% for developers earning under $1M/year (which you will be).

### Web version strategy

The web version at venture-game.web.app is the marketing funnel. It must be good enough that people want the app, but the app must be better.

**Web version includes:**
- All AI personalities and both variants
- Full multiplayer
- Stats tracking (localStorage)

**App adds:**
- Native haptics (iOS Taptic Engine via Capacitor — huge improvement over Android-only vibrate)
- Home screen icon, no browser chrome, feels like a real app
- Push notifications for multiplayer turns (future)
- Offline reliability (no "can't load page" issues)
- Original card art (if art is app-only, this is a strong draw)

**Conversion tactics:**
- After every 5th AI game on web, show a non-blocking banner: "Enjoying Venture? Get the app for native haptics and offline play." Link to App Store / Play Store.
- On the web score screen, small "Get the App" link in footer.
- Do NOT nag. One subtle prompt per session maximum. Aggressive popups will make people leave.

---

## Launch Marketing (Zero Budget)

### Reddit (highest ROI for zero budget)

Post to these subreddits. Each has different norms — adapt tone accordingly.

| Subreddit | Audience | Post angle |
|-----------|----------|------------|
| r/boardgames (5M+) | Board game enthusiasts | "I built a digital version of a Lost Cities-style card game with 8 AI opponents — free to play in your browser" |
| r/digitaltabletop (~30K) | Digital board game players | Gameplay screenshots, feature comparison to existing apps |
| r/indiegaming (~600K) | Indie game fans | "Solo dev story: I evolved AI opponents using genetic algorithms" — the AI story is genuinely interesting |
| r/gamedev (~1M) | Game developers | Technical post about the AI evolution process, Monte Carlo evaluation, endgame solver |
| r/cardgames (~50K) | Card game players | Straightforward "here's a free card game you can play right now" |
| r/WebGames (~200K) | Browser game players | Direct link to web version, short description |

**Reddit rules:**
- Do NOT post to all subreddits on the same day. Space them out over 2 weeks.
- Be honest that it is your game. Redditors hate covert self-promotion.
- Lead with the free web version. Nobody clicks App Store links from Reddit.
- The AI evolution angle is genuinely novel — lean into it on r/gamedev and r/indiegaming.
- Engage with every comment. This is your customer support and marketing simultaneously.

### BoardGameGeek

- Create a game page for Venture on BGG.
- List it as a digital implementation inspired by Lost Cities mechanics.
- Post in the "Digital Games" forum.
- BGG users are the most likely to pay $2.99 for a quality card game app. This audience converts.

### Product Hunt

- Launch on a Tuesday or Wednesday (highest traffic days).
- Title: "Venture — A card game with AI opponents evolved by genetic algorithm"
- Lead with what makes it different: the AI evolution story, 8 personalities, boss AIs that cheat.
- Include a direct link to the web version so people can play immediately.
- Ask 5-10 friends/colleagues to upvote in the first hour (this is normal and expected on PH).

### YouTube / TikTok

Short-form video content, created with screen recordings:

1. **"I evolved AI for a card game using genetic algorithms"** (60-90 seconds) — Show the evolution process, genome visualization, personality differences. This is the most shareable angle.
2. **"Can you beat an AI that sees your hand?"** (30-60 seconds) — Gameplay clip of The Seer or The Oracle making seemingly impossible plays.
3. **"I built a card game app as a solo developer"** (2-3 minutes) — Dev story, before/after, lessons learned. Works on YouTube and TikTok.

You do not need a camera. Screen recordings with voiceover or text overlay are fine. Use CapCut (free) for editing.

### Press Kit

Create a /press page on the web app or a simple press-kit.md in the repo:

- 5-6 high-resolution screenshots (phone frames)
- App icon in multiple sizes
- One-paragraph description (50 words)
- One-page description (200 words)
- Key facts: solo developer, AI evolved via genetic algorithm, 8 AI personalities, free web version
- Contact email
- Links: web version, Play Store, App Store, GitHub (if public)

---

## App Store Listing

### App Description (196 words)

> Venture is a strategic card game for two players. Play against 8 unique AI opponents or challenge a friend online.
>
> Build expeditions across five colors by playing cards in ascending order. Every expedition is a gamble — start one and you are committed to a 20-point cost. Add wager cards to double or triple your stakes. Reach 8 cards for a bonus. When the deck runs out, the highest score wins.
>
> **8 AI Personalities.** The Explorer rushes into every expedition. The Scholar focuses deep. The Gambler bets big. The Strategist calculates everything. Each plays differently — learn their styles and exploit their weaknesses.
>
> **2 Boss AIs.** The Seer knows your hand. The Oracle knows everything. They are meant to be unfair. Beating them is the real challenge.
>
> **Online Multiplayer.** Share a room code with a friend. Real-time play with reconnection support and rematch.
>
> **Two Variants.** Classic mode with five discard piles, or Single Pile for faster, more aggressive games.
>
> No ads. No subscriptions. No loot boxes. Pay once, play forever.
>
> Simple to learn. Deep enough to master.

### Screenshots (in order — first 3 are critical)

1. **Mid-game board** — Hand of cards, active expeditions with colorful cards, opponent's expeditions visible. Shows the core gameplay loop. Add text overlay: "Strategic card game for two."
2. **AI personality picker** — Grid of all 8 AI opponents with names and brief descriptions. Text overlay: "8 unique AI opponents."
3. **Score breakdown screen** — The polished receipt-style scoring. Text overlay: "Every point counts."
4. **Online multiplayer lobby** — Room code entry, "Share with a friend" visible. Text overlay: "Play online with friends."
5. **Boss AI warning screen** — The Seer or Oracle with the dramatic warning label. Text overlay: "Can you beat an AI that cheats?"

### Keywords

Primary (high relevance, moderate competition):
- card game
- board game
- strategy card game
- two player game
- expedition card game

Secondary (lower competition, niche):
- lost cities (people search for this — your game will appear as alternative)
- card game AI
- 2 player card game
- offline card game
- board game app

### Category

**Primary: Card Games** (most specific match)
**Secondary: Board Games** (broader discovery)

Do not use "Strategy" as primary — it is dominated by Clash-style games and your app will be invisible.

---

## Metrics to Track

### Key Performance Indicators

For a solo indie game, keep metrics simple. Use Firebase Analytics (free) on mobile and basic event logging on web.

| Metric | What it tells you | Target |
|--------|-------------------|--------|
| **Downloads/week** | Is anyone finding the game? | 10+/week organic after month 1 |
| **Day 1 retention** | Does the game make a good first impression? | >40% |
| **Day 7 retention** | Is there enough depth to keep playing? | >20% |
| **Day 30 retention** | Is this a "keep on my phone" game? | >10% |
| **Games per session** | Is it addictive? Card games should get 2-3 games per sit-down. | 2+ |
| **Session length** | How long do people play? | 8-15 minutes |
| **AI vs multiplayer split** | Where to invest development time | Expect 85-90% AI, 10-15% multiplayer |
| **AI personality popularity** | Which AIs do people enjoy? Which do they avoid? | Track picks per personality |
| **Variant split** | Classic vs Single Pile preference | Data-driven default selection |
| **Web-to-app conversion** | Is the funnel working? | Track "Get the App" clicks |
| **App Store rating** | The single most important growth metric | Maintain 4.5+ stars |

### What NOT to track

Do not build a complex analytics dashboard. You are one person. Check numbers once a week. The game itself is the product, not the metrics.

---

## Risk Assessment

### Legal: Kosmos trademark (LOW risk if handled correctly)

- **Game mechanics cannot be copyrighted.** This is settled law (Lotus v. Borland, many others). The ascending-card, expedition-betting mechanic is free to use.
- **"Lost Cities" is trademarked by Kosmos.** The name "Venture" is clean — no conflicts in the board/card game space. Verify with a USPTO search before launch.
- **Card art must be original.** AI-generated art is fine. Do not use any Kosmos imagery, color schemes that are obviously copied, or similar card layouts.
- **App description must not mention "Lost Cities" by name.** You can say "inspired by classic expedition card games" but not "a Lost Cities clone."
- **Risk mitigation:** If Kosmos sends a takedown, it would be for trademark, not mechanics. As long as name, art, and description are original, you are legally fine.

### Competition: Lost Cities digital clones (MODERATE)

- **Official Lost Cities app** exists on iOS/Android (by Denkspiele). It has mixed reviews (3.5-4.0 stars), dated UI, and unreliable multiplayer.
- **Several clones exist** but most are low quality, abandoned, or web-only.
- **Your advantages:** 8 AI personalities (most clones have 1), boss AIs, polished animations, two variants, active development, free web version.
- **Your disadvantages:** No brand recognition, no existing user base, no original card art (yet).
- **The market is small but underserved.** Lost Cities fans want a good digital version. The official app is not great. There is room for a quality alternative.

### Technical: Firebase costs (LOW risk)

- Firebase RTDB free tier: 100 simultaneous connections, 1GB stored, 10GB/month transfer.
- AI games are fully offline — zero Firebase cost.
- Only multiplayer uses Firebase. At 100 simultaneous multiplayer sessions, you are well within free tier.
- **If it goes viral:** Firebase Blaze (pay-as-go) is ~$5/GB data transfer. A million multiplayer games/month might cost $10-50. This is a good problem to have.
- **Worst case:** If costs spike unexpectedly, you can add a "multiplayer is temporarily unavailable" notice and throttle. AI mode keeps working.

### Financial: Break-even analysis

| Scenario | Google Play | Apple App Store | Combined |
|----------|-------------|-----------------|----------|
| **Cost** | $25 one-time | $99/year | $124 year 1 |
| **Net per sale** | $2.54 (15% commission) | $2.54 (15% Small Business) | — |
| **Break-even** | 10 sales (done) | 39 sales/year | 49 total sales |
| **Monthly to sustain** | — | ~4 sales/month for Apple | 4 sales/month |

49 sales in year one is achievable if the game is good and you do minimal marketing. That is roughly one sale per week on each platform. If you cannot hit that after 6 months, drop the Apple listing and keep Android + web.

---

## 90-Day Post-Launch Plan

### Pre-Launch (before submitting to stores)

- [ ] Complete original card art for all 60 cards (this is the #1 priority)
- [ ] App icon and splash screen
- [ ] Capacitor wrap, test on real iPhone and Android device
- [ ] Rename everything to "Venture" — codebase, Firebase project, hosting URL
- [ ] Set up venture-game.web.app hosting
- [ ] Prepare 5 App Store screenshots with text overlays
- [ ] Write App Store description (draft above)
- [ ] Record one 60-second gameplay video

### Week 1-2: Launch

- [ ] Submit to Google Play. Expect 1-3 day review.
- [ ] Post to r/boardgames and r/digitaltabletop (web version link, mention app is coming).
- [ ] Post to r/indiegaming with the "solo dev + AI evolution" angle.
- [ ] Create BoardGameGeek page.
- [ ] Share with friends and family — ask for honest Play Store reviews.
- [ ] Fix any crash bugs immediately. First reviews set the tone.

**Focus:** Get 10-20 genuine reviews on Google Play. Stars matter more than download count early on.

### Month 1: Validate and fix

- [ ] Read every review and every piece of feedback. Respond to all of them.
- [ ] Fix the top 3 complaints, whatever they are.
- [ ] If Android sales > 30, submit to Apple App Store.
- [ ] Post to Product Hunt (mid-month, after initial bugs are fixed).
- [ ] Post the AI evolution story to r/gamedev (technical writeup).
- [ ] Track Day 1 and Day 7 retention. If Day 1 < 30%, the onboarding needs work.

**Focus:** Product quality. Do not market a broken game. Fix first, promote second.

### Month 2: Grow

- [ ] Post gameplay clips to YouTube Shorts / TikTok (2-3 videos).
- [ ] If a subreddit post did well, follow up with a "month 1 update" post.
- [ ] Add "Rate this app" prompt after 5th completed game (one-time, dismissable).
- [ ] Consider a launch sale: $0.99 for one week to boost downloads and reviews.
- [ ] Begin IAP work if there is demand (card backs are easiest to implement).

**Focus:** Convert web players to app buyers. The web version should be driving steady traffic by now.

### Month 3: Sustain or pivot

- [ ] Evaluate: Are you hitting 4+ sales/week across platforms?
  - **Yes:** Keep going. Add cosmetic IAP, start planning next feature (matchmaking, ELO).
  - **No:** Cut Apple if it is not covering the $99. Focus on what IS working (web traffic? Reddit? BGG?). Consider making the game fully free on all platforms and adding a tip jar / "buy me a coffee" instead.
- [ ] Write a retrospective. What worked? What did not? Share it on r/gamedev (this content performs well).
- [ ] Plan the next 90 days based on data, not assumptions.

**Focus:** Honest assessment. A solo dev side project does not need to be profitable to be worthwhile — but you should know your numbers.

---

## Summary of Key Decisions

| Decision | Recommendation |
|----------|---------------|
| Price | $2.99 one-time |
| Ads | No |
| Subscription | No |
| IAP at launch | No (add cosmetics later) |
| First platform | Google Play |
| iOS timing | After 30-50 Android sales |
| Web version | Full features, subtle app promotion |
| Marketing budget | $0 — Reddit, BGG, Product Hunt, short-form video |
| Break-even target | 49 sales in year 1 |

---

*This document is a plan, not a commitment. Adapt based on what the market tells you.*
