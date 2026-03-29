// ai-game.js — AI game mode: start, AI turn logic, worker communication, function overrides

// Debug: tap title 5x to see score screen
let debugTaps=0;let debugTimer=null;
function debugTapTitle(){
  debugTaps++;if(debugTimer)clearTimeout(debugTimer);
  debugTimer=setTimeout(()=>debugTaps=0,2000);
  if(debugTaps>=5){
    debugTaps=0;mySlot='player1';
    gameState={expeditions:{
      player1:{red:[{color:'red',value:0,id:'r_w0'},{color:'red',value:0,id:'r_w1'},{color:'red',value:2,id:'r_2'},{color:'red',value:4,id:'r_4'},{color:'red',value:5,id:'r_5'},{color:'red',value:6,id:'r_6'},{color:'red',value:7,id:'r_7'},{color:'red',value:8,id:'r_8'}],green:[{color:'green',value:3,id:'g_3'},{color:'green',value:6,id:'g_6'}],blue:[],white:[{color:'white',value:0,id:'w_w0'},{color:'white',value:3,id:'w_3'}],yellow:[]},
      player2:{red:[{color:'red',value:0,id:'r2_w0'},{color:'red',value:3,id:'r2_3'}],green:[{color:'green',value:4,id:'g2_4'},{color:'green',value:6,id:'g2_6'},{color:'green',value:8,id:'g2_8'},{color:'green',value:10,id:'g2_10'}],blue:[{color:'blue',value:2,id:'b2_2'},{color:'blue',value:5,id:'b2_5'},{color:'blue',value:9,id:'b2_9'}],white:[],yellow:[{color:'yellow',value:7,id:'y2_7'}]}
    }};
    showGameOver();
  }
}

// leaveGame, saveSession, clearSession, tryReconnect in src/multiplayer.js

// ===== AI MODE =====
function startAIGame(){
  const name=getName();
  if(!name){document.getElementById('lobby-error').textContent='Enter your name';return}
  isAIGame=true; myId=genId(); mySlot='player1'; roomRef=null; roomCode=null; humanDrawHistory=[]; humanPlayHistory=[]; humanDiscardHistory=[];
  if(typeof _statsRecordedForGame!=='undefined') _statsRecordedForGame=false;
  const drawPile=createDrawPile();
  const hand1=drawPile.splice(0,8),hand2=drawPile.splice(0,8);
  const exps={},discard={};
  COLORS.forEach(c=>{exps[c]=[];discard[c]=[]});
  gameState={
    drawPile,hands:{player1:hand1,player2:hand2},
    expeditions:{player1:{...exps},player2:Object.fromEntries(COLORS.map(c=>[c,[]]))},
    discards:Object.fromEntries(COLORS.map(c=>[c,[]])),
    singlePile:[],currentTurn:seriesFirstPlayer,phase:'play',
    lastDiscardedColor:null,justDiscarded:false,status:'playing'
  };
  const pers=AI_PERSONALITIES[aiPersonality]||AI_PERSONALITIES.scholar;
  document.getElementById('opponent-name-store').textContent=pers.name;
  const myLabel=document.getElementById('my-label');
  if(myLabel) myLabel.textContent=getName().toUpperCase()+"'s Ventures";
  showScreen('game-screen');
  renderGame();
  // If AI goes first (seriesFirstPlayer is player2), trigger AI turn
  if(seriesFirstPlayer==='player2') setTimeout(()=>aiTurn(), 500);
}

// Override Firebase writes when in AI mode
const _origPlayToExpedition=playToExpedition;
playToExpedition=async function(color){
  if(!isAIGame)return _origPlayToExpedition(color);
  if(!selectedCard||gameState.currentTurn!==mySlot||gameState.phase!=='play')return;
  if(selectedCard.color!==color)return;
  const expedition=getCards(gameState,'expeditions',mySlot,color);
  if(!canPlayOnExpedition(selectedCard,expedition)){toast('Must be higher than '+expedition[expedition.length-1].value);return}
  SFX.play();
  const card=selectedCard;
  const saved=grabPos(card.id);
  const hand=getCards(gameState,'hands',mySlot).filter(c=>c.id!==card.id);
  expedition.push(card);
  const u={};u[`hands/${mySlot}`]=hand;u[`expeditions/${mySlot}/${color}`]=expedition;u['phase']='draw';u['lastDiscardedColor']=null;u['justDiscarded']=false;
  humanPlayHistory.push(color);
  lastPlayedCard={card,to:'expedition',color};
  selectedCard=null;localUpdate(u);slideFrom(saved);
};

