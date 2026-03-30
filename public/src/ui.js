// ui.js — Screen transitions, toast, modal helpers.
// Pure DOM manipulation. No game logic dependencies.

function toast(msg){const t=document.getElementById('toast');t.innerHTML=msg;t.classList.add('show');SFX.error();setTimeout(()=>t.classList.remove('show'),2200)}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active')}
function showRules(){document.getElementById('rules-modal').classList.add('active')}
function closeRules(){document.getElementById('rules-modal').classList.remove('active')}
function openAIPersonalityModal(){document.getElementById('ai-personality-modal').classList.add('active')}
function closeAIPersonalityModal(){document.getElementById('ai-personality-modal').classList.remove('active')}

function showGameMenu(){
  document.getElementById('game-menu').classList.add('active');
  const sndBtn=document.getElementById('sound-toggle-btn');
  if(sndBtn) sndBtn.textContent='Sound: '+(soundEnabled?'On':'Off');
  const btn=document.getElementById('cb-toggle-btn');
  if(btn) btn.textContent='Colorblind Mode: '+(colorblindMode?'On':'Off');
  const hcbtn=document.getElementById('hc-toggle-btn');
  if(hcbtn) hcbtn.textContent='High Contrast: '+(highContrastMode?'On':'Off');
  const sbtn=document.getElementById('score-toggle-btn');
  if(sbtn) sbtn.textContent='Live Score: '+(liveScoreEnabled?'On':'Off');
}
function closeGameMenu(){document.getElementById('game-menu').classList.remove('active')}
function confirmQuit(){closeGameMenu();document.getElementById('quit-confirm').classList.add('active')}
function closeQuitConfirm(){document.getElementById('quit-confirm').classList.remove('active')}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showScreen, toast, showRules, closeRules, openAIPersonalityModal, closeAIPersonalityModal, showGameMenu, closeGameMenu, confirmQuit, closeQuitConfirm };
}
