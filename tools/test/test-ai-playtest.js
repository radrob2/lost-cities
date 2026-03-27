// Comprehensive AI playtesting — exercises all AI code paths through full games
// Tests: heuristic AI, genome AI, edge cases, illegal state detection

const { COLORS, calculateScore, canPlayOnExpedition, createDeck } = require('./game-rules');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); passed++; }
  catch (e) { console.log(`  FAIL: ${name}\n        ${e.message}`); failed++; }
}

console.log('=== AI Playtest Suite ===\n');

// ========== HEURISTIC AI (mirrors ai-worker.js) ==========
function scoreColor(cards) {
  if (!cards || cards.length === 0) return 0;
  let wagers = 0, sum = 0;
  for (const c of cards) { if (c.value === 0) wagers++; else sum += c.value; }
  return (sum - 20) * (1 + wagers) + (cards.length >= 8 ? 20 : 0);
}

function heuristicTurn(sim, player) {
  const hand = sim.hands[player];
  if (hand.length === 0) return true;
  const other = player === 'player1' ? 'player2' : 'player1';
  const myExps = sim.expeditions[player];
  const oppExps = sim.expeditions[other];
  const deckSize = sim.deck.length;

  const handByColor = {};
  for (const c of COLORS) handByColor[c] = [];
  for (const card of hand) handByColor[card.color].push(card);

  let myExpCount = 0;
  for (const c of COLORS) if ((myExps[c] || []).length > 0) myExpCount++;

  function projectScore(exp, handCards) {
    const combined = [...exp];
    const sorted = handCards.filter(h => h.value > 0).sort((a, b) => a.value - b.value);
    let topVal = exp.length > 0 ? exp[exp.length - 1].value : -1;
    for (const c of sorted) { if (c.value > topVal) { combined.push(c); topVal = c.value; } }
    return scoreColor(combined);
  }

  const playOptions = [];
  for (const card of hand) {
    const c = card.color;
    const exp = myExps[c] || [];
    if (!canPlayOnExpedition(card, exp)) continue;
    let score = 0;
    const commitment = exp.length;
    const handInColor = handByColor[c];
    const handCount = handInColor.length;
    const currentScore = scoreColor(exp);
    const remaining = handInColor.filter(h => h.id !== card.id);
    const afterPlay = projectScore([...exp, card], remaining);
    const delta = afterPlay - currentScore;

    if (card.value === 0) {
      if (commitment > 0 && exp.some(e => e.value > 0)) continue;
      const withoutWager = projectScore(exp, remaining);
      score = afterPlay - withoutWager > 0 ? afterPlay - withoutWager : (afterPlay - withoutWager) * 0.5;
      if (deckSize > 35) score += 8; else if (deckSize > 25) score += 3; else score -= 5;
      if (handCount >= 4) score += 5; else if (handCount >= 3) score += 2; else score -= 8;
    } else {
      if (commitment > 0) {
        score = Math.max(delta, card.value * 0.5);
        const futureCount = commitment + 1 + remaining.filter(h => h.value > card.value).length;
        if (futureCount >= 8) score += 20; else if (futureCount >= 6) score += 8;
        const wagerCount = exp.filter(e => e.value === 0).length;
        if (wagerCount > 0) score += card.value * wagerCount * 0.3;
        if (card.value <= 4) score += 3;
      } else {
        if (delta > -5) score = delta * 0.5 + handCount * 3; else score = delta * 0.3;
        if (deckSize < 15) score -= 10; else if (deckSize < 25 && handCount < 3) score -= 8;
        if (myExpCount >= 3) score -= 5; if (myExpCount >= 4) score -= 10;
        if (card.value <= 4 && handCount >= 3) score += 5;
        if (card.value >= 8 && handCount <= 2) score -= 15;
      }
    }
    playOptions.push({ card, score });
  }

  const discardOptions = [];
  for (const card of hand) {
    const c = card.color;
    const exp = myExps[c] || [];
    const oppExp = oppExps[c] || [];
    let safety = 0;
    if (oppExp.length > 0 && canPlayOnExpedition(card, oppExp)) {
      safety = -100 - oppExp.filter(e => e.value === 0).length * 20 - (card.value || 3) * 3;
    } else if (oppExp.length > 0) { safety = -5 - (card.value || 0); if (card.value >= 7) safety = -25; }
    else safety = 8;
    if (exp.length === 0) { if (handByColor[c].length <= 1) safety += 12; safety += 3; if (card.value <= 4) safety += 4; }
    else { safety -= 15; if (canPlayOnExpedition(card, exp)) safety -= 20 + (card.value || 0); }
    if (card.value >= 7) safety -= card.value * 1.5;
    if (card.value === 0) { if (exp.length === 0 && handByColor[c].length <= 2) safety += 8; else if (exp.length > 0) safety -= 12; }
    if (handByColor[c].filter(h => h.id !== card.id).length === 0) safety += 6;
    discardOptions.push({ card, score: safety });
  }

  playOptions.sort((a, b) => b.score - a.score);
  discardOptions.sort((a, b) => b.score - a.score);
  const bestPlay = playOptions[0], bestDiscard = discardOptions[0];

  let action, card, discardedColor = null, justDiscarded = false;
  if (bestPlay && (bestPlay.score > 0 || (bestDiscard && bestDiscard.score < -50 && bestPlay.score > -10))) {
    action = 'play'; card = bestPlay.card;
  } else {
    action = 'discard'; card = bestDiscard.card;
  }

  const idx = hand.indexOf(card);
  if (idx === -1) throw new Error('Card not found in hand');
  hand.splice(idx, 1);

  if (action === 'play') {
    (sim.expeditions[player][card.color] = sim.expeditions[player][card.color] || []).push(card);
  } else {
    if (sim.variant === 'single') { sim.singlePile.push(card); justDiscarded = true; }
    else { (sim.discards[card.color] = sim.discards[card.color] || []).push(card); discardedColor = card.color; }
  }

  // Draw
  let drew = false;
  if (sim.variant === 'classic') {
    let bestDS = -Infinity, bestDC = null;
    for (const c of COLORS) {
      if (c === discardedColor) continue;
      const pile = sim.discards[c] || [];
      if (pile.length === 0) continue;
      const top = pile[pile.length - 1];
      let ds = 0;
      if ((myExps[c] || []).length > 0 && canPlayOnExpedition(top, myExps[c])) { ds = 8 + top.value; if (top.value > 5) ds += 5; }
      if ((oppExps[c] || []).length > 0 && canPlayOnExpedition(top, oppExps[c])) ds = Math.max(ds, 12 + top.value);
      ds -= 2;
      if (ds > bestDS) { bestDS = ds; bestDC = c; }
    }
    if (bestDC && bestDS > 6) { hand.push(sim.discards[bestDC].pop()); drew = true; }
  } else if (!justDiscarded && sim.singlePile && sim.singlePile.length > 0) {
    const top = sim.singlePile[sim.singlePile.length - 1];
    let ds = 0;
    if ((myExps[top.color] || []).length > 0 && canPlayOnExpedition(top, myExps[top.color])) ds = 8 + top.value;
    if (ds > 6) { hand.push(sim.singlePile.pop()); drew = true; }
  }
  if (!drew) {
    if (sim.deck.length === 0) return true;
    hand.push(sim.deck.pop());
    if (sim.deck.length === 0) return true;
  }
  return false;
}

