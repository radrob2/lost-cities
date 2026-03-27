# Venture -- Sound Design Document

## Current State

All sounds are synthesized via Web Audio API. No audio files are loaded, keeping the app lightweight (~2KB of sound code). The current implementation in `public/src/sound.js` uses basic single-oscillator tones with simple gain envelopes.

### Current Sound Inventory

| Action     | Implementation                            | Feel                          |
|------------|-------------------------------------------|-------------------------------|
| select     | 800Hz sine, 60ms                          | Thin electronic blip          |
| play card  | 440Hz triangle + 660Hz sine, ~150ms       | Two-tone "boop"               |
| discard    | Noise burst + 300Hz sine, 80ms            | Static-y tap                  |
| draw card  | 520Hz + 620Hz staggered sines, ~170ms     | Two rising pips               |
| your turn  | C5-E5-G5 ascending triangles, ~400ms      | Chime, but thin               |
| game over  | C5-A4-F4 descending triangles, ~1100ms    | Somber but sounds like a ringtone |
| win        | C5-E5-G5-C6 ascending triangles, ~750ms   | Fanfare, but sounds like a UI alert |
| error      | 200Hz square, 150ms                       | Buzzy, jarring                |
| undo       | 500Hz-400Hz sine pair, 80ms               | Barely audible reverse pip    |

### Problems With Current Sounds

1. **Everything sounds "electronic."** Single oscillators with no filtering or layering produce a Game Boy quality rather than an adventure game quality.
2. **No spatial character.** No reverb, no warmth. Sounds exist in a vacuum.
3. **Card interactions feel weightless.** Play, discard, and draw all sound similar -- generic tones rather than physical gestures.
4. **Haptics are one-size-fits-all.** The vibrate patterns do not vary enough between action types to create distinct tactile signatures.
5. **No personality.** Nothing about the sounds says "expedition" or "discovery." They could belong to any calculator app.

---

## Sound Direction

### Theme

Venture's world is warm lantern light on aged parchment, distant horizons, and the quiet tension of deciding whether to risk an expedition. The sounds should evoke:

- **Material:** Wood, thick paper, brass clasps, canvas tent fabric
- **Space:** A camp table at dusk -- not a concert hall, not a void
- **Emotion:** Curiosity tempered with caution. Small triumphs. Respectful losses.

### Design Pillars

1. **Tactile over musical.** Card sounds should feel like touching physical objects. Save melodic content for state changes (your turn, win, lose).
2. **Warm over bright.** Prefer lower-mid frequencies (200-600Hz) as the body of sounds, with controlled high-frequency transients. Avoid the "cold sine" quality of the current sounds.
3. **Short over long.** Card interaction sounds should be 40-120ms. Only notifications and end-game events exceed 300ms.
4. **Distinct silhouettes.** A player should be able to identify every sound with their eyes closed. Each action needs a unique frequency range, rhythm, and haptic signature.

---

## Sound Design Spec

### 1. Card Select (tap/highlight a card in hand)

**Feel:** A fingertip touching a thick card. Subtle confirmation that says "I see you picked this."

**Technical approach:**
- Filtered noise burst (bandpass 1200-3000Hz) for the "touch" transient, 15ms
- Sub-layer: 280Hz sine, 30ms, quick decay -- adds warmth underneath the click
- Gentle low-pass filter sweep on the noise from 3000Hz to 800Hz over 15ms

**Duration:** 40ms total

**Haptic:** Light impact (Capacitor `impact({style:'light'})`) or 8ms vibrate. Barely there.

```
Envelope:  |*..    (sharp attack, fast decay)
Frequency: noise(bandpass) + 280Hz body
```

### 2. Play Card to Expedition

**Feel:** A card sliding across wood and landing with a satisfying "thock." This is the most-heard sound in the game and must feel great every single time.

**Technical approach:**
- Layer 1 -- Slide: Filtered noise, bandpass 600-2000Hz, 60ms, linear fade-in over 20ms then decay. Pitch the filter center down from 2000Hz to 800Hz over 60ms (simulates friction).
- Layer 2 -- Land: 180Hz triangle + 360Hz triangle (octave stack), 50ms, sharp attack, fast exponential decay. This is the satisfying "thock."
- Layer 3 -- Air: Very quiet noise burst (vol 0.02), broadband, 30ms at the end. The card displacing air.
- Subtle warmth: Run the output through a low-pass filter at 4000Hz to remove harshness.

**Duration:** 90ms (slide 0-60ms, land at 40ms, overlap creates fullness)

**Haptic:** Medium impact (`impact({style:'medium'})`) or 20ms vibrate, fired at the "land" moment (40ms delay from action start).

