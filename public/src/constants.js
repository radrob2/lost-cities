// constants.js — Global constants, state variables, utility functions, and UI modal helpers

const COLORS = ['red','green','blue','white','yellow'];
document.documentElement.style.setProperty('--num-colors',COLORS.length);
const COLOR_LABELS = {red:'Red',green:'Green',blue:'Blue',white:'White',yellow:'Yellow'};
const COLOR_HEX = {red:'#c04040',green:'#40a060',blue:'#4080c0',white:'#909098',yellow:'#c0a030'};
const COLOR_SYMBOLS = {red:'\u25B2',green:'\u25CF',blue:'\u2248',white:'\u25C6',yellow:'\u2605'};
let colorblindMode=localStorage.getItem('expedition-colorblind')==='true';
let highContrastMode=localStorage.getItem('expedition-highcontrast')==='true';
if(highContrastMode) document.body.classList.add('high-contrast');
let liveScoreEnabled=localStorage.getItem('expedition-livescore')!=='false'; // on by default
let seriesScore={you:0,opp:0};
let seriesFirstPlayer='player1'; // alternates each rematch

let myId=null, mySlot=null, roomCode=null, roomRef=null, gameState=null;
let selectedCard=null, listeners=[];
let expandedStack=null; // {who:'my'|'opp', color:'red'} — which stack is fanned out
let variant='classic'; // 'classic' or 'single'
let isAIGame=false;
let aiPersonality='heuristic'; // default AI personality — Strategist beats all evolved genomes
const AI_PERSONALITIES={explorer:{name:'Explorer',emoji:'\u{1F5E1}\uFE0F'},scholar:{name:'Scholar',emoji:'\u{1F6E1}\uFE0F'},collector:{name:'Collector',emoji:'\u{1F3DB}\uFE0F'},spy:{name:'Spy',emoji:'\u{1F575}\uFE0F'},gambler:{name:'Gambler',emoji:'\u23F1\uFE0F'},heuristic:{name:'Strategist',emoji:'\u{1F9E0}'},seer:{name:'The Seer',emoji:'\u{1F441}\uFE0F',boss:true,warn:'Can see your cards'},oracle:{name:'The Oracle',emoji:'\u{1F52E}',boss:true,warn:'Knows everything'}};
let lastPlayedCard=null; // {card, from:'expedition'|'discard'|'single', color} for undo


function setVariant(v){
  variant=v;
  document.getElementById('vbtn-classic').className='variant-btn'+(v==='classic'?' active':'');
  document.getElementById('vbtn-single').className='variant-btn'+(v==='single'?' active':'');
}

function setPersonality(p){
  aiPersonality=p;
  for(const k of Object.keys(AI_PERSONALITIES)){
    document.getElementById('pbtn-'+k).className='variant-btn'+(k===p?' active':'');
  }
  const info=AI_PERSONALITIES[p];
  const warn=document.getElementById('boss-warn');
  if(warn) warn.textContent=info&&info.warn?'Warning: '+info.warn:'';
}

// Firebase strips empty arrays — this safely gets nested arrays
function getCards(obj, ...keys){
  let v=obj;
  for(const k of keys){if(!v||typeof v!=='object')return[];v=v[k]}
  return Array.isArray(v)?v:[];
}

function genId(){return Math.random().toString(36).substr(2,9)}

// Sound loaded from src/sound.js, animations from src/animations.js
function genRoomCode(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ';let r='';for(let i=0;i<4;i++)r+=c[Math.floor(Math.random()*c.length)];return r}
function toast(msg){const t=document.getElementById('toast');t.innerHTML=msg;t.classList.add('show');SFX.error();setTimeout(()=>t.classList.remove('show'),2200)}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active')}
function showRules(){document.getElementById('rules-modal').classList.add('active')}
function closeRules(){document.getElementById('rules-modal').classList.remove('active')}
function openAIPersonalityModal(){document.getElementById('ai-personality-modal').classList.add('active')}
function closeAIPersonalityModal(){document.getElementById('ai-personality-modal').classList.remove('active')}
// ===== TURN NOTIFICATIONS =====
function requestNotificationPermission(){
  if('Notification' in window && Notification.permission==='default'){
    Notification.requestPermission();
  }
}
function notifyTurn(){
  if('Notification' in window && Notification.permission==='granted'){
    try{new Notification('Venture',{body:"It's your turn!",icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%23d4a843"/><text x="16" y="22" text-anchor="middle" font-size="18">%E2%9C%A6</text></svg>'});}catch(e){}
  }
}

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
function toggleColorblind(){
  colorblindMode=!colorblindMode;
  localStorage.setItem('expedition-colorblind',colorblindMode);
  document.getElementById('cb-toggle-btn').textContent='Colorblind Mode: '+(colorblindMode?'On':'Off');
  renderGame();
}
function toggleHighContrast(){
  highContrastMode=!highContrastMode;
  localStorage.setItem('expedition-highcontrast',highContrastMode);
  document.body.classList.toggle('high-contrast',highContrastMode);
  document.getElementById('hc-toggle-btn').textContent='High Contrast: '+(highContrastMode?'On':'Off');
  renderGame();
}
function toggleLiveScore(){
  liveScoreEnabled=!liveScoreEnabled;
  localStorage.setItem('expedition-livescore',liveScoreEnabled);
  document.getElementById('score-toggle-btn').textContent='Live Score: '+(liveScoreEnabled?'On':'Off');
  renderGame();
}
function confirmQuit(){closeGameMenu();document.getElementById('quit-confirm').classList.add('active')}
function closeQuitConfirm(){document.getElementById('quit-confirm').classList.remove('active')}

function createDeck(){
  let deck=[];
  COLORS.forEach(c=>{
    for(let i=0;i<3;i++)deck.push({color:c,value:0,id:c+'_w'+i});
    for(let v=2;v<=10;v++)deck.push({color:c,value:v,id:c+'_'+v});
  });
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
  return deck;
}
