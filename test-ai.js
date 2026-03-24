#!/usr/bin/env node
// A/B test: new AI greedy policy vs old AI greedy policy
// Runs thousands of games and reports win rates

const COLORS = ['red','green','blue','white','yellow'];

function allCards(){
  const cards=[];
  for(const c of COLORS){
    for(let i=0;i<3;i++) cards.push({color:c,value:0,id:c+'_w'+i});
    for(let v=2;v<=10;v++) cards.push({color:c,value:v,id:c+'_'+v});
  }
  return cards;
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    const t=arr[i]; arr[i]=arr[j]; arr[j]=t;
  }
  return arr;
}

function canPlay(card, exp){
  if(exp.length===0) return true;
  const top=exp[exp.length-1];
  if(card.value===0) return top.value===0;
  return card.value>top.value;
}

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

function scoreExpeditions(exps){
  let total=0;
  for(const c of COLORS) total+=scoreColor(exps[c]||[]);
  return total;
}

function analyzeHand(hand, expeditions){
  const analysis={};
  const byColor={};
  for(const c of COLORS) byColor[c]=[];
  for(let i=0;i<hand.length;i++) byColor[hand[i].color].push(hand[i]);
  for(const c of COLORS){
    const exp=expeditions[c];
    const expLen=exp?exp.length:0;
    const topVal=expLen>0?exp[expLen-1].value:-1;
    const colorCards=byColor[c];
    if(colorCards.length===0){
      analysis[c]={playable:[],count:0,projected:expLen>0?scoreColor(exp):0};
      continue;
    }
    let hasNumbers=false;
    if(expLen>0) for(let i=0;i<expLen;i++) if(exp[i].value>0){hasNumbers=true;break;}
    const sorted=colorCards.slice().sort((a,b)=>a.value-b.value);
    const playable=[];
    let curTop=topVal;
    for(let i=0;i<sorted.length;i++){
      const card=sorted[i];
      if(card.value===0){
        if(!hasNumbers){playable.push(card);curTop=0;}
      } else if(card.value>curTop){
        playable.push(card);curTop=card.value;
      }
    }
    const futureExp=expLen>0?exp.concat(playable):playable;
    const projected=scoreColor(futureExp);
    analysis[c]={playable,count:playable.length,projected};
  }
  return analysis;
}

// OLD greedy policy (with just the floor fix)
function greedyTurnOld(sim, player){
  const hand=sim.hands[player];
  if(hand.length===0) return true;
  const other=player==='player1'?'player2':'player1';
  const analysis=analyzeHand(hand, sim.expeditions[player]);

  let bestIdx=-1, bestDelta=-Infinity, bestAction='discard';
  for(const c of COLORS){
    const a=analysis[c];
    if(a.count===0) continue;
    const nextCard=a.playable[0];
    const idx=hand.indexOf(nextCard);
    if(idx===-1) continue;
    const exp=sim.expeditions[player][c];
    const curScore=exp.length===0?0:scoreColor(exp);
    const turnsLeft=Math.ceil(sim.deck.length/2);
    const canPlayCount=Math.min(a.count, turnsLeft);
    const toPlay=a.playable.slice(0, canPlayCount);
    const futureExp=[...exp, ...toPlay];
    const futureScore=scoreColor(futureExp);
    const delta=futureScore-curScore;
    if(delta>bestDelta){bestDelta=delta; bestIdx=idx; bestAction='play';}
  }

  let discIdx=0, discCost=Infinity;
  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const c=card.color;
    const a=analysis[c];
    let cost=0;
    if(a.count>0){
      let inSequence=false;
      for(let j=0;j<a.playable.length;j++){
        if(a.playable[j].id===card.id){inSequence=true;break;}
      }
      if(inSequence){
        cost=a.projected-scoreColor(sim.expeditions[player][c]);
        if(a.count>1) cost=cost/a.count;
        cost=Math.max(cost, card.value||3);
      }
    }
    const oppExp=sim.expeditions[other][c];
    if(oppExp&&oppExp.length>0&&canPlay(card,oppExp)){
      let oppWagers=0;
      for(let j=0;j<oppExp.length;j++) if(oppExp[j].value===0) oppWagers++;
      cost+=(card.value||0)*(1+oppWagers);
    }
    if(cost<discCost){discCost=cost; discIdx=i;}
  }

  if(bestDelta<=0){ bestIdx=discIdx; bestAction='discard'; }

  const card=hand.splice(bestIdx,1)[0];
  let discardedColor=null, justDiscarded=false;
  if(bestAction==='play'){
    sim.expeditions[player][card.color].push(card);
  } else {
    if(sim.variant==='single'){ sim.singlePile.push(card); justDiscarded=true; }
    else { sim.discards[card.color].push(card); discardedColor=card.color; }
  }

  // Draw phase (shared)
  return drawPhase(sim, player, hand, discardedColor, justDiscarded);
}

