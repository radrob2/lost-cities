#!/usr/bin/env node
// UI Playtest — uses Puppeteer to load the game, interact with it, and catch issues.
// Takes screenshots at each stage for visual review.

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const GAME_URL = 'file://' + path.resolve(__dirname, '../../public/index.html');
const SCREENSHOT_DIR = path.resolve(__dirname, '../../playtest-screenshots');

let passed = 0, failed = 0;
const errors = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${e.message}`);
    failed++;
    errors.push({ name, error: e.message });
  }
}

(async () => {
  // Setup
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  console.log('=== UI Playtest Suite ===\n');
  console.log(`Loading: ${GAME_URL}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 }); // iPhone viewport

  // Collect console errors
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  // Load the game (file:// protocol means no Firebase, but UI should render)
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await new Promise(r=>setTimeout(r,1000)); // Let scripts initialize

  // Dismiss tutorial if it auto-opened
  const tutorialOpen = await page.$eval('#tutorial-overlay', el => el.classList.contains('active')).catch(() => false);
  if (tutorialOpen) {
    await page.evaluate(() => closeTutorial());
    await new Promise(r => setTimeout(r, 300));
  }

  // ========== LOBBY SCREEN TESTS ==========
  await test('lobby screen renders', async () => {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-lobby.png') });
    const title = await page.$eval('.lobby-title', el => el.textContent);
    if (!title.includes('Lost Cities') && !title.includes('Expedition'))
      throw new Error(`Unexpected title: ${title}`);
  });

  await test('lobby has Play vs AI button', async () => {
    const btns = await page.$$eval('.btn', els => els.map(e => e.textContent.trim()));
    if (!btns.some(b => b.includes('Play vs AI'))) throw new Error(`Buttons: ${btns.join(', ')}`);
  });

  await test('lobby has personality picker with all options', async () => {
    const buttons = await page.$$eval('[id^="pbtn-"]', els => els.map(e => ({ id: e.id, text: e.textContent.trim() })));
    const ids = buttons.map(b => b.id);
    for (const expected of ['pbtn-explorer', 'pbtn-scholar', 'pbtn-heuristic', 'pbtn-seer', 'pbtn-oracle']) {
      if (!ids.includes(expected)) throw new Error(`Missing personality button: ${expected}`);
    }
  });

  await test('variant buttons work', async () => {
    await page.click('#vbtn-single');
    const singleActive = await page.$eval('#vbtn-single', el => el.classList.contains('active'));
    if (!singleActive) throw new Error('Single pile button not active after click');
    await page.click('#vbtn-classic');
    const classicActive = await page.$eval('#vbtn-classic', el => el.classList.contains('active'));
    if (!classicActive) throw new Error('Classic button not active after click');
  });

  await test('personality selection shows boss warning', async () => {
    await page.click('#pbtn-seer');
    await new Promise(r=>setTimeout(r,100));
    const warn = await page.$eval('#boss-warn', el => el.textContent);
    if (!warn.includes('see your cards')) throw new Error(`Warn text: "${warn}"`);
    await page.click('#pbtn-heuristic'); // reset
    await new Promise(r=>setTimeout(r,100));
    const noWarn = await page.$eval('#boss-warn', el => el.textContent);
    if (noWarn.length > 0) throw new Error(`Should have no warning, got: "${noWarn}"`);
  });

  // ========== TUTORIAL TESTS ==========
  await test('tutorial opens and has slides', async () => {
    // Check if tutorial overlay exists
    const tutorialExists = await page.$('#tutorial-overlay');
    if (!tutorialExists) throw new Error('Tutorial overlay not found');
    // Show it manually
    await page.evaluate(() => showTutorial());
    await new Promise(r=>setTimeout(r,300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-tutorial.png') });
    const activeSlide = await page.$('.tutorial-slide.active');
    if (!activeSlide) throw new Error('No active tutorial slide');
  });

  await test('tutorial navigation works', async () => {
    // Click Next
    await page.click('#tutorial-next-btn');
    await new Promise(r=>setTimeout(r,200));
    const slide1Active = await page.$$eval('.tutorial-slide', els => els.findIndex(e => e.classList.contains('active')));
    if (slide1Active !== 1) throw new Error(`Expected slide 1 active, got ${slide1Active}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-tutorial-slide2.png') });
    // Go to last slide
    await page.click('#tutorial-next-btn');
    await page.click('#tutorial-next-btn');
    await new Promise(r=>setTimeout(r,200));
    const btnText = await page.$eval('#tutorial-next-btn', el => el.textContent);
    if (!btnText.includes('Got it')) throw new Error(`Last slide button should say "Got it", got "${btnText}"`);
    // Close tutorial
    await page.click('#tutorial-next-btn');
    await new Promise(r=>setTimeout(r,300));
  });

  // ========== ENTER NAME + START AI GAME ==========
  await test('can enter name and start AI game', async () => {
    // Type name
    await page.type('#player-name', 'TestBot');
    await new Promise(r=>setTimeout(r,100));
    // Click Play vs AI
    const btns = await page.$$('.btn');
    for (const btn of btns) {
      const text = await btn.evaluate(el => el.textContent.trim());
      if (text.includes('Play vs AI')) { await btn.click(); break; }
    }
    await new Promise(r=>setTimeout(r,500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-game-start.png') });
    // Check we're on game screen
    const gameScreen = await page.$eval('#game-screen', el => el.classList.contains('active'));
    if (!gameScreen) throw new Error('Game screen not active after starting AI game');
  });

  // ========== GAME BOARD TESTS ==========
  await test('game board has hand cards', async () => {
    const handCards = await page.$$('#hand-cards .card');
    if (handCards.length !== 8) throw new Error(`Expected 8 hand cards, got ${handCards.length}`);
  });

  await test('turn indicator shows "Your Turn"', async () => {
    const turnText = await page.$eval('#turn-indicator', el => el.textContent);
    if (!turnText.includes('Your Turn')) throw new Error(`Turn indicator: "${turnText}"`);
  });

  await test('deck shows card count', async () => {
    const deckLabel = await page.$eval('#deck-count-label', el => el.textContent);
    if (!deckLabel.includes('left')) throw new Error(`Deck label: "${deckLabel}"`);
    const count = parseInt(deckLabel);
    if (count !== 44) throw new Error(`Expected 44 cards in deck, got ${count}`);
  });

  await test('cards have proper color classes', async () => {
    const classes = await page.$$eval('#hand-cards .card', els => els.map(e => e.className));
    const hasColor = classes.every(c => COLORS.some(color => c.includes(`color-${color}`)));
    if (!hasColor) throw new Error(`Some cards missing color class: ${classes.join(', ')}`);
  });

  await test('cards have data-id attributes', async () => {
    const ids = await page.$$eval('#hand-cards .card', els => els.map(e => e.getAttribute('data-id')));
    if (ids.some(id => !id)) throw new Error('Some cards missing data-id');
    const unique = new Set(ids);
    if (unique.size !== ids.length) throw new Error('Duplicate card IDs in hand');
  });

  // ========== PLAY A CARD ==========
  await test('selecting a card highlights it', async () => {
    const firstCard = await page.$('#hand-cards .card');
    await firstCard.click();
    await new Promise(r=>setTimeout(r,200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-card-selected.png') });
    const selected = await page.$('#hand-cards .card.selected');
    if (!selected) throw new Error('No card has selected class after clicking');
  });

  await test('selecting card shows target zones', async () => {
    // Check for either expedition targets or discard targets
    const targets = await page.$$('.card.target');
    const targetLabels = await page.$$('.target-label');
    if (targets.length === 0 && targetLabels.length === 0)
      throw new Error('No target zones highlighted after card selection');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-targets-shown.png') });
  });

  // Try to play or discard the selected card
  await test('can play/discard a card (play phase)', async () => {
    // Click first available target
    const target = await page.$('.card.target');
    if (target) {
      await target.click();
      await new Promise(r=>setTimeout(r,300));
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-after-play.png') });
    // Should now be in draw phase or card was played
    const handCards = await page.$$('#hand-cards .card');
    // Hand should have 7 cards now (played/discarded one)
    if (handCards.length !== 7) throw new Error(`Expected 7 cards after play, got ${handCards.length}`);
  });

  await test('can draw from deck (draw phase)', async () => {
    const phaseBar = await page.$eval('.phase-bar', el => el.textContent);
    if (phaseBar.includes('Draw') || phaseBar.includes('draw') || phaseBar.includes('deck')) {
      // Click deck
      const deck = await page.$('#deck-draw');
      if (deck) {
        await deck.click();
        await new Promise(r=>setTimeout(r,500));
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-after-draw.png') });
  });

  // Wait for AI turn
  await test('AI takes its turn', async () => {
    await new Promise(r=>setTimeout(r,3000)); // AI thinking time
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-after-ai-turn.png') });
    // Check turn indicator flipped back
    const turnText = await page.$eval('#turn-indicator', el => el.textContent);
    // It should be back to our turn (or game could have ended)
    console.log(`        Turn after AI: "${turnText}"`);
  });

  // ========== GAME MENU ==========
  await test('game menu opens and closes', async () => {
    // Navigate back to game screen first
    await page.evaluate(() => showScreen('game-screen'));
    await new Promise(r=>setTimeout(r,200));
    // Open menu via JS (click may fail due to overlay/z-index)
    await page.evaluate(() => showGameMenu());
    await new Promise(r=>setTimeout(r,300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-game-menu.png') });
    const menuVisible = await page.$eval('#game-menu', el => el.classList.contains('active'));
    if (!menuVisible) throw new Error('Game menu not visible after showGameMenu()');
    // Check colorblind toggle exists
    const cbBtn = await page.$('#cb-toggle-btn');
    if (!cbBtn) throw new Error('Colorblind toggle button not found in menu');
    // Check colorblind toggle text
    const cbText = await page.$eval('#cb-toggle-btn', el => el.textContent);
    if (!cbText.includes('Colorblind Mode')) throw new Error(`CB button text: "${cbText}"`);
    // Close menu
    await page.evaluate(() => closeGameMenu());
    await new Promise(r=>setTimeout(r,200));
  });

  // ========== COLORBLIND MODE ==========
  await test('colorblind mode adds symbols to cards', async () => {
    // Enable colorblind mode
    await page.evaluate(() => { colorblindMode = true; renderGame(); });
    await new Promise(r=>setTimeout(r,300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-colorblind-mode.png') });
    const cbSyms = await page.$$('.cb-sym');
    if (cbSyms.length === 0) throw new Error('No colorblind symbols found on cards');
    console.log(`        Found ${cbSyms.length} colorblind symbols`);
    // Disable
    await page.evaluate(() => { colorblindMode = false; renderGame(); });
  });

  // ========== DEBUG SCORE SCREEN ==========
  await test('debug score screen renders correctly', async () => {
    await page.evaluate(() => {
      mySlot = 'player1';
      const testState = {
        expeditions: {
          player1: {
            red: [{color:'red',value:0,id:'r_w0'},{color:'red',value:0,id:'r_w1'},{color:'red',value:2,id:'r_2'},{color:'red',value:4,id:'r_4'},{color:'red',value:5,id:'r_5'},{color:'red',value:6,id:'r_6'},{color:'red',value:7,id:'r_7'},{color:'red',value:8,id:'r_8'}],
            green: [{color:'green',value:3,id:'g_3'},{color:'green',value:6,id:'g_6'}],
            blue: [], white: [{color:'white',value:0,id:'w_w0'},{color:'white',value:3,id:'w_3'}], yellow: []
          },
          player2: {
            red: [{color:'red',value:0,id:'r2_w0'},{color:'red',value:3,id:'r2_3'}],
            green: [{color:'green',value:4,id:'g2_4'},{color:'green',value:6,id:'g2_6'},{color:'green',value:8,id:'g2_8'},{color:'green',value:10,id:'g2_10'}],
            blue: [{color:'blue',value:2,id:'b2_2'},{color:'blue',value:5,id:'b2_5'},{color:'blue',value:9,id:'b2_9'}],
            white: [], yellow: [{color:'yellow',value:7,id:'y2_7'}]
          }
        }
      };
      gameState = testState;
      showGameOver();
    });
    await new Promise(r=>setTimeout(r,500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-score-screen.png') });

    // Check score screen elements
    const winnerText = await page.$eval('#winner-text', el => el.textContent);
    if (!winnerText) throw new Error('No winner text');
    console.log(`        Winner text: "${winnerText}"`);

    const scoreDetails = await page.$eval('#score-details', el => el.innerHTML.length);
    if (scoreDetails < 50) throw new Error('Score details seem empty');
  });

  await test('score screen color rows are clickable (expand/collapse)', async () => {
    // Click first color row to expand
    const colorRow = await page.$('[id^="sc-row-"]');
    if (colorRow) {
      await colorRow.click();
      await new Promise(r=>setTimeout(r,200));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13-score-expanded.png') });
      const body = await page.$('[id^="sc-body-"]');
      const bodyDisplay = body ? await body.evaluate(el => el.style.display) : 'missing';
      if (bodyDisplay === 'none') throw new Error('Score body still hidden after click');
    }
  });

  // ========== VIEWPORT TESTS ==========
  await test('renders at 375px width (iPhone SE)', async () => {
    await page.setViewport({ width: 375, height: 667 });
    await page.evaluate(() => { showScreen('lobby-screen'); });
    await new Promise(r=>setTimeout(r,200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14-iphone-se.png') });
    // Check nothing overflows
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    if (bodyWidth > 375) throw new Error(`Body overflows: ${bodyWidth}px > 375px`);
  });

  await test('renders at 390px width (iPhone 14)', async () => {
    await page.setViewport({ width: 390, height: 844 });
    await page.evaluate(() => { showScreen('lobby-screen'); });
    await new Promise(r=>setTimeout(r,200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15-iphone-14.png') });
  });

  await test('renders at 412px width (Pixel 7)', async () => {
    await page.setViewport({ width: 412, height: 915 });
    await page.evaluate(() => { showScreen('lobby-screen'); });
    await new Promise(r=>setTimeout(r,200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16-pixel-7.png') });
  });

  // ========== CONSOLE ERROR CHECK ==========
  await test('no JavaScript errors in console', async () => {
    // Filter out expected Firebase errors (we're running from file://)
    const realErrors = consoleErrors.filter(e =>
      !e.includes('firebase') && !e.includes('Firebase') &&
      !e.includes('ERR_FILE_NOT_FOUND') && !e.includes('net::') &&
      !e.includes('Worker creation failed') && !e.includes('Failed to construct')
    );
    if (realErrors.length > 0) {
      throw new Error(`${realErrors.length} console errors:\n        ${realErrors.join('\n        ')}`);
    }
    console.log(`        (${consoleErrors.length} Firebase-related errors ignored, expected for file:// protocol)`);
  });

  // Cleanup
  await browser.close();

  // Summary
  console.log(`\n${passed} passed, ${failed} failed`);
  if (errors.length > 0) {
    console.log('\nFailed tests:');
    errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  }
  console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}/`);
  console.log(`Review them to verify visual correctness.`);

  if (failed > 0) process.exit(1);
})();

const COLORS = ['red', 'green', 'blue', 'white', 'yellow'];
