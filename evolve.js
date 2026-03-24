#!/usr/bin/env node
/**
 * Evolutionary AI Tuner for Lost Cities
 *
 * Extracts ~15 tunable constants from the greedy rollout policy,
 * encodes them as a "genome", and uses tournament selection +
 * crossover + mutation to find optimal values.
 *
 * Usage: node evolve.js [--generations 100] [--population 50] [--games 200] [--variant classic]
 */

const COLORS = ['red','green','blue','white','yellow'];

// ==================== GENOME DEFINITION ====================
// Each gene: { name, default, min, max, description }
const GENE_DEFS = [
  // Phase 1: Play decision
  { name: 'playThreshold',     default: 0,  min: -30, max: 30,  desc: 'Min delta to play instead of discard' },
  { name: 'wagerFallbackVal',  default: 3,  min: 0,   max: 8,   desc: 'Floor value for wager cards in discard cost' },

  // Phase 1: Discard cost — opponent gain weights
  { name: 'oppGainCardWeight', default: 1,  min: 0,   max: 3,   desc: 'Multiplier on card value for opp gain' },
  { name: 'oppGainWagerMult',  default: 1,  min: 0,   max: 4,   desc: 'Extra per opp wager when discarding useful card' },

  // Phase 2: Draw from discard (classic)
  { name: 'drawBaseVal',       default: 2,  min: 0,   max: 6,   desc: 'Base value of wager when drawn' },
  { name: 'drawExpBonus',      default: 12, min: 0,   max: 25,  desc: 'Bonus if we already have expedition started' },
  { name: 'drawDenyBonus',     default: 8,  min: 0,   max: 20,  desc: 'Bonus for denying opp a useful card' },
  { name: 'drawDenyWagerMult', default: 4,  min: 0,   max: 10,  desc: 'Extra per opp wager when denying' },
  { name: 'drawThreshold',     default: 6,  min: 0,   max: 15,  desc: 'Min score to draw from discard' },

  // Phase 2: Deny-only draw (cant play it ourselves)
  { name: 'denyOnlyWagerMult', default: 5,  min: 0,   max: 12,  desc: 'Wager multiplier for deny-only draws' },
  { name: 'denyOnlyThreshold', default: 8,  min: 2,   max: 20,  desc: 'Min score for deny-only draws' },

  // Phase 2: Single pile draw
  { name: 'singleDrawBase',    default: 2,  min: 0,   max: 6,   desc: 'Base value for single pile wager draw' },
  { name: 'singleDrawExpBonus',default: 12, min: 0,   max: 25,  desc: 'Bonus if expedition started (single)' },
  { name: 'singleDrawThresh',  default: 6,  min: 0,   max: 15,  desc: 'Min score to draw from single pile' },

  // Sequence cost scaling
  { name: 'seqCostDivisor',    default: 1,  min: 0.3, max: 2,   desc: '1=divide by count, <1=value each card more, >1=value less' },
];

// ==================== GAME ENGINE (self-contained) ====================

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
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function canPlayCard(card, exp){
  if(exp.length===0) return true;
  const top=exp[exp.length-1];
  if(card.value===0) return top.value===0;
  return card.value > top.value;
}

function scoreColor(cards){
  if(cards.length===0) return 0;
  let wagers=0, sum=0;
  for(const c of cards){ if(c.value===0) wagers++; else sum+=c.value; }
  return (sum-20)*(1+wagers)+(cards.length>=8?20:0);
}

function scoreAll(exps){
  let t=0;
  for(const c of COLORS) t+=scoreColor(exps[c]||[]);
  return t;
}

// ==================== PARAMETERIZED GREEDY POLICY ====================

function analyzeHand(hand, expeditions){
  const analysis={};
  const byColor={};
  for(const c of COLORS) byColor[c]=[];
  for(const card of hand) byColor[card.color].push(card);

  for(const c of COLORS){
    const exp=expeditions[c]||[];
    const topVal=exp.length>0? exp[exp.length-1].value : -1;
    const colorCards=byColor[c];

    if(colorCards.length===0){
      analysis[c]={playable:[], count:0, projected:exp.length>0?scoreColor(exp):0};
      continue;
    }

    let hasNumbers=false;
    for(const e of exp) if(e.value>0){hasNumbers=true;break;}

    const sorted=colorCards.slice().sort((a,b)=>a.value-b.value);
    const playable=[];
    let curTop=topVal;
    for(const card of sorted){
      if(card.value===0){
        if(!hasNumbers){playable.push(card); curTop=0;}
      } else if(card.value>curTop){
        playable.push(card); curTop=card.value;
      }
    }

    analysis[c]={playable, count:playable.length, projected:scoreColor(exp.concat(playable))};
  }
  return analysis;
}