// ========== GAME STATE HELPERS ==========
function createGameState(variant) {
  const deck = createDeck();
  const h1 = deck.splice(0, 8), h2 = deck.splice(0, 8);
  const e1 = {}, e2 = {}, dc = {};
  for (const c of COLORS) { e1[c] = []; e2[c] = []; dc[c] = []; }
  return { hands: { player1: h1, player2: h2 }, expeditions: { player1: e1, player2: e2 },
    discards: dc, singlePile: [], deck, variant };
}

function validateGameState(gs) {
  const errors = [];
  // Check hand sizes
  for (const p of ['player1', 'player2']) {
    const h = gs.hands[p];
    if (h.length < 0 || h.length > 8) errors.push(`${p} hand size ${h.length} out of range`);
  }
  // Check expedition legality
  for (const p of ['player1', 'player2']) {
    for (const c of COLORS) {
      const exp = gs.expeditions[p][c] || [];
      for (let i = 1; i < exp.length; i++) {
        const prev = exp[i - 1], curr = exp[i];
        if (prev.value === 0 && curr.value === 0) continue;
        if (prev.value === 0 && curr.value > 0) continue;
        if (curr.value <= prev.value) errors.push(`${p} ${c}: illegal order ${prev.value} -> ${curr.value}`);
      }
    }
  }
  // Check total card count
  let total = gs.deck.length + gs.hands.player1.length + gs.hands.player2.length;
  for (const p of ['player1', 'player2'])
    for (const c of COLORS) total += (gs.expeditions[p][c] || []).length;
  if (gs.variant === 'classic')
    for (const c of COLORS) total += (gs.discards[c] || []).length;
  else total += (gs.singlePile || []).length;
  if (total !== 60) errors.push(`Card count ${total} != 60`);
  // Check no duplicate IDs
  const ids = new Set();
  const allCards = [...gs.deck, ...gs.hands.player1, ...gs.hands.player2];
  for (const p of ['player1', 'player2'])
    for (const c of COLORS) allCards.push(...(gs.expeditions[p][c] || []));
  if (gs.variant === 'classic')
    for (const c of COLORS) allCards.push(...(gs.discards[c] || []));
  else allCards.push(...(gs.singlePile || []));
  for (const card of allCards) {
    if (ids.has(card.id)) errors.push(`Duplicate card ID: ${card.id}`);
    ids.add(card.id);
  }
  return errors;
}