const _origDiscardTo=discardTo;
discardTo=async function(color){
  if(!isAIGame)return _origDiscardTo(color);
  if(!selectedCard||gameState.currentTurn!==mySlot||gameState.phase!=='play')return;
  if(selectedCard.color!==color){toast('Discard to the '+COLOR_LABELS[selectedCard.color]+' pile');return}
  SFX.discard();
  const card=selectedCard;
  const saved=grabPos(card.id);
  const hand=getCards(gameState,'hands',mySlot).filter(c=>c.id!==card.id);
  const pile=getCards(gameState,'discards',color);pile.push(card);
  const u={};u[`hands/${mySlot}`]=hand;u[`discards/${color}`]=pile;u['phase']='draw';u['lastDiscardedColor']=color;
  humanDiscardHistory.push({color:card.color,value:card.value});
  lastPlayedCard={card,to:'discard',color};
  selectedCard=null;localUpdate(u);slideFrom(saved);
};

const _origDrawFromDrawPile=drawFromDrawPile;
drawFromDrawPile=async function(){
  if(!isAIGame)return _origDrawFromDrawPile();
  if(gameState.currentTurn!==mySlot||gameState.phase!=='draw')return;
  const drawPile=getCards(gameState,'drawPile');if(drawPile.length===0)return;
  SFX.drawCard();
  const drawPileEl=document.getElementById('draw-pile-col');
  const card=drawPile.pop();
  const hand=getCards(gameState,'hands',mySlot);hand.push(card);
  const u={};u['drawPile']=drawPile;u[`hands/${mySlot}`]=hand;u['currentTurn']='player2';u['phase']='play';u['lastDiscardedColor']=null;u['justDiscarded']=false;
  if(drawPile.length===0)u['status']='finished';
  lastPlayedCard=null;
  localUpdate(u);slideFromEl(drawPileEl, card.id);
  if(gameState.status!=='finished') setTimeout(aiTurn,300);
};

const _origDrawFromDiscard=drawFromDiscard;
drawFromDiscard=async function(color){
  if(!isAIGame)return _origDrawFromDiscard(color);
  if(gameState.currentTurn!==mySlot||gameState.phase!=='draw')return;
  if(color===gameState.lastDiscardedColor){toast("Can't draw from pile you just discarded to");return}
  const pile=getCards(gameState,'discards',color);if(pile.length===0)return;
  SFX.drawCard();
  humanDrawHistory.push(color);
  const card=pile[pile.length-1];
  const saved=grabPos(card.id);
  pile.pop();const hand=getCards(gameState,'hands',mySlot);hand.push(card);
  const u={};u[`discards/${color}`]=pile;u[`hands/${mySlot}`]=hand;u['currentTurn']='player2';u['phase']='play';u['lastDiscardedColor']=null;
  lastPlayedCard=null;
  localUpdate(u);slideFrom(saved);
  if(gameState.status!=='finished') setTimeout(aiTurn,300);
};

const _origDiscardToSingle=discardToSingle;
discardToSingle=async function(){
  if(!isAIGame)return _origDiscardToSingle();
  if(!selectedCard||gameState.currentTurn!==mySlot||gameState.phase!=='play')return;
  SFX.discard();
  const card=selectedCard;
  const saved=grabPos(card.id);
  const hand=getCards(gameState,'hands',mySlot).filter(c=>c.id!==card.id);
  const pile=getCards(gameState,'singlePile');pile.push(card);
  const u={};u[`hands/${mySlot}`]=hand;u['singlePile']=pile;u['phase']='draw';u['justDiscarded']=true;
  humanDiscardHistory.push({color:card.color,value:card.value});
  lastPlayedCard={card,to:'single',color:card.color};
  selectedCard=null;localUpdate(u);slideFrom(saved);
};

