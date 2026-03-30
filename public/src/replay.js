// ===== GAME REPLAY SYSTEM =====
// Depends on: globals (gameState, mySlot, isAIGame, variant, selectedCard, COLORS),
//             renderGame, showScreen, showGameOver, calcScore, toast, SFX,
//             getCards, localUpdate, createDrawPile, canPlayOnExpedition
//             playToExpedition, discardTo, discardToSingle, drawFromDrawPile, drawFromDiscard, drawFromSingle,
//             executeAIPhase1, executeAIPhase2

const REPLAY_STORAGE_KEY = 'expedition-last-replay';

// ===== ACTION LOGGING =====
let gameReplayLog = [];
let _replayInitialState = null;
let _replayRecordingActive = false;

function _deepCloneState(state) {
  if (!state) return null;
  return JSON.parse(JSON.stringify(state));
}

function _logReplayAction(action) {
  if (!_replayRecordingActive) return;
  action.timestamp = Date.now();
  gameReplayLog.push(action);
}

function startReplayRecording() {
  gameReplayLog = [];
  _replayInitialState = _deepCloneState(gameState);
  _replayRecordingActive = true;
}

function stopReplayRecording() {
  _replayRecordingActive = false;
}

// ===== MONKEY-PATCH GAME ACTIONS TO LOG =====

// Wrap playToExpedition
const _replayOrigPlayToExpedition = playToExpedition;
playToExpedition = async function(color) {
  if (_replayActive) return;
  const card = selectedCard ? {color: selectedCard.color, value: selectedCard.value, id: selectedCard.id} : null;
  const player = mySlot;
  const phaseBefore = gameState ? gameState.phase : null;
  const result = await _replayOrigPlayToExpedition(color);
  if (card && card.color === color && phaseBefore === 'play' && gameState && gameState.phase === 'draw') {
    _logReplayAction({type: 'play', card, color, player});
  }
  return result;
};

// Wrap discardTo
const _replayOrigDiscardTo = discardTo;
discardTo = async function(color) {
  if (_replayActive) return;
  const card = selectedCard ? {color: selectedCard.color, value: selectedCard.value, id: selectedCard.id} : null;
  const player = mySlot;
  const phaseBefore = gameState ? gameState.phase : null;
  const result = await _replayOrigDiscardTo(color);
  if (card && card.color === color && phaseBefore === 'play' && gameState && gameState.phase === 'draw') {
    _logReplayAction({type: 'discard', card, color, player});
  }
  return result;
};

// Wrap discardToSingle
const _replayOrigDiscardToSingle = discardToSingle;
discardToSingle = async function() {
  if (_replayActive) return;
  const card = selectedCard ? {color: selectedCard.color, value: selectedCard.value, id: selectedCard.id} : null;
  const player = mySlot;
  const phaseBefore = gameState ? gameState.phase : null;
  const result = await _replayOrigDiscardToSingle();
  if (card && phaseBefore === 'play' && gameState && gameState.phase === 'draw') {
    _logReplayAction({type: 'discard', card, color: card.color, drawFrom: 'single', player});
  }
  return result;
};

// Wrap drawFromDrawPile
const _replayOrigDrawFromDrawPile = drawFromDrawPile;
drawFromDrawPile = async function() {
  if (_replayActive) return;
  const drawPile = getCards(gameState, 'drawPile');
  const topCard = drawPile.length > 0 ? {color: drawPile[drawPile.length-1].color, value: drawPile[drawPile.length-1].value, id: drawPile[drawPile.length-1].id} : null;
  const player = mySlot;
  const phaseBefore = gameState ? gameState.phase : null;
  const result = await _replayOrigDrawFromDrawPile();
  if (topCard && phaseBefore === 'draw' && gameState && gameState.phase === 'play') {
    _logReplayAction({type: 'draw', card: topCard, drawFrom: 'drawPile', player});
  }
  return result;
};

