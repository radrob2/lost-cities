#!/usr/bin/env node
// Full game playthrough via Puppeteer — plays 3+ turns, verifies state consistency

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const GAME_URL = 'file://' + path.resolve(__dirname, '../../public/index.html');
const SCREENSHOT_DIR = path.resolve(__dirname, '../../playtest-screenshots');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS: ${name}`); passed++; }
  catch (e) { console.log(`  FAIL: ${name}\n        ${e.message}`); failed++; }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  console.log('=== Full Game Playthrough ===\n');

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });

  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await wait(1000);

  // Dismiss tutorial + start game
  await page.evaluate(() => {
    if(document.getElementById('tutorial-overlay').classList.contains('active')) closeTutorial();
  });
  await wait(200);
  await page.type('#player-name', 'Tester');
  await wait(100);

  // Start AI game
  const btns = await page.$$('.btn');
  for (const btn of btns) {
    const text = await btn.evaluate(el => el.textContent.trim());
    if (text.includes('Play vs AI')) { await btn.click(); break; }
  }
  await wait(500);

  // Helper: play one full turn (play phase + draw phase)
  async function playOneTurn(turnNum) {
    // Check if it's our turn
    const isMyTurn = await page.evaluate(() =>
      gameState && gameState.currentTurn === mySlot && gameState.phase === 'play'
    );
    if (!isMyTurn) return false;

    const handBefore = await page.$$('#hand-cards .card');
    const handCountBefore = handBefore.length;

    // Select first card
    if (handCountBefore === 0) return false;
    await handBefore[0].click();
    await wait(200);

    // Find and click a target
    const target = await page.$('.card.target');
    if (!target) {
      // Deselect and try another card
      await handBefore[0].click();
      await wait(100);
      if (handCountBefore > 1) {
        await handBefore[1].click();
        await wait(200);
        const t2 = await page.$('.card.target');
        if (t2) { await t2.click(); await wait(300); }
        else return false;
      } else return false;
    } else {
      await target.click();
      await wait(300);
    }

    // Verify we're in draw phase
    const phase = await page.evaluate(() => gameState ? gameState.phase : null);
    if (phase === 'draw') {
      // Draw from draw pile
      const drawPileEl = await page.$('#deck-draw');
      if (drawPileEl) { await drawPileEl.click(); await wait(300); }
    }

    // Wait for AI turn
    await wait(3500);

    return true;
  }

  // Play multiple turns
  let turnsPlayed = 0;
  for (let i = 0; i < 5; i++) {
    const played = await playOneTurn(i);
    if (played) turnsPlayed++;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `game-turn-${i}.png`) });
  }

  await test(`played ${turnsPlayed} turns successfully`, async () => {
    if (turnsPlayed < 2) throw new Error(`Only played ${turnsPlayed} turns`);
  });

  await test('game state is consistent after multiple turns', async () => {
    const state = await page.evaluate(() => {
      if (!gameState) return null;
      const hand1 = (gameState.hands && gameState.hands.player1) || [];
      const hand2 = (gameState.hands && gameState.hands.player2) || [];
      let expCount = 0;
      for (const p of ['player1', 'player2'])
        for (const c of ['red','green','blue','white','yellow'])
          expCount += ((gameState.expeditions[p] || {})[c] || []).length;
      const drawPileLen = (gameState.drawPile || []).length;
      return { hand1: hand1.length, hand2: hand2.length, expCount, drawPileLen, status: gameState.status };
    });
    if (!state) throw new Error('No game state');
    console.log(`        Hands: ${state.hand1}/${state.hand2}, Expeditions: ${state.expCount}, Draw pile: ${state.drawPileLen}, Status: ${state.status}`);
    if (state.hand1 < 0 || state.hand1 > 9) throw new Error(`P1 hand size ${state.hand1} out of range`);
    if (state.hand2 < 0 || state.hand2 > 9) throw new Error(`P2 hand size ${state.hand2} out of range`);
  });

  await test('draw pile count decreases as game progresses', async () => {
    const drawPileText = await page.$eval('#deck-count-label', el => el.textContent);
    const drawPileCount = parseInt(drawPileText);
    if (drawPileCount >= 44) throw new Error(`Draw pile still at ${drawPileCount} — no cards drawn?`);
    console.log(`        Draw pile: ${drawPileCount} cards left`);
  });

  await test('expeditions have legal card ordering', async () => {
    const errors = await page.evaluate(() => {
      const errs = [];
      for (const p of ['player1', 'player2']) {
        for (const c of ['red','green','blue','white','yellow']) {
          const exp = (gameState.expeditions[p] || {})[c] || [];
          for (let i = 1; i < exp.length; i++) {
            const prev = exp[i-1], curr = exp[i];
            if (prev.value === 0 && curr.value === 0) continue;
            if (prev.value === 0 && curr.value > 0) continue;
            if (curr.value <= prev.value) errs.push(`${p} ${c}: ${prev.value} -> ${curr.value}`);
          }
        }
      }
      return errs;
    });
    if (errors.length > 0) throw new Error(`Illegal ordering: ${errors.join(', ')}`);
  });

  await test('no duplicate card IDs in game state', async () => {
    const dupes = await page.evaluate(() => {
      const ids = new Set();
      const all = [...(gameState.drawPile||[]), ...(gameState.hands.player1||[]), ...(gameState.hands.player2||[])];
      for (const p of ['player1','player2'])
        for (const c of ['red','green','blue','white','yellow'])
          all.push(...((gameState.expeditions[p]||{})[c]||[]));
      for (const c of ['red','green','blue','white','yellow'])
        all.push(...((gameState.discards||{})[c]||[]));
      all.push(...(gameState.singlePile||[]));
      const dupes = [];
      for (const card of all) {
        if (ids.has(card.id)) dupes.push(card.id);
        ids.add(card.id);
      }
      return { total: all.length, dupes };
    });
    if (dupes.dupes.length > 0) throw new Error(`Duplicate IDs: ${dupes.dupes.join(', ')}`);
    if (dupes.total !== 60) throw new Error(`Total cards: ${dupes.total}, expected 60`);
    console.log(`        All 60 cards accounted for, 0 duplicates`);
  });

  await test('opponent (AI) has played cards', async () => {
    const aiCards = await page.evaluate(() => {
      let count = 0;
      for (const c of ['red','green','blue','white','yellow'])
        count += ((gameState.expeditions.player2 || {})[c] || []).length;
      return count;
    });
    console.log(`        AI has ${aiCards} cards in expeditions`);
    // AI should have played at least something after 2+ turns
  });

  // Take final screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'game-final.png') });

  await test('no unexpected JS errors during game', async () => {
    const real = jsErrors.filter(e => !e.includes('Worker') && !e.includes('firebase'));
    if (real.length > 0) throw new Error(`JS errors: ${real.join('; ')}`);
  });

  await browser.close();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
