// gamelogic.js — Game actions: card selection, play, discard, draw, undo, scoring display, game over

function canPlayOnExpedition(card, expedition){
  if(expedition.length===0) return true;
  const top=expedition[expedition.length-1];
  if(card.value===0) return top.value===0; // wager only before numbers
  return card.value > top.value;
}

function selectCard(cardId){
  if(gameState.currentTurn!==mySlot || gameState.phase!=='play') return;
  SFX.select();
  expandedStack=null; // Collapse any expanded stack when selecting a card
  const hand=getCards(gameState,'hands',mySlot);
  const card=hand.find(c=>c.id===cardId);
  if(!card) return;
  selectedCard = (selectedCard && selectedCard.id===cardId) ? null : card;
  renderGame();
}

async function playToExpedition(color){
  if(!selectedCard || gameState.currentTurn!==mySlot || gameState.phase!=='play') return;
  if(selectedCard.color!==color) return;
  const expedition=getCards(gameState,'expeditions',mySlot,color);
  if(!canPlayOnExpedition(selectedCard, expedition)){
    toast('Must be higher than '+expedition[expedition.length-1].value); return;
  }
  SFX.play();
  const card=selectedCard;
  const saved=grabPos(card.id);
  const hand=(getCards(gameState,'hands',mySlot)).filter(c=>c.id!==card.id);
  expedition.push(card);
  gameState.hands[mySlot]=hand;
  gameState.phase='draw';
  gameState.lastDiscardedColor=null;
  gameState.justDiscarded=false;
  const updates={};
  updates[`hands/${mySlot}`]=hand;
  updates[`expeditions/${mySlot}/${color}`]=expedition;
  updates['phase']='draw';
  updates['lastDiscardedColor']=null;
  updates['justDiscarded']=false;
  lastPlayedCard={card,to:'expedition',color};
  selectedCard=null;
  renderGame();
  slideFrom(saved);
  if(!isAIGame) roomRef.child('game').update(updates);
}

async function discardTo(color){
  if(!selectedCard || gameState.currentTurn!==mySlot || gameState.phase!=='play') return;
  if(selectedCard.color!==color){
    toast('Discard to the '+COLOR_LABELS[selectedCard.color]+' pile'); return;
  }
  SFX.discard();
  const card=selectedCard;
  const saved=grabPos(card.id);
  const hand=(getCards(gameState,'hands',mySlot)).filter(c=>c.id!==card.id);
  const pile=getCards(gameState,'discards',color);
  pile.push(card);
  gameState.hands[mySlot]=hand;
  gameState.phase='draw';
  gameState.lastDiscardedColor=color;
  const updates={};
  updates[`hands/${mySlot}`]=hand;
  updates[`discards/${color}`]=pile;
  updates['phase']='draw';
  updates['lastDiscardedColor']=color;
  lastPlayedCard={card,to:'discard',color};
  selectedCard=null;
  renderGame();
  slideFrom(saved);
  if(!isAIGame) roomRef.child('game').update(updates);
}

async function drawFromDeck(){
  if(gameState.currentTurn!==mySlot || gameState.phase!=='draw') return;
  const deck=getCards(gameState,'deck');
  if(deck.length===0) return;
  SFX.drawCard();
  const deckEl=document.getElementById('deck-col');
  const card=deck.pop();
  const hand=getCards(gameState,'hands',mySlot);
  hand.push(card);
  const oppSlot=mySlot==='player1'?'player2':'player1';
  gameState.currentTurn=oppSlot;
  gameState.phase='play';
  gameState.lastDiscardedColor=null;
  gameState.justDiscarded=false;
  const updates={};
  updates['deck']=deck;
  updates[`hands/${mySlot}`]=hand;
  updates['currentTurn']=oppSlot;
  updates['phase']='play';
  updates['lastDiscardedColor']=null;
  updates['justDiscarded']=false;
  if(deck.length===0){ updates['status']='finished'; gameState.status='finished'; }
  lastPlayedCard=null;
  renderGame();
  slideFromEl(deckEl, card.id);
  if(!isAIGame) roomRef.child('game').update(updates);
}

