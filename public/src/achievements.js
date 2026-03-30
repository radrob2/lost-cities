// ===== ACHIEVEMENT / BADGE SYSTEM =====
// Depends on: globals (gameState, mySlot, isAIGame, aiPersonality, variant, COLORS),
//             calcScore, toast, loadStats (from stats.js)

const ACHIEVEMENTS_KEY = 'expedition-achievements';

const ACHIEVEMENTS = [
  { id: 'first_victory',   name: 'First Victory',   description: 'Win your first game',                          icon: '\u{1F3C6}' },
  { id: 'streak_master',   name: 'Streak Master',    description: 'Win 5 games in a row',                         icon: '\u{1F525}' },
  { id: 'high_roller',     name: 'High Roller',      description: 'Score 100+ points in a single game',           icon: '\u{1F4B0}' },
  { id: 'color_master',    name: 'Color Master',     description: 'Score positive in all 5 colors in one game',   icon: '\u{1F308}' },
  { id: 'wager_king',      name: 'Wager King',       description: 'Play 3 wagers in one expedition and score positive', icon: '\u{1F451}' },
  { id: 'speed_run',       name: 'Speed Run',        description: 'Win a game with 20+ cards left in draw pile',  icon: '\u26A1' },
  { id: 'comeback_kid',    name: 'Comeback Kid',     description: 'Win while opponent scored 30+ more on expeditions', icon: '\u{1F4AA}' },
  { id: 'beat_seer',       name: 'Beat the Seer',    description: 'Beat The Seer boss AI',                        icon: '\u{1F441}\uFE0F' },
  { id: 'beat_oracle',     name: 'Beat the Oracle',  description: 'Beat The Oracle boss AI',                      icon: '\u{1F52E}' },
  { id: 'century_club',    name: 'Century Club',     description: 'Play 100 games total',                         icon: '\u{1F4AF}' }
];

function loadAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Achievements corrupted, resetting:', e);
    return {};
  }
}

function saveAchievements(a) {
  try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(a)); }
  catch (e) { console.error('Failed to save achievements:', e); }
}

/**
 * Check all achievement conditions after a game ends.
 * @param {number} myScore - player's total score
 * @param {number} oppScore - opponent's total score
 * @param {object} gs - gameState snapshot
 * @param {string|null} personality - AI personality key or null
 * @returns {Array} newly unlocked achievement objects
 */
function checkAchievements(myScore, oppScore, gs, personality) {
  const saved = loadAchievements();
  const stats = loadStats();
  const newly = [];
  const now = new Date().toISOString();

  function unlock(id) {
    if (saved[id]) return; // already unlocked
    saved[id] = { unlocked: true, date: now };
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) newly.push(ach);
  }

  const won = myScore > oppScore;
  const myExpeditions = gs && gs.expeditions ? gs.expeditions[mySlot] : null;
  const myBreakdown = myExpeditions ? calcScore(myExpeditions).breakdown : null;
  const drawPileLeft = (gs && gs.drawPile) ? gs.drawPile.length : 0;

  // 1. First Victory
  if (won) {
    unlock('first_victory');
  }

  // 2. Streak Master — 5 wins in a row (stats already updated before this call)
  if (stats.currentStreak >= 5) {
    unlock('streak_master');
  }

  // 3. High Roller — 100+ points
  if (myScore >= 100) {
    unlock('high_roller');
  }

  // 4. Color Master — positive score in all 5 colors
  if (myBreakdown) {
    const allPositive = COLORS.every(c => myBreakdown[c] && myBreakdown[c].score > 0);
    if (allPositive) {
      unlock('color_master');
    }
  }

  // 5. Wager King — 3 wagers in one expedition, expedition scores positive
  if (myBreakdown) {
    for (const c of COLORS) {
      const info = myBreakdown[c];
      if (info && info.wagers >= 3 && info.score > 0) {
        unlock('wager_king');
        break;
      }
    }
  }

  // 6. Speed Run — win with 20+ cards left in draw pile
  if (won && drawPileLeft >= 20) {
    unlock('speed_run');
  }

  // 7. Comeback Kid — win while opponent's total is 30+ (simplified: opponent scored well but you still won)
  if (won && oppScore >= 30 && myScore > oppScore) {
    unlock('comeback_kid');
  }

  // 8. Beat the Seer
  if (won && personality === 'seer') {
    unlock('beat_seer');
  }

  // 9. Beat the Oracle
  if (won && personality === 'oracle') {
    unlock('beat_oracle');
  }

  // 10. Century Club — 100 total games
  if (stats.totalGames >= 100) {
    unlock('century_club');
  }

  if (newly.length > 0) {
    saveAchievements(saved);
  }
  return newly;
}

function showAchievementToast(achievement) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span style="color:#ffd700">${achievement.icon}</span> Achievement Unlocked: <span style="color:#ffd700">${achievement.name}</span>`;
  t.style.border = '1.5px solid #ffd700';
  t.style.boxShadow = '0 4px 16px rgba(255,215,0,.3), 0 0 8px rgba(255,215,0,.15)';
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
    // Reset toast styling after hide
    setTimeout(() => {
      t.style.border = '';
      t.style.boxShadow = '';
    }, 300);
  }, 3000);
}

function showAchievementToasts(achievements) {
  if (!achievements || achievements.length === 0) return;
  let i = 0;
  function showNext() {
    if (i >= achievements.length) return;
    showAchievementToast(achievements[i]);
    i++;
    if (i < achievements.length) {
      setTimeout(showNext, 3500);
    }
  }
  showNext();
}

function renderAchievements() {
  const container = document.getElementById('achievements-content');
  if (!container) return;
  const saved = loadAchievements();

  let html = '<div class="stats-section"><h3>Achievements</h3><div class="achievements-grid">';
  for (const ach of ACHIEVEMENTS) {
    const unlocked = saved[ach.id];
    const cls = unlocked ? 'achievement-badge unlocked' : 'achievement-badge locked';
    const dateStr = unlocked ? new Date(unlocked.date).toLocaleDateString() : '';
    html += `<div class="${cls}">
      <span class="ach-icon">${ach.icon}</span>
      <div class="ach-info">
        <span class="ach-name">${ach.name}</span>
        <span class="ach-desc">${ach.description}</span>
        ${unlocked ? `<span class="ach-date">${dateStr}</span>` : ''}
      </div>
    </div>`;
  }
  html += '</div></div>';
  container.innerHTML = html;
}

on('statsShown', function() {
  renderAchievements();
});

on('gameOver', function(data) {
  const newlyUnlocked = checkAchievements(data.myScore, data.oppScore, gameState, data.personality);
  if (newlyUnlocked.length > 0) {
    setTimeout(() => showAchievementToasts(newlyUnlocked), 800);
  }
});
