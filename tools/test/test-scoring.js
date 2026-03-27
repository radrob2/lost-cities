const assert = require('assert');
const { calculateScore, COLORS } = require('./game-rules');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

console.log('=== Scoring Tests ===\n');

// --- Empty expedition ---
test('empty expedition scores 0', () => {
  assert.strictEqual(calculateScore([]), 0);
});

test('null expedition scores 0', () => {
  assert.strictEqual(calculateScore(null), 0);
});

test('undefined expedition scores 0', () => {
  assert.strictEqual(calculateScore(undefined), 0);
});

// --- Single number card ---
test('single card (value 5) scores (5-20)*1 = -15', () => {
  assert.strictEqual(calculateScore([{ value: 5 }]), -15);
});

test('single card (value 10) scores (10-20)*1 = -10', () => {
  assert.strictEqual(calculateScore([{ value: 10 }]), -10);
});

// --- Multiple number cards, no wagers ---
test('cards 2,3,4 score (9-20)*1 = -11', () => {
  const cards = [{ value: 2 }, { value: 3 }, { value: 4 }];
  assert.strictEqual(calculateScore(cards), -11);
});

test('cards 5,6,7,8,9,10 score (45-20)*1 = 25', () => {
  const cards = [5, 6, 7, 8, 9, 10].map(v => ({ value: v }));
  assert.strictEqual(calculateScore(cards), 25);
});

// --- With wagers ---
test('1 wager + cards 5,6,7 scores (18-20)*2 = -4', () => {
  const cards = [{ value: 0 }, { value: 5 }, { value: 6 }, { value: 7 }];
  assert.strictEqual(calculateScore(cards), -4);
});

test('2 wagers + cards 8,9,10 scores (27-20)*3 = 21', () => {
  const cards = [{ value: 0 }, { value: 0 }, { value: 8 }, { value: 9 }, { value: 10 }];
  assert.strictEqual(calculateScore(cards), 21);
});

test('3 wagers + cards 5,6,7,8,9 scores (35-20)*4 = 60', () => {
  const cards = [{ value: 0 }, { value: 0 }, { value: 0 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }];
  // 8 cards so bonus applies: 60 + 20 = 80
  assert.strictEqual(calculateScore(cards), 80);
});

// --- 8+ card bonus ---
test('8 cards get +20 bonus', () => {
  // 8 number cards: 2,3,4,5,6,7,8,9 => sum=44, (44-20)*1 + 20 = 44
  const cards = [2, 3, 4, 5, 6, 7, 8, 9].map(v => ({ value: v }));
  assert.strictEqual(calculateScore(cards), 44);
});

test('7 cards get no bonus', () => {
  const cards = [2, 3, 4, 5, 6, 7, 8].map(v => ({ value: v }));
  // sum=35, (35-20)*1 = 15, no bonus
  assert.strictEqual(calculateScore(cards), 15);
});

test('9 cards get +20 bonus', () => {
  // 9 number cards: 2,3,4,5,6,7,8,9,10 => sum=54, (54-20)*1 + 20 = 54
  const cards = [2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => ({ value: v }));
  assert.strictEqual(calculateScore(cards), 54);
});

// --- All wagers, no numbers ---
test('1 wager only scores (0-20)*2 = -40', () => {
  assert.strictEqual(calculateScore([{ value: 0 }]), -40);
});

test('2 wagers only scores (0-20)*3 = -60', () => {
  const cards = [{ value: 0 }, { value: 0 }];
  assert.strictEqual(calculateScore(cards), -60);
});

test('3 wagers only scores (0-20)*4 = -80', () => {
  const cards = [{ value: 0 }, { value: 0 }, { value: 0 }];
  assert.strictEqual(calculateScore(cards), -80);
});

// --- Max possible score for one expedition ---
test('max score: 3 wagers + 2,3,4,5,6,7,8,9,10 = 12 cards', () => {
  // sum = 2+3+4+5+6+7+8+9+10 = 54
  // (54-20)*4 + 20 = 136 + 20 = 156
  const cards = [
    { value: 0 }, { value: 0 }, { value: 0 },
    { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 },
    { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }, { value: 10 }
  ];
  assert.strictEqual(calculateScore(cards), 156);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
