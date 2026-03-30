const CONFIG = require('../../public/src/config');
const RULES = require('../../public/src/rules');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' — ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('\n=== Rules Tests ===\n');

// --- canPlayOnExpedition ---

test('canPlayOnExpedition: anything on empty', () => {
  assert(RULES.canPlayOnExpedition({ value: 5 }, []) === true);
});

test('canPlayOnExpedition: wager on empty', () => {
  assert(RULES.canPlayOnExpedition({ value: 0 }, []) === true);
});

test('canPlayOnExpedition: higher number on number', () => {
  assert(RULES.canPlayOnExpedition({ value: 7 }, [{ value: 5 }]) === true);
});

test('canPlayOnExpedition: lower number rejected', () => {
  assert(RULES.canPlayOnExpedition({ value: 3 }, [{ value: 5 }]) === false);
});

test('canPlayOnExpedition: equal number rejected', () => {
  assert(RULES.canPlayOnExpedition({ value: 5 }, [{ value: 5 }]) === false);
});

test('canPlayOnExpedition: wager on wager allowed', () => {
  assert(RULES.canPlayOnExpedition({ value: 0 }, [{ value: 0 }]) === true);
});

test('canPlayOnExpedition: wager after number rejected', () => {
  assert(RULES.canPlayOnExpedition({ value: 0 }, [{ value: 5 }]) === false);
});

test('canPlayOnExpedition: number after wager allowed', () => {
  assert(RULES.canPlayOnExpedition({ value: 2 }, [{ value: 0 }]) === true);
});

test('canPlayOnExpedition: null/undefined expedition treated as empty', () => {
  assert(RULES.canPlayOnExpedition({ value: 5 }, null) === true);
  assert(RULES.canPlayOnExpedition({ value: 5 }, undefined) === true);
});

// --- createDrawPile ---

test('createDrawPile: returns 60 cards', () => {
  const pile = RULES.createDrawPile();
  assert(pile.length === 60, 'expected 60, got ' + pile.length);
});

test('createDrawPile: each card has color, value, id', () => {
  const pile = RULES.createDrawPile();
  pile.forEach(c => {
    assert(typeof c.color === 'string', 'missing color');
    assert(typeof c.value === 'number', 'missing value');
    assert(typeof c.id === 'string', 'missing id');
  });
});

test('createDrawPile: 3 wagers per color', () => {
  const pile = RULES.createDrawPile();
  for (const color of CONFIG.colors) {
    const wagers = pile.filter(c => c.color === color && c.value === 0);
    assert(wagers.length === CONFIG.wagerCount, color + ' has ' + wagers.length + ' wagers');
  }
});

test('createDrawPile: numbers 2-10 per color', () => {
  const pile = RULES.createDrawPile();
  for (const color of CONFIG.colors) {
    for (let v = CONFIG.numberRange[0]; v <= CONFIG.numberRange[1]; v++) {
      const found = pile.filter(c => c.color === color && c.value === v);
      assert(found.length === 1, color + '_' + v + ' count: ' + found.length);
    }
  }
});

test('createDrawPile: is shuffled (two calls differ)', () => {
  const a = RULES.createDrawPile();
  const b = RULES.createDrawPile();
  let same = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id === b[i].id) same++;
  }
  assert(same < 55, 'piles too similar: ' + same + '/60 same positions');
});

// --- allCards ---

test('allCards: returns 60 cards', () => {
  const cards = RULES.allCards();
  assert(cards.length === 60, 'expected 60, got ' + cards.length);
});

test('allCards: not shuffled (deterministic order)', () => {
  const a = RULES.allCards();
  const b = RULES.allCards();
  for (let i = 0; i < a.length; i++) {
    assert(a[i].id === b[i].id, 'order differs at index ' + i);
  }
});

test('allCards: same card set as createDrawPile', () => {
  const all = RULES.allCards().map(c => c.id).sort();
  const pile = RULES.createDrawPile().map(c => c.id).sort();
  for (let i = 0; i < all.length; i++) {
    assert(all[i] === pile[i], 'mismatch at ' + i);
  }
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