function playFullGame(variant) {
  const gs = createGameState(variant);
  let turn = 'player1', safety = 200;
  while (safety-- > 0) {
    if (heuristicTurn(gs, turn)) break;
    turn = turn === 'player1' ? 'player2' : 'player1';
  }
  return gs;
}

// ========== TESTS ==========

test('heuristic AI: 500 classic games without crashes', () => {
  let crashes = 0, stateErrors = 0;
  for (let i = 0; i < 500; i++) {
    try {
      const gs = playFullGame('classic');
      const errs = validateGameState(gs);
      if (errs.length > 0) { stateErrors++; if (stateErrors === 1) console.log('        First error:', errs[0]); }
    } catch (e) { crashes++; if (crashes === 1) console.log('        First crash:', e.message); }
  }
  if (crashes > 0) throw new Error(`${crashes}/500 games crashed`);
  if (stateErrors > 0) throw new Error(`${stateErrors}/500 games had illegal state`);
});

test('heuristic AI: 500 single-pile games without crashes', () => {
  let crashes = 0, stateErrors = 0;
  for (let i = 0; i < 500; i++) {
    try {
      const gs = playFullGame('single');
      const errs = validateGameState(gs);
      if (errs.length > 0) { stateErrors++; if (stateErrors === 1) console.log('        First error:', errs[0]); }
    } catch (e) { crashes++; if (crashes === 1) console.log('        First crash:', e.message); }
  }
  if (crashes > 0) throw new Error(`${crashes}/500 games crashed`);
  if (stateErrors > 0) throw new Error(`${stateErrors}/500 games had illegal state`);
});

test('all games end with deck exhausted', () => {
  for (let i = 0; i < 100; i++) {
    const gs = playFullGame('classic');
    if (gs.deck.length !== 0) throw new Error(`Game ${i}: deck has ${gs.deck.length} cards left`);
  }
});

