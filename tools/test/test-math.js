const CONFIG = require('../../public/src/config');
const MATH = require('../../public/src/math');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' — ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function approx(a, b, eps) { return Math.abs(a - b) < (eps || 0.01); }

console.log('\n=== Math Tests ===\n');

// --- Scoring ---

test('scoreExpedition: empty returns 0', () => {
  assert(MATH.scoreExpedition([]) === 0);
});

test('scoreExpedition: null/undefined returns 0', () => {
  assert(MATH.scoreExpedition(null) === 0);
  assert(MATH.scoreExpedition(undefined) === 0);
});

test('scoreExpedition: single number card', () => {
  const cards = [{ value: 5 }];
  assert(MATH.scoreExpedition(cards) === -15, 'expected -15, got ' + MATH.scoreExpedition(cards));
});

test('scoreExpedition: numbers 5,6,7,8,9,10 = 25', () => {
  const cards = [5, 6, 7, 8, 9, 10].map(v => ({ value: v }));
  assert(MATH.scoreExpedition(cards) === 25);
});

test('scoreExpedition: 1 wager + 5,6,7 = -4', () => {
  const cards = [{ value: 0 }, { value: 5 }, { value: 6 }, { value: 7 }];
  assert(MATH.scoreExpedition(cards) === -4);
});

test('scoreExpedition: 3 wagers + 5,6,7,8,9 = 80 (60 + 20 bonus)', () => {
  const cards = [{ value: 0 }, { value: 0 }, { value: 0 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }];
  assert(MATH.scoreExpedition(cards) === 80, 'expected 80 (60 + 20 bonus), got ' + MATH.scoreExpedition(cards));
});

test('scoreExpedition: 8 cards get bonus', () => {
  const cards = [{ value: 0 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }];
  const score = MATH.scoreExpedition(cards);
  const withoutBonus = (2 + 3 + 4 + 5 + 6 + 7 + 8 - 20) * 2;
  assert(score === withoutBonus + 20, 'expected ' + (withoutBonus + 20) + ', got ' + score);
});

test('scoreExpedition: 7 cards no bonus', () => {
  const cards = [{ value: 0 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }, { value: 7 }];
  const score = MATH.scoreExpedition(cards);
  const expected = (2 + 3 + 4 + 5 + 6 + 7 - 20) * 2;
  assert(score === expected, 'expected ' + expected + ', got ' + score);
});

test('scoreAll: scores all colors', () => {
  const expeditions = {};
  CONFIG.colors.forEach(c => { expeditions[c] = []; });
  expeditions[CONFIG.colors[0]] = [{ value: 5 }, { value: 6 }];
  const result = MATH.scoreAll(expeditions);
  assert(typeof result.total === 'number');
  assert(result.total === -9, 'expected -9, got ' + result.total);
});

// --- ELO ---

test('eloExpected: equal ratings = 0.5', () => {
  assert(approx(MATH.eloExpected(1200, 1200), 0.5));
});

test('eloExpected: higher rating > 0.5', () => {
  assert(MATH.eloExpected(1400, 1200) > 0.5);
});

test('eloExpected: lower rating < 0.5', () => {
  assert(MATH.eloExpected(1000, 1200) < 0.5);
});

test('eloChange: win against equal returns positive', () => {
  const change = MATH.eloChange(1200, 1200, 1, 32);
  assert(change > 0, 'expected positive, got ' + change);
});

test('eloChange: loss against equal returns negative', () => {
  const change = MATH.eloChange(1200, 1200, 0, 32);
  assert(change < 0, 'expected negative, got ' + change);
});

// --- Phi ---

test('phiTier: n=0 returns cardH', () => {
  assert(MATH.phiTier(100, 0) === 100);
});

test('phiTier: n=1 returns cardH / phi', () => {
  assert(approx(MATH.phiTier(100, 1), 61.80, 0.1));
});

test('phiTier: higher n = smaller value', () => {
  assert(MATH.phiTier(100, 2) < MATH.phiTier(100, 1));
  assert(MATH.phiTier(100, 3) < MATH.phiTier(100, 2));
});

// --- Stack offset ---

test('stackOffset: returns positive number', () => {
  const offset = MATH.stackOffset(5, 100);
  assert(offset > 0, 'expected positive, got ' + offset);
});

test('stackOffset: more cards = smaller offset', () => {
  const offset5 = MATH.stackOffset(5, 100);
  const offset10 = MATH.stackOffset(10, 100);
  assert(offset10 < offset5, 'offset10 should be < offset5');
});

// --- Pile height ---

test('pileHeight: 0 cards = 0', () => {
  assert(MATH.pileHeight(0, 10, 100) === 0);
});

test('pileHeight: 1 card = cardH', () => {
  assert(MATH.pileHeight(1, 10, 100) === 100);
});

test('pileHeight: n cards = cardH + (n-1) * offset', () => {
  assert(MATH.pileHeight(5, 10, 100) === 100 + 4 * 10);
});

// --- Centering ---

test('center: content smaller than container', () => {
  assert(MATH.center(50, 100) === 25);
});

test('center: content equals container', () => {
  assert(MATH.center(100, 100) === 0);
});

test('center: content larger than container returns 0', () => {
  assert(MATH.center(150, 100) === 0);
});

// --- Jitter ---

test('jitter: returns rotation and x/y offsets', () => {
  const j = MATH.jitter('red_5', 3);
  assert(typeof j.rotation === 'number');
  assert(typeof j.x === 'number');
  assert(typeof j.y === 'number');
});

test('jitter: deterministic for same inputs', () => {
  const a = MATH.jitter('red_5', 3);
  const b = MATH.jitter('red_5', 3);
  assert(a.rotation === b.rotation);
  assert(a.x === b.x);
  assert(a.y === b.y);
});

test('jitter: different for different inputs', () => {
  const a = MATH.jitter('red_5', 3);
  const b = MATH.jitter('blue_8', 1);
  assert(a.rotation !== b.rotation || a.x !== b.x || a.y !== b.y);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
