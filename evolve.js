#!/usr/bin/env node
// Evolutionary tournament to optimize AI greedy rollout policy weights
// Usage: node evolve.js [generations] [populationSize]

const COLORS = ['red','green','blue','white','yellow'];

// ===== GAME ENGINE (standalone copy for speed) =====

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

// ===== DEFAULT WEIGHTS =====

const DEFAULT_WEIGHTS = {
  // Play decision
  playThreshold: 0,        // min delta to play vs discard

  // Discard cost
  discardValueFloor: 1.0,   // multiplier on card.value as floor
  wagerFloorValue: 3,       // floor value for wagers
  oppGainWeight: 1.0,       // weight on opponent gain from discard

  // Draw from discard (classic)
  drawBaseWagerValue: 2,    // base value when drawing a wager
  drawExistingBonus: 12,    // bonus for drawing into existing expedition
  denyBonus: 8,             // bonus for denying opponent
  denyWagerBonus: 4,        // per-wager deny bonus
  drawThreshold: 6,         // min score to draw from discard
  denyThreshold: 8,         // min score for deny-only draws
  denyWagerWeight: 5,       // weight on opponent wagers for deny

  // Draw from single pile
  singleDrawExistingBonus: 12,
  singleDrawThreshold: 6,
};

// ===== PARAMETERIZED GREEDY POLICY =====

function analyzeHand(hand, expeditions){
  const analysis={};
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
    let hasNumbers=false;
    if(expLen>0) for(let i=0;i<expLen;i++) if(exp[i].value>0){hasNumbers=true;break;}
    const sorted=colorCards.slice().sort((a,b)=>a.value-b.value);
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
    const futureExp=expLen>0?exp.concat(playable):playable;
    const projected=scoreColor(futureExp);
    analysis[c]={playable, count:playable.length, projected};
  }
  return analysis;
}

function greedyTurn(sim, player, w){
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
    const curScore=exp.length===0? 0 : scoreColor(exp);
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
        cost=a.projected - scoreColor(sim.expeditions[player][c]);
        if(a.count>1) cost=cost/a.count;
        cost=Math.max(cost, (card.value||w.wagerFloorValue) * w.discardValueFloor);
      }
    }

    const oppExp=sim.expeditions[other][c];
    if(oppExp&&oppExp.length>0 && canPlay(card, oppExp)){
      let oppWagers=0;
      for(let j=0;j<oppExp.length;j++) if(oppExp[j].value===0) oppWagers++;
      cost+=(card.value||0)*(1+oppWagers) * w.oppGainWeight;
    }

    if(cost<discCost){discCost=cost; discIdx=i;}
  }

  if(bestDelta<=w.playThreshold){
    bestIdx=discIdx; bestAction='discard';
  }

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

  // Phase 2: Draw
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
        let s=top.value||w.drawBaseWagerValue;
        if(exp.length>0) s+=w.drawExistingBonus;
        if(oppExp.length>0 && canPlay(top,oppExp)){
          s+=w.denyBonus;
          let ow=0; for(let j=0;j<oppExp.length;j++) if(oppExp[j].value===0) ow++;
          if(ow>0) s+=ow*w.denyWagerBonus;
        }
        if(s>bestDS){bestDS=s; bestDC=c;}
      } else if(oppExp.length>0 && canPlay(top,oppExp)){
        let ow=0; for(let j=0;j<oppExp.length;j++) if(oppExp[j].value===0) ow++;
        let s=(top.value||w.drawBaseWagerValue)+ow*w.denyWagerWeight;
        if(s>bestDS && s>w.denyThreshold){bestDS=s; bestDC=c;}
      }
    }
    if(bestDC && bestDS>w.drawThreshold){
      hand.push(sim.discards[bestDC].pop());
      drew=true;
    }
  } else if(!justDiscarded && sim.singlePile.length>0){
    const top=sim.singlePile[sim.singlePile.length-1];
    const exp=sim.expeditions[player][top.color];
    if(canPlay(top,exp)){
      let s=top.value||w.drawBaseWagerValue;
      if(exp.length>0) s+=w.singleDrawExistingBonus;
      if(s>w.singleDrawThreshold){
        hand.push(sim.singlePile.pop());
        drew=true;
      }
    }
  }

  if(!drew){
    if(sim.deck.length===0) return true;
    hand.push(sim.deck.pop());
    if(sim.deck.length===0) return true;
  }

  return false;
}

