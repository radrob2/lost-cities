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
  for(const c of COLORS) total+=scoreColor(exps[c]||[]);
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

// Score a single color's expedition using the actual game formula
function scoreColor(cards){
  const n=cards.length;
  if(n===0) return 0;
  let wagers=0, sum=0;
  for(let i=0;i<n;i++){
    const v=cards[i].value;
    if(v===0) wagers++; else sum+=v;
  }
  return (sum-20)*(1+wagers)+(n>=8?20:0);
}

// ========== GREEDY ROLLOUT POLICY ==========
// Used to simulate both players' future turns quickly.
// Needs to be good enough that Monte Carlo statistics reflect real outcomes.

// Analyze what playable sequences a player holds for each color.
function analyzeHand(hand, expeditions){
  const analysis={};
  // Pre-bucket hand cards by color to avoid repeated filtering
  const byColor={};
  for(const c of COLORS) byColor[c]=[];
  for(let i=0;i<hand.length;i++) byColor[hand[i].color].push(hand[i]);

  for(const c of COLORS){
    const exp=expeditions[c];
    const expLen=exp?exp.length:0;
    const topVal=expLen>0? exp[expLen-1].value : -1;

    const colorCards=byColor[c];
    if(colorCards.length===0){
      analysis[c]={playable:[], count:0, projected:expLen>0?scoreColor(exp):0};
      continue;
    }

    // Check if expedition already has number cards
    let hasNumbers=false;
    if(expLen>0) for(let i=0;i<expLen;i++) if(exp[i].value>0){hasNumbers=true;break;}

    // Sort: wagers first, then numbers ascending
    const sorted=colorCards.slice().sort((a,b)=>a.value-b.value);

    // Build playable sequence
    const playable=[];
    let curTop=topVal;
    for(let i=0;i<sorted.length;i++){
      const card=sorted[i];
      if(card.value===0){
        if(!hasNumbers){playable.push(card); curTop=0;}
      } else if(card.value>curTop){
        playable.push(card); curTop=card.value;
      }
    }

    // Compute projected score if we play the full sequence
    const futureExp=expLen>0?exp.concat(playable):playable;
    const projected=scoreColor(futureExp);

    analysis[c]={playable, count:playable.length, projected};
  }
  return analysis;
}

