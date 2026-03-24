// Monte Carlo AI Worker for Lost Cities
// Runs simulations off the main thread to find the best action via P(win)

const COLORS = ['red','green','blue','white','yellow'];

// All 60 cards in the game
function allCards(){
  const cards=[];
  for(const c of COLORS){
    for(let i=0;i<3;i++) cards.push({color:c,value:0,id:c+'_w'+i});
    for(let v=2;v<=10;v++) cards.push({color:c,value:v,id:c+'_'+v});
  }
  return cards;
}

function canPlay(card, exp){
  if(exp.length===0) return true;
  const top=exp[exp.length-1];
  if(card.value===0) return top.value===0;
  return card.value>top.value;
}

function scoreExpeditions(exps){
  let total=0;
  for(const c of COLORS){
    const cards=exps[c]||[];
    if(cards.length===0) continue;
    const wagers=cards.filter(x=>x.value===0).length;
    const sum=cards.filter(x=>x.value>0).reduce((s,x)=>s+x.value,0);
    total+=(sum-20)*(1+wagers)+(cards.length>=8?20:0);
  }
  return total;
}

// Fisher-Yates
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    const t=arr[i]; arr[i]=arr[j]; arr[j]=t;
  }
  return arr;
}

// Determine which cards are unknown to the AI (player2)
function getUnknownPool(gs, variant){
  const known=new Set();
  // AI's hand
  for(const c of gs.hands.player2) known.add(c.id);
  // All expeditions
  for(const p of ['player1','player2'])
    for(const c of COLORS)
      for(const card of (gs.expeditions[p][c]||[])) known.add(card.id);
  // Discards
  if(variant==='classic'){
    for(const c of COLORS)
      for(const card of (gs.discards[c]||[])) known.add(card.id);
  } else {
    for(const card of (gs.singlePile||[])) known.add(card.id);
  }
  return allCards().filter(c=>!known.has(c.id));
}

// Create a simulation state from the real state + a sampled deal
function createSim(gs, oppHand, deck, variant){
  const sim={
    hands:{
      player1: oppHand.map(c=>({...c})),
      player2: gs.hands.player2.map(c=>({...c}))
    },
    expeditions:{
      player1:{}, player2:{}
    },
    deck: deck.map(c=>({...c})),
    variant
  };
  for(const p of ['player1','player2'])
    for(const c of COLORS)
      sim.expeditions[p][c]=(gs.expeditions[p][c]||[]).map(x=>({...x}));

  if(variant==='classic'){
    sim.discards={};
    for(const c of COLORS) sim.discards[c]=(gs.discards[c]||[]).map(x=>({...x}));
  } else {
    sim.singlePile=(gs.singlePile||[]).map(x=>({...x}));
  }
  return sim;
}

// ========== GREEDY ROLLOUT POLICY ==========
// Used to simulate both players' future turns quickly.
// Doesn't need to be perfect — just reasonable enough that
// the Monte Carlo statistics reflect real game outcomes.