```
Timeline:  [--slide---]
               [thock-]
                 [air]
           0   40  60  90ms
```

### 3. Play Wager Card

**Feel:** Everything from "Play Card" plus a layer of tension and anticipation. The player is committing to risk.

**Technical approach:**
- Same as Play Card, but add:
- Layer 4 -- Tension tone: 220Hz sawtooth (very low volume, 0.03), 200ms, slow attack (80ms fade-in), slow decay. Low-pass filtered at 800Hz so it sounds like a muted brass undertone rather than a raw synth.
- Layer 5 -- Shimmer: Two detuned sines at 1760Hz and 1780Hz (beat frequency of 20Hz creates a wavering shimmer), 150ms, vol 0.015, fade in and out.

**Duration:** 200ms (the tension layers linger after the card lands)

**Haptic:** Medium-heavy impact (`impact({style:'heavy'})`) or 30ms vibrate. The extra weight signals "this matters."

### 4. Discard Card

**Feel:** Tossing a card onto a pile. Lighter and more casual than playing to an expedition. Should feel dismissive but not negative.

**Technical approach:**
- Layer 1 -- Toss: Noise burst, bandpass 800-2500Hz, 40ms. Filter sweeps down from 2500Hz to 1000Hz (card moving away).
- Layer 2 -- Landing: 250Hz sine, 30ms, softer attack than the play-card thock (5ms attack instead of instant).
- No warmth layer -- discards should feel lighter, less substantial than plays.

**Duration:** 60ms

**Haptic:** Light impact or 12ms vibrate. Noticeably lighter than play-card.

### 5. Draw from Deck

**Feel:** Peeling a card off a deck and flipping it over. Discovery. "What did I get?"

**Technical approach:**
- Layer 1 -- Peel: Very short noise burst (10ms), bandpass 2000-5000Hz, vol 0.03. The card separating.
- Layer 2 -- Flip: Pitch-rising sine from 400Hz to 700Hz over 80ms, triangle wave, vol 0.06. The upward pitch implies "reveal" and "possibility."
- Layer 3 -- Settle: 300Hz sine, 30ms, starting at 80ms. The card arriving in hand.

**Duration:** 110ms

**Haptic:** Light-medium. Two quick pulses: 8ms at start (peel), 15ms at 80ms (settle). Or `impact({style:'light'})` twice with 80ms gap.

### 6. Draw from Discard Pile

**Feel:** Picking up a known card. Less surprise than deck draw, more deliberate. A hint of craftiness -- "I'll take that, thank you."

**Technical approach:**
- Layer 1 -- Lift: Noise burst similar to deck draw but bandpass 1000-3000Hz (slightly duller, it is a known card).
- Layer 2 -- Slide: Sine sweeping 350Hz to 500Hz over 60ms, triangle, vol 0.05. Lower and shorter than deck-draw flip -- less wonder, more calculation.
- Layer 3 -- Settle: Same as deck draw.

**Duration:** 80ms

**Haptic:** Light impact or 10ms vibrate. Single pulse, no drama.

### 7. Your Turn Notification

**Feel:** A gentle campfire chime. "Your move, explorer." Not urgent, not aggressive. Warm and inviting.

**Technical approach:**
- Three notes: E4 (330Hz), G4 (392Hz), B4 (494Hz) -- an E minor triad, warmer and more "adventurous" than the current C major.
- Waveform: Triangle oscillators, but each note also has a very quiet sine an octave above (660, 784, 988Hz) at vol 0.02 for shimmer.
- Each note: 120ms, 80ms gap between onsets.
- Add convolution reverb (generate a short synthetic impulse response -- exponentially decaying noise, 300ms, filtered) to place the chime in a "space."
- Overall envelope: Gentle fade-out on the last note (200ms decay).

**Duration:** ~500ms

**Haptic:** Three gentle pulses matching the notes. Pattern: `[15, 65, 15, 65, 20]` (pulse-gap-pulse-gap-pulse).

### 8. Opponent's Move (cards appearing on their side)

**Feel:** Muffled version of the play/discard sound. You hear it happen but it is across the table.

**Technical approach:**
- Same layers as play card but:
- Lower volume (60% of normal)
- Extra low-pass filter at 2000Hz (sounds "distant")
- Slightly longer envelope (120ms instead of 90ms, feels further away)

**Duration:** 120ms

**Haptic:** None. Only the active player gets haptic feedback.

### 9. Game Over (general)

**Feel:** The expedition is over. A door closing. Contemplative, not dramatic.

**Technical approach:**
- Two descending notes: G4 (392Hz) to D4 (294Hz), triangle waves.
- Each note: 250ms with 100ms overlap (crossfade).
- Add a low drone: 147Hz (D3) sine, vol 0.04, 600ms, slow fade-in and out. Grounds the sound.
- Synthetic reverb tail: 400ms of filtered noise decay.