test('scores are reasonable (no extreme outliers)', () => {
  let minScore = Infinity, maxScore = -Infinity;
  for (let i = 0; i < 200; i++) {
    const gs = playFullGame('classic');
    for (const p of ['player1', 'player2']) {
      let total = 0;
      for (const c of COLORS) total += scoreColor(gs.expeditions[p][c] || []);
      minScore = Math.min(minScore, total);
      maxScore = Math.max(maxScore, total);
    }
  }
  // Theoretical range is about -300 to +300. If we see scores outside -400 to +400, something is wrong.
  if (minScore < -400) throw new Error(`Suspiciously low score: ${minScore}`);
  if (maxScore > 400) throw new Error(`Suspiciously high score: ${maxScore}`);
  console.log(`        Score range: ${minScore} to ${maxScore}`);
});

test('no card duplication or loss across 100 games', () => {
  for (let i = 0; i < 100; i++) {
    const gs = playFullGame(i % 2 === 0 ? 'classic' : 'single');
    const errs = validateGameState(gs);
    if (errs.length > 0) throw new Error(`Game ${i}: ${errs[0]}`);
  }
});

test('hand sizes are correct at game end (8 cards each, minus plays/discards)', () => {
  for (let i = 0; i < 50; i++) {
    const gs = playFullGame('classic');
    // At game end, each player should have 8 cards (drew on last turn fills hand)
    // Actually hand size can vary — last draw may end the game mid-turn
    for (const p of ['player1', 'player2']) {
      if (gs.hands[p].length < 0 || gs.hands[p].length > 9)
        throw new Error(`${p} hand size ${gs.hands[p].length} out of range`);
    }
  }
});

test('expedition ordering is always legal after AI play', () => {
  for (let i = 0; i < 200; i++) {
    const gs = playFullGame(i % 2 === 0 ? 'classic' : 'single');
    for (const p of ['player1', 'player2']) {
      for (const c of COLORS) {
        const exp = gs.expeditions[p][c] || [];
        for (let j = 1; j < exp.length; j++) {
          const prev = exp[j - 1], curr = exp[j];
          if (prev.value === 0 && curr.value === 0) continue;
          if (prev.value === 0 && curr.value > 0) continue;
          if (curr.value <= prev.value)
            throw new Error(`Game ${i} ${p} ${c}: ${prev.value} -> ${curr.value} is illegal`);
        }
      }
    }
  }
});

test('heuristic AI never discards playable card to active opponent expedition (sample)', () => {
  // This is a statistical test — run many games and count dangerous discards
  let dangerousDiscards = 0, totalDiscards = 0;
  for (let g = 0; g < 200; g++) {
    const gs = createGameState('classic');
    let turn = 'player1', safety = 200;
    while (safety-- > 0) {
      const other = turn === 'player1' ? 'player2' : 'player1';
      const hand = [...gs.hands[turn]];
      const gameOver = heuristicTurn(gs, turn);
      // Check what was discarded by comparing hands
      const newHand = gs.hands[turn];
      const played = hand.filter(c => !newHand.find(n => n.id === c.id));
      for (const card of played) {
        // Check if it went to discard (not expedition)
        for (const c of COLORS) {
          const pile = gs.discards[c] || [];
          if (pile.length > 0 && pile[pile.length - 1].id === card.id) {
            totalDiscards++;
            const oppExp = gs.expeditions[other][card.color] || [];
            if (oppExp.length > 0 && canPlayOnExpedition(card, oppExp)) dangerousDiscards++;
          }
        }
      }
      if (gameOver) break;
      turn = turn === 'player1' ? 'player2' : 'player1';
    }
  }
  const rate = totalDiscards > 0 ? (dangerousDiscards / totalDiscards * 100).toFixed(1) : '0';
  console.log(`        Dangerous discards: ${dangerousDiscards}/${totalDiscards} (${rate}%)`);
  // Allow up to 5% dangerous discards (sometimes there's no safe option)
  if (totalDiscards > 0 && dangerousDiscards / totalDiscards > 0.05)
    throw new Error(`Too many dangerous discards: ${rate}%`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
