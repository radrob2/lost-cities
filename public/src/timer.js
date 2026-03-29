// ===== TURN TIMER =====
// Depends on: globals (gameState, mySlot, selectedCard, variant, isAIGame, roomRef, COLORS),
//             getCards, renderGame, toast, SFX, discardTo, discardToSingle, drawFromDeck

// --- Timer State ---
let timerSetting = localStorage.getItem('expedition-timer-setting') || 'friendly';
let timerSecondsLeft = 0;
let timerIntervalId = null;
let timerActive = false;

// --- Timer Setting Helpers ---
function getTimerSeconds() {
  if (timerSetting === '30') return 30;
  if (timerSetting === '60') return 60;
  if (timerSetting === '90') return 90;
  return 0; // friendly = no timer
}

function isTimerEnabled() {
  return timerSetting !== 'friendly';
}

function setTimerSetting(val) {
  timerSetting = val;
  localStorage.setItem('expedition-timer-setting', val);
  // Update UI buttons in AI modal
  updateTimerButtons('timer-picker-ai');
  // Update UI buttons in game menu
  updateTimerButtons('timer-picker-menu');
  // If mid-game and multiplayer, sync to Firebase
  if (!isAIGame && roomRef && gameState && gameState.status === 'playing') {
    roomRef.child('settings/timer').set(val);
  }
  // If timer is running, restart with new setting
  if (timerActive) {
    stopTurnTimer();
    if (gameState && gameState.currentTurn === mySlot && isTimerEnabled()) {
      startTurnTimer();
    }
  }
  updateTimerDisplay();
}

function updateTimerButtons(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const btns = container.querySelectorAll('.timer-opt-btn');
  btns.forEach(btn => {
    const val = btn.dataset.timer;
    btn.className = 'variant-btn timer-opt-btn' + (val === timerSetting ? ' active' : '');
  });
}

// --- Timer Display ---
function getOrCreateTimerDisplay() {
  let el = document.getElementById('turn-timer-display');
  if (!el) {
    el = document.createElement('span');
    el.id = 'turn-timer-display';
    el.style.cssText = 'font-family:Cinzel,serif;font-weight:700;font-size:var(--text-md);line-height:var(--line-lg);margin-left:var(--space-micro);font-variant-numeric:tabular-nums;display:none;transition:color 0.3s;';
    const ti = document.getElementById('turn-indicator');
    if (ti && ti.parentNode) {
      ti.parentNode.insertBefore(el, ti.nextSibling);
    }
  }
  return el;
}

function updateTimerDisplay() {
  const el = getOrCreateTimerDisplay();
  if (!isTimerEnabled() || !timerActive || !gameState || gameState.currentTurn !== mySlot) {
    el.style.display = 'none';
    el.classList.remove('timer-pulse');
    return;
  }
  el.style.display = 'inline';
  el.textContent = timerSecondsLeft + 's';
  // Color logic
  if (timerSecondsLeft <= 5) {
    el.style.color = '#e74c3c';
    el.classList.add('timer-pulse');
  } else if (timerSecondsLeft <= 10) {
    el.style.color = '#f0c850';
    el.classList.remove('timer-pulse');
  } else {
    el.style.color = '#ffffff';
    el.classList.remove('timer-pulse');
  }
}

// --- Timer Core ---
function startTurnTimer() {
  stopTurnTimer();
  if (!isTimerEnabled()) return;
  const secs = getTimerSeconds();
  if (secs <= 0) return;
  timerSecondsLeft = secs;
  timerActive = true;
  updateTimerDisplay();
  timerIntervalId = setInterval(() => {
    timerSecondsLeft--;
    if (timerSecondsLeft <= 0) {
      timerSecondsLeft = 0;
      updateTimerDisplay();
      stopTurnTimer();
      autoPlayOnTimeout();
      return;
    }
    updateTimerDisplay();
  }, 1000);
}

function stopTurnTimer() {
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  timerActive = false;
  updateTimerDisplay();
}

// --- Auto-play on Timeout ---
async function autoPlayOnTimeout() {
  if (!gameState || gameState.currentTurn !== mySlot) return;
  SFX.error();
  toast("Time's up! Auto-played.");

  const hand = getCards(gameState, 'hands', mySlot);
  if (hand.length === 0) return;

  if (gameState.phase === 'play') {
    // Pick a random card from hand
    const randomIndex = Math.floor(Math.random() * hand.length);
    const card = hand[randomIndex];
    // Select the card, then discard it
    selectedCard = card;
    if (variant === 'single') {
      await discardToSingle();
    } else {
      await discardTo(card.color);
    }
    // Now draw from draw pile
    await drawFromDrawPile();
  } else if (gameState.phase === 'draw') {
    // Already in draw phase (play phase was done but draw wasn't) — just draw from draw pile
    await drawFromDrawPile();
  }
}

// --- Hook into renderGame ---
// Wrap renderGame to detect turn changes and manage timer
const _origRenderGameForTimer = typeof renderGame === 'function' ? renderGame : null;

function _timerRenderHook() {
  if (!gameState) return;
  const isMyTurn = gameState.currentTurn === mySlot;
  const wasTimerActive = timerActive;

  if (isMyTurn && gameState.phase === 'play' && gameState.status === 'playing') {
    // Start timer if not already running
    if (!timerActive && isTimerEnabled()) {
      startTurnTimer();
    }
  } else if (isMyTurn && gameState.phase === 'draw' && gameState.status === 'playing') {
    // Keep timer running during draw phase (same turn)
  } else {
    // Not my turn or game over — stop timer
    if (timerActive) {
      stopTurnTimer();
    }
  }
  updateTimerDisplay();
}