function greedyTurn(sim, player){
  const hand=sim.hands[player];
  if(hand.length===0) return true;
  const other=player==='player1'?'player2':'player1';

  const analysis=analyzeHand(hand, sim.expeditions[player]);

  // --- Phase 1: Pick best action by comparing actual projected scores ---

  // For each color, compute the score delta of playing the next card in sequence
  // vs not playing anything in that color. Only consider the lowest playable card
  // per color — playing out of order is never correct since it blocks cards below.
  let bestIdx=-1, bestDelta=-Infinity, bestAction='discard';

  for(const c of COLORS){
    const a=analysis[c];
    if(a.count===0) continue;
    const nextCard=a.playable[0]; // always play lowest first
    const idx=hand.indexOf(nextCard);
    if(idx===-1) continue;

    const exp=sim.expeditions[player][c];

    // What's our score in this color if we do nothing (current expedition)?
    const curScore=exp.length===0? 0 : scoreColor(exp);

    // What's our projected score if we play this card (and eventually the rest of the sequence)?
    // Estimate: we'll play as many of the sequence as we have turns for
    const turnsLeft=Math.ceil(sim.deck.length/2); // rough: each player draws ~1/turn
    const canPlayCount=Math.min(a.count, turnsLeft);
    const toPlay=a.playable.slice(0, canPlayCount);
    const futureExp=[...exp, ...toPlay];
    const futureScore=scoreColor(futureExp);
    const delta=futureScore-curScore;

    if(delta>bestDelta){bestDelta=delta; bestIdx=idx; bestAction='play';}
  }

  // Find best discard: card whose removal costs us the least and helps opponent the least
  // Pre-cache opponent scores per color
  let discIdx=0, discCost=Infinity;
  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const c=card.color;
    const a=analysis[c];

    // Cost = how much we lose + how much opponent gains
    let cost=0;

    // Our loss: is this card in our playable sequence?
    if(a.count>0){
      let inSequence=false;
      for(let j=0;j<a.playable.length;j++){
        if(a.playable[j].id===card.id){inSequence=true;break;}
      }
      if(inSequence){
        // Difference between projected score with and without this card
        cost=a.projected - scoreColor(sim.expeditions[player][c]);
        // That's the value of the whole sequence; approximate single card's contribution
        // by dividing by sequence length (each card matters roughly equally)
        if(a.count>1) cost=cost/a.count;
        // Floor at card's face value — high cards are always costly to discard.
        // Without this, the -20 expedition penalty makes unstarted-expedition cards
        // appear worthless (a lone 10 scores -10, so cost = -10 = "free to discard").
        cost=Math.max(cost, card.value||3);
      }
    }

    // Opponent gain: can they play this card?
    const oppExp=sim.expeditions[other][c];
    if(oppExp&&oppExp.length>0 && canPlay(card, oppExp)){
      // Estimate opponent's gain: card value adjusted by their wager multiplier
      let oppWagers=0;
      for(let j=0;j<oppExp.length;j++) if(oppExp[j].value===0) oppWagers++;
      cost+=(card.value||0)*(1+oppWagers);
    }

    if(cost<discCost){discCost=cost; discIdx=i;}
  }

  // Play if the delta is positive (we gain points), otherwise discard
  if(bestDelta<=0){
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
      const oppExp=sim.expeditions[other][c];

      if(canPlay(top,exp)){
        let s=top.value||2;
        if(exp.length>0) s+=12;
        // Bonus: deny opponent a useful card (draw it before they can)
        if(oppExp.length>0 && canPlay(top,oppExp)){
          s+=8;
          const oppWagers=oppExp.filter(x=>x.value===0).length;
          if(oppWagers>0) s+=oppWagers*4;
        }
        if(s>bestDS){bestDS=s; bestDC=c;}
      } else if(oppExp.length>0 && canPlay(top,oppExp)){
        // Can't play it ourselves, but drawing it denies opponent
        // Only worth it if opponent would gain significantly
        const oppWagers=oppExp.filter(x=>x.value===0).length;
        let s=(top.value||2)+oppWagers*5;
        if(s>bestDS && s>8){bestDS=s; bestDC=c;} // high threshold — only deny high-value cards
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

  // Run simulations with shared deals (same random deal for all action pairs)
  // This dramatically reduces variance when comparing actions.
  const minSims=Math.min(simCount, 80); // minimum before early stopping
  let simsRan=0;
  for(let s=0;s<simCount;s++){
    simsRan++;
    const shuffled=shuffle([...pool]);
    const oppHand=shuffled.slice(0, oppHandSize);
    const deck=shuffled.slice(oppHandSize);

    for(const pair of pairs){
      const sim=createSim(gs, oppHand, deck, variant);

      // Apply phase 1
      const p1=pair.p1;
      const cardIdx=sim.hands.player2.findIndex(c=>c.id===p1.card.id);
      if(cardIdx===-1) continue;
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

      if(gameOver){
        const s1=scoreExpeditions(sim.expeditions.player1);
        const s2=scoreExpeditions(sim.expeditions.player2);
        pair.wins+= s2>s1?1:(s2===s1?0.5:0);
      } else {
        pair.wins+=rollout(sim,'player1');
      }
    }

    // Early stopping: if one action is dominating after enough samples,
    // don't waste time on more simulations
    if(s>=minSims && s%20===0){
      let best1=0, best2=0;
      for(const p of pairs){
        if(p.wins>best1){best2=best1; best1=p.wins;}
        else if(p.wins>best2) best2=p.wins;
      }
      const n=s+1;
      // If leader is ahead by >4 standard deviations, stop early
      const gap=(best1-best2)/n;
      const se=Math.sqrt(0.25/n); // worst-case stderr for proportion
      if(gap>4*se) break;
    }
  }

  // Find best pair
  let best=pairs[0];
  for(let i=1;i<pairs.length;i++){
    if(pairs[i].wins>best.wins) best=pairs[i];
  }

  return {phase1: best.p1, phase2: best.p2, winRate: best.wins/simsRan,
          simsRan,
          stats: pairs.map(p=>({
            p1: p.p1.type+'_'+p.p1.color+'_'+(p.p1.card.value||'W'),
            p2: p.p2.type+(p.p2.color?'_'+p.p2.color:''),
            wr: (p.wins/simsRan*100).toFixed(1)+'%'
          }))};
}

// ========== WORKER MESSAGE HANDLER ==========
self.onmessage=function(e){
  const {gameState, variant, simCount}=e.data;
  const t0=performance.now();
  const result=evaluate(gameState, variant, simCount||500);
  const elapsed=Math.round(performance.now()-t0);
  self.postMessage({result, elapsed});
};