// Wrap drawFromDiscard
const _replayOrigDrawFromDiscard = drawFromDiscard;
drawFromDiscard = async function(color) {
  if (_replayActive) return;
  const pile = getCards(gameState, 'discards', color);
  const topCard = pile.length > 0 ? {color: pile[pile.length-1].color, value: pile[pile.length-1].value, id: pile[pile.length-1].id} : null;
  const player = mySlot;
  const phaseBefore = gameState ? gameState.phase : null;
  const result = await _replayOrigDrawFromDiscard(color);
  if (topCard && phaseBefore === 'draw' && gameState && gameState.phase === 'play') {
    _logReplayAction({type: 'draw', card: topCard, drawFrom: 'discard', drawColor: color, player});
  }
  return result;
};

// Wrap drawFromSingle
const _replayOrigDrawFromSingle = drawFromSingle;
drawFromSingle = async function() {
  if (_replayActive) return;
  const pile = getCards(gameState, 'singlePile') || [];
  const topCard = pile.length > 0 ? {color: pile[pile.length-1].color, value: pile[pile.length-1].value, id: pile[pile.length-1].id} : null;
  const player = mySlot;
  const phaseBefore = gameState ? gameState.phase : null;
  const result = await _replayOrigDrawFromSingle();
  if (topCard && phaseBefore === 'draw' && gameState && gameState.phase === 'play') {
    _logReplayAction({type: 'draw', card: topCard, drawFrom: 'single', player});
  }
  return result;
};

// Wrap executeAIPhase1
const _replayOrigExecuteAIPhase1 = executeAIPhase1;
executeAIPhase1 = function(p1, onDone) {
  const hand = getCards(gameState, 'hands', 'player2');
  const card = hand.find(c => c.id === p1.card.id);
  if (card) {
    if (p1.type === 'play') {
      _logReplayAction({type: 'play', card: {color: card.color, value: card.value, id: card.id}, color: card.color, player: 'player2'});
    } else {
      _logReplayAction({type: 'discard', card: {color: card.color, value: card.value, id: card.id}, color: card.color, drawFrom: variant === 'single' ? 'single' : undefined, player: 'player2'});
    }
  }
  return _replayOrigExecuteAIPhase1(p1, onDone);
};

// Wrap executeAIPhase2
const _replayOrigExecuteAIPhase2 = executeAIPhase2;
executeAIPhase2 = function(p2) {
  if (gameState.status === 'finished') return _replayOrigExecuteAIPhase2(p2);

  if (p2.type === 'discard' && variant === 'classic') {
    const pile = getCards(gameState, 'discards', p2.color);
    if (pile.length > 0) {
      const card = pile[pile.length - 1];
      _logReplayAction({type: 'draw', card: {color: card.color, value: card.value, id: card.id}, drawFrom: 'discard', drawColor: p2.color, player: 'player2'});
    } else {
      // Falls back to draw pile
      const drawPile = getCards(gameState, 'drawPile');
      if (drawPile.length > 0) {
        const card = drawPile[drawPile.length - 1];
        _logReplayAction({type: 'draw', card: {color: card.color, value: card.value, id: card.id}, drawFrom: 'drawPile', player: 'player2'});
      }
    }
  } else if (p2.type === 'single') {
    const pile = getCards(gameState, 'singlePile') || [];
    if (pile.length > 0) {
      const card = pile[pile.length - 1];
      _logReplayAction({type: 'draw', card: {color: card.color, value: card.value, id: card.id}, drawFrom: 'single', player: 'player2'});
    } else {
      const drawPile = getCards(gameState, 'drawPile');
      if (drawPile.length > 0) {
        const card = drawPile[drawPile.length - 1];
        _logReplayAction({type: 'draw', card: {color: card.color, value: card.value, id: card.id}, drawFrom: 'drawPile', player: 'player2'});
      }
    }
  } else {
    // Draw from draw pile
    const drawPile = getCards(gameState, 'drawPile');
    if (drawPile.length > 0) {
      const card = drawPile[drawPile.length - 1];
      _logReplayAction({type: 'draw', card: {color: card.color, value: card.value, id: card.id}, drawFrom: 'drawPile', player: 'player2'});
    }
  }

  return _replayOrigExecuteAIPhase2(p2);
};

