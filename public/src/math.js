// math.js — Every named formula as a pure function.
// Reads CONFIG only. No other dependencies.

if (typeof CONFIG === 'undefined') {
  var CONFIG = require('./config');
}

// --- Scoring ---

function scoreExpedition(cards) {
  if (!cards || cards.length === 0) return 0;
  let wagers = 0, sum = 0;
  for (const c of cards) {
    if (c.value === 0) wagers++;
    else sum += c.value;
  }
  return (sum - CONFIG.scoring.baseCost) * (1 + wagers)
    + (cards.length >= CONFIG.scoring.bonusThreshold ? CONFIG.scoring.bonusPoints : 0);
}

function scoreAll(expeditions) {
  let total = 0;
  const perColor = {};
  for (const color of CONFIG.colors) {
    const score = scoreExpedition(expeditions[color] || []);
    perColor[color] = score;
    total += score;
  }
  return { total, perColor };
}

// --- ELO ---

function eloExpected(playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

function eloChange(playerRating, opponentRating, actual, kFactor) {
  return Math.round(kFactor * (actual - eloExpected(playerRating, opponentRating)));
}

// --- Phi ---

const PHI = 1.6180339887;

function phiTier(cardH, n) {
  return cardH / Math.pow(PHI, n);
}

// --- Stack offset ---

const STACK_K = 0.367;
const STACK_EXP = 0.613;

function stackOffset(count, cardH) {
  if (count <= 1) return 0;
  return cardH * STACK_K / Math.pow(count, STACK_EXP);
}

// --- Pile height ---

function pileHeight(cardCount, cardOffset, cardH) {
  if (cardCount <= 0) return 0;
  return cardH + Math.max(0, cardCount - 1) * cardOffset;
}

// --- Centering ---

function center(contentHeight, containerHeight) {
  return Math.max(0, Math.round((containerHeight - contentHeight) / 2));
}

// --- Jitter ---

function jitter(cardId, index) {
  const s = cardId + ':' + index;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const rotation = (h % 100) / 100 * CONFIG.ui.jitter.degrees * 2 - CONFIG.ui.jitter.degrees;
  const x = ((h >> 4) % 100) / 100 * CONFIG.ui.jitter.px * 2 - CONFIG.ui.jitter.px;
  const y = ((h >> 8) % 100) / 100 * CONFIG.ui.jitter.px * 2 - CONFIG.ui.jitter.px;
  return { rotation, x, y };
}

const MATH = { scoreExpedition, scoreAll, eloExpected, eloChange, phiTier, stackOffset, pileHeight, center, jitter, PHI, STACK_K, STACK_EXP };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MATH;
}