// NEW greedy policy (game-stage-aware)
function greedyTurnNew(sim, player){
  const hand=sim.hands[player];
  if(hand.length===0) return true;
  const other=player==='player1'?'player2':'player1';
  const analysis=analyzeHand(hand, sim.expeditions[player]);

  let bestIdx=-1, bestDelta=-Infinity, bestAction='discard';
  for(const c of COLORS){
    const a=analysis[c];
    if(a.count===0) continue;
    const nextCard=a.playable[0];
    const idx=hand.indexOf(nextCard);
    if(idx===-1) continue;
    const exp=sim.expeditions[player][c];
    const curScore=exp.length===0?0:scoreColor(exp);
    const turnsLeft=Math.ceil(sim.deck.length/2);
    const canPlayCount=Math.min(a.count, turnsLeft);
    const toPlay=a.playable.slice(0, canPlayCount);
    const futureExp=[...exp, ...toPlay];
    const futureScore=scoreColor(futureExp);
    const delta=futureScore-curScore;
    if(delta>bestDelta){bestDelta=delta; bestIdx=idx; bestAction='play';}
  }

  let discIdx=0, discCost=Infinity;
  const deckLen=sim.deck.length;
  const progress=1-deckLen/44;
  const handByColor={};
  for(const c of COLORS) handByColor[c]=0;
  for(let i=0;i<hand.length;i++) handByColor[hand[i].color]++;

  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const c=card.color;
    const a=analysis[c];
    const exp=sim.expeditions[player][c];
    const expLen=exp?exp.length:0;
    let cost=0;

    let inSequence=false;
    if(a.count>0){
      for(let j=0;j<a.playable.length;j++){
        if(a.playable[j].id===card.id){inSequence=true;break;}
      }
    }

    if(inSequence && expLen>0){
      let wagers=0;
      for(let j=0;j<expLen;j++) if(exp[j].value===0) wagers++;
      cost=(card.value||5)*(1+wagers);
    } else if(inSequence){
      const colorCount=handByColor[c];
      cost=(card.value||3)*Math.min(1,colorCount/2.5)*(1-progress*0.6);
      cost=Math.max(cost,(card.value||3)*0.3);
    } else {
      cost=(card.value||1)*0.1;
    }

    const oppExp=sim.expeditions[other][c];
    if(oppExp&&oppExp.length>0&&canPlay(card,oppExp)){
      let oppWagers=0;
      for(let j=0;j<oppExp.length;j++) if(oppExp[j].value===0) oppWagers++;
      cost+=(card.value||0)*(1+oppWagers);
    }
    if(cost<discCost){discCost=cost; discIdx=i;}
  }

  if(bestDelta<=0){ bestIdx=discIdx; bestAction='discard'; }

  const card=hand.splice(bestIdx,1)[0];
  let discardedColor=null, justDiscarded=false;
  if(bestAction==='play'){
    sim.expeditions[player][card.color].push(card);
  } else {
    if(sim.variant==='single'){ sim.singlePile.push(card); justDiscarded=true; }
    else { sim.discards[card.color].push(card); discardedColor=card.color; }
  }

  return drawPhase(sim, player, hand, discardedColor, justDiscarded);
}