**Duration:** 800ms

**Haptic:** Single long pulse, 60ms. A full stop.

### 10. Win

**Feel:** Triumphant but restrained. Not a slot machine jackpot -- more like reaching a mountain summit and taking a breath. Pride.

**Technical approach:**
- Four ascending notes: D4 (294Hz), F#4 (370Hz), A4 (440Hz), D5 (587Hz) -- D major arpeggio. Bright but warm.
- Waveform: Triangle base + quiet sine octave-above shimmer (same technique as your-turn chime).
- Timing: 100ms per note, slight overlap (80ms onset spacing). Final note holds 300ms with slow decay.
- Add a "bloom" on the final note: Filtered noise (bandpass 2000-6000Hz), vol 0.02, 200ms, fading in then out. Like a sparkle.
- Synthetic reverb: 500ms tail.

**Duration:** ~900ms

**Haptic:** Ascending intensity pattern. `impact({style:'light'})`, then `medium`, then `heavy` on the final note. Three impacts, 80ms apart.

### 11. Lose

**Feel:** Respectful. "Good game, try again." Not punishing. A minor-key mirror of the win sound, but shorter.

**Technical approach:**
- Three descending notes: A4 (440Hz), F4 (349Hz), D4 (294Hz) -- D minor arpeggio descending.
- Triangle waves, same shimmer technique, but shimmer is quieter (vol 0.01).
- Timing: 120ms per note, 100ms onset spacing. Final note fades 200ms.
- No bloom effect. Just the notes and a short reverb tail (300ms).

**Duration:** ~600ms

**Haptic:** Single medium impact on the first note only. No drawn-out vibration -- do not rub it in.

### 12. Error / Illegal Move

**Feel:** A wooden "knock" -- like tapping on the table to say "nope." Physical, not electronic.

**Technical approach:**
- Layer 1: 150Hz triangle, 40ms, sharp attack, fast decay. The knock body.
- Layer 2: Noise burst, bandpass 500-1500Hz, 20ms. The knock transient.
- Play the knock twice, 80ms apart (double-knock pattern: "nuh-uh").

**Duration:** 140ms

**Haptic:** Two firm pulses matching the knocks. `[20, 60, 20]`.

### 13. Undo

**Feel:** Rewinding. A card sliding backward. Quick and clean.

**Technical approach:**
- Pitch-falling sine from 600Hz to 350Hz over 70ms, triangle wave. The inverse of the draw-card "flip."
- Quiet noise layer, 30ms, bandpass 1000-3000Hz. The card moving.

**Duration:** 70ms

**Haptic:** Light impact or 10ms vibrate. Understated.

### 14. Shuffle / New Game Start

**Feel:** A deck being shuffled. Fresh start energy.

**Technical approach:**
- Rapid sequence of 8-10 very short noise bursts (8ms each), bandpass 1500-4000Hz, with randomized timing offsets (15-40ms apart). Simulates cards riffling.
- Underneath: A quiet rising sine sweep from 200Hz to 400Hz over the full duration. Subconscious "things are beginning" energy.

**Duration:** ~300ms

**Haptic:** Rapid light pulses matching the noise bursts. `impact({style:'light'})` fired 6 times, 40ms apart.

---

## Ambient Sound

### Recommendation: Yes, but minimal and optional.

A subtle ambient layer elevates the experience from "web app" to "game." But it must be done carefully.

### Approach: Synthesized Campfire Ambience

No audio files. Generate ambient sound entirely with Web Audio API:

- **Crackle:** Random noise bursts (2-8ms each), bandpass 3000-8000Hz, triggered at random intervals (200-800ms apart), vol 0.008-0.015 (randomized). Sounds like distant embers.
- **Low warmth:** 80Hz sine, vol 0.01, with very slow random volume modulation (LFO at 0.1Hz). A subliminal "room tone" that makes silence feel warm rather than empty.
- **Occasional pops:** Every 3-8 seconds (randomized), a slightly louder noise burst (vol 0.02, 15ms, bandpass 1000-4000Hz). A log shifting in the fire.

### Implementation Rules

- Ambient is OFF by default. Toggled separately from SFX.
- Ambient fades in over 2 seconds when enabled (no sudden appearance).
- Ambient ducks (reduces volume by 50%) when a card sound plays, then recovers over 200ms. This ensures card sounds remain clear.
- Ambient stops during the opponent's turn timer and game-over sequence to let those moments breathe.
- CPU impact is minimal: one noise generator running continuously plus occasional scheduled bursts. No convolution processing on the ambient layer.