function greedyTurn(sim, player){
  const hand=sim.hands[player];
  if(hand.length===0) return true;
  const other=player==='player1'?'player2':'player1';

  // --- Phase 1: Play or Discard ---
  let bestIdx=-1, bestScore=-Infinity, bestAction='discard';

  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const exp=sim.expeditions[player][card.color];
    if(!canPlay(card,exp)) continue;

    let score=0;
    if(exp.length>0){
      // Extending existing expedition — almost always good
      score=20+(card.value||3);
      // Bonus for chasing 8-card bonus
      if(exp.length>=6) score+=8;
    } else {
      // Starting new expedition — evaluate in-hand support
      const colorCards=hand.filter(c=>c.color===card.color);
      const numSum=colorCards.filter(c=>c.value>0).reduce((s,c)=>s+c.value,0);
      const wagers=colorCards.filter(c=>c.value===0).length;
      const projected=(numSum-20)*(1+wagers);

      if(card.value===0){
        // Wager: only if we have good backup
        score=projected>0? 8+colorCards.length*2 : -5;
      } else {
        score=projected>0? 6+projected/5 : projected/3;
      }
      // Fewer cards in deck = less time to build, penalize new starts
      if(sim.deck.length<15) score-=8;
      if(sim.deck.length<8) score-=8;
    }
    if(score>bestScore){bestScore=score; bestIdx=i; bestAction='play';}
  }

  // Find best discard candidate
  let discIdx=0, discScore=Infinity;
  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const exp=sim.expeditions[player][card.color];
    let val=card.value||1;
    if(exp.length>0) val+=30; // keep cards for active expeditions
    if(exp.length>0 && canPlay(card,exp)) val+=20;
    // Don't feed opponent
    const oppExp=sim.expeditions[other][card.color];
    if(oppExp.length>0) val+=10;
    if(val<discScore){discScore=val; discIdx=i;}
  }

  if(bestAction!=='play' || bestScore<3){
    bestIdx=discIdx; bestAction='discard';
  }

  // Execute phase 1
  const card=hand.splice(bestIdx,1)[0];
  let discardedColor=null, justDiscarded=false;

  if(bestAction==='play'){
    sim.expeditions[player][card.color].push(card);
  } else {
    if(sim.variant==='single'){
      sim.singlePile.push(card);
      justDiscarded=true;
    } else {
      sim.discards[card.color].push(card);
      discardedColor=card.color;
    }
  }

  // --- Phase 2: Draw ---
  let drew=false;

  if(sim.variant==='classic'){
    let bestDC=null, bestDS=-1;
    for(const c of COLORS){
      if(c===discardedColor) continue;
      const pile=sim.discards[c];
      if(pile.length===0) continue;
      const top=pile[pile.length-1];
      const exp=sim.expeditions[player][c];
      if(canPlay(top,exp)){
        let s=top.value||2;
        if(exp.length>0) s+=12;
        if(s>bestDS){bestDS=s; bestDC=c;}
      }
    }
    if(bestDC && bestDS>6){
      hand.push(sim.discards[bestDC].pop());
      drew=true;
    }
  } else if(!justDiscarded && sim.singlePile.length>0){
    const top=sim.singlePile[sim.singlePile.length-1];
    const exp=sim.expeditions[player][top.color];
    if(canPlay(top,exp)){
      let s=top.value||2;
      if(exp.length>0) s+=12;
      if(s>6){
        hand.push(sim.singlePile.pop());
        drew=true;
      }
    }
  }

  if(!drew){
    if(sim.deck.length===0) return true; // game over
    hand.push(sim.deck.pop());
    if(sim.deck.length===0) return true;
  }

  return false; // game continues
}

// Play game to completion, return 1 if player2 (AI) wins, 0.5 for tie, 0 for loss
function rollout(sim, startingPlayer){
  let turn=startingPlayer;
  let safety=80;
  while(safety-->0){
    if(greedyTurn(sim,turn)) break;
    turn=turn==='player1'?'player2':'player1';
  }
  const s1=scoreExpeditions(sim.expeditions.player1);
  const s2=scoreExpeditions(sim.expeditions.player2);
  return s2>s1? 1 : (s2===s1? 0.5 : 0);
}

// ========== ACTION ENUMERATION ==========

function getPhase1Actions(gs){
  const hand=gs.hands.player2;
  const actions=[];
  const seen=new Set(); // dedup identical strategic choices

  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const exp=gs.expeditions.player2[card.color]||[];

    // Play option
    if(canPlay(card,exp)){
      const key='P_'+card.color+'_'+card.value;
      if(!seen.has(key)){
        seen.add(key);
        actions.push({type:'play', idx:i, card, color:card.color});
      }
    }

    // Discard option
    const dkey='D_'+card.color+'_'+card.value;
    if(!seen.has(dkey)){
      seen.add(dkey);
      actions.push({type:'discard', idx:i, card, color:card.color});
    }
  }
  return actions;
}

function getPhase2Actions(gs, variant, discardedColor, justDiscarded){
  const actions=[{type:'deck'}];

  if(variant==='classic'){
    for(const c of COLORS){
      if(c===discardedColor) continue;
      // Check if pile has cards (may have gained one from phase1 discard)
      const pile=gs.discards[c]||[];
      if(pile.length>0) actions.push({type:'discard', color:c});
    }
  } else if(!justDiscarded){
    if((gs.singlePile||[]).length>0) actions.push({type:'single'});
  }
  return actions;
}

// ========== MONTE CARLO EVALUATION ==========