// SINGLE PILE VARIANT
async function discardToSingle(){
  if(!selectedCard || gameState.currentTurn!==mySlot || gameState.phase!=='play') return;
  SFX.discard();
  const card=selectedCard;
  const saved=grabPos(card.id);
  const hand=(getCards(gameState,'hands',mySlot)).filter(c=>c.id!==card.id);
  const pile=getCards(gameState,'singlePile');
  pile.push(card);
  gameState.singlePile=pile;
  gameState.hands[mySlot]=hand;
  gameState.phase='draw';
  gameState.justDiscarded=true;
  const updates={};
  updates[`hands/${mySlot}`]=hand;
  updates['singlePile']=pile;
  updates['phase']='draw';
  updates['justDiscarded']=true;
  lastPlayedCard={card,to:'single',color:card.color};
  selectedCard=null;
  renderGame();
  slideFrom(saved);
  if(!isAIGame) roomRef.child('game').update(updates);
}

async function drawFromSingle(){
  if(gameState.currentTurn!==mySlot || gameState.phase!=='draw') return;
  if(gameState.justDiscarded){toast("Can't draw from pile you just discarded to");return}
  const pile=getCards(gameState,'singlePile');
  if(pile.length===0) return;
  SFX.drawCard();
  const card=pile[pile.length-1];
  const saved=grabPos(card.id);
  pile.pop();
  const hand=getCards(gameState,'hands',mySlot);
  hand.push(card);
  const oppSlot=mySlot==='player1'?'player2':'player1';
  gameState.currentTurn=oppSlot;
  gameState.phase='play';
  gameState.justDiscarded=false;
  const updates={};
  updates['singlePile']=pile;
  updates[`hands/${mySlot}`]=hand;
  updates['currentTurn']=oppSlot;
  updates['phase']='play';
  updates['justDiscarded']=false;
  lastPlayedCard=null;
  renderGame();
  slideFrom(saved);
  if(!isAIGame) roomRef.child('game').update(updates);
}

async function drawFromDiscard(color){
  if(gameState.currentTurn!==mySlot || gameState.phase!=='draw') return;
  if(color===gameState.lastDiscardedColor){toast("Can't draw from pile you just discarded to");return}
  const pile=getCards(gameState,'discards',color);
  if(pile.length===0) return;
  SFX.drawCard();
  const card=pile[pile.length-1];
  const saved=grabPos(card.id);
  pile.pop();
  const hand=getCards(gameState,'hands',mySlot);
  hand.push(card);
  const oppSlot=mySlot==='player1'?'player2':'player1';
  gameState.currentTurn=oppSlot;
  gameState.phase='play';
  gameState.lastDiscardedColor=null;
  const updates={};
  updates[`discards/${color}`]=pile;
  updates[`hands/${mySlot}`]=hand;
  updates['currentTurn']=oppSlot;
  updates['phase']='play';
  lastPlayedCard=null;
  updates['lastDiscardedColor']=null;
  renderGame();
  slideFrom(saved);
  if(!isAIGame) roomRef.child('game').update(updates);
}

// ===== UNDO =====
async function undoLastPlay(){
  if(!lastPlayedCard||gameState.phase!=='draw'||gameState.currentTurn!==mySlot)return;
  SFX.undo();
  const {card,to,color}=lastPlayedCard;
  const hand=getCards(gameState,'hands',mySlot);
  hand.push(card);
  const u={};
  u[`hands/${mySlot}`]=hand;
  u['phase']='play';
  if(to==='expedition'){
    const exp=getCards(gameState,'expeditions',mySlot,color);
    exp.pop();
    u[`expeditions/${mySlot}/${color}`]=exp;
  } else if(to==='discard'){
    const pile=getCards(gameState,'discards',color);
    pile.pop();
    u[`discards/${color}`]=pile;
  } else if(to==='single'){
    const pile=getCards(gameState,'singlePile');
    pile.pop();
    u['singlePile']=pile;
  }
  u['lastDiscardedColor']=null;
  u['justDiscarded']=false;
  lastPlayedCard=null;
  selectedCard=card;
  if(isAIGame){localUpdate(u)} else {await roomRef.child('game').update(u)}
}