// Shared draw phase
function drawPhase(sim, player, hand, discardedColor, justDiscarded){
  const other=player==='player1'?'player2':'player1';
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
        if(oppExp.length>0&&canPlay(top,oppExp)){
          s+=8;
          const ow=oppExp.filter(x=>x.value===0).length;
          if(ow>0) s+=ow*4;
        }
        if(s>bestDS){bestDS=s;bestDC=c;}
      } else if(oppExp.length>0&&canPlay(top,oppExp)){
        const ow=oppExp.filter(x=>x.value===0).length;
        let s=(top.value||2)+ow*5;
        if(s>bestDS&&s>8){bestDS=s;bestDC=c;}
      }
    }
    if(bestDC&&bestDS>6){hand.push(sim.discards[bestDC].pop());drew=true;}
  } else if(!justDiscarded&&sim.singlePile.length>0){
    const top=sim.singlePile[sim.singlePile.length-1];
    const exp=sim.expeditions[player][top.color];
    if(canPlay(top,exp)){
      let s=top.value||2;
      if(exp.length>0) s+=12;
      if(s>6){hand.push(sim.singlePile.pop());drew=true;}
    }
  }

  if(!drew){
    if(sim.deck.length===0) return true;
    hand.push(sim.deck.pop());
    if(sim.deck.length===0) return true;
  }
  return false;
}

function createGame(variant){
  const deck=shuffle(allCards());
  const hand1=deck.splice(0,8);
  const hand2=deck.splice(0,8);
  return {
    hands:{player1:hand1,player2:hand2},
    expeditions:{player1:Object.fromEntries(COLORS.map(c=>[c,[]])),player2:Object.fromEntries(COLORS.map(c=>[c,[]]))},
    discards:variant==='classic'?Object.fromEntries(COLORS.map(c=>[c,[]])):null,
    singlePile:variant==='single'?[]:null,
    deck, variant
  };
}

function cloneGame(g){
  const c={
    hands:{player1:g.hands.player1.map(x=>({...x})),player2:g.hands.player2.map(x=>({...x}))},
    expeditions:{player1:{},player2:{}},
    deck:g.deck.map(x=>({...x})),
    variant:g.variant
  };
  for(const p of ['player1','player2'])
    for(const col of COLORS) c.expeditions[p][col]=(g.expeditions[p][col]||[]).map(x=>({...x}));
  if(g.variant==='classic'){
    c.discards={};
    for(const col of COLORS) c.discards[col]=(g.discards[col]||[]).map(x=>({...x}));
  } else {
    c.singlePile=(g.singlePile||[]).map(x=>({...x}));
  }
  return c;
}

function playGame(turnFnP1, turnFnP2, variant){
  const game=createGame(variant);
  let turn='player1';
  let safety=80;
  while(safety-->0){
    const fn=turn==='player1'?turnFnP1:turnFnP2;
    if(fn(game, turn)) break;
    turn=turn==='player1'?'player2':'player1';
  }
  return {
    s1:scoreExpeditions(game.expeditions.player1),
    s2:scoreExpeditions(game.expeditions.player2)
  };
}

// Run A/B test
const GAMES=10000;

for(const variant of ['classic','single']){
  let newWins=0, oldWins=0, ties=0;
  let newTotal=0, oldTotal=0;

  for(let g=0;g<GAMES;g++){
    const first=g%2===0;
    const p1fn=first?greedyTurnNew:greedyTurnOld;
    const p2fn=first?greedyTurnOld:greedyTurnNew;
    const {s1,s2}=playGame(p1fn, p2fn, variant);

    if(first){
      newTotal+=s1; oldTotal+=s2;
      if(s1>s2) newWins++; else if(s2>s1) oldWins++; else ties++;
    } else {
      newTotal+=s2; oldTotal+=s1;
      if(s2>s1) newWins++; else if(s1>s2) oldWins++; else ties++;
    }
  }

  const total=newWins+oldWins;
  console.log(`\n${variant.toUpperCase()} (${GAMES} games, alternating first player):`);
  console.log(`  New: ${newWins} wins (${(newWins/total*100).toFixed(1)}%) avg score ${(newTotal/GAMES).toFixed(1)}`);
  console.log(`  Old: ${oldWins} wins (${(oldWins/total*100).toFixed(1)}%) avg score ${(oldTotal/GAMES).toFixed(1)}`);
  console.log(`  Ties: ${ties}`);
}
