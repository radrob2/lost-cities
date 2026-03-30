const CONFIG = require('../../public/src/config');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' — ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('\n=== Config Tests ===\n');

// Structure tests
test('CONFIG is an object', () => {
  assert(typeof CONFIG === 'object' && CONFIG !== null);
});

test('colors is an array of 5 strings', () => {
  assert(Array.isArray(CONFIG.colors));
  assert(CONFIG.colors.length === 5);
  CONFIG.colors.forEach(c => assert(typeof c === 'string'));
});

test('wagerCount is a positive integer', () => {
  assert(Number.isInteger(CONFIG.wagerCount) && CONFIG.wagerCount > 0);
});

test('numberRange is [min, max] with min < max', () => {
  assert(Array.isArray(CONFIG.numberRange));
  assert(CONFIG.numberRange.length === 2);
  assert(CONFIG.numberRange[0] < CONFIG.numberRange[1]);
});

test('handSize is a positive integer', () => {
  assert(Number.isInteger(CONFIG.handSize) && CONFIG.handSize > 0);
});

// Scoring config
test('scoring has baseCost, bonusThreshold, bonusPoints', () => {
  assert(typeof CONFIG.scoring.baseCost === 'number');
  assert(typeof CONFIG.scoring.bonusThreshold === 'number');
  assert(typeof CONFIG.scoring.bonusPoints === 'number');
});

// Derived values
test('cardsPerColor derivable from config', () => {
  const cardsPerColor = CONFIG.wagerCount + (CONFIG.numberRange[1] - CONFIG.numberRange[0] + 1);
  assert(cardsPerColor === 12, 'expected 12, got ' + cardsPerColor);
});

test('total cards derivable from config', () => {
  const cardsPerColor = CONFIG.wagerCount + (CONFIG.numberRange[1] - CONFIG.numberRange[0] + 1);
  const totalCards = CONFIG.colors.length * cardsPerColor;
  assert(totalCards === 60, 'expected 60, got ' + totalCards);
});

// Color display data
test('colorHex has entry for every color', () => {
  CONFIG.colors.forEach(c => assert(typeof CONFIG.colorHex[c] === 'string', 'missing hex for ' + c));
});

test('colorLabels has entry for every color', () => {
  CONFIG.colors.forEach(c => assert(typeof CONFIG.colorLabels[c] === 'string', 'missing label for ' + c));
});

test('colorSymbols has entry for every color', () => {
  CONFIG.colors.forEach(c => assert(typeof CONFIG.colorSymbols[c] === 'string', 'missing symbol for ' + c));
});

// AI personalities
test('personalities is an object with entries', () => {
  assert(typeof CONFIG.personalities === 'object');
  assert(Object.keys(CONFIG.personalities).length > 0);
});

test('each personality has name, emoji, rating', () => {
  for (const [key, p] of Object.entries(CONFIG.personalities)) {
    assert(typeof p.name === 'string', key + ' missing name');
    assert(typeof p.emoji === 'string', key + ' missing emoji');
    assert(typeof p.rating === 'number', key + ' missing rating');
  }
});

// Subsections exist
test('ai thresholds exist', () => {
  assert(typeof CONFIG.ai === 'object');
  assert(typeof CONFIG.ai.mcSimulations === 'number');
});

test('ui thresholds exist', () => {
  assert(typeof CONFIG.ui === 'object');
  assert(typeof CONFIG.ui.animMs === 'number');
});

test('elo config exists', () => {
  assert(typeof CONFIG.elo === 'object');
  assert(typeof CONFIG.elo.startRating === 'number');
});

test('timer config exists', () => {
  assert(typeof CONFIG.timer === 'object');
  assert(Array.isArray(CONFIG.timer.options));
});

test('achievement thresholds exist', () => {
  assert(typeof CONFIG.achievements === 'object');
  assert(typeof CONFIG.achievements.highRoller === 'number');
});

test('storagePrefix is a string', () => {
  assert(typeof CONFIG.storagePrefix === 'string');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