const _origDrawFromSingle=drawFromSingle;
drawFromSingle=async function(){
  if(!isAIGame)return _origDrawFromSingle();
  if(gameState.currentTurn!==mySlot||gameState.phase!=='draw')return;
  if(gameState.justDiscarded){toast("Can't draw from pile you just discarded to");return}
  const pile=getCards(gameState,'singlePile');if(pile.length===0)return;
  SFX.drawCard();
  const card=pile[pile.length-1];
  const saved=grabPos(card.id);
  pile.pop();const hand=getCards(gameState,'hands',mySlot);hand.push(card);
  const u={};u['singlePile']=pile;u[`hands/${mySlot}`]=hand;u['currentTurn']='player2';u['phase']='play';u['justDiscarded']=false;
  lastPlayedCard=null;
  localUpdate(u);slideFrom(saved);
  if(gameState.status!=='finished') setTimeout(aiTurn,300);
};

// AI TURN LOGIC — Monte Carlo simulation via Web Worker
let aiWorker=null;
function getAIWorker(){
  if(!aiWorker){
    try{
      aiWorker=new Worker('ai-worker.js?v='+Date.now());
    }catch(e){
      console.error('Worker creation failed:',e.message);
      return null;
    }
  }
  return aiWorker;
}

let aiThinking=false;
let humanDrawHistory=[]; // Track colors human has drawn from discard piles
let humanPlayHistory=[]; // Track colors human has played to expeditions
let humanDiscardHistory=[]; // Track {color, value} human has discarded
function aiTurn(){
  if(aiThinking)return;
  if(gameState.status==='finished'||gameState.currentTurn!=='player2')return;
  const hand=getCards(gameState,'hands','player2');
  if(hand.length===0)return;
  aiThinking=true;

  // Show thinking indicator
  const oppNameEl=document.getElementById('opponent-name-store');
  const origName=oppNameEl?oppNameEl.textContent:'';
  if(oppNameEl) oppNameEl.textContent='AI thinking...';

  // Build a clean state snapshot for the worker
  // Seer/Oracle boss AIs get to see opponent's hand
  const isCheating=aiPersonality==='seer'||aiPersonality==='oracle';
  const oppHand=isCheating?getCards(gameState,'hands','player1').map(c=>({color:c.color,value:c.value,id:c.id})):[];
  const snapshot={
    hands:{
      player1:oppHand,
      player2:hand.map(c=>({color:c.color,value:c.value,id:c.id}))
    },
    expeditions:{player1:{},player2:{}},
    discards:{},
    singlePile:(gameState.singlePile||[]).map(c=>({color:c.color,value:c.value,id:c.id})),
    deckSize:getCards(gameState,'drawPile').length,
    knownDeck:aiPersonality==='oracle'?getCards(gameState,'drawPile').map(c=>({color:c.color,value:c.value,id:c.id})):null,
    oppDrawHistory:humanDrawHistory,
    oppPlayHistory:humanPlayHistory,
    oppDiscardHistory:humanDiscardHistory
  };
  for(const p of ['player1','player2'])
    for(const c of COLORS)
      snapshot.expeditions[p][c]=getCards(gameState,'expeditions',p,c).map(x=>({color:x.color,value:x.value,id:x.id}));
  for(const c of COLORS)
    snapshot.discards[c]=getCards(gameState,'discards',c).map(x=>({color:x.color,value:x.value,id:x.id}));

  const worker=getAIWorker();
  if(!worker){aiThinking=false;if(oppNameEl)oppNameEl.textContent=origName;aiFallbackTurn();return;}
  worker.onmessage=function(e){
    aiThinking=false;
    if(oppNameEl)oppNameEl.textContent=origName;
    const {result,elapsed}=e.data;
    if(!result){
      aiFallbackTurn();
      return;
    }
    // Rich decision logging (behind DEBUG flag)
    if(window.EXPEDITION_DEBUG){
      const d=result.debug;
      console.group(`AI Turn (${elapsed}ms, ${result.simsRan} sims)`);
      console.log(`Hand: ${d.hand}`);
      console.log(`Draw pile: ${d.deckSize} cards left`);
      console.log(`Opp expeditions:`, Object.keys(d.oppExps).length?d.oppExps:'(none)');
      console.log(`CHOSE: ${d.chosen} -> draw ${d.chosenDraw} (${(result.winRate*100).toFixed(1)}% win)`);
      if(d.dangerNote) console.warn(d.dangerNote);
      console.log('Top moves considered:');
      console.table(d.topMoves);
      console.groupEnd();
    }

    // Execute phase 1
    executeAIPhase1(result.phase1, function(){
      // Execute phase 2 after animation
      executeAIPhase2(result.phase2);
    });
  };

  worker.onerror=function(err){
    console.error('AI worker error:',err);
    aiThinking=false;
    if(oppNameEl)oppNameEl.textContent=origName;
    aiFallbackTurn();
  };

  worker.postMessage({gameState:snapshot, variant, simCount:500, personality:aiPersonality});
}

