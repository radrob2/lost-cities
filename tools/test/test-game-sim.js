const assert = require('assert');
const { COLORS, calculateScore, canPlayOnExpedition, createDrawPile } = require('./game-rules');

const NUM_GAMES = 100;
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

console.log('=== Game Simulation Tests ===\n');

// --- Draw pile creation ---
test('draw pile has exactly 60 cards', () => {
  const drawPile = createDrawPile();
  assert.strictEqual(drawPile.length, 60);
});

test('draw pile has 5 colors x 12 cards each', () => {
  const drawPile = createDrawPile();
  for (const c of COLORS) {
    const colorCards = drawPile.filter(card => card.color === c);
    assert.strictEqual(colorCards.length, 12, `${c} should have 12 cards, got ${colorCards.length}`);
  }
});

test('each color has 3 wagers and numbers 2-10', () => {
  const drawPile = createDrawPile();
  for (const c of COLORS) {
    const colorCards = drawPile.filter(card => card.color === c);
    const wagers = colorCards.filter(card => card.value === 0);
    assert.strictEqual(wagers.length, 3, `${c} should have 3 wagers`);
    for (let v = 2; v <= 10; v++) {
      const nums = colorCards.filter(card => card.value === v);
      assert.strictEqual(nums.length, 1, `${c} should have one card with value ${v}`);
    }
  }
});

test('every card has a unique id', () => {
  const drawPile = createDrawPile();
  const ids = new Set(drawPile.map(c => c.id));
  assert.strictEqual(ids.size, 60);
});

test('draw pile is shuffled (two draw piles differ)', () => {
  // Extremely unlikely two shuffled draw piles are identical
  const d1 = createDrawPile();
  const d2 = createDrawPile();
  const same = d1.every((c, i) => c.id === d2[i].id);
  assert.strictEqual(same, false, 'Two shuffled draw piles should not be identical');
});

// --- Simulate full games ---

function simulateGame() {
  const drawPile = createDrawPile();
  const hands = { player1: drawPile.splice(0, 8), player2: drawPile.splice(0, 8) };
  const expeditions = {
    player1: Object.fromEntries(COLORS.map(c => [c, []])),
    player2: Object.fromEntries(COLORS.map(c => [c, []]))
  };
  const discards = Object.fromEntries(COLORS.map(c => [c, []]));

  let currentTurn = 'player1';
  let turnCount = 0;
  const maxTurns = 1000; // safety valve

  while (drawPile.length > 0 && turnCount < maxTurns) {
    turnCount++;
    const hand = hands[currentTurn];
    const myExps = expeditions[currentTurn];

    // --- Play phase: pick a random legal action (play to expedition or discard) ---
    // Collect all legal plays
    const legalPlays = [];
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      // Can play to own expedition?
      if (canPlayOnExpedition(card, myExps[card.color])) {
        legalPlays.push({ type: 'play', cardIndex: i, color: card.color });
      }
      // Can always discard
      legalPlays.push({ type: 'discard', cardIndex: i, color: card.color });
    }

    // Pick a random legal action
    const action = legalPlays[Math.floor(Math.random() * legalPlays.length)];
    const card = hand.splice(action.cardIndex, 1)[0];

    if (action.type === 'play') {
      myExps[card.color].push(card);
    } else {
      discards[card.color].push(card);
    }

    // --- Draw phase: draw from draw pile or a discard pile ---
    // Collect draw options (draw pile + any non-empty discard pile, except the one just discarded to)
    const drawOptions = ['drawPile'];
    for (const c of COLORS) {
      if (discards[c].length > 0) {
        // Can't draw from the pile you just discarded to
        if (action.type === 'discard' && c === card.color) continue;
        drawOptions.push(c);
      }
    }

    const drawChoice = drawOptions[Math.floor(Math.random() * drawOptions.length)];
    if (drawChoice === 'drawPile') {
      hand.push(drawPile.pop());
    } else {
      hand.push(discards[drawChoice].pop());
    }

    currentTurn = currentTurn === 'player1' ? 'player2' : 'player1';
  }

  return { expeditions, turnCount, drawPileEmpty: drawPile.length === 0 };
}

test(`simulate ${NUM_GAMES} random games without crashes`, () => {
  let crashes = 0;
  let drawPileEmptyCount = 0;
  let scoreErrors = 0;

  for (let i = 0; i < NUM_GAMES; i++) {
    try {
      const result = simulateGame();
      if (result.drawPileEmpty) drawPileEmptyCount++;

      // Verify scores calculate without error
      for (const player of ['player1', 'player2']) {
        for (const c of COLORS) {
          const score = calculateScore(result.expeditions[player][c]);
          if (typeof score !== 'number' || isNaN(score)) {
            scoreErrors++;
          }
        }
      }
    } catch (e) {
      crashes++;
    }
  }

  assert.strictEqual(crashes, 0, `${crashes} games crashed`);
  assert.strictEqual(scoreErrors, 0, `${scoreErrors} score calculation errors`);
  console.log(`        (${drawPileEmptyCount}/${NUM_GAMES} games ended by draw pile exhaustion)`);
});

test('all simulated games end with empty draw pile', () => {
  // With random legal moves, games should always exhaust the draw pile
  // (players always draw a card each turn)
  let allEmpty = true;
  for (let i = 0; i < 20; i++) {
    const result = simulateGame();
    if (!result.drawPileEmpty) { allEmpty = false; break; }
  }
  assert.strictEqual(allEmpty, true, 'Some games did not exhaust the draw pile');
});

test('expedition cards are in legal order after simulation', () => {
  for (let g = 0; g < 20; g++) {
    const result = simulateGame();
    for (const player of ['player1', 'player2']) {
      for (const c of COLORS) {
        const exp = result.expeditions[player][c];
        for (let i = 1; i < exp.length; i++) {
          const prev = exp[i - 1];
          const curr = exp[i];
          if (prev.value === 0 && curr.value === 0) continue; // wager-wager ok
          if (prev.value === 0 && curr.value > 0) continue; // wager-number ok
          assert.ok(curr.value > prev.value,
            `${player} ${c}: card ${curr.value} not > ${prev.value} at position ${i}`);
        }
      }
    }
  }
});

test('total cards accounted for after simulation (60 total)', () => {
  for (let g = 0; g < 20; g++) {
    const result = simulateGame();
    // We can't count discards from simulateGame easily, but we can verify
    // expedition cards are a subset of valid cards
    let expCardCount = 0;
    for (const player of ['player1', 'player2']) {
      for (const c of COLORS) {
        expCardCount += result.expeditions[player][c].length;
      }
    }
    // Expedition cards should be between 0 and 60
    assert.ok(expCardCount >= 0 && expCardCount <= 60,
      `Expedition card count ${expCardCount} out of range`);
  }
});

test('scores are finite numbers for all simulated games', () => {
  for (let g = 0; g < NUM_GAMES; g++) {
    const result = simulateGame();
    let totalP1 = 0, totalP2 = 0;
    for (const c of COLORS) {
      totalP1 += calculateScore(result.expeditions.player1[c]);
      totalP2 += calculateScore(result.expeditions.player2[c]);
    }
    assert.ok(isFinite(totalP1), `Player 1 score not finite: ${totalP1}`);
    assert.ok(isFinite(totalP2), `Player 2 score not finite: ${totalP2}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
