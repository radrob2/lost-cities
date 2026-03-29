// ===== ELO RATING SYSTEM =====
// Depends on: globals (gameState, mySlot, isAIGame, aiPersonality, variant),
//             AI_PERSONALITIES, calcScore, showGameOver, loadStats, renderStats

const ELO_KEY = 'expedition-elo';
const ELO_START = 1200;
const ELO_HISTORY_MAX = 50;

const AI_RATINGS = {
  explorer: 1100,
  scholar: 1150,
  collector: 1100,
  spy: 1050,
  gambler: 1000,
  heuristic: 1300,
  seer: 1500,
  oracle: 1800
};

function defaultElo() {
  return { rating: ELO_START, gamesPlayed: 0, history: [] };
}

function loadElo() {
  try {
    const raw = localStorage.getItem(ELO_KEY);
    if (!raw) return defaultElo();
    const e = JSON.parse(raw);
    if (typeof e.rating !== 'number' || typeof e.gamesPlayed !== 'number') return defaultElo();
    if (!Array.isArray(e.history)) e.history = [];
    return e;
  } catch (err) {
    console.error('Elo data corrupted, resetting:', err);
    return defaultElo();
  }
}

function saveElo(data) {
  try { localStorage.setItem(ELO_KEY, JSON.stringify(data)); }
  catch (err) { console.error('Failed to save elo:', err); }
}

function calculateEloChange(myRating, oppRating, result, gamesPlayed) {
  const K = gamesPlayed < 20 ? 32 : 16;
  const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
  const change = Math.round(K * (result - expected));
  return { newRating: myRating + change, change: change };
}

function recordEloResult(oppRating, result) {
  const elo = loadElo();
  const calc = calculateEloChange(elo.rating, oppRating, result, elo.gamesPlayed);
  elo.rating = calc.newRating;
  elo.gamesPlayed++;
  elo.history.push({
    opp: oppRating,
    result: result,
    change: calc.change,
    newRating: calc.newRating,
    date: new Date().toISOString()
  });
  // Keep only last 50 entries
  if (elo.history.length > ELO_HISTORY_MAX) {
    elo.history = elo.history.slice(elo.history.length - ELO_HISTORY_MAX);
  }
  saveElo(elo);
  return { newRating: calc.newRating, change: calc.change };
}

function getAIRating(personality) {
  return AI_RATINGS[personality] || ELO_START;
}

// Hook into showGameOver to show ELO change
let _eloRecordedForGame = false;
let _lastEloChange = null;
const _origShowGameOverElo = showGameOver;
showGameOver = function() {
  // Record ELO before rendering game over screen
  if (gameState && gameState.status === 'finished' && !_eloRecordedForGame && isAIGame) {
    _eloRecordedForGame = true;
    const s1 = calcScore(gameState.expeditions.player1);
    const s2 = calcScore(gameState.expeditions.player2);
    const myScore = mySlot === 'player1' ? s1.total : s2.total;
    const oppScore = mySlot === 'player1' ? s2.total : s1.total;
    const result = myScore > oppScore ? 1 : myScore < oppScore ? 0 : 0.5;
    const oppRating = getAIRating(aiPersonality);
    _lastEloChange = recordEloResult(oppRating, result);
  }
  // Call the previous showGameOver (which may be the stats-wrapped version)
  _origShowGameOverElo();
  // Inject ELO change display after the game over screen renders
  if (_lastEloChange) {
    const el = document.getElementById('elo-change-display');
    if (el) {
      const sign = _lastEloChange.change >= 0 ? '+' : '';
      const color = _lastEloChange.change >= 0 ? '#4caf50' : '#e07060';
      const elo = loadElo();
      el.innerHTML = `<span style="color:${color};font-family:'Cinzel',serif;font-weight:700;font-size:var(--text-lg)">${sign}${_lastEloChange.change}</span> <span style="color:var(--parchment-dark);font-size:var(--text-sm)">Rating: ${elo.rating}</span>`;
      el.style.display = 'block';
    }
  }
};

// Reset ELO tracking flag on new games
const _origRematchElo = typeof rematch === 'function' ? rematch : null;
if (_origRematchElo) {
  rematch = function() {
    _eloRecordedForGame = false;
    _lastEloChange = null;
    const el = document.getElementById('elo-change-display');
    if (el) el.style.display = 'none';
    _origRematchElo();
  };
}

// Patch renderStats to include ELO rating section
const _origRenderStats = renderStats;
renderStats = function() {
  _origRenderStats();
  const container = document.getElementById('stats-content');
  if (!container) return;
  const elo = loadElo();
  let html = '';

  html += `<div class="stats-section">
    <h3>Rating</h3>
    <div class="stat-row"><span class="stat-label">Current Rating</span><span class="stat-value gold">${elo.rating}</span></div>
    <div class="stat-row"><span class="stat-label">Games Rated</span><span class="stat-value">${elo.gamesPlayed}</span></div>
    <div class="stat-row"><span class="stat-label">K-Factor</span><span class="stat-value">${elo.gamesPlayed < 20 ? '32 (provisional)' : '16'}</span></div>`;

  if (elo.history.length > 0) {
    html += `<div style="margin-top:var(--gap-sm);font-size:var(--text-sm);color:var(--parchment-dark)">Recent</div>
    <div style="margin-top:var(--space-micro);display:flex;flex-direction:column;gap:var(--space-micro)">`;
    // Show last 10 entries, most recent first
    const recent = elo.history.slice(-10).reverse();
    for (const entry of recent) {
      const sign = entry.change >= 0 ? '+' : '';
      const color = entry.change >= 0 ? '#4caf50' : '#e07060';
      const resultLabel = entry.result === 1 ? 'W' : entry.result === 0 ? 'L' : 'D';
      const resultColor = entry.result === 1 ? '#4caf50' : entry.result === 0 ? '#e07060' : 'var(--parchment-dark)';
      html += `<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:var(--text-md);padding:var(--space-micro) 0">
        <span style="color:${resultColor};font-weight:700;width:var(--text-lg)">${resultLabel}</span>
        <span style="color:var(--parchment-dark);flex:1;text-align:center;font-size:var(--text-sm)">vs ${entry.opp}</span>
        <span style="color:${color};font-family:'Cinzel',serif;font-weight:700;width:calc(var(--text-lg) * 2.8);text-align:right">${sign}${entry.change}</span>
        <span style="color:var(--parchment-dark);font-size:var(--text-sm);width:calc(var(--text-lg) * 2.5);text-align:right">${entry.newRating}</span>
      </div>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  // Prepend rating section to top of stats
  container.innerHTML = html + container.innerHTML;
};

// Wrap doResetStats to also reset ELO data
const _origDoResetStats = doResetStats;
doResetStats = function() {
  localStorage.removeItem(ELO_KEY);
  _origDoResetStats();
};

// Also reset elo flag when leaving games
const _origLeaveGameElo = typeof leaveGame === 'function' ? leaveGame : null;
if (_origLeaveGameElo) {
  leaveGame = function() {
    _eloRecordedForGame = false;
    _lastEloChange = null;
    _origLeaveGameElo();
  };
}
