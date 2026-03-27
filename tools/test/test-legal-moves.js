const assert = require('assert');
const { canPlayOnExpedition } = require('./game-rules');

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

console.log('=== Legal Move Tests ===\n');

// --- Empty expedition ---
test('any number card on empty expedition is legal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 5 }, []), true);
});

test('wager on empty expedition is legal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 0 }, []), true);
});

test('null expedition treated as empty (legal)', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 3 }, null), true);
});

test('undefined expedition treated as empty (legal)', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 0 }, undefined), true);
});

// --- Ascending order for number cards ---
test('higher number on top of lower number is legal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 7 }, [{ value: 5 }]), true);
});

test('equal number on top of same number is illegal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 5 }, [{ value: 5 }]), false);
});

test('lower number on top of higher number is illegal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 3 }, [{ value: 5 }]), false);
});

test('number 2 on top of number 10 is illegal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 2 }, [{ value: 10 }]), false);
});

test('number 10 on top of number 9 is legal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 10 }, [{ value: 9 }]), true);
});

test('consecutive numbers (3 on 2) is legal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 3 }, [{ value: 2 }]), true);
});

// --- Wagers before numbers ---
test('wager on top of wager is legal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 0 }, [{ value: 0 }]), true);
});

test('wager after number card is illegal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 0 }, [{ value: 2 }]), false);
});

test('wager after high number is illegal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 0 }, [{ value: 10 }]), false);
});

test('number card after wager is legal (any number)', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 2 }, [{ value: 0 }]), true);
});

test('high number after wager is legal', () => {
  assert.strictEqual(canPlayOnExpedition({ value: 10 }, [{ value: 0 }]), true);
});

// --- Multi-card expedition scenarios ---
test('number on expedition with multiple wagers is legal', () => {
  const exp = [{ value: 0 }, { value: 0 }, { value: 0 }];
  assert.strictEqual(canPlayOnExpedition({ value: 2 }, exp), true);
});

test('wager on expedition with wagers then number is illegal', () => {
  const exp = [{ value: 0 }, { value: 3 }];
  assert.strictEqual(canPlayOnExpedition({ value: 0 }, exp), false);
});

test('higher number on expedition ending in number is legal', () => {
  const exp = [{ value: 0 }, { value: 3 }, { value: 5 }];
  assert.strictEqual(canPlayOnExpedition({ value: 6 }, exp), true);
});

test('lower number on expedition ending in number is illegal', () => {
  const exp = [{ value: 0 }, { value: 3 }, { value: 5 }];
  assert.strictEqual(canPlayOnExpedition({ value: 4 }, exp), false);
});

// --- Only top card matters ---
test('only top card matters for legal check', () => {
  // Expedition has 2, 5, 8 -- top is 8, so 9 is legal, 7 is not
  const exp = [{ value: 2 }, { value: 5 }, { value: 8 }];
  assert.strictEqual(canPlayOnExpedition({ value: 9 }, exp), true);
  assert.strictEqual(canPlayOnExpedition({ value: 7 }, exp), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