function greedyTurnWithGenome(sim, player, genome){
  const hand=sim.hands[player];
  if(hand.length===0) return true;
  const other=player==='player1'?'player2':'player1';
  const g=genome;

  const analysis=analyzeHand(hand, sim.expeditions[player]);

  // Phase 1: play or discard
  let bestIdx=-1, bestDelta=-Infinity, bestAction='discard';

  for(const c of COLORS){
    const a=analysis[c];
    if(a.count===0) continue;
    const nextCard=a.playable[0];
    const idx=hand.indexOf(nextCard);
    if(idx===-1) continue;

    const exp=sim.expeditions[player][c]||[];
    const curScore=exp.length===0?0:scoreColor(exp);
    const turnsLeft=Math.ceil(sim.deck.length/2);
    const canPlayCount=Math.min(a.count, turnsLeft);
    const futureExp=[...exp, ...a.playable.slice(0,canPlayCount)];
    const delta=scoreColor(futureExp)-curScore;

    if(delta>bestDelta){bestDelta=delta; bestIdx=idx; bestAction='play';}
  }

  // Find best discard
  let discIdx=0, discCost=Infinity;
  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const c=card.color;
    const a=analysis[c];
    let cost=0;

    if(a.count>0){
      let inSeq=false;
      for(const p of a.playable) if(p.id===card.id){inSeq=true;break;}
      if(inSeq){
        cost=a.projected - scoreColor(sim.expeditions[player][c]||[]);
        if(a.count>1) cost=cost * g.seqCostDivisor / a.count;
        cost=Math.max(cost, card.value || g.wagerFallbackVal);
      }
    }

    const oppExp=sim.expeditions[other][c]||[];
    if(oppExp.length>0 && canPlayCard(card, oppExp)){
      let oppWagers=0;
      for(const e of oppExp) if(e.value===0) oppWagers++;
      cost += (card.value||0) * g.oppGainCardWeight * (1 + oppWagers * g.oppGainWagerMult);
    }

    if(cost<discCost){discCost=cost; discIdx=i;}
  }

  if(bestDelta <= g.playThreshold){
    bestIdx=discIdx; bestAction='discard';
  }

  const card=hand.splice(bestIdx,1)[0];
  let discardedColor=null, justDiscarded=false;

  if(bestAction==='play'){
    (sim.expeditions[player][card.color]=sim.expeditions[player][card.color]||[]).push(card);
  } else {
    if(sim.variant==='single'){
      sim.singlePile.push(card);
      justDiscarded=true;
    } else {
      (sim.discards[card.color]=sim.discards[card.color]||[]).push(card);
      discardedColor=card.color;
    }
  }

  // Phase 2: draw
  let drew=false;

  if(sim.variant==='classic'){
    let bestDC=null, bestDS=-1;
    for(const c of COLORS){
      if(c===discardedColor) continue;
      const pile=sim.discards[c]||[];
      if(pile.length===0) continue;
      const top=pile[pile.length-1];
      const exp=sim.expeditions[player][c]||[];
      const oppExp=sim.expeditions[other][c]||[];

      if(canPlayCard(top,exp)){
        let s=(top.value||g.drawBaseVal);
        if(exp.length>0) s+=g.drawExpBonus;
        if(oppExp.length>0 && canPlayCard(top,oppExp)){
          s+=g.drawDenyBonus;
          const ow=oppExp.filter(x=>x.value===0).length;
          if(ow>0) s+=ow*g.drawDenyWagerMult;
        }
        if(s>bestDS){bestDS=s; bestDC=c;}
      } else if(oppExp.length>0 && canPlayCard(top,oppExp)){
        const ow=oppExp.filter(x=>x.value===0).length;
        let s=(top.value||g.drawBaseVal)+ow*g.denyOnlyWagerMult;
        if(s>bestDS && s>g.denyOnlyThreshold){bestDS=s; bestDC=c;}
      }
    }
    if(bestDC && bestDS>g.drawThreshold){
      hand.push(sim.discards[bestDC].pop());
      drew=true;
    }
  } else if(!justDiscarded && sim.singlePile.length>0){
    const top=sim.singlePile[sim.singlePile.length-1];
    const exp=sim.expeditions[player][top.color]||[];
    if(canPlayCard(top,exp)){
      let s=(top.value||g.singleDrawBase);
      if(exp.length>0) s+=g.singleDrawExpBonus;
      if(s>g.singleDrawThresh){
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

// ==================== GAME SIMULATION ====================

function createGameState(variant){
  const deck=shuffle(allCards());
  const h1=deck.splice(0,8);
  const h2=deck.splice(0,8);
  const exps1={}, exps2={}, discs={};
  for(const c of COLORS){exps1[c]=[]; exps2[c]=[]; discs[c]=[];}
  return {
    hands:{player1:h1, player2:h2},
    expeditions:{player1:exps1, player2:exps2},
    discards:discs,
    singlePile:[],
    deck,
    variant
  };
}

function deepCopy(gs){
  const s={
    hands:{
      player1:gs.hands.player1.map(c=>({...c})),
      player2:gs.hands.player2.map(c=>({...c}))
    },
    expeditions:{player1:{},player2:{}},
    deck:gs.deck.map(c=>({...c})),
    variant:gs.variant
  };
  for(const p of ['player1','player2'])
    for(const c of COLORS)
      s.expeditions[p][c]=(gs.expeditions[p][c]||[]).map(x=>({...x}));
  if(gs.variant==='classic'){
    s.discards={};
    for(const c of COLORS) s.discards[c]=(gs.discards[c]||[]).map(x=>({...x}));
  } else {
    s.singlePile=(gs.singlePile||[]).map(x=>({...x}));
  }
  return s;
}

// Play a full game: genome1 controls player1, genome2 controls player2
// Returns: 1 if genome1 wins, 0 if genome2 wins, 0.5 for tie
function playGame(genome1, genome2, variant){
  const gs=createGameState(variant);
  let turn='player1';
  let safety=80;
  while(safety-->0){
    const g=turn==='player1'?genome1:genome2;
    if(greedyTurnWithGenome(gs, turn, g)) break;
    turn=turn==='player1'?'player2':'player1';
  }
  const s1=scoreAll(gs.expeditions.player1);
  const s2=scoreAll(gs.expeditions.player2);
  return s1>s2?1:(s1===s2?0.5:0);
}

// ==================== EVOLUTION ====================

function createGenome(){
  const g={};
  for(const def of GENE_DEFS) g[def.name]=def.default;
  return g;
}

function randomGenome(){
  const g={};
  for(const def of GENE_DEFS){
    g[def.name]=def.min + Math.random()*(def.max-def.min);
  }
  return g;
}

function mutate(genome, rate=0.3, strength=0.2){
  const g={...genome};
  for(const def of GENE_DEFS){
    if(Math.random()<rate){
      const range=def.max-def.min;
      const delta=(Math.random()*2-1)*range*strength;
      g[def.name]=Math.max(def.min, Math.min(def.max, g[def.name]+delta));
    }
  }
  return g;
}

function crossover(a, b){
  const child={};
  for(const def of GENE_DEFS){
    // Blend crossover with slight randomness
    const t=Math.random();
    child[def.name]=a[def.name]*t + b[def.name]*(1-t);
  }
  return child;
}

function tournament(population, gamesPerMatch, variant){
  const n=population.length;
  const scores=new Array(n).fill(0);
  let matchesPlayed=0;
  const totalMatches=n*(n-1)/2;

  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      matchesPlayed++;
      let w1=0, w2=0;
      for(let g=0;g<gamesPerMatch;g++){
        // Alternate who goes first
        const r1=playGame(population[i], population[j], variant);
        w1+=r1; w2+=(1-r1);
        const r2=playGame(population[j], population[i], variant);
        w2+=r2; w1+=(1-r2);
      }
      scores[i]+=w1;
      scores[j]+=w2;
    }
  }
  return scores;
}

function formatGenome(g){
  const entries=[];
  for(const def of GENE_DEFS){
    const v=g[def.name];
    entries.push(`  ${def.name}: ${typeof v==='number'?v.toFixed(3):v}`);
  }
  return '{\n'+entries.join(',\n')+'\n}';
}

// ==================== MAIN ====================

function parseArgs(){
  const args={generations:100, population:40, games:100, variant:'classic', elites:8};
  for(let i=2;i<process.argv.length;i++){
    const a=process.argv[i];
    if(a==='--generations'||a==='-g') args.generations=parseInt(process.argv[++i]);
    else if(a==='--population'||a==='-p') args.population=parseInt(process.argv[++i]);
    else if(a==='--games') args.games=parseInt(process.argv[++i]);
    else if(a==='--variant'||a==='-v') args.variant=process.argv[++i];
    else if(a==='--elites'||a==='-e') args.elites=parseInt(process.argv[++i]);
  }
  return args;
}

function main(){
  const args=parseArgs();
  const {generations, population: popSize, games, variant, elites}=args;

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Lost Cities AI — Evolutionary Tuner       ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║ Population: ${String(popSize).padEnd(5)} Generations: ${String(generations).padEnd(10)}║`);
  console.log(`║ Games/match: ${String(games).padEnd(4)} Elites: ${String(elites).padEnd(15)}║`);
  console.log(`║ Variant: ${variant.padEnd(35)}║`);
  console.log(`║ Genes: ${String(GENE_DEFS.length).padEnd(37)}║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Initialize population: default genome + random genomes
  let pop=[createGenome()];
  for(let i=1;i<popSize;i++) pop.push(randomGenome());

  let allTimeBest=null, allTimeBestScore=-Infinity;

  for(let gen=0;gen<generations;gen++){
    const t0=Date.now();

    // Tournament
    const scores=tournament(pop, games, variant);

    // Find best
    const maxGames=games*2*(popSize-1); // each individual plays this many total games
    let bestIdx=0;
    for(let i=1;i<popSize;i++) if(scores[i]>scores[bestIdx]) bestIdx=i;

    const bestWinRate=(scores[bestIdx]/maxGames*100).toFixed(1);
    const avgWinRate=(scores.reduce((a,b)=>a+b,0)/popSize/maxGames*100).toFixed(1);

    if(scores[bestIdx]>allTimeBestScore){
      allTimeBestScore=scores[bestIdx];
      allTimeBest={...pop[bestIdx]};
    }

    const elapsed=((Date.now()-t0)/1000).toFixed(1);
    console.log(`Gen ${String(gen+1).padStart(3)}/${generations} | Best: ${bestWinRate}% | Avg: ${avgWinRate}% | ${elapsed}s`);

    // Sort by score descending
    const indexed=scores.map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s);

    // Select elites
    const newPop=[];
    for(let i=0;i<elites;i++) newPop.push({...pop[indexed[i].i]});

    // Fill rest with offspring of elites
    while(newPop.length<popSize){
      const p1=newPop[Math.floor(Math.random()*elites)];
      const p2=newPop[Math.floor(Math.random()*elites)];
      let child=crossover(p1, p2);

      // Adaptive mutation: stronger early, weaker late
      const progress=gen/generations;
      const mutRate=0.4*(1-progress*0.5);
      const mutStrength=0.3*(1-progress*0.6);
      child=mutate(child, mutRate, mutStrength);
      newPop.push(child);
    }

    pop=newPop;
  }

  // Final evaluation: pit best genome against default
  console.log('\n══════════════════════════════════════════════');
  console.log('FINAL: Best evolved genome vs Default');
  console.log('══════════════════════════════════════════════');

  const defaultG=createGenome();
  let evoWins=0, defWins=0, ties=0;
  const finalGames=2000;
  for(let i=0;i<finalGames;i++){
    const r1=playGame(allTimeBest, defaultG, variant);
    if(r1===1) evoWins++; else if(r1===0) defWins++; else ties++;
    const r2=playGame(defaultG, allTimeBest, variant);
    if(r2===0) evoWins++; else if(r2===1) defWins++; else ties++;
  }

  console.log(`Evolved: ${evoWins} wins (${(evoWins/(finalGames*2)*100).toFixed(1)}%)`);
  console.log(`Default: ${defWins} wins (${(defWins/(finalGames*2)*100).toFixed(1)}%)`);
  console.log(`Ties:    ${ties}`);
  console.log('');
  console.log('Best genome:');
  console.log(formatGenome(allTimeBest));

  // Output as JSON for easy copy-paste into ai-worker.js
  console.log('\n// Paste this into ai-worker.js as the AI constants:');
  console.log('const EVOLVED = ' + JSON.stringify(allTimeBest, null, 2) + ';');
}

main();