function showGameOver(){
  const s1=calcScore(gameState.expeditions.player1);
  const s2=calcScore(gameState.expeditions.player2);
  const my=mySlot==='player1'?s1:s2;
  const opp=mySlot==='player1'?s2:s1;
  const chex={red:'#c0392b',green:'#27ae60',blue:'#2980b9',white:'#95a5a6',yellow:'#f39c12'};
  const w=document.getElementById('winner-text');
  if(my.total>opp.total){w.textContent='Victory!';w.style.cssText='color:var(--gold-bright);';seriesScore.you++;}
  else if(my.total<opp.total){w.textContent='Defeated';w.style.cssText='color:#e07060;';seriesScore.opp++;}
  else{w.textContent='A Draw!';w.style.cssText='color:var(--parchment);';}
  // Show series score
  const seriesEl=document.getElementById('series-score');
  if(seriesEl){
    if(seriesScore.you+seriesScore.opp>1) seriesEl.textContent=`Series: You ${seriesScore.you} \u2014 ${seriesScore.opp} Opp`;
    else seriesEl.textContent='';
  }
  const neg=v=>v<0?'r-neg':'';
  const goldPlus=v=>v>=0?'r-pos':'r-neg';
  const sign=v=>v>=0?'<span class="sc-sign">+</span>'+v:'<span class="sc-sign">−</span>'+Math.abs(v);
  const fmt=v=>v<0?'<span class="sc-sign">-</span>'+Math.abs(v):''+v;
  const dash='';
  const myWin=my.total>opp.total;
  const oppWin=opp.total>my.total;
  // Color style for collapsed row totals: negative=red, positive=gold, winner gets glow
  function colorStyle(score,isWinner){
    if(score===0&&!isWinner) return 'class="r-muted"';
    if(isWinner) return score<0?'class="r-neg r-winner"':'class="r-pos r-winner"';
    return score<0?'class="r-neg"':'class="r-pos"';
  }
  // Style for game total row
  function winStyle(score,isW){
    if(isW) return score<0?'class="r-neg r-winner"':'class="r-pos r-winner"';
    return score<0?'class="r-neg"':'class="r-muted"';
  }

  // Centered-label row: [You value left-aligned] [label centered] [Opp value right-aligned]
  function row(mV,label,oV,mC,oC,extra){
    return `<div class="r-line sc-row" style="justify-content:center;${extra||''}"><span style="flex:1;text-align:left" class="${mC||''}">${mV}</span><span style="min-width:calc(var(--card-h) * 1.15);text-align:center;padding:0 var(--gap-col);font-size:var(--text-md);opacity:.7">${label}</span><span style="flex:1;text-align:right" class="${oC||''}">${oV}</span></div>`;
  }

  // Column headers — fixed width center column for alignment
  let html=`<div class="r-line sc-row" style="justify-content:center;font-size:var(--text-lg);font-family:'Cinzel',serif;padding-bottom:var(--gap-sm);color:var(--parchment)">
    <span style="flex:1;text-align:left;${myWin?'color:var(--gold-bright)':''}">You</span><span style="min-width:calc(var(--card-h) * 1.15);text-align:center;padding:0 var(--gap-col)"></span><span style="flex:1;text-align:right;${oppWin?'color:var(--gold-bright)':''}">Opp</span></div>`;

  // Color rows
  let colorIdx=0;
  COLORS.forEach(c=>{
    const m=my.breakdown[c], o=opp.breakdown[c];
    if(m.count===0&&o.count===0)return;
    const mS=m.count>0?fmt(m.score):'', oS=o.count>0?fmt(o.score):'';
    const idx=colorIdx++;
    const mWinC=m.score>o.score, oWinC=o.score>m.score;

    // Cards strings — use W for wager instead of emoji to save space
    const mCards=m.count>0?(Array(m.wagers).fill('W').join(' ')+(m.values.length?(m.wagers?' ':'')+m.values.join(' '):'')):'';
    const oCards=o.count>0?(Array(o.wagers).fill('W').join(' ')+(o.values.length?(o.wagers?' ':'')+o.values.join(' '):'')):'';

    // Between-color separator — medium weight (skip first)
    if(idx>0) html+=`<div class="r-sep-color"></div>`;

    // Collapsed: scores flanking color dot — negative=red, positive=gold
    html+=`<div id="sc-row-${idx}" style="cursor:pointer;padding:var(--gap-col) 0" onclick="toggleScore(${idx})">
      <div class="r-line sc-row r-color-total" style="justify-content:center">
        <span style="flex:1;text-align:left" ${m.count?colorStyle(m.score,mWinC):'class="r-muted"'}>${mS}</span>
        <span style="min-width:calc(var(--card-h) * 1.15);text-align:center;padding:0 var(--gap-col)"><span class="color-dot" style="background:${chex[c]};width:var(--text-lg);height:var(--text-lg);display:inline-flex;align-items:center;justify-content:center;font-size:var(--text-sm);color:rgba(255,255,255,.6)">▼</span></span>
        <span style="flex:1;text-align:right" ${o.count?colorStyle(o.score,oWinC):'class="r-muted"'}>${oS}</span>
      </div>
    </div>`;

    // Expanded header: cards flanking color dot — truncated on overflow
    html+=`<div id="sc-exp-${idx}" style="display:none;cursor:pointer;padding:var(--gap-col) 0" onclick="toggleScore(${idx})">
      <div class="r-line sc-row" style="justify-content:center">
        <span class="sc-cards" style="flex:1;text-align:left;opacity:.6">${mCards}</span>
        <span style="min-width:calc(var(--card-h) * 1.15);text-align:center;padding:0 var(--gap-col)"><span class="color-dot" style="background:${chex[c]};width:var(--text-lg);height:var(--text-lg);display:inline-flex;align-items:center;justify-content:center;font-size:var(--text-sm);color:rgba(255,255,255,.6)">▲</span></span>
        <span class="sc-cards" style="flex:1;text-align:right;opacity:.6">${oCards}</span>
      </div>
    </div>`;

    // Breakdown body — thin separators within
    html+=`<div id="sc-body-${idx}" style="display:none;padding:0 0 var(--gap-col)">`;

    html+=row(m.count?m.sum:dash,'Card total',o.count?o.sum:dash,m.count?neg(m.sum):'',o.count?neg(o.sum):'');
    html+=row(m.count?'<span class="sc-sign">−</span>20':dash,'Venture cost',o.count?'<span class="sc-sign">−</span>20':dash,'r-muted','r-muted');

    const maxW=Math.max(m.wagers,o.wagers);
    const hasBonus=m.bonus||o.bonus;

    for(let i=0;i<maxW;i++){
      html+=row(i<m.wagers?sign(m.subtotal):dash,'W'+(i+1),i<o.wagers?sign(o.subtotal):dash,i<m.wagers?goldPlus(m.subtotal):'',i<o.wagers?goldPlus(o.subtotal):'');
    }

    if(hasBonus){
      html+=row(m.bonus?'<span class="sc-sign">+</span>20':dash,'8+ bonus',o.bonus?'<span class="sc-sign">+</span>20':dash,m.bonus?'r-pos':'',o.bonus?'r-pos':'');
    }

    // Color subtotal with thin separator above
    html+=`<div class="r-sep-breakdown"></div>`;
    html+=`<div class="r-line sc-row r-color-total" style="justify-content:center;padding-top:var(--gap-col)">
      <span style="flex:1;text-align:left" ${m.count?colorStyle(m.score,mWinC):'class="r-muted"'}>${m.count?fmt(m.score):dash}</span>
      <span style="min-width:calc(var(--card-h) * 1.15);text-align:center;padding:0 var(--gap-col)"></span>
      <span style="flex:1;text-align:right" ${o.count?colorStyle(o.score,oWinC):'class="r-muted"'}>${o.count?fmt(o.score):dash}</span></div>`;

    html+=`</div>`;
  });

  // Game total — bold gold separator (strongest visual weight)
  html+=`<div style="border-top:calc(var(--border-w) * 2) solid var(--gold);margin:var(--gap-sm) 0 var(--gap-col)"></div>`;
  html+=`<div class="r-line sc-row" style="justify-content:center;font-weight:900;font-family:'Cinzel',serif;padding:var(--gap-sm) 0;font-variant-numeric:tabular-nums">
    <span style="flex:1;text-align:left;font-size:var(--line-md)" ${winStyle(my.total,myWin)}>${fmt(my.total)}</span>
    <span style="min-width:calc(var(--card-h) * 1.15);text-align:center;padding:0 var(--gap-col)"></span>
    <span style="flex:1;text-align:right;font-size:var(--line-md)" ${winStyle(opp.total,oppWin)}>${fmt(opp.total)}</span>
  </div>`;

  // Put it all in one container
  document.getElementById('score-summary').innerHTML='';
  document.getElementById('score-details').innerHTML=html;
  showScreen('gameover-screen');
  if(myWin) SFX.win(); else SFX.gameOver();
}

