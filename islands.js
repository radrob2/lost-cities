#!/usr/bin/env node
/**
 * Island Model Evolution for Lost Cities AI
 * 5 islands, each seeded with a different archetype.
 * Occasional migration between islands.
 * Produces 5 distinct strong AIs with different play styles.
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const fs = require('fs');

const COLORS = ['red','green','blue','white','yellow'];

const GENE_DEFS = [
  {name:'earlyPlayThresh',def:0,min:-30,max:30},{name:'midPlayThresh',def:0,min:-30,max:30},
  {name:'latePlayThresh',def:0,min:-30,max:30},{name:'earlyPhaseBound',def:30,min:15,max:38},
  {name:'latePhaseBound',def:15,min:5,max:25},{name:'phaseBlendWidth',def:5,min:1,max:15},
  {name:'endgameUrgency',def:1,min:0,max:3},
  {name:'maxExpeditions',def:5,min:1.5,max:5},{name:'newExpMinProjected',def:0,min:-20,max:25},
  {name:'newExpLatePenalty',def:10,min:0,max:30},{name:'eightCardWeight',def:5,min:0,max:20},
  {name:'concentrationBonus',def:0,min:0,max:15},{name:'abandonThreshold',def:-15,min:-40,max:0},
  {name:'cardCountVsValue',def:0.5,min:0,max:1},{name:'focusVsSpread',def:0.5,min:0,max:1},
  {name:'colorSynergyWeight',def:3,min:0,max:10},{name:'orphanPenalty',def:2,min:0,max:10},
  {name:'wagerMinProjected',def:5,min:-10,max:30},{name:'wagerEarlyBonus',def:5,min:0,max:15},
  {name:'wagerLatePenalty',def:10,min:0,max:30},{name:'wagerStackBonus',def:3,min:0,max:15},
  {name:'wagerHoldValue',def:2,min:0,max:10},{name:'wagerRiskTolerance',def:0.5,min:0,max:1},
  {name:'wagerMinHandCards',def:2,min:0,max:5},{name:'wagerAsVariance',def:0,min:-1,max:1},
  {name:'oppAwareness',def:1,min:0,max:3},{name:'oppBlockWeight',def:0,min:0,max:10},
  {name:'oppDiscardDanger',def:3,min:0,max:15},{name:'oppWagerFear',def:5,min:0,max:15},
  {name:'oppDenyDrawWeight',def:3,min:0,max:12},{name:'oppColorTrackWeight',def:1,min:0,max:5},
  {name:'oppDrawSignalWeight',def:2,min:0,max:8},{name:'counterPlayWeight',def:0,min:-5,max:5},
  {name:'oppMirrorPenalty',def:0,min:0,max:10},{name:'oppExpCountFear',def:1,min:0,max:5},
  {name:'drawDiscardThresh',def:6,min:0,max:20},{name:'drawExpBonus',def:12,min:0,max:25},
  {name:'drawDenyBonus',def:8,min:0,max:20},{name:'drawDenyWagerMult',def:4,min:0,max:12},
  {name:'drawUnknownValue',def:3,min:0,max:10},{name:'drawForNewExpThresh',def:10,min:0,max:25},
  {name:'drawDenyOnlyThresh',def:8,min:2,max:25},{name:'drawInfoLeakPenalty',def:0,min:0,max:5},
  {name:'riskSeekWhenBehind',def:0,min:0,max:2},{name:'riskAvoidWhenAhead',def:0,min:0,max:2},
  {name:'scoreDiffSensitivity',def:0.05,min:0,max:0.2},{name:'variancePreference',def:0,min:-1,max:1},
  {name:'highCardBias',def:0,min:-5,max:5},{name:'safeDiscardBias',def:1,min:0,max:5},
  {name:'rushWhenAheadBy',def:30,min:5,max:60},{name:'stallWhenBehindBy',def:30,min:5,max:60},
  {name:'tempoAwareness',def:0.5,min:0,max:2},{name:'drawSourceTempo',def:0,min:-1,max:1},
  {name:'holdVsPlayBias',def:0,min:-3,max:3},
  {name:'cardCountingWeight',def:1,min:0,max:3},{name:'deckRichnessWeight',def:1,min:0,max:5},
  {name:'colorDepletionTrack',def:1,min:0,max:3},{name:'oppHandSizeWeight',def:0.5,min:0,max:3},
  {name:'perfectInfoEndgame',def:10,min:3,max:20},
];

// ==================== FULL GAME ENGINE (same as evolve-v2) ====================
function allCards(){const c=[];for(const co of COLORS){for(let i=0;i<3;i++)c.push({color:co,value:0,id:co+'_w'+i});for(let v=2;v<=10;v++)c.push({color:co,value:v,id:co+'_'+v});}return c;}
const ALL_CARDS=allCards();
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function canPlayCard(c,e){if(!e||e.length===0)return true;const t=e[e.length-1];if(c.value===0)return t.value===0;return c.value>t.value;}
function scoreColor(c){if(!c||c.length===0)return 0;let w=0,s=0;for(const x of c){if(x.value===0)w++;else s+=x.value;}return(s-20)*(1+w)+(c.length>=8?20:0);}
function scoreAll(e){let t=0;for(const c of COLORS)t+=scoreColor(e[c]||[]);return t;}

function buildSensors(sim,player){
  const other=player==='player1'?'player2':'player1';const hand=sim.hands[player];
  const myExps=sim.expeditions[player];const oppExps=sim.expeditions[other];const deckSize=sim.deck.length;
  const seen=new Set();
  for(const p of['player1','player2'])for(const c of COLORS)for(const card of(sim.expeditions[p][c]||[]))seen.add(card.id);
  if(sim.variant==='classic')for(const c of COLORS)for(const card of(sim.discards[c]||[]))seen.add(card.id);
  else for(const card of(sim.singlePile||[]))seen.add(card.id);
  for(const card of hand)seen.add(card.id);
  const unknown=ALL_CARDS.filter(c=>!seen.has(c.id));const colorInfo={};const myHandByColor={};
  for(const c of COLORS)myHandByColor[c]=[];for(const card of hand)myHandByColor[card.color].push(card);
  let myScore=0,oppScore=0,myExpCount=0,oppExpCount=0;
  for(const c of COLORS){
    const myExp=myExps[c]||[];const oppExp=oppExps[c]||[];const myHand=myHandByColor[c];
    const mS=scoreColor(myExp);const oS=scoreColor(oppExp);myScore+=mS;oppScore+=oS;
    if(myExp.length>0)myExpCount++;if(oppExp.length>0)oppExpCount++;
    const unk=unknown.filter(x=>x.color===c);const topVal=myExp.length>0?myExp[myExp.length-1].value:-1;
    let hasNum=false;for(const e of myExp)if(e.value>0){hasNum=true;break;}
    const sorted=myHand.slice().sort((a,b)=>a.value-b.value);const playable=[];let curTop=topVal;
    for(const card of sorted){if(card.value===0){if(!hasNum){playable.push(card);curTop=0;}}else if(card.value>curTop){playable.push(card);curTop=card.value;}}
    let ow=0;for(const e of oppExp)if(e.value===0)ow++;
    let dt=null;if(sim.variant==='classic'){const p=sim.discards[c]||[];if(p.length>0)dt=p[p.length-1];}
    colorInfo[c]={myExp,oppExp,myHand,playable,myScore:mS,oppScore:oS,projected:scoreColor(myExp.concat(playable)),
      oppWagers:ow,unknownCount:unk.length,depleted:(12-unk.length)/12,discardTop:dt,myCardCount:myExp.length,oppCardCount:oppExp.length};
  }
  return{hand,deckSize,myScore,oppScore,scoreDiff:myScore-oppScore,myExpCount,oppExpCount,colorInfo,myHandByColor,
    unknown,unknownCount:unknown.length,turnsLeft:Math.ceil(deckSize/2),variant:sim.variant};
}

function getPhase(g,ds){const w=Math.max(g.phaseBlendWidth,1);if(ds>=g.earlyPhaseBound)return{early:1,mid:0,late:0};if(ds<=g.latePhaseBound)return{early:0,mid:0,late:1};if(ds>g.earlyPhaseBound-w){const t=(g.earlyPhaseBound-ds)/w;return{early:1-t,mid:t,late:0};}if(ds<g.latePhaseBound+w){const t=(ds-g.latePhaseBound)/w;return{early:0,mid:t,late:1-t};}return{early:0,mid:1,late:0};}
function blendPhase(g,p,e,m,l){return p.early*e+p.mid*m+p.late*l;}

function evaluatePlay(g,s,card,color){const ci=s.colorInfo[color];const ph=getPhase(g,s.deckSize);if(card.value===0)return evaluateWager(g,s,card,color,ph);const fp=scoreColor([...ci.myExp,card,...ci.playable.filter(p=>p.id!==card.id)]);const delta=fp-ci.myScore;let sc=delta-blendPhase(g,ph,g.earlyPlayThresh,g.midPlayThresh,g.latePlayThresh);if(ci.myExp.length===0){sc-=g.newExpMinProjected;sc-=ph.late*g.newExpLatePenalty;if(s.myExpCount>=Math.round(g.maxExpeditions))sc-=15*(s.myExpCount-g.maxExpeditions+1);}const fc=ci.myCardCount+1+ci.playable.filter(p=>p.id!==card.id).length;if(fc>=8)sc+=g.eightCardWeight;else if(fc>=6)sc+=g.eightCardWeight*0.3;let mx=0;for(const c2 of COLORS){const l=(s.colorInfo[c2].myExp||[]).length;if(l>mx)mx=l;}if(ci.myCardCount===mx&&ci.myCardCount>0)sc+=g.concentrationBonus;sc+=ci.myHand.length*g.colorSynergyWeight*g.focusVsSpread;if(ci.oppExp.length>0)sc-=g.oppMirrorPenalty*g.oppAwareness;if(g.cardCountingWeight>0)sc-=ci.depleted*g.colorDepletionTrack*5;if(s.deckSize<10)sc*=g.endgameUrgency;sc-=g.holdVsPlayBias;if(s.scoreDiff<0)sc+=g.riskSeekWhenBehind*Math.abs(s.scoreDiff)*g.scoreDiffSensitivity;if(s.scoreDiff>0)sc-=g.riskAvoidWhenAhead*s.scoreDiff*g.scoreDiffSensitivity;return sc;}

function evaluateWager(g,s,card,color,ph){const ci=s.colorInfo[color];const wW=scoreColor([...ci.myExp,card,...ci.playable.filter(p=>p.id!==card.id)]);let sc=wW-ci.projected-g.wagerMinProjected;sc+=blendPhase(g,ph,g.wagerEarlyBonus,0,-g.wagerLatePenalty);let ew=0;for(const e of ci.myExp)if(e.value===0)ew++;sc+=ew*g.wagerStackBonus;sc-=g.wagerHoldValue;if(ci.myHand.length<g.wagerMinHandCards)sc-=10;sc*=(0.5+g.wagerRiskTolerance);if(s.scoreDiff<0)sc+=g.wagerAsVariance*10;if(s.scoreDiff>0)sc-=g.wagerAsVariance*5;if(ci.myExp.length===0){sc-=g.newExpMinProjected;sc-=ph.late*g.newExpLatePenalty;if(s.myExpCount>=Math.round(g.maxExpeditions))sc-=20;}return sc;}

function evaluateDiscard(g,s,card,color){const ci=s.colorInfo[color];let cost=0;let inSeq=false;for(const p of ci.playable)if(p.id===card.id){inSeq=true;break;}if(inSeq){cost=(ci.projected-ci.myScore);if(ci.playable.length>1)cost/=ci.playable.length;cost=Math.max(cost,card.value||3);cost+=ci.myHand.length*g.colorSynergyWeight;}else{cost=card.value*0.3;}if(ci.myExp.length===0&&ci.myHand.length<=1)cost-=g.orphanPenalty;cost+=card.value*g.highCardBias*0.1;const ocu=ci.oppExp.length>0&&canPlayCard(card,ci.oppExp);if(ocu){let gain=(card.value||3)*g.oppDiscardDanger/3+ci.oppWagers*g.oppWagerFear;if(ci.oppCardCount>=3)gain+=g.oppColorTrackWeight*ci.oppCardCount;cost+=gain*g.oppAwareness;}if(!ocu)cost-=g.safeDiscardBias;cost+=g.drawInfoLeakPenalty;if(ci.myExp.length>0&&ci.myScore<g.abandonThreshold)cost*=0.3;return cost;}

function evaluateDraw(g,s,color,card,isDeny){const ci=s.colorInfo[color];let sc=0;if(!isDeny){sc=card.value||2;if(ci.myExp.length>0)sc+=g.drawExpBonus;if(ci.myExp.length===0)sc-=g.drawForNewExpThresh;if(ci.oppExp.length>0&&canPlayCard(card,ci.oppExp)){sc+=g.drawDenyBonus*g.oppAwareness;sc+=ci.oppWagers*g.drawDenyWagerMult;}}else{sc=g.oppDenyDrawWeight*g.oppAwareness+ci.oppWagers*g.drawDenyWagerMult-g.drawDenyOnlyThresh;}sc-=g.drawInfoLeakPenalty;if(s.scoreDiff>g.rushWhenAheadBy)sc-=g.drawSourceTempo*g.tempoAwareness*5;if(s.scoreDiff<-g.stallWhenBehindBy)sc+=g.drawSourceTempo*g.tempoAwareness*5;return sc;}

function genomeTurn(sim,player,g){const hand=sim.hands[player];if(hand.length===0)return true;const other=player==='player1'?'player2':'player1';const sensors=buildSensors(sim,player);let bpi=-1,bps=-Infinity,bdi=0,bdc=Infinity;for(let i=0;i<hand.length;i++){const card=hand[i];const c=card.color;const exp=sim.expeditions[player][c]||[];if(canPlayCard(card,exp)){const ps=evaluatePlay(g,sensors,card,c);if(ps>bps){bps=ps;bpi=i;}}const dc=evaluateDiscard(g,sensors,card,c);if(dc<bdc){bdc=dc;bdi=i;}}const action=(bpi>=0&&bps>0)?'play':'discard';const ci=action==='play'?bpi:bdi;const card=hand.splice(ci,1)[0];let dC=null,jD=false;if(action==='play'){(sim.expeditions[player][card.color]=sim.expeditions[player][card.color]||[]).push(card);}else{if(sim.variant==='single'){sim.singlePile.push(card);jD=true;}else{(sim.discards[card.color]=sim.discards[card.color]||[]).push(card);dC=card.color;}}let drew=false;if(sim.variant==='classic'){let bDC=null,bDS=-Infinity;for(const c of COLORS){if(c===dC)continue;const pile=sim.discards[c]||[];if(pile.length===0)continue;const top=pile[pile.length-1];const exp=sim.expeditions[player][c]||[];const oE=sim.expeditions[other][c]||[];if(canPlayCard(top,exp)){const s=evaluateDraw(g,sensors,c,top,false);if(s>bDS){bDS=s;bDC=c;}}else if(oE.length>0&&canPlayCard(top,oE)){const s=evaluateDraw(g,sensors,c,top,true);if(s>bDS){bDS=s;bDC=c;}}}if(bDC&&bDS>g.drawDiscardThresh){hand.push(sim.discards[bDC].pop());drew=true;}}else if(!jD&&sim.singlePile&&sim.singlePile.length>0){const top=sim.singlePile[sim.singlePile.length-1];const exp=sim.expeditions[player][top.color]||[];if(canPlayCard(top,exp)){const s=evaluateDraw(g,sensors,top.color,top,false);if(s>g.drawDiscardThresh){hand.push(sim.singlePile.pop());drew=true;}}}if(!drew){if(sim.deck.length===0)return true;hand.push(sim.deck.pop());if(sim.deck.length===0)return true;}return false;}

function createGameState(v){const d=shuffle(allCards());const h1=d.splice(0,8),h2=d.splice(0,8);const e1={},e2={},dc={};for(const c of COLORS){e1[c]=[];e2[c]=[];dc[c]=[];}return{hands:{player1:h1,player2:h2},expeditions:{player1:e1,player2:e2},discards:dc,singlePile:[],deck:d,variant:v};}
function playGame(g1,g2,v){const gs=createGameState(v);let t='player1',s=80;while(s-->0){if(genomeTurn(gs,t,t==='player1'?g1:g2))break;t=t==='player1'?'player2':'player1';}const s1=scoreAll(gs.expeditions.player1),s2=scoreAll(gs.expeditions.player2);return s1>s2?1:(s1===s2?0.5:0);}

// ==================== EVOLUTION HELPERS ====================
function randomGenome(){const g={};for(const d of GENE_DEFS)g[d.name]=d.min+Math.random()*(d.max-d.min);return g;}
function mutate(genome,rate,strength){const g={...genome};for(const d of GENE_DEFS){if(Math.random()<rate){const r=d.max-d.min;g[d.name]=Math.max(d.min,Math.min(d.max,g[d.name]+(Math.random()*2-1)*r*strength));}}return g;}
function crossover(a,b){const c={};for(const d of GENE_DEFS){if(Math.random()<0.3)c[d.name]=Math.random()<0.5?a[d.name]:b[d.name];else{const t=Math.random();c[d.name]=a[d.name]*t+b[d.name]*(1-t);}}return c;}
function genomeDist(a,b){let s=0;for(const d of GENE_DEFS){const r=d.max-d.min;if(r===0)continue;const diff=(a[d.name]-b[d.name])/r;s+=diff*diff;}return Math.sqrt(s/GENE_DEFS.length);}

// ==================== ISLAND ARCHETYPES ====================
const ISLANDS = [
  {
    name: '🗡️  Explorer',
    desc: 'Aggressive, plays fast, starts many expeditions',
    seed: g => { g.earlyPlayThresh=-15; g.maxExpeditions=4.5; g.holdVsPlayBias=-2;
      g.wagerRiskTolerance=0.8; g.wagerEarlyBonus=12; g.wagerMinProjected=-5;
      g.rushWhenAheadBy=15; g.tempoAwareness=1.5; g.endgameUrgency=2; }
  },
  {
    name: '🛡️  Scholar',
    desc: 'Conservative, careful wagers, values safety',
    seed: g => { g.earlyPlayThresh=10; g.maxExpeditions=3; g.wagerRiskTolerance=0.1;
      g.wagerMinProjected=15; g.wagerMinHandCards=4; g.newExpMinProjected=10;
      g.riskAvoidWhenAhead=1.5; g.safeDiscardBias=4; g.oppAwareness=2; }
  },
  {
    name: '🏛️  Collector',
    desc: 'Focused on 2-3 colors, chases 8-card bonus',
    seed: g => { g.maxExpeditions=2.5; g.focusVsSpread=0; g.eightCardWeight=18;
      g.concentrationBonus=12; g.orphanPenalty=8; g.colorSynergyWeight=8;
      g.cardCountVsValue=0.8; g.newExpMinProjected=15; }
  },
  {
    name: '🕵️  Spy',
    desc: 'Opponent-focused, blocks and denies',
    seed: g => { g.oppAwareness=2.5; g.oppBlockWeight=8; g.oppDiscardDanger=12;
      g.oppDenyDrawWeight=10; g.oppWagerFear=12; g.counterPlayWeight=3;
      g.oppMirrorPenalty=5; g.drawDenyBonus=15; g.safeDiscardBias=4; }
  },
  {
    name: '⏱️  Gambler',
    desc: 'High variance, loves wagers, adjusts to score',
    seed: g => { g.wagerRiskTolerance=0.95; g.wagerMinProjected=-5; g.wagerEarlyBonus=10;
      g.wagerStackBonus=12; g.wagerAsVariance=0.8; g.riskSeekWhenBehind=1.5;
      g.variancePreference=0.7; g.scoreDiffSensitivity=0.15; }
  },
];

// ==================== WORKER ====================
if(!isMainThread){
  const {matchups, population, games, variant} = workerData;
  const results=[];
  for(const {i,j} of matchups){
    let w1=0,w2=0;
    for(let g=0;g<games;g++){const r1=playGame(population[i],population[j],variant);w1+=r1;w2+=(1-r1);const r2=playGame(population[j],population[i],variant);w2+=r2;w1+=(1-r2);}
    results.push({i,j,w1,w2});
  }
  parentPort.postMessage(results);
  process.exit(0);
}

// ==================== MAIN ====================
async function tournament(pop,games,variant,numWorkers){
  const n=pop.length;const matchups=[];
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)matchups.push({i,j});
  const chunks=[];const cs=Math.ceil(matchups.length/numWorkers);
  for(let i=0;i<matchups.length;i+=cs)chunks.push(matchups.slice(i,i+cs));
  const scores=new Array(n).fill(0);
  const promises=chunks.map(chunk=>new Promise((res,rej)=>{
    const w=new Worker(__filename,{workerData:{matchups:chunk,population:pop,games,variant}});
    w.on('message',res);w.on('error',rej);
  }));
  const all=await Promise.all(promises);
  for(const results of all)for(const{i,j,w1,w2}of results){scores[i]+=w1;scores[j]+=w2;}
  return scores;
}

async function main(){
  const args={generations:60, islandSize:15, games:60, variant:'classic', migrationEvery:10, migrationCount:2};
  for(let i=2;i<process.argv.length;i++){
    const a=process.argv[i];
    if(a==='--generations'||a==='-g')args.generations=parseInt(process.argv[++i]);
    else if(a==='--island-size'||a==='-s')args.islandSize=parseInt(process.argv[++i]);
    else if(a==='--games')args.games=parseInt(process.argv[++i]);
    else if(a==='--variant'||a==='-v')args.variant=process.argv[++i];
  }

  const numCPUs=os.cpus().length;
  const numWorkers=Math.max(1,numCPUs-1);
  const numIslands=ISLANDS.length;

  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Lost Cities AI — Island Model Evolution         ║');
  console.log('║   5 Islands × Distinct Archetypes                 ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║ Islands: ${numIslands}  Size: ${String(args.islandSize).padEnd(4)} Generations: ${String(args.generations).padEnd(10)}║`);
  console.log(`║ Games/match: ${String(args.games).padEnd(4)} Migration every: ${String(args.migrationEvery).padEnd(13)}║`);
  console.log(`║ Workers: ${String(numWorkers).padEnd(43)}║`);
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');

  for(const island of ISLANDS) console.log(`  ${island.name}: ${island.desc}`);
  console.log('');

  const {generations, islandSize, games, variant, migrationEvery, migrationCount}=args;

  // Initialize islands
  const islands=ISLANDS.map(island=>{
    const pop=[];
    // Seed archetype
    const seed=randomGenome();
    island.seed(seed);
    pop.push(seed);
    // Variations of archetype
    for(let i=1;i<Math.floor(islandSize*0.6);i++) pop.push(mutate(seed,0.5,0.4));
    // Random for diversity
    while(pop.length<islandSize) pop.push(randomGenome());
    return {name:island.name, pop, best:null, bestScore:-Infinity};
  });

  for(let gen=0;gen<generations;gen++){
    const t0=Date.now();
    const genResults=[];

    // Evolve each island independently
    for(let isl=0;isl<numIslands;isl++){
      const island=islands[isl];
      const scores=await tournament(island.pop, games, variant, numWorkers);
      const maxG=games*2*(islandSize-1);

      let bestIdx=0;
      for(let i=1;i<islandSize;i++) if(scores[i]>scores[bestIdx]) bestIdx=i;
      const bestWR=(scores[bestIdx]/maxG*100).toFixed(1);

      if(scores[bestIdx]>island.bestScore){
        island.bestScore=scores[bestIdx];
        island.best={...island.pop[bestIdx]};
      }

      genResults.push(bestWR);

      // Selection + breeding
      const indexed=scores.map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s);
      const elites=3;
      const newPop=[];
      for(let i=0;i<elites;i++) newPop.push({...island.pop[indexed[i].i]});
      // 2 immigrants
      newPop.push(randomGenome());
      newPop.push(randomGenome());
      while(newPop.length<islandSize){
        const p1=newPop[Math.floor(Math.random()*elites)];
        const p2=newPop[Math.floor(Math.random()*Math.min(newPop.length,elites+2))];
        let child=crossover(p1,p2);
        const progress=gen/generations;
        child=mutate(child,0.5*(1-progress*0.3),0.35*(1-progress*0.4));
        newPop.push(child);
      }
      island.pop=newPop;
    }

    // Migration
    if(gen>0 && gen%migrationEvery===0){
      for(let i=0;i<numIslands;i++){
        const src=islands[i];
        const dst=islands[(i+1)%numIslands];
        for(let m=0;m<migrationCount;m++){
          // Send best from src to dst, replacing worst in dst
          dst.pop[dst.pop.length-1-m]={...src.pop[m]};
        }
      }
    }

    const elapsed=((Date.now()-t0)/1000).toFixed(1);
    const summary=ISLANDS.map((isl,i)=>`${isl.name.slice(0,4)}${genResults[i]}%`).join(' ');
    console.log(`Gen ${String(gen+1).padStart(3)}/${generations} | ${summary} | ${elapsed}s`);
  }

  // Grand tournament: all island champions vs each other vs default
  console.log('\n════════════════════════════════════════════════════');
  console.log('GRAND TOURNAMENT: Island Champions + Default');
  console.log('════════════════════════════════════════════════════');

  const defaultG={};for(const d of GENE_DEFS)defaultG[d.name]=d.def;
  const champions=[...islands.map(i=>i.best), defaultG];
  const champNames=[...ISLANDS.map(i=>i.name), '📜 Default'];
  const champScores=await tournament(champions, 1000, variant, numWorkers);

  const champResults=champScores.map((s,i)=>({name:champNames[i],score:s,wr:s/(1000*2*(champions.length-1))*100}));
  champResults.sort((a,b)=>b.wr-a.wr);

  console.log(`${'Rank'.padEnd(5)} ${'Name'.padEnd(20)} ${'Win Rate'.padStart(10)}`);
  console.log('─'.repeat(40));
  champResults.forEach((r,i)=>{
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'  ';
    console.log(`${medal}${String(i+1).padEnd(3)} ${r.name.padEnd(20)} ${r.wr.toFixed(1).padStart(8)}%`);
  });

  // Save all champions
  const output={
    champions: islands.map((isl,i)=>({
      name: ISLANDS[i].name,
      desc: ISLANDS[i].desc,
      genome: isl.best,
      grandTournamentWR: champResults.find(r=>r.name===ISLANDS[i].name)?.wr
    })),
    default: defaultG,
    variant,
  };

  fs.writeFileSync('/tmp/lost-cities/champions.json', JSON.stringify(output, null, 2));
  console.log('\nChampions saved to champions.json');

  // Print genomes
  for(const isl of islands){
    const island=ISLANDS[islands.indexOf(isl)];
    console.log(`\n${island.name}:`);
    console.log(JSON.stringify(isl.best, null, 2));
  }
}

main().catch(e=>{console.error(e);process.exit(1)});