// ===== HOOK INTO GAME START =====
const _replayOrigStartAIGame = startAIGame;
startAIGame = function() {
  _replayOrigStartAIGame();
  startReplayRecording();
};

// ===== SAVE REPLAY ON GAME OVER =====
let _replaySavedForGame = false;
on('gameOver', function(data) {
  if (!_replaySavedForGame) {
    _replaySavedForGame = true;
    stopReplayRecording();
    saveReplay();
  }
  _injectReplayButton();
});

function saveReplay() {
  if (!_replayInitialState || gameReplayLog.length === 0) return;
  const replay = {
    initialState: _replayInitialState,
    actions: gameReplayLog,
    variant: variant,
    mySlot: mySlot,
    isAIGame: isAIGame,
    aiPersonality: typeof aiPersonality !== 'undefined' ? aiPersonality : null,
    savedAt: Date.now()
  };
  try {
    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(replay));
  } catch (e) {
    console.error('Failed to save replay:', e);
  }
}

function loadReplay() {
  try {
    const raw = localStorage.getItem(REPLAY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load replay:', e);
    return null;
  }
}

// ===== INJECT REPLAY BUTTON INTO GAME OVER SCREEN =====
function _injectReplayButton() {
  if (document.getElementById('replay-btn')) return;
  const replay = loadReplay();
  if (!replay) return;
  const btnsContainer = document.querySelector('#gameover-screen > div:last-child');
  if (!btnsContainer) return;
  const viewBoardBtn = btnsContainer.querySelector('button:nth-child(2)');
  if (!viewBoardBtn) return;
  const replayBtn = document.createElement('button');
  replayBtn.id = 'replay-btn';
  replayBtn.className = 'btn';
  replayBtn.textContent = 'Replay';
  replayBtn.onclick = function() { SFX.select(); startReplayPlayback(); };
  viewBoardBtn.after(replayBtn);
}

// ===== REPLAY PLAYBACK =====
let _replayActive = false;
let _replayPlaying = false;
let _replayStep = 0;
let _replayTimer = null;
let _replaySpeed = 1; // 1x, 2x, 4x
let _replayData = null;
let _replaySavedGameState = null;
let _replaySavedMySlot = null;
let _replaySavedVariant = null;
let _replaySavedIsAIGame = null;
let _replaySavedSelectedCard = null;

function startReplayPlayback() {
  const replay = loadReplay();
  if (!replay || !replay.initialState || !replay.actions || replay.actions.length === 0) {
    toast('No replay data available');
    return;
  }
  _replayData = replay;

  // Save current game state
  _replaySavedGameState = _deepCloneState(gameState);
  _replaySavedMySlot = mySlot;
  _replaySavedVariant = variant;
  _replaySavedIsAIGame = isAIGame;
  _replaySavedSelectedCard = selectedCard;

  // Set up replay state
  mySlot = replay.mySlot;
  variant = replay.variant;
  gameState = _deepCloneState(replay.initialState);
  selectedCard = null;
  _replayActive = true;
  _replayPlaying = false;
  _replayStep = 0;
  _replaySpeed = 1;

  // Switch to game screen and render
  showScreen('game-screen');
  renderGame();

  // Show replay control bar
  _createReplayControls();
  _updateReplayInfo();

  // Update phase bar
  const pb = document.getElementById('phase-prompt');
  if (pb) pb.textContent = 'Replay — Press Play to start';
}

function _createReplayControls() {
  // Remove existing if any
  const existing = document.getElementById('replay-control-bar');
  if (existing) existing.remove();

  const bar = document.createElement('div');
  bar.id = 'replay-control-bar';
  bar.innerHTML = `
    <div class="replay-controls-inner">
      <button id="replay-exit-btn" class="replay-ctrl-btn" title="Exit Replay">&#x2715;</button>
      <button id="replay-step-back-btn" class="replay-ctrl-btn" title="Step Back">&#x23EA;</button>
      <button id="replay-play-btn" class="replay-ctrl-btn replay-play" title="Play">&#x25B6;</button>
      <button id="replay-step-fwd-btn" class="replay-ctrl-btn" title="Step Forward">&#x23E9;</button>
      <select id="replay-speed-select" class="replay-speed-select" title="Playback Speed">
        <option value="1">1x</option>
        <option value="2">2x</option>
        <option value="4">4x</option>
      </select>
      <span id="replay-info" class="replay-info">0 / 0</span>
    </div>
  `;

  // Insert at top of game screen
  const gameScreen = document.getElementById('game-screen');
  gameScreen.insertBefore(bar, gameScreen.firstChild);

  // Bind events
  document.getElementById('replay-exit-btn').onclick = exitReplay;
  document.getElementById('replay-step-back-btn').onclick = replayStepBack;
  document.getElementById('replay-play-btn').onclick = toggleReplayPlay;
  document.getElementById('replay-step-fwd-btn').onclick = replayStepForward;
  document.getElementById('replay-speed-select').onchange = function() {
    _replaySpeed = parseInt(this.value);
    // If currently playing, restart timer with new speed
    if (_replayPlaying) {
      clearInterval(_replayTimer);
      _replayTimer = setInterval(_replayTick, _getReplayDelay());
    }
  };
}

function _getReplayDelay() {
  return Math.round(800 / _replaySpeed);
}

function _updateReplayInfo() {
  const info = document.getElementById('replay-info');
  if (info && _replayData) {
    info.textContent = _replayStep + ' / ' + _replayData.actions.length;
  }
}

function _updatePlayButton() {
  const btn = document.getElementById('replay-play-btn');
  if (!btn) return;
  if (_replayPlaying) {
    btn.innerHTML = '&#x23F8;'; // pause
    btn.title = 'Pause';
  } else {
    btn.innerHTML = '&#x25B6;'; // play
    btn.title = 'Play';
  }
}

function toggleReplayPlay() {
  if (_replayPlaying) {
    _replayPlaying = false;
    if (_replayTimer) { clearInterval(_replayTimer); _replayTimer = null; }
  } else {
    if (_replayStep >= _replayData.actions.length) {
      // Already at end, restart
      _replayStep = 0;
      gameState = _deepCloneState(_replayData.initialState);
      renderGame();
    }
    _replayPlaying = true;
    _replayTimer = setInterval(_replayTick, _getReplayDelay());
  }
  _updatePlayButton();
}

function _replayTick() {
  if (_replayStep >= _replayData.actions.length) {
    _replayPlaying = false;
    if (_replayTimer) { clearInterval(_replayTimer); _replayTimer = null; }
    _updatePlayButton();
    const pb = document.getElementById('phase-prompt');
    if (pb) pb.textContent = 'Replay complete';
    return;
  }
  _applyReplayAction(_replayData.actions[_replayStep]);
  _replayStep++;
  _updateReplayInfo();
  renderGame();
  _highlightReplayAction(_replayData.actions[_replayStep - 1]);
}

function replayStepForward() {
  if (!_replayData || _replayStep >= _replayData.actions.length) return;
  _applyReplayAction(_replayData.actions[_replayStep]);
  _replayStep++;
  _updateReplayInfo();
  renderGame();
  _highlightReplayAction(_replayData.actions[_replayStep - 1]);
}

function replayStepBack() {
  if (!_replayData || _replayStep <= 0) return;
  // Rebuild state from initial up to step-1
  _replayStep--;
  gameState = _deepCloneState(_replayData.initialState);
  for (let i = 0; i < _replayStep; i++) {
    _applyReplayAction(_replayData.actions[i]);
  }
  _updateReplayInfo();
  renderGame();
  if (_replayStep > 0) {
    _highlightReplayAction(_replayData.actions[_replayStep - 1]);
  }
}

function _applyReplayAction(action) {
  if (!action || !gameState) return;

  const player = action.player;

  if (action.type === 'play') {
    // Play card to expedition
    const hand = getCards(gameState, 'hands', player);
    const idx = hand.findIndex(c => c.id === action.card.id);
    if (idx === -1) return;
    const card = hand.splice(idx, 1)[0];
    const exp = getCards(gameState, 'expeditions', player, action.color);
    exp.push(card);
    gameState.phase = 'draw';
    gameState.lastDiscardedColor = null;
    gameState.justDiscarded = false;

  } else if (action.type === 'discard') {
    // Discard card
    const hand = getCards(gameState, 'hands', player);
    const idx = hand.findIndex(c => c.id === action.card.id);
    if (idx === -1) return;
    const card = hand.splice(idx, 1)[0];

    if (action.drawFrom === 'single' || variant === 'single') {
      const pile = gameState.singlePile || [];
      pile.push(card);
      gameState.singlePile = pile;
      gameState.justDiscarded = true;
    } else {
      const pile = getCards(gameState, 'discards', action.color);
      pile.push(card);
      gameState.lastDiscardedColor = action.color;
    }
    gameState.phase = 'draw';

  } else if (action.type === 'draw') {
    // Draw card
    let card = null;

    if (action.drawFrom === 'drawPile') {
      const drawPile = getCards(gameState, 'drawPile');
      // Find the specific card in the draw pile or pop from top
      const dpIdx = drawPile.findIndex(c => c.id === action.card.id);
      if (dpIdx !== -1) {
        card = drawPile.splice(dpIdx, 1)[0];
      } else if (drawPile.length > 0) {
        card = drawPile.pop();
      }
      if (drawPile.length === 0) gameState.status = 'finished';

    } else if (action.drawFrom === 'discard') {
      const pile = getCards(gameState, 'discards', action.drawColor || action.card.color);
      if (pile.length > 0) {
        card = pile.pop();
      }

    } else if (action.drawFrom === 'single') {
      const pile = gameState.singlePile || [];
      if (pile.length > 0) {
        card = pile.pop();
        gameState.singlePile = pile;
      }
    }

    if (card) {
      const hand = getCards(gameState, 'hands', player);
      hand.push(card);
    }

    // End of turn: switch to other player
    const oppSlot = player === 'player1' ? 'player2' : 'player1';
    gameState.currentTurn = oppSlot;
    gameState.phase = 'play';
    gameState.lastDiscardedColor = null;
    gameState.justDiscarded = false;
  }
}

function _highlightReplayAction(action) {
  if (!action) return;

  // Remove previous highlights
  document.querySelectorAll('.replay-highlight').forEach(el => el.classList.remove('replay-highlight'));

  // Highlight the card that was involved
  if (action.card && action.card.id) {
    const cardEl = document.querySelector(`[data-id="${action.card.id}"]`);
    if (cardEl) {
      cardEl.classList.add('replay-highlight');
    }
  }

  // Update phase bar with action description
  const pb = document.getElementById('phase-prompt');
  if (pb) {
    const who = action.player === (_replayData.mySlot) ? 'You' : 'Opponent';
    const cardName = action.card ? (action.card.value === 0 ? 'Wager' : action.card.value) + ' ' + (action.card.color || '') : '';
    if (action.type === 'play') {
      pb.textContent = who + ' played ' + cardName + ' to expedition';
    } else if (action.type === 'discard') {
      pb.textContent = who + ' discarded ' + cardName;
    } else if (action.type === 'draw') {
      const from = action.drawFrom === 'drawPile' ? 'draw pile' : action.drawFrom === 'single' ? 'single pile' : (action.drawColor || action.card.color) + ' discard';
      pb.textContent = who + ' drew from ' + from;
    }
  }
}

function exitReplay() {
  _replayActive = false;
  _replayPlaying = false;
  if (_replayTimer) { clearInterval(_replayTimer); _replayTimer = null; }

  // Remove control bar
  const bar = document.getElementById('replay-control-bar');
  if (bar) bar.remove();

  // Remove highlights
  document.querySelectorAll('.replay-highlight').forEach(el => el.classList.remove('replay-highlight'));

  // Restore game state
  if (_replaySavedGameState) {
    gameState = _replaySavedGameState;
    mySlot = _replaySavedMySlot;
    variant = _replaySavedVariant;
    isAIGame = _replaySavedIsAIGame;
    selectedCard = _replaySavedSelectedCard;
    _replaySavedGameState = null;
  }

  // Go back to game over screen
  showScreen('gameover-screen');
}

// ===== INTERCEPT GAME INTERACTIONS DURING REPLAY =====
// Override click handlers to do nothing during replay
const _replayOrigSelectCard = (typeof selectCard !== 'undefined') ? selectCard : null;
if (typeof selectCard !== 'undefined') {
  const _origSelectCard = selectCard;
  selectCard = function() {
    if (_replayActive) return;
    return _origSelectCard.apply(this, arguments);
  };
}

// ===== HOOK INTO REMATCH TO RESET RECORDING FLAG =====
const _replayOrigRematch = rematch;
rematch = function() {
  _replaySavedForGame = false;
  _replayOrigRematch();
  startReplayRecording();
};

// ===== INJECT REPLAY STYLES =====
(function _injectReplayStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #replay-control-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.92);
      border-bottom: var(--border-w) solid var(--gold);
      padding: max(env(safe-area-inset-top), var(--space-micro)) var(--gap-sm) var(--space-micro);
      display: flex;
      justify-content: center;
    }
    .replay-controls-inner {
      display: flex;
      align-items: center;
      gap: var(--gap-sm);
      max-width: 400px;
      width: 100%;
      justify-content: center;
    }
    .replay-ctrl-btn {
      font-family: 'Cinzel', serif;
      font-size: var(--text-md);
      width: 36px;
      height: 36px;
      border: var(--border-w) solid var(--gold);
      background: rgba(255, 255, 255, 0.06);
      color: var(--gold);
      border-radius: var(--space-micro);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      padding: 0;
      line-height: 1;
    }
    .replay-ctrl-btn:active {
      transform: scale(0.92);
      background: rgba(212, 168, 67, 0.2);
    }
    .replay-ctrl-btn.replay-play {
      width: 44px;
      height: 44px;
      font-size: var(--text-lg);
      border-radius: 50%;
      border-width: 2px;
    }
    .replay-speed-select {
      font-family: 'Cinzel', serif;
      font-size: var(--text-sm);
      padding: var(--space-micro);
      border: var(--border-w) solid rgba(212, 168, 67, 0.4);
      background: rgba(255, 255, 255, 0.06);
      color: var(--gold);
      border-radius: var(--space-micro);
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
      text-align: center;
      width: 40px;
    }
    .replay-speed-select option {
      background: #1a0f0a;
      color: var(--gold);
    }
    .replay-info {
      font-family: 'Crimson Text', serif;
      font-size: var(--text-sm);
      color: var(--parchment-dark);
      white-space: nowrap;
      min-width: 50px;
      text-align: center;
    }
    .replay-highlight {
      box-shadow: 0 0 var(--gap-sm) var(--space-micro) rgba(240, 200, 80, 0.8), 0 0 calc(var(--gap-sm) * 2) var(--gap-sm) rgba(240, 200, 80, 0.4) !important;
      border-color: var(--gold-bright) !important;
      z-index: 5;
    }
  `;
  document.head.appendChild(style);
})();
