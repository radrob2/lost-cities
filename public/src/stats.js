// ===== STATS TRACKING =====
// Depends on: globals (gameState, mySlot, isAIGame, aiPersonality, variant),
//             AI_PERSONALITIES, calcScore, showScreen, toast, showGameOver

const STATS_KEY='expedition-stats';
function defaultStats(){
  return {
    totalGames:0,wins:0,losses:0,draws:0,
    currentStreak:0,bestStreak:0,
    highestScore:-Infinity,
    totalScore:0,
    byPersonality:{},
    byVariant:{}
  };
}
function loadStats(){
  try{
    const raw=localStorage.getItem(STATS_KEY);
    if(!raw)return defaultStats();
    const s=JSON.parse(raw);
    const d=defaultStats();
    for(const k of Object.keys(d)){
      if(s[k]===undefined||s[k]===null) s[k]=d[k];
    }
    if(typeof s.totalGames!=='number'||s.totalGames<0) return defaultStats();
    return s;
  }catch(e){
    console.error('Stats corrupted, resetting:',e);
    return defaultStats();
  }
}
function saveStats(s){
  try{localStorage.setItem(STATS_KEY,JSON.stringify(s))}
  catch(e){console.error('Failed to save stats:',e)}
}

function recordGameResult(myScore,oppScore,personality,gameVariant){
  const s=loadStats();
  s.totalGames++;
  s.totalScore+=myScore;
  if(myScore>oppScore){
    s.wins++;
    s.currentStreak=Math.max(0,s.currentStreak)+1;
    if(s.currentStreak>s.bestStreak) s.bestStreak=s.currentStreak;
  } else if(myScore<oppScore){
    s.losses++;
    s.currentStreak=Math.min(0,s.currentStreak)-1;
  } else {
    s.draws++;
    s.currentStreak=0;
  }
  if(myScore>s.highestScore) s.highestScore=myScore;

  if(personality){
    if(!s.byPersonality[personality]) s.byPersonality[personality]={w:0,l:0,d:0};
    const p=s.byPersonality[personality];
    if(myScore>oppScore) p.w++; else if(myScore<oppScore) p.l++; else p.d++;
  }

  if(gameVariant){
    if(!s.byVariant[gameVariant]) s.byVariant[gameVariant]={w:0,l:0,d:0};
    const v=s.byVariant[gameVariant];
    if(myScore>oppScore) v.w++; else if(myScore<oppScore) v.l++; else v.d++;
  }

  saveStats(s);
}

// Subscribe to gameOver event to record stats
let _statsRecordedForGame = false;
on('gameOver', function(data) {
  if (!_statsRecordedForGame) {
    _statsRecordedForGame = true;
    recordGameResult(data.myScore, data.oppScore, data.personality, data.variant);
  }
});

on('newGame', function() {
  _statsRecordedForGame = false;
});

on('rematch', function() {
  _statsRecordedForGame = false;
});

function showStats(){
  renderStats();
  showScreen('stats-screen');
  emit('statsShown');
}

function pct(n,total){return total===0?'0%':Math.round(n/total*100)+'%'}

function renderStats(){
  const s=loadStats();
  const winRate=s.totalGames?pct(s.wins,s.totalGames):'--';
  const avgScore=s.totalGames?Math.round(s.totalScore/s.totalGames):'--';
  const highScore=s.highestScore===-Infinity?'--':s.highestScore;
  const streakDisplay=s.currentStreak>0?'+'+s.currentStreak:s.currentStreak<0?''+s.currentStreak:'0';
  const streakClass=s.currentStreak>0?'positive':s.currentStreak<0?'negative':'';

  let html='';

  html+=`<div class="stats-section">
    <h3>Overall Record</h3>
    <div class="stat-row"><span class="stat-label">Games Played</span><span class="stat-value">${s.totalGames}</span></div>
    <div class="stat-row"><span class="stat-label">Wins / Losses / Draws</span><span class="stat-value">${s.wins} / ${s.losses} / ${s.draws}</span></div>
    <div class="stat-row"><span class="stat-label">Win Rate</span><span class="stat-value gold">${winRate}</span></div>
    <div class="stat-row"><span class="stat-label">Current Streak</span><span class="stat-value ${streakClass}">${streakDisplay}</span></div>
    <div class="stat-row"><span class="stat-label">Best Win Streak</span><span class="stat-value gold">${s.bestStreak}</span></div>
  </div>`;

  html+=`<div class="stats-section">
    <h3>Scoring</h3>
    <div class="stat-row"><span class="stat-label">Highest Score</span><span class="stat-value gold">${highScore}</span></div>
    <div class="stat-row"><span class="stat-label">Average Score</span><span class="stat-value">${avgScore}</span></div>
  </div>`;

  const persKeys=Object.keys(s.byPersonality);
  if(persKeys.length>0){
    html+=`<div class="stats-section"><h3>vs AI Personality</h3><div class="stats-personality-grid">`;
    for(const k of persKeys){
      const p=s.byPersonality[k];
      const total=p.w+p.l+p.d;
      const info=AI_PERSONALITIES[k];
      const name=info?(info.emoji+' '+info.name):k;
      const wr=pct(p.w,total);
      html+=`<div class="stats-record-row">
        <span class="rec-name">${name}</span>
        <span class="rec-bar">${p.w}W ${p.l}L ${p.d}D</span>
        <span class="rec-wr">${wr}</span>
      </div>`;
    }
    html+=`</div></div>`;
  }

  const varKeys=Object.keys(s.byVariant);
  if(varKeys.length>0){
    html+=`<div class="stats-section"><h3>By Variant</h3><div class="stats-variant-grid">`;
    for(const k of varKeys){
      const v=s.byVariant[k];
      const total=v.w+v.l+v.d;
      const name=k==='classic'?'Classic (5 piles)':k==='single'?'Single Pile':k;
      const wr=pct(v.w,total);
      html+=`<div class="stats-record-row">
        <span class="rec-name">${name}</span>
        <span class="rec-bar">${v.w}W ${v.l}L ${v.d}D</span>
        <span class="rec-wr">${wr}</span>
      </div>`;
    }
    html+=`</div></div>`;
  }

  if(s.totalGames===0){
    html+=`<div class="stats-section" style="text-align:center">
      ${renderText('No expeditions completed yet.<br>Play a game to start tracking!', 4, {color:'var(--parchment-dark)', tag:'p', extraStyle:'font-style:italic'})}
    </div>`;
  }

  document.getElementById('stats-content').innerHTML=html;
  emit('statsRendered');
}

function confirmResetStats(){
  document.getElementById('reset-confirm').classList.add('active');
}
function closeResetConfirm(){
  document.getElementById('reset-confirm').classList.remove('active');
}
function doResetStats(){
  closeResetConfirm();
  localStorage.removeItem(STATS_KEY);
  renderStats();
  toast('Stats reset');
  emit('statsReset');
}