// ===== GAME SIMULATION =====

function createGame(variant){
  const deck=shuffle(allCards());
  const hand1=deck.splice(0,8);
  const hand2=deck.splice(0,8);
  const exps={}, discard={};
  COLORS.forEach(c=>{exps[c]=[];discard[c]=[]});
  return {
    hands:{player1:hand1, player2:hand2},
    expeditions:{player1:{...exps}, player2:Object.fromEntries(COLORS.map(c=>[c,[]]))},
    discards:variant==='classic'?Object.fromEntries(COLORS.map(c=>[c,[]])):null,
    singlePile:variant==='single'?[]:null,
    deck, variant
  };
}

function playGame(w1, w2, variant){
  const sim=createGame(variant);
  let turn='player1';
  let safety=80;
  while(safety-->0){
    const w=turn==='player1'?w1:w2;
    if(greedyTurn(sim, turn, w)) break;
    turn=turn==='player1'?'player2':'player1';
  }
  const s1=scoreExpeditions(sim.expeditions.player1);
  const s2=scoreExpeditions(sim.expeditions.player2);
  return {s1, s2};
}

// ===== EVOLUTION =====

function randomWeight(base, range){
  return base + (Math.random()*2-1)*range;
}

function randomWeights(){
  const w={};
  w.playThreshold = randomWeight(0, 15);
  w.discardValueFloor = randomWeight(1.0, 0.8);
  w.wagerFloorValue = randomWeight(3, 3);
  w.oppGainWeight = randomWeight(1.0, 0.8);
  w.drawBaseWagerValue = randomWeight(2, 2);
  w.drawExistingBonus = randomWeight(12, 10);
  w.denyBonus = randomWeight(8, 8);
  w.denyWagerBonus = randomWeight(4, 4);
  w.drawThreshold = randomWeight(6, 5);
  w.denyThreshold = randomWeight(8, 6);
  w.denyWagerWeight = randomWeight(5, 4);
  w.singleDrawExistingBonus = randomWeight(12, 10);
  w.singleDrawThreshold = randomWeight(6, 5);
  return w;
}

function mutate(w, rate=0.3){
  const m={...w};
  for(const key of Object.keys(m)){
    if(Math.random()<rate){
      const magnitude=Math.abs(m[key])*0.3 + 0.5;
      m[key]+=(Math.random()*2-1)*magnitude;
    }
  }
  return m;
}

function crossover(a, b){
  const child={};
  for(const key of Object.keys(a)){
    child[key]=Math.random()<0.5?a[key]:b[key];
  }
  return child;
}

function roundRobin(population, gamesPerPair, variant){
  const n=population.length;
  const scores=new Array(n).fill(0);

  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      let winsI=0, winsJ=0;
      for(let g=0;g<gamesPerPair;g++){
        // Alternate who goes first
        const first=g%2===0;
        const w1=first?population[i]:population[j];
        const w2=first?population[j]:population[i];
        const {s1,s2}=playGame(w1, w2, variant);
        if(first){
          if(s1>s2) winsI++; else if(s2>s1) winsJ++;
        } else {
          if(s2>s1) winsI++; else if(s1>s2) winsJ++;
        }
      }
      scores[i]+=winsI;
      scores[j]+=winsJ;
    }
  }
  return scores;
}