---

## Music

### Recommendation: No music for v1.

Card games thrive on the rhythm of their own sounds. Adding music risks:
- Clashing with the carefully designed card SFX
- Becoming annoying on repeated plays (card game sessions can last 20+ minutes)
- Adding complexity to the audio mixing (ducking, volume balancing)
- Increasing perceived "weight" of the app for something that most players will mute

### Future (v2+)

If music is added later, the right approach is a single ambient music layer:
- Generative: slowly evolving pad chords using detuned oscillators and filtered noise
- Key of D major / B minor (matches the win/lose sound design above)
- No melody, no rhythm -- just harmonic texture
- Volume at roughly 20% of SFX level
- Separate toggle from SFX and ambient

---

## Synthetic Reverb Implementation

Several sounds above call for reverb. Here is how to build it with Web Audio API without loading impulse response files:

```
function createSyntheticReverb(ctx, duration = 0.4, decay = 2.0) {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
}
```

Create one reverb node at audio context initialization and route sounds through it via a shared wet/dry gain pair. Do not create a new convolver per sound -- that is expensive.

---

## Haptic Design Notes

### Capacitor Haptics Styles

The current code only uses `impact({style:'light'})`. Capacitor provides three levels:

| Style    | Use For                                       |
|----------|-----------------------------------------------|
| `light`  | Select, draw, undo, discard                   |
| `medium` | Play card, your turn                          |
| `heavy`  | Wager play, win, game over                    |

### Haptic Rules

- Never fire haptics during the opponent's animated moves. Only the active player feels feedback.
- Haptics must be synchronous with the most prominent audio transient (the "thock," the first note, etc.). Even 30ms of mismatch feels wrong.
- On devices without haptic support, do not attempt `navigator.vibrate` as a substitute during gameplay -- it is too coarse. Reserve `vibrate()` fallback for notifications only (your turn, game over).

---

## Top 3 Improvements (Priority Order)

These three changes would produce the largest perceptible quality jump, implementable entirely in Web Audio synthesis with no audio files.

### 1. Replace play-card sound with layered noise+thock

**Current:** Two bare oscillator tones (440Hz + 660Hz). Sounds like a notification.
**Proposed:** Friction noise slide + low-frequency thock + air burst (see spec item 2 above).
**Why this matters:** Play-card is heard 30-50 times per game. It is the heartbeat of the experience. Making it feel like a physical card landing on wood transforms the entire session from "web app" to "card game."
**Effort:** ~20 lines of code. Replace the `play()` method in the SFX object.

### 2. Add synthetic reverb to notification sounds

**Current:** All sounds exist in a dead acoustic void. They feel synthetic and disconnected.
**Proposed:** Create a shared ConvolverNode with a synthetic impulse response (see reverb section above). Route your-turn, win, lose, and game-over sounds through it with a 20-30% wet mix.
**Why this matters:** Reverb is the single cheapest way to make synthesized sounds feel "real." It adds the illusion of physical space -- sounds feel like they happen in a room rather than inside a computer.
**Effort:** ~15 lines for the reverb infrastructure, plus routing changes in 4 SFX methods.

### 3. Differentiate play vs. discard vs. draw with distinct frequency bands

**Current:** Play (440+660Hz), discard (noise+300Hz), and draw (520+620Hz) all live in the same 300-800Hz range. They blur together.
**Proposed:**
- Play: Low-mid body (150-400Hz). Grounded, substantial.
- Discard: Mid-high transient (800-2500Hz). Light, tossed-away.
- Draw: Rising pitch sweep (400-700Hz). Upward motion, curiosity.
**Why this matters:** Frequency separation is how the ear tells sounds apart instantly. When three different actions share the same frequency band, the player's brain has to work harder to distinguish them, which undermines the tactile feedback loop.
**Effort:** Adjustments to existing oscillator frequencies plus adding the noise-based transient layers. ~30 lines changed across three methods.

---

## Implementation Notes

- All changes should happen in `public/src/sound.js`.
- The `playTone()` and `playNoise()` helper functions are too simple for the layered approach described above. New helper functions will be needed: `playFilteredNoise(centerFreq, bandwidth, duration, vol)`, `playSweep(startFreq, endFreq, duration, waveform, vol)`, and the reverb setup function.
- Keep the existing `soundEnabled` toggle and `try/catch` safety. Web Audio failures should never block gameplay.
- Test on iOS Safari specifically. Safari resumes AudioContext on user gesture only, and some envelope scheduling behaves differently than Chrome. The existing `getAudio()` resume pattern is correct; preserve it.
- Haptic changes require testing on a real device via Capacitor. The simulator does not produce haptic feedback.
