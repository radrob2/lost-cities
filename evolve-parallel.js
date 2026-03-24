#!/usr/bin/env node
/**
 * Parallel Evolutionary AI Tuner for Lost Cities
 * Uses worker_threads to parallelize tournament matchups across all CPU cores.
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

const COLORS = ['red','green','blue','white','yellow'];

const GENE_DEFS = [
  { name: 'playThreshold',     default: 0,  min: -30, max: 30 },
  { name: 'wagerFallbackVal',  default: 3,  min: 0,   max: 8 },
  { name: 'oppGainCardWeight', default: 1,  min: 0,   max: 3 },
  { name: 'oppGainWagerMult',  default: 1,  min: 0,   max: 4 },
  { name: 'drawBaseVal',       default: 2,  min: 0,   max: 6 },
  { name: 'drawExpBonus',      default: 12, min: 0,   max: 25 },
  { name: 'drawDenyBonus',     default: 8,  min: 0,   max: 20 },
  { name: 'drawDenyWagerMult', default: 4,  min: 0,   max: 10 },
  { name: 'drawThreshold',     default: 6,  min: 0,   max: 15 },
  { name: 'denyOnlyWagerMult', default: 5,  min: 0,   max: 12 },
  { name: 'denyOnlyThreshold', default: 8,  min: 2,   max: 20 },
  { name: 'singleDrawBase',    default: 2,  min: 0,   max: 6 },
  { name: 'singleDrawExpBonus',default: 12, min: 0,   max: 25 },
  { name: 'singleDrawThresh',  default: 6,  min: 0,   max: 15 },
  { name: 'seqCostDivisor',    default: 1,  min: 0.3, max: 2 },
];

// ==================== GAME ENGINE ====================

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
      if(card.value===0){ if(!hasNumbers){playable.push(card); curTop=0;} }
      else if(card.value>curTop){ playable.push(card); curTop=card.value; }
    }
    analysis[c]={playable, count:playable.length, projected:scoreColor(exp.concat(playable))};
  }
  return analysis;
}

function greedyTurn(sim, player, g){
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
    const exp=sim.expeditions[player][c]||[];
    const curScore=exp.length===0?0:scoreColor(exp);
    const turnsLeft=Math.ceil(sim.deck.length/2);
    const canPlayCount=Math.min(a.count, turnsLeft);
    const futureExp=[...exp, ...a.playable.slice(0,canPlayCount)];
    const delta=scoreColor(futureExp)-curScore;
    if(delta>bestDelta){bestDelta=delta; bestIdx=idx; bestAction='play';}
  }

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
      let ow=0; for(const e of oppExp) if(e.value===0) ow++;
      cost += (card.value||0) * g.oppGainCardWeight * (1 + ow * g.oppGainWagerMult);
    }
    if(cost<discCost){discCost=cost; discIdx=i;}
  }

  if(bestDelta <= g.playThreshold){ bestIdx=discIdx; bestAction='discard'; }

  const card=hand.splice(bestIdx,1)[0];
  let discardedColor=null, justDiscarded=false;
  if(bestAction==='play'){
    (sim.expeditions[player][card.color]=sim.expeditions[player][card.color]||[]).push(card);
  } else {
    if(sim.variant==='single'){ sim.singlePile.push(card); justDiscarded=true; }
    else { (sim.discards[card.color]=sim.discards[card.color]||[]).push(card); discardedColor=card.color; }
  }

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
    if(bestDC && bestDS>g.drawThreshold){ hand.push(sim.discards[bestDC].pop()); drew=true; }
  } else if(!justDiscarded && sim.singlePile.length>0){
    const top=sim.singlePile[sim.singlePile.length-1];
    const exp=sim.expeditions[player][top.color]||[];
    if(canPlayCard(top,exp)){
      let s=(top.value||g.singleDrawBase);
      if(exp.length>0) s+=g.singleDrawExpBonus;
      if(s>g.singleDrawThresh){ hand.push(sim.singlePile.pop()); drew=true; }
    }
  }
  if(!drew){
    if(sim.deck.length===0) return true;
    hand.push(sim.deck.pop());
    if(sim.deck.length===0) return true;
  }
  return false;
}

function createGameState(variant){
  const deck=shuffle(allCards());
  const h1=deck.splice(0,8), h2=deck.splice(0,8);
  const exps1={}, exps2={}, discs={};
  for(const c of COLORS){exps1[c]=[]; exps2[c]=[]; discs[c]=[];}
  return { hands:{player1:h1,player2:h2}, expeditions:{player1:exps1,player2:exps2}, discards:discs, singlePile:[], deck, variant };
}

function playGame(g1, g2, variant){
  const gs=createGameState(variant);
  let turn='player1', safety=80;
  while(safety-->0){
    if(greedyTurn(gs, turn, turn==='player1'?g1:g2)) break;
    turn=turn==='player1'?'player2':'player1';
  }
  const s1=scoreAll(gs.expeditions.player1), s2=scoreAll(gs.expeditions.player2);
  return s1>s2?1:(s1===s2?0.5:0);
}

// ==================== WORKER CODE ====================

if(!isMainThread){
  // Worker: receive matchups, play games, return scores
  const {matchups, population, games, variant} = workerData;
  const results = [];
  for(const {i, j} of matchups){
    let w1=0, w2=0;
    for(let g=0;g<games;g++){
      const r1=playGame(population[i], population[j], variant);
      w1+=r1; w2+=(1-r1);
      const r2=playGame(population[j], population[i], variant);
      w2+=r2; w1+=(1-r2);
    }
    results.push({i, j, w1, w2});
  }
  parentPort.postMessage(results);
  process.exit(0);
}

// ==================== MAIN THREAD ====================

function createGenome(){
  const g={};
  for(const def of GENE_DEFS) g[def.name]=def.default;
  return g;
}

function randomGenome(){
  const g={};
  for(const def of GENE_DEFS) g[def.name]=def.min+Math.random()*(def.max-def.min);
  return g;
}

function mutate(genome, rate=0.3, strength=0.2){
  const g={...genome};
  for(const def of GENE_DEFS){
    if(Math.random()<rate){
      const range=def.max-def.min;
      g[def.name]=Math.max(def.min, Math.min(def.max, g[def.name]+(Math.random()*2-1)*range*strength));
    }
  }
  return g;
}

function crossover(a, b){
  const child={};
  for(const def of GENE_DEFS){ const t=Math.random(); child[def.name]=a[def.name]*t+b[def.name]*(1-t); }
  return child;
}

function formatGenome(g){
  return '{\n'+GENE_DEFS.map(d=>`  ${d.name}: ${g[d.name].toFixed(3)}`).join(',\n')+'\n}';
}

async function parallelTournament(population, games, variant, numWorkers){
  const n=population.length;
  const matchups=[];
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) matchups.push({i,j});

  // Split matchups across workers
  const chunks=[];
  const chunkSize=Math.ceil(matchups.length/numWorkers);
  for(let i=0;i<matchups.length;i+=chunkSize){
    chunks.push(matchups.slice(i, i+chunkSize));
  }

  const scores=new Array(n).fill(0);

  const promises=chunks.map(chunk=>new Promise((resolve,reject)=>{
    const w=new Worker(__filename, {
      workerData: {matchups:chunk, population, games, variant}
    });
    w.on('message', resolve);
    w.on('error', reject);
  }));

  const allResults=await Promise.all(promises);
  for(const results of allResults){
    for(const {i,j,w1,w2} of results){
      scores[i]+=w1;
      scores[j]+=w2;
    }
  }
  return scores;
}

async function main(){
  const args={generations:80, population:40, games:100, variant:'classic', elites:8};
  for(let i=2;i<process.argv.length;i++){
    const a=process.argv[i];
    if(a==='--generations'||a==='-g') args.generations=parseInt(process.argv[++i]);
    else if(a==='--population'||a==='-p') args.population=parseInt(process.argv[++i]);
    else if(a==='--games') args.games=parseInt(process.argv[++i]);
    else if(a==='--variant'||a==='-v') args.variant=process.argv[++i];
    else if(a==='--elites'||a==='-e') args.elites=parseInt(process.argv[++i]);
  }

  const numCPUs=os.cpus().length;
  const numWorkers=Math.max(1, numCPUs-1); // leave 1 core free

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Lost Cities AI — Parallel Evolutionary Tuner  ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║ Population: ${String(args.population).padEnd(5)} Generations: ${String(args.generations).padEnd(13)}║`);
  console.log(`║ Games/match: ${String(args.games).padEnd(4)} Elites: ${String(args.elites).padEnd(18)}║`);
  console.log(`║ Workers: ${String(numWorkers).padEnd(6)} CPUs: ${String(numCPUs).padEnd(20)}║`);
  console.log(`║ Variant: ${args.variant.padEnd(38)}║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  const {generations, population:popSize, games, variant, elites}=args;

  let pop=[createGenome()];
  for(let i=1;i<popSize;i++) pop.push(randomGenome());

  let allTimeBest=null, allTimeBestScore=-Infinity;

  for(let gen=0;gen<generations;gen++){
    const t0=Date.now();
    const scores=await parallelTournament(pop, games, variant, numWorkers);

    const maxGames=games*2*(popSize-1);
    let bestIdx=0;
    for(let i=1;i<popSize;i++) if(scores[i]>scores[bestIdx]) bestIdx=i;

    if(scores[bestIdx]>allTimeBestScore){
      allTimeBestScore=scores[bestIdx];
      allTimeBest={...pop[bestIdx]};
    }

    const bestWR=(scores[bestIdx]/maxGames*100).toFixed(1);
    const avgWR=(scores.reduce((a,b)=>a+b,0)/popSize/maxGames*100).toFixed(1);
    const elapsed=((Date.now()-t0)/1000).toFixed(1);
    console.log(`Gen ${String(gen+1).padStart(3)}/${generations} | Best: ${bestWR}% | Avg: ${avgWR}% | ${elapsed}s`);

    const indexed=scores.map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s);
    const newPop=[];
    for(let i=0;i<elites;i++) newPop.push({...pop[indexed[i].i]});

    while(newPop.length<popSize){
      const p1=newPop[Math.floor(Math.random()*elites)];
      const p2=newPop[Math.floor(Math.random()*elites)];
      let child=crossover(p1, p2);
      const progress=gen/generations;
      child=mutate(child, 0.4*(1-progress*0.5), 0.3*(1-progress*0.6));
      newPop.push(child);
    }
    pop=newPop;
  }

  // Final evaluation
  console.log('\n══════════════════════════════════════════════════');
  console.log('FINAL: Best evolved genome vs Default (4000 games)');
  console.log('══════════════════════════════════════════════════');

  // Run final eval in parallel too
  const defaultG=createGenome();
  const finalPop=[allTimeBest, defaultG];
  const finalScores=await parallelTournament(finalPop, 2000, variant, numWorkers);

  console.log(`Evolved: ${finalScores[0].toFixed(0)} wins (${(finalScores[0]/4000*100).toFixed(1)}%)`);
  console.log(`Default: ${finalScores[1].toFixed(0)} wins (${(finalScores[1]/4000*100).toFixed(1)}%)`);
  console.log('');
  console.log('Best genome:');
  console.log(formatGenome(allTimeBest));
  console.log('\n// Paste into ai-worker.js:');
  console.log('const EVOLVED = ' + JSON.stringify(allTimeBest, null, 2) + ';');
}

main().catch(e=>{console.error(e);process.exit(1)});