function evolve(generations=50, popSize=24, gamesPerPair=40, variant='classic'){
  console.log(`\nEvolving ${variant} variant: ${generations} generations, ${popSize} population, ${gamesPerPair} games/pair`);
  console.log('='.repeat(70));

  // Initialize population: include default weights + random
  let population=[{...DEFAULT_WEIGHTS}];
  for(let i=1;i<popSize;i++) population.push(randomWeights());

  let bestEver=null, bestEverScore=-Infinity;

  for(let gen=0;gen<generations;gen++){
    const t0=Date.now();
    const scores=roundRobin(population, gamesPerPair, variant);

    // Find best
    let bestIdx=0;
    for(let i=1;i<scores.length;i++) if(scores[i]>scores[bestIdx]) bestIdx=i;

    const maxScore=scores[bestIdx];
    const totalGames=(popSize-1)*gamesPerPair;
    const winRate=(maxScore/totalGames*100).toFixed(1);
    const elapsed=((Date.now()-t0)/1000).toFixed(1);

    if(maxScore>bestEverScore){
      bestEverScore=maxScore;
      bestEver={...population[bestIdx]};
    }

    // Sort population by score
    const ranked=population.map((w,i)=>({w,s:scores[i]})).sort((a,b)=>b.s-a.s);

    console.log(`Gen ${String(gen+1).padStart(3)}: best ${winRate}% (${maxScore}/${totalGames}) | elapsed ${elapsed}s`);

    // Selection: keep top 25%
    const keepN=Math.max(4, Math.floor(popSize*0.25));
    const survivors=ranked.slice(0, keepN).map(r=>r.w);

    // New population: survivors + children + mutations + a few random
    const newPop=[...survivors];

    // Children via crossover
    while(newPop.length<popSize*0.6){
      const a=survivors[Math.floor(Math.random()*survivors.length)];
      const b=survivors[Math.floor(Math.random()*survivors.length)];
      newPop.push(mutate(crossover(a, b), 0.3));
    }

    // Mutations of survivors
    while(newPop.length<popSize*0.85){
      const parent=survivors[Math.floor(Math.random()*survivors.length)];
      newPop.push(mutate(parent, 0.5));
    }

    // Fresh random blood
    while(newPop.length<popSize){
      newPop.push(randomWeights());
    }

    population=newPop;
  }

  return bestEver;
}

// ===== MAIN =====

const generations=parseInt(process.argv[2])||50;
const popSize=parseInt(process.argv[3])||24;
const gamesPerPair=parseInt(process.argv[4])||40;

// Run for both variants
const classicBest=evolve(generations, popSize, gamesPerPair, 'classic');
const singleBest=evolve(generations, popSize, gamesPerPair, 'single');

// Validate against default weights
console.log('\n\nValidation: evolved vs default (1000 games each side)');
console.log('='.repeat(70));

for(const [label, best, variant] of [['Classic', classicBest, 'classic'], ['Single', singleBest, 'single']]){
  let evolvedWins=0, defaultWins=0;
  for(let g=0;g<2000;g++){
    const first=g%2===0;
    const w1=first?best:DEFAULT_WEIGHTS;
    const w2=first?DEFAULT_WEIGHTS:best;
    const {s1,s2}=playGame(w1, w2, variant);
    if(first){
      if(s1>s2) evolvedWins++; else if(s2>s1) defaultWins++;
    } else {
      if(s2>s1) evolvedWins++; else if(s1>s2) defaultWins++;
    }
  }
  console.log(`${label}: evolved ${evolvedWins} wins, default ${defaultWins} wins (${(evolvedWins/(evolvedWins+defaultWins)*100).toFixed(1)}%)`);
}

console.log('\n\nBest weights (classic):');
console.log(JSON.stringify(classicBest, null, 2));
console.log('\nBest weights (single):');
console.log(JSON.stringify(singleBest, null, 2));

// Output in format ready to paste into ai-worker.js
console.log('\n\n// Paste into ai-worker.js:');
console.log('const W_CLASSIC = '+JSON.stringify(Object.fromEntries(Object.entries(classicBest).map(([k,v])=>[k,Math.round(v*100)/100])))+';');
console.log('const W_SINGLE = '+JSON.stringify(Object.fromEntries(Object.entries(singleBest).map(([k,v])=>[k,Math.round(v*100)/100])))+';');