// Inject timer hook after renderGame
(function() {
  if (typeof renderGame !== 'function') return;
  const _orig = renderGame;
  renderGame = function() {
    _orig.apply(this, arguments);
    _timerRenderHook();
  };
})();

// --- CSS for timer pulse animation ---
(function() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes timerPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }
    .timer-pulse {
      animation: timerPulse 0.8s ease-in-out infinite;
      display: inline-block !important;
    }
  `;
  document.head.appendChild(style);
})();

// --- Inject Timer UI into AI Personality Modal ---
(function() {
  function createTimerPicker(id) {
    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.style.cssText = 'display:flex;gap:var(--space-micro);justify-content:center;flex-wrap:wrap;';
    const options = [
      { val: '30', label: '30s' },
      { val: '60', label: '60s' },
      { val: '90', label: '90s' },
      { val: 'friendly', label: 'Friendly' }
    ];
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'variant-btn timer-opt-btn' + (opt.val === timerSetting ? ' active' : '');
      btn.dataset.timer = opt.val;
      btn.textContent = opt.label;
      btn.onclick = function() { SFX.select(); setTimerSetting(opt.val); };
      wrap.appendChild(btn);
    });
    return wrap;
  }

  // AI modal: insert before Start Game button
  const aiModal = document.getElementById('ai-personality-modal');
  if (aiModal) {
    const startBtn = aiModal.querySelector('.btn');
    // Find the "Start Game" button specifically
    const btns = aiModal.querySelectorAll('.btn');
    let targetBtn = null;
    btns.forEach(b => { if (b.textContent.trim() === 'Start Game') targetBtn = b; });
    if (targetBtn) {
      const label = document.createElement('div');
      label.style.cssText = "font-family:'Cinzel',serif;font-size:var(--text-sm);line-height:var(--line-md);color:var(--parchment-dark);margin:var(--gap-sm) 0 var(--space-micro);opacity:.5;text-align:center;";
      label.textContent = 'Turn Timer';
      targetBtn.parentNode.insertBefore(label, targetBtn);
      targetBtn.parentNode.insertBefore(createTimerPicker('timer-picker-ai'), targetBtn);
    }
  }

  // Game menu: insert before "Main Menu" button
  const gameMenu = document.getElementById('game-menu');
  if (gameMenu) {
    const menuBtns = gameMenu.querySelectorAll('.btn');
    let mainMenuBtn = null;
    menuBtns.forEach(b => { if (b.textContent.trim() === 'Main Menu') mainMenuBtn = b; });
    if (mainMenuBtn) {
      const label = document.createElement('div');
      label.style.cssText = "font-family:'Cinzel',serif;font-size:var(--text-sm);line-height:var(--line-md);color:var(--parchment-dark);margin:var(--gap-sm) 0 var(--space-micro);opacity:.5;text-align:center;";
      label.textContent = 'Turn Timer';
      mainMenuBtn.parentNode.insertBefore(label, mainMenuBtn);
      mainMenuBtn.parentNode.insertBefore(createTimerPicker('timer-picker-menu'), mainMenuBtn);
    }
  }
})();

// --- Multiplayer Timer Sync ---
// For multiplayer, the room creator sets the timer; joiner reads it
function syncTimerToRoom() {
  if (isAIGame || !roomRef) return;
  roomRef.child('settings/timer').set(timerSetting);
}

function loadTimerFromRoom() {
  if (isAIGame || !roomRef) return;
  roomRef.child('settings/timer').once('value', snap => {
    const val = snap.val();
    if (val && ['30', '60', '90', 'friendly'].includes(val)) {
      timerSetting = val;
      localStorage.setItem('expedition-timer-setting', val);
      updateTimerButtons('timer-picker-ai');
      updateTimerButtons('timer-picker-menu');
    }
  });
}

// Hook into multiplayer: when creating a room, sync timer; when joining, load timer
(function() {
  if (typeof createRoom === 'function') {
    const _origCreate = createRoom;
    createRoom = async function() {
      await _origCreate.apply(this, arguments);
      // After room is created, sync timer setting
      if (roomRef) syncTimerToRoom();
    };
  }
  if (typeof joinRoom === 'function') {
    const _origJoin = joinRoom;
    joinRoom = async function() {
      await _origJoin.apply(this, arguments);
      // After joining, load timer from room
      if (roomRef) loadTimerFromRoom();
    };
  }
})();

// Listen for timer setting changes in multiplayer (for joiner to see creator's changes)
(function() {
  const _origStartGame = typeof startGame === 'function' ? startGame : null;
  if (_origStartGame) {
    startGame = async function() {
      await _origStartGame.apply(this, arguments);
      if (!isAIGame && roomRef) {
        const timerRef = roomRef.child('settings/timer');
        const timerListener = timerRef.on('value', snap => {
          const val = snap.val();
          if (val && ['30', '60', '90', 'friendly'].includes(val)) {
            timerSetting = val;
            updateTimerButtons('timer-picker-menu');
            // Restart timer if needed
            if (gameState && gameState.currentTurn === mySlot && isTimerEnabled() && !timerActive) {
              startTurnTimer();
            } else if (!isTimerEnabled() && timerActive) {
              stopTurnTimer();
            }
          }
        });
        listeners.push(() => timerRef.off('value', timerListener));
      }
    };
  }
})();