function toggleScore(idx){
  SFX.select();
  const row=document.getElementById('sc-row-'+idx);
  const exp=document.getElementById('sc-exp-'+idx);
  const body=document.getElementById('sc-body-'+idx);
  const isOpen=body.style.display!=='none';
  row.style.display=isOpen?'block':'none';
  exp.style.display=isOpen?'none':'block';
  body.style.display=isOpen?'none':'block';
}

function viewFinalBoard(){
  showScreen('game-screen');
  renderGame();
  document.getElementById('back-to-scores').style.display='block';
  document.getElementById('phase-bar').textContent='Game Over — Final Board';
}
function backToScores(){
  document.getElementById('back-to-scores').style.display='none';
  showScreen('gameover-screen');
}

function rematch(){
  // Swap who goes first
  seriesFirstPlayer=seriesFirstPlayer==='player1'?'player2':'player1';
  playAgain();
}

async function playAgain(){
  if(mySlot==='player1' && !isAIGame){
    const deck=createDeck();
    const hand1=deck.splice(0,8),hand2=deck.splice(0,8);
    const exps={},discard={};
    COLORS.forEach(c=>{exps[c]=[];discard[c]=[]});
    await roomRef.child('game').set({
      deck,hands:{player1:hand1,player2:hand2},
      expeditions:{player1:exps,player2:exps},
      discards:discard,currentTurn:seriesFirstPlayer,phase:'play',
      lastDiscardedColor:null,status:'playing'
    });
  }
  selectedCard=null; document.getElementById('back-to-scores').style.display='none'; if(typeof _statsRecordedForGame!=='undefined') _statsRecordedForGame=false; showScreen('game-screen');
}

// ===== LOCAL UPDATE (for AI mode) =====
function localUpdate(updates){
  for(const [k,v] of Object.entries(updates)){
    const parts=k.split('/');
    let obj=gameState;
    for(let i=0;i<parts.length-1;i++){
      if(!obj[parts[i]])obj[parts[i]]={};
      obj=obj[parts[i]];
    }
    obj[parts[parts.length-1]]=v;
  }
  renderGame();
  if(gameState.status==='finished')showGameOver();
}
