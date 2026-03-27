// Pure game logic extracted from public/index.html and public/ai-worker.js
// No dependencies. Used by automated tests.

const COLORS = ['red', 'green', 'blue', 'white', 'yellow'];

/**
 * Score a single expedition (array of cards).
 * Formula: (sum_of_numbers - 20) * (1 + wager_count) + (length >= 8 ? 20 : 0)
 * Empty expedition = 0.
 */
function calculateScore(expedition) {
  if (!expedition || expedition.length === 0) return 0;
  let wagers = 0, sum = 0;
  for (const c of expedition) {
    if (c.value === 0) wagers++;
    else sum += c.value;
  }
  return (sum - 20) * (1 + wagers) + (expedition.length >= 8 ? 20 : 0);
}

/**
 * Can this card legally be played on top of this expedition?
 * Rules:
 *   - Empty expedition: anything is legal.
 *   - Wager (value 0): only if top card is also a wager.
 *   - Number card: must be strictly greater than top card value.
 */
function canPlayOnExpedition(card, expedition) {
  if (!expedition || expedition.length === 0) return true;
  const top = expedition[expedition.length - 1];
  if (card.value === 0) return top.value === 0;
  return card.value > top.value;
}

/**
 * Create a full 60-card deck (shuffled).
 * 5 colors x (3 wagers + numbers 2-10) = 60 cards.
 */
function createDeck() {
  const deck = [];
  COLORS.forEach(c => {
    for (let i = 0; i < 3; i++) deck.push({ color: c, value: 0, id: c + '_w' + i });
    for (let v = 2; v <= 10; v++) deck.push({ color: c, value: v, id: c + '_' + v });
  });
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

module.exports = { COLORS, calculateScore, canPlayOnExpedition, createDeck };