function executeAIPhase1(p1, onDone){
  const hand=getCards(gameState,'hands','player2');
  const card=hand.find(c=>c.id===p1.card.id);
  if(!card){aiFallbackTurn();return;}

  // Grab card position before state change for FLIP animation
  const saved=grabPos(card.id);

  const u={};
  const newHand=hand.filter(c=>c.id!==card.id);
  u['hands/player2']=newHand;

  if(p1.type==='play'){
    const exp=getCards(gameState,'expeditions','player2',card.color);
    exp.push(card);
    u[`expeditions/player2/${card.color}`]=exp;
    u['lastDiscardedColor']=null;u['justDiscarded']=false;
    SFX.play();
  } else {
    if(variant==='single'){
      const pile=getCards(gameState,'singlePile');pile.push(card);
      u['singlePile']=pile;u['justDiscarded']=true;
    } else {
      const pile=getCards(gameState,'discards',card.color);pile.push(card);
      u[`discards/${card.color}`]=pile;u['lastDiscardedColor']=card.color;
    }
    SFX.discard();
  }
  u['phase']='draw';
  localUpdate(u);
  slideFrom(saved);
  setTimeout(()=>onDone(), ANIM_MS + 50);
}

function executeAIPhase2(p2){
  if(gameState.status==='finished')return;
  const u2={};
  const aiHand=getCards(gameState,'hands','player2');

  if(p2.type==='discard'&&variant==='classic'){
    const pile=getCards(gameState,'discards',p2.color);
    if(pile.length>0){
      const card=pile.pop();
      // Grab position of the discard card before it disappears
      const saved=grabPos(card.id);
      aiHand.push(card);
      u2[`discards/${p2.color}`]=pile;
      SFX.drawCard();
    } else {
      // Pile empty (opponent took it) — fall back to draw pile
      return drawAIFromDrawPile(u2,aiHand);
    }
  } else if(p2.type==='single'){
    const pile=getCards(gameState,'singlePile');
    if(pile.length>0){
      const card=pile.pop();aiHand.push(card);
      u2['singlePile']=pile;
      SFX.drawCard();
    } else {
      return drawAIFromDrawPile(u2,aiHand);
    }
  } else {
    SFX.drawCard();
    return drawAIFromDrawPile(u2,aiHand);
  }

  u2['hands/player2']=aiHand;
  u2['currentTurn']='player1';u2['phase']='play';u2['lastDiscardedColor']=null;u2['justDiscarded']=false;
  localUpdate(u2);
}

function drawAIFromDrawPile(u2,aiHand){
  const drawPile=getCards(gameState,'drawPile');
  if(drawPile.length===0){u2['status']='finished';localUpdate(u2);return;}
  const card=drawPile.pop();aiHand.push(card);
  u2['drawPile']=drawPile;
  if(drawPile.length===0)u2['status']='finished';
  u2['hands/player2']=aiHand;
  u2['currentTurn']='player1';u2['phase']='play';u2['lastDiscardedColor']=null;u2['justDiscarded']=false;
  localUpdate(u2);
}

// Simple fallback if worker fails
function aiFallbackTurn(){
  const hand=getCards(gameState,'hands','player2');
  if(hand.length===0)return;
  // Discard first card, draw from draw pile
  const card=hand[0];
  const u={};
  u['hands/player2']=hand.filter(c=>c.id!==card.id);
  if(variant==='single'){
    const pile=getCards(gameState,'singlePile');pile.push(card);
    u['singlePile']=pile;u['justDiscarded']=true;
  } else {
    const pile=getCards(gameState,'discards',card.color);pile.push(card);
    u[`discards/${card.color}`]=pile;u['lastDiscardedColor']=card.color;
  }
  u['phase']='draw';
  localUpdate(u);
  onAnimationsDone(()=>{
    const u2={};const aiHand=getCards(gameState,'hands','player2');
    drawAIFromDrawPile(u2,aiHand);
  });
}