function evaluate(gs, variant, simCount){
  const pool=getUnknownPool(gs, variant);
  const deckSize=gs.deckSize; // sent from main thread
  const oppHandSize=pool.length-deckSize;

  if(oppHandSize<0 || pool.length===0){
    // Fallback: no unknown cards (shouldn't happen in normal play)
    return {phase1:{type:'discard',idx:0,card:gs.hands.player2[0],color:gs.hands.player2[0].color}, phase2:{type:'deck'}};
  }

  const phase1Actions=getPhase1Actions(gs);
  if(phase1Actions.length===0) return null;

  // For each phase1 action, determine phase2 options
  // and evaluate all pairs via Monte Carlo
  const pairs=[];
  for(const p1 of phase1Actions){
    const discColor=p1.type==='discard'? p1.color : null;
    const justDisc=p1.type==='discard';

    // Build a temporary state reflecting phase1 to get correct phase2 options
    // (e.g., discard adds to pile, affecting available draws)
    const tempDiscards=variant==='classic'?{}:null;
    const tempSingle=variant==='single'?[...(gs.singlePile||[])]:null;
    if(variant==='classic'){
      for(const c of COLORS) tempDiscards[c]=[...(gs.discards[c]||[])];
      if(p1.type==='discard') tempDiscards[p1.color].push(p1.card);
    } else if(p1.type==='discard'){
      tempSingle.push(p1.card);
    }
    const tempGs={...gs, discards:tempDiscards||gs.discards, singlePile:tempSingle||gs.singlePile};

    const p2Actions=getPhase2Actions(tempGs, variant, discColor, justDisc);
    for(const p2 of p2Actions){
      pairs.push({p1, p2, wins:0});
    }
  }

  // Run simulations
  for(let s=0;s<simCount;s++){
    // Sample a deal: randomly distribute unknown cards to opponent hand + deck
    const shuffled=shuffle([...pool]);
    const oppHand=shuffled.slice(0, oppHandSize);
    const deck=shuffled.slice(oppHandSize);

    for(const pair of pairs){
      // Create simulation state
      const sim=createSim(gs, oppHand, deck, variant);

      // Apply phase 1
      const p1=pair.p1;
      // Find card in sim hand by matching id
      const cardIdx=sim.hands.player2.findIndex(c=>c.id===p1.card.id);
      if(cardIdx===-1) continue; // shouldn't happen
      const playedCard=sim.hands.player2.splice(cardIdx,1)[0];

      if(p1.type==='play'){
        sim.expeditions.player2[playedCard.color].push(playedCard);
      } else {
        if(variant==='single'){
          sim.singlePile.push(playedCard);
        } else {
          sim.discards[playedCard.color].push(playedCard);
        }
      }

      // Apply phase 2
      const p2=pair.p2;
      let gameOver=false;
      if(p2.type==='deck'){
        if(sim.deck.length===0){gameOver=true;}
        else {
          sim.hands.player2.push(sim.deck.pop());
          if(sim.deck.length===0) gameOver=true;
        }
      } else if(p2.type==='discard'){
        const pile=sim.discards[p2.color];
        if(pile.length>0) sim.hands.player2.push(pile.pop());
      } else if(p2.type==='single'){
        if(sim.singlePile.length>0) sim.hands.player2.push(sim.singlePile.pop());
      }

      // Rollout from opponent's turn
      if(gameOver){
        const s1=scoreExpeditions(sim.expeditions.player1);
        const s2=scoreExpeditions(sim.expeditions.player2);
        pair.wins+= s2>s1?1:(s2===s1?0.5:0);
      } else {
        pair.wins+=rollout(sim,'player1');
      }
    }
  }

  // Find best pair
  let best=pairs[0];
  for(let i=1;i<pairs.length;i++){
    if(pairs[i].wins>best.wins) best=pairs[i];
  }

  return {phase1: best.p1, phase2: best.p2, winRate: best.wins/simCount,
          stats: pairs.map(p=>({
            p1: p.p1.type+'_'+p.p1.color+'_'+(p.p1.card.value||'W'),
            p2: p.p2.type+(p.p2.color?'_'+p.p2.color:''),
            wr: (p.wins/simCount*100).toFixed(1)+'%'
          }))};
}

// ========== WORKER MESSAGE HANDLER ==========
self.onmessage=function(e){
  const {gameState, variant, simCount}=e.data;
  const t0=performance.now();
  const result=evaluate(gameState, variant, simCount||200);
  const elapsed=Math.round(performance.now()-t0);
  self.postMessage({result, elapsed});
};
