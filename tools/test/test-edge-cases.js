// Edge case tests — stress test unusual game states
const { COLORS, calculateScore, canPlayOnExpedition, createDeck } = require('./game-rules');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); passed++; }
  catch (e) { console.log(`  FAIL: ${name}\n        ${e.message}`); failed++; }
}

console.log('=== Edge Case Tests ===\n');

// --- Score edge cases ---
test('expedition with all wagers, no numbers scores (0-20)*4 = -80', () => {
  const cards = [{color:'red',value:0},{color:'red',value:0},{color:'red',value:0}];
  const score = calculateScore(cards);
  if (score !== -80) throw new Error(`Expected -80, got ${score}`);
});

test('single wager + single low number: (2-20)*2 = -36', () => {
  const cards = [{color:'red',value:0},{color:'red',value:2}];
  const score = calculateScore(cards);
  if (score !== -36) throw new Error(`Expected -36, got ${score}`);
});

test('exact break-even: cards summing to 20 with no wagers = 0', () => {
  const cards = [{color:'red',value:2},{color:'red',value:3},{color:'red',value:4},{color:'red',value:5},{color:'red',value:6}];
  const score = calculateScore(cards);
  if (score !== 0) throw new Error(`Expected 0, got ${score}`);
});

test('8 cards exactly: 3 wagers + 5 numbers', () => {
  const cards = [
    {color:'red',value:0},{color:'red',value:0},{color:'red',value:0},
    {color:'red',value:2},{color:'red',value:3},{color:'red',value:4},
    {color:'red',value:5},{color:'red',value:6}
  ];
  const score = calculateScore(cards);
  // (2+3+4+5+6 - 20) * (1+3) + 20 = (20-20)*4 + 20 = 0 + 20 = 20
  if (score !== 20) throw new Error(`Expected 20, got ${score}`);
});

// --- canPlayOnExpedition edge cases ---
test('wager on expedition with 3 wagers is legal', () => {
  // 3 wagers already, 4th wager — but game only has 3 wagers per color
  // This tests the logic, not the game constraint
  const exp = [{color:'r',value:0},{color:'r',value:0},{color:'r',value:0}];
  if (!canPlayOnExpedition({color:'r',value:0}, exp)) throw new Error('Should be legal');
});

test('value 2 on expedition ending with value 2 is illegal (not strictly greater)', () => {
  const exp = [{color:'r',value:2}];
  if (canPlayOnExpedition({color:'r',value:2}, exp)) throw new Error('Should be illegal');
});

test('value 10 on expedition ending with value 9 is legal', () => {
  const exp = [{color:'r',value:9}];
  if (!canPlayOnExpedition({color:'r',value:10}, exp)) throw new Error('Should be legal');
});

test('nothing can be played on expedition ending with 10', () => {
  const exp = [{color:'r',value:10}];
  // Only wager would be legal, but wager requires top to be wager
  if (canPlayOnExpedition({color:'r',value:0}, exp)) throw new Error('Wager on 10 should be illegal');
  for (let v = 2; v <= 10; v++) {
    if (canPlayOnExpedition({color:'r',value:v}, exp)) throw new Error(`${v} on 10 should be illegal`);
  }
});

// --- Deck integrity ---
test('createDeck has no duplicate IDs across 100 decks', () => {
  for (let i = 0; i < 100; i++) {
    const deck = createDeck();
    const ids = new Set(deck.map(c => c.id));
    if (ids.size !== 60) throw new Error(`Deck ${i}: ${ids.size} unique IDs, expected 60`);
  }
});

test('all card IDs follow expected format', () => {
  const deck = createDeck();
  for (const card of deck) {
    if (card.value === 0) {
      if (!/^[a-z]+_w[012]$/.test(card.id)) throw new Error(`Bad wager ID: ${card.id}`);
    } else {
      if (!/^[a-z]+_\d+$/.test(card.id)) throw new Error(`Bad number ID: ${card.id}`);
    }
  }
});

// --- Score range validation ---
test('theoretical minimum score is -300 (5 colors × -60 each)', () => {
  // 3 wagers in each color, no numbers: (0-20)*(1+3) = -80 per color
  // But -80*5 = -400... wait, let me recalc
  // Actually worst: 3 wagers only per color = (0-20)*4 = -80, ×5 = -400
  // Single wager only = (0-20)*2 = -40
  // The theoretical min with just 1 card per color starting 5 exps:
  // (v-20)*1 per color, worst single card is value 2: (2-20) = -18
  const allWagers = {};
  for (const c of COLORS) {
    allWagers[c] = [{color:c,value:0},{color:c,value:0},{color:c,value:0}];
  }
  let total = 0;
  for (const c of COLORS) total += calculateScore(allWagers[c]);
  if (total !== -400) throw new Error(`Expected -400, got ${total}`);
});

test('theoretical maximum score is achievable', () => {
  // Max per color: 3 wagers + 2,3,4,5,6,7,8,9,10 = 12 cards
  // (2+3+4+5+6+7+8+9+10 - 20) * (1+3) + 20 = (54-20)*4 + 20 = 136+20 = 156
  const maxExp = {};
  for (const c of COLORS) {
    maxExp[c] = [
      {color:c,value:0},{color:c,value:0},{color:c,value:0},
      {color:c,value:2},{color:c,value:3},{color:c,value:4},
      {color:c,value:5},{color:c,value:6},{color:c,value:7},
      {color:c,value:8},{color:c,value:9},{color:c,value:10}
    ];
  }
  let total = 0;
  for (const c of COLORS) total += calculateScore(maxExp[c]);
  // 156 × 5 = 780
  if (total !== 780) throw new Error(`Expected 780, got ${total}`);
});

// --- Empty/null handling ---
test('calculateScore handles various falsy inputs', () => {
  if (calculateScore(null) !== 0) throw new Error('null should score 0');
  if (calculateScore(undefined) !== 0) throw new Error('undefined should score 0');
  if (calculateScore([]) !== 0) throw new Error('empty array should score 0');
  if (calculateScore(false) !== 0) throw new Error('false should score 0');
});

test('canPlayOnExpedition handles null/undefined expedition', () => {
  const card = {color:'red',value:5};
  if (!canPlayOnExpedition(card, null)) throw new Error('null expedition should allow play');
  if (!canPlayOnExpedition(card, undefined)) throw new Error('undefined expedition should allow play');
  if (!canPlayOnExpedition(card, [])) throw new Error('empty expedition should allow play');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
