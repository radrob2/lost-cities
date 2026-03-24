#!/usr/bin/env node
/**
 * Ablation Analysis for Lost Cities AI
 * Takes a genome (from evolution), resets one gene at a time to default,
 * measures win rate drop. Identifies which genes actually matter.
 * Also does convergence analysis on a population.
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const fs = require('fs');

// Import game engine + gene defs from evolve-v2
// (We duplicate the essentials here for standalone operation)

const COLORS = ['red','green','blue','white','yellow'];

const GENE_DEFS = [
  {name:'earlyPlayThresh',def:0,min:-30,max:30,cat:'phase'},{name:'midPlayThresh',def:0,min:-30,max:30,cat:'phase'},
  {name:'latePlayThresh',def:0,min:-30,max:30,cat:'phase'},{name:'earlyPhaseBound',def:30,min:15,max:38,cat:'phase'},
  {name:'latePhaseBound',def:15,min:5,max:25,cat:'phase'},{name:'phaseBlendWidth',def:5,min:1,max:15,cat:'phase'},
  {name:'endgameUrgency',def:1,min:0,max:3,cat:'phase'},
  {name:'maxExpeditions',def:5,min:1.5,max:5,cat:'portfolio'},{name:'newExpMinProjected',def:0,min:-20,max:25,cat:'portfolio'},
  {name:'newExpLatePenalty',def:10,min:0,max:30,cat:'portfolio'},{name:'eightCardWeight',def:5,min:0,max:20,cat:'portfolio'},
  {name:'concentrationBonus',def:0,min:0,max:15,cat:'portfolio'},{name:'abandonThreshold',def:-15,min:-40,max:0,cat:'portfolio'},
  {name:'cardCountVsValue',def:0.5,min:0,max:1,cat:'portfolio'},{name:'focusVsSpread',def:0.5,min:0,max:1,cat:'portfolio'},
  {name:'colorSynergyWeight',def:3,min:0,max:10,cat:'portfolio'},{name:'orphanPenalty',def:2,min:0,max:10,cat:'portfolio'},
  {name:'wagerMinProjected',def:5,min:-10,max:30,cat:'wager'},{name:'wagerEarlyBonus',def:5,min:0,max:15,cat:'wager'},
  {name:'wagerLatePenalty',def:10,min:0,max:30,cat:'wager'},{name:'wagerStackBonus',def:3,min:0,max:15,cat:'wager'},
  {name:'wagerHoldValue',def:2,min:0,max:10,cat:'wager'},{name:'wagerRiskTolerance',def:0.5,min:0,max:1,cat:'wager'},
  {name:'wagerMinHandCards',def:2,min:0,max:5,cat:'wager'},{name:'wagerAsVariance',def:0,min:-1,max:1,cat:'wager'},
  {name:'oppAwareness',def:1,min:0,max:3,cat:'opponent'},{name:'oppBlockWeight',def:0,min:0,max:10,cat:'opponent'},
  {name:'oppDiscardDanger',def:3,min:0,max:15,cat:'opponent'},{name:'oppWagerFear',def:5,min:0,max:15,cat:'opponent'},
  {name:'oppDenyDrawWeight',def:3,min:0,max:12,cat:'opponent'},{name:'oppColorTrackWeight',def:1,min:0,max:5,cat:'opponent'},
  {name:'oppDrawSignalWeight',def:2,min:0,max:8,cat:'opponent'},{name:'counterPlayWeight',def:0,min:-5,max:5,cat:'opponent'},
  {name:'oppMirrorPenalty',def:0,min:0,max:10,cat:'opponent'},{name:'oppExpCountFear',def:1,min:0,max:5,cat:'opponent'},
  {name:'drawDiscardThresh',def:6,min:0,max:20,cat:'draw'},{name:'drawExpBonus',def:12,min:0,max:25,cat:'draw'},
  {name:'drawDenyBonus',def:8,min:0,max:20,cat:'draw'},{name:'drawDenyWagerMult',def:4,min:0,max:12,cat:'draw'},
  {name:'drawUnknownValue',def:3,min:0,max:10,cat:'draw'},{name:'drawForNewExpThresh',def:10,min:0,max:25,cat:'draw'},
  {name:'drawDenyOnlyThresh',def:8,min:2,max:25,cat:'draw'},{name:'drawInfoLeakPenalty',def:0,min:0,max:5,cat:'draw'},
  {name:'riskSeekWhenBehind',def:0,min:0,max:2,cat:'risk'},{name:'riskAvoidWhenAhead',def:0,min:0,max:2,cat:'risk'},
  {name:'scoreDiffSensitivity',def:0.05,min:0,max:0.2,cat:'risk'},{name:'variancePreference',def:0,min:-1,max:1,cat:'risk'},
  {name:'highCardBias',def:0,min:-5,max:5,cat:'risk'},{name:'safeDiscardBias',def:1,min:0,max:5,cat:'risk'},
  {name:'rushWhenAheadBy',def:30,min:5,max:60,cat:'tempo'},{name:'stallWhenBehindBy',def:30,min:5,max:60,cat:'tempo'},
  {name:'tempoAwareness',def:0.5,min:0,max:2,cat:'tempo'},{name:'drawSourceTempo',def:0,min:-1,max:1,cat:'tempo'},
  {name:'holdVsPlayBias',def:0,min:-3,max:3,cat:'tempo'},
  {name:'cardCountingWeight',def:1,min:0,max:3,cat:'info'},{name:'deckRichnessWeight',def:1,min:0,max:5,cat:'info'},
  {name:'colorDepletionTrack',def:1,min:0,max:3,cat:'info'},{name:'oppHandSizeWeight',def:0.5,min:0,max:3,cat:'info'},
  {name:'perfectInfoEndgame',def:10,min:3,max:20,cat:'info'},
];

// ==================== GAME ENGINE (copy from evolve-v2) ====================
// (Full copy of game engine, sensors, genome turn logic)

function allCards(){
  const cards=[];
  for(const c of COLORS){
    for(let i=0;i<3;i++) cards.push({color:c,value:0,id:c+'_w'+i});
    for(let v=2;v<=10;v++) cards.push({color:c,value:v,id:c+'_'+v});
  }
  return cards;
}
const ALL_CARDS=allCards();

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr;
}

function canPlayCard(card,exp){
  if(!exp||exp.length===0)return true;
  const top=exp[exp.length-1];
  if(card.value===0)return top.value===0;
  return card.value>top.value;
}

function scoreColor(cards){
  if(!cards||cards.length===0)return 0;
  let w=0,s=0;
  for(const c of cards){if(c.value===0)w++;else s+=c.value;}
  return(s-20)*(1+w)+(cards.length>=8?20:0);
}

function scoreAll(exps){let t=0;for(const c of COLORS)t+=scoreColor(exps[c]||[]);return t;}

function buildSensors(sim,player){
  const other=player==='player1'?'player2':'player1';
  const hand=sim.hands[player];
  const myExps=sim.expeditions[player];
  const oppExps=sim.expeditions[other];
  const deckSize=sim.deck.length;
  const seen=new Set();
  for(const p of['player1','player2'])for(const c of COLORS)for(const card of(sim.expeditions[p][c]||[]))seen.add(card.id);
  if(sim.variant==='classic')for(const c of COLORS)for(const card of(sim.discards[c]||[]))seen.add(card.id);
  else for(const card of(sim.singlePile||[]))seen.add(card.id);
  for(const card of hand)seen.add(card.id);
  const unknown=ALL_CARDS.filter(c=>!seen.has(c.id));
  const colorInfo={};
  const myHandByColor={};
  for(const c of COLORS)myHandByColor[c]=[];
  for(const card of hand)myHandByColor[card.color].push(card);
  let myScore=0,oppScore=0,myExpCount=0,oppExpCount=0;
  for(const c of COLORS){
    const myExp=myExps[c]||[];const oppExp=oppExps[c]||[];const myHand=myHandByColor[c];
    const mScore=scoreColor(myExp);const oScore=scoreColor(oppExp);
    myScore+=mScore;oppScore+=oScore;
    if(myExp.length>0)myExpCount++;if(oppExp.length>0)oppExpCount++;
    const unknownInColor=unknown.filter(x=>x.color===c);
    const seenInColor=12-unknownInColor.length;
    const topVal=myExp.length>0?myExp[myExp.length-1].value:-1;
    let hasNumbers=false;for(const e of myExp)if(e.value>0){hasNumbers=true;break;}
    const sorted=myHand.slice().sort((a,b)=>a.value-b.value);
    const playable=[];let curTop=topVal;
    for(const card of sorted){
      if(card.value===0){if(!hasNumbers){playable.push(card);curTop=0;}}
      else if(card.value>curTop){playable.push(card);curTop=card.value;}
    }
    let oppWagers=0;for(const e of oppExp)if(e.value===0)oppWagers++;
    const projected=scoreColor(myExp.concat(playable));
    let discardTop=null;
    if(sim.variant==='classic'){const pile=sim.discards[c]||[];if(pile.length>0)discardTop=pile[pile.length-1];}
    colorInfo[c]={myExp,oppExp,myHand,playable,myScore:mScore,oppScore:oScore,projected,oppWagers,
      unknownCount:unknownInColor.length,depleted:seenInColor/12,discardTop,myCardCount:myExp.length,oppCardCount:oppExp.length};
  }
  return{hand,deckSize,myScore,oppScore,scoreDiff:myScore-oppScore,myExpCount,oppExpCount,
    colorInfo,myHandByColor,unknown,unknownCount:unknown.length,turnsLeft:Math.ceil(deckSize/2),variant:sim.variant};
}

function getPhase(g,ds){
  const w=Math.max(g.phaseBlendWidth,1);
  if(ds>=g.earlyPhaseBound)return{early:1,mid:0,late:0};
  if(ds<=g.latePhaseBound)return{early:0,mid:0,late:1};
  if(ds>g.earlyPhaseBound-w){const t=(g.earlyPhaseBound-ds)/w;return{early:1-t,mid:t,late:0};}
  if(ds<g.latePhaseBound+w){const t=(ds-g.latePhaseBound)/w;return{early:0,mid:t,late:1-t};}
  return{early:0,mid:1,late:0};
}

function blendPhase(g,phase,e,m,l){return phase.early*e+phase.mid*m+phase.late*l;}

function evaluatePlay(g,sensors,card,color){
  const ci=sensors.colorInfo[color];const phase=getPhase(g,sensors.deckSize);
  if(card.value===0)return evaluateWager(g,sensors,card,color,phase);
  const fullProjected=scoreColor([...ci.myExp,card,...ci.playable.filter(p=>p.id!==card.id)]);
  const delta=fullProjected-ci.myScore;
  let score=delta-blendPhase(g,phase,g.earlyPlayThresh,g.midPlayThresh,g.latePlayThresh);
  if(ci.myExp.length===0){score-=g.newExpMinProjected;score-=phase.late*g.newExpLatePenalty;
    if(sensors.myExpCount>=Math.round(g.maxExpeditions))score-=15*(sensors.myExpCount-g.maxExpeditions+1);}
  const futureCount=ci.myCardCount+1+ci.playable.filter(p=>p.id!==card.id).length;
  if(futureCount>=8)score+=g.eightCardWeight;else if(futureCount>=6)score+=g.eightCardWeight*0.3;
  let maxExpLen=0;for(const c2 of COLORS){const len=(sensors.colorInfo[c2].myExp||[]).length;if(len>maxExpLen)maxExpLen=len;}
  if(ci.myCardCount===maxExpLen&&ci.myCardCount>0)score+=g.concentrationBonus;
  score+=ci.myHand.length*g.colorSynergyWeight*g.focusVsSpread;
  if(ci.oppExp.length>0)score-=g.oppMirrorPenalty*g.oppAwareness;
  if(g.cardCountingWeight>0)score-=ci.depleted*g.colorDepletionTrack*5;
  if(sensors.deckSize<10)score*=g.endgameUrgency;
  score-=g.holdVsPlayBias;
  if(sensors.scoreDiff<0)score+=g.riskSeekWhenBehind*Math.abs(sensors.scoreDiff)*g.scoreDiffSensitivity;
  if(sensors.scoreDiff>0)score-=g.riskAvoidWhenAhead*sensors.scoreDiff*g.scoreDiffSensitivity;
  return score;
}

function evaluateWager(g,sensors,card,color,phase){
  const ci=sensors.colorInfo[color];
  const withW=scoreColor([...ci.myExp,card,...ci.playable.filter(p=>p.id!==card.id)]);
  let score=withW-ci.projected-g.wagerMinProjected;
  score+=blendPhase(g,phase,g.wagerEarlyBonus,0,-g.wagerLatePenalty);
  let ew=0;for(const e of ci.myExp)if(e.value===0)ew++;
  score+=ew*g.wagerStackBonus;score-=g.wagerHoldValue;
  if(ci.myHand.length<g.wagerMinHandCards)score-=10;
  score*=(0.5+g.wagerRiskTolerance);
  if(sensors.scoreDiff<0)score+=g.wagerAsVariance*10;
  if(sensors.scoreDiff>0)score-=g.wagerAsVariance*5;
  if(ci.myExp.length===0){score-=g.newExpMinProjected;score-=phase.late*g.newExpLatePenalty;
    if(sensors.myExpCount>=Math.round(g.maxExpeditions))score-=20;}
  return score;
}

function evaluateDiscard(g,sensors,card,color){
  const ci=sensors.colorInfo[color];
  let cost=0;let inSeq=false;
  for(const p of ci.playable)if(p.id===card.id){inSeq=true;break;}
  if(inSeq){cost=(ci.projected-ci.myScore);if(ci.playable.length>1)cost/=ci.playable.length;
    cost=Math.max(cost,card.value||3);cost+=ci.myHand.length*g.colorSynergyWeight;}
  else{cost=card.value*0.3;}
  if(ci.myExp.length===0&&ci.myHand.length<=1)cost-=g.orphanPenalty;
  cost+=card.value*g.highCardBias*0.1;
  const oppCanUse=ci.oppExp.length>0&&canPlayCard(card,ci.oppExp);
  if(oppCanUse){let gain=(card.value||3)*g.oppDiscardDanger/3+ci.oppWagers*g.oppWagerFear;
    if(ci.oppCardCount>=3)gain+=g.oppColorTrackWeight*ci.oppCardCount;cost+=gain*g.oppAwareness;}
  if(!oppCanUse)cost-=g.safeDiscardBias;
  cost+=g.drawInfoLeakPenalty;
  if(ci.myExp.length>0&&ci.myScore<g.abandonThreshold)cost*=0.3;
  return cost;
}

function evaluateDraw(g,sensors,color,card,isDeny){
  const ci=sensors.colorInfo[color];let score=0;
  if(!isDeny){score=card.value||2;if(ci.myExp.length>0)score+=g.drawExpBonus;
    if(ci.myExp.length===0)score-=g.drawForNewExpThresh;
    if(ci.oppExp.length>0&&canPlayCard(card,ci.oppExp)){score+=g.drawDenyBonus*g.oppAwareness;score+=ci.oppWagers*g.drawDenyWagerMult;}}
  else{score=g.oppDenyDrawWeight*g.oppAwareness+ci.oppWagers*g.drawDenyWagerMult-g.drawDenyOnlyThresh;}
  score-=g.drawInfoLeakPenalty;
  if(sensors.scoreDiff>g.rushWhenAheadBy)score-=g.drawSourceTempo*g.tempoAwareness*5;
  if(sensors.scoreDiff<-g.stallWhenBehindBy)score+=g.drawSourceTempo*g.tempoAwareness*5;
  return score;
}

function genomeTurn(sim,player,g){
  const hand=sim.hands[player];if(hand.length===0)return true;
  const other=player==='player1'?'player2':'player1';
  const sensors=buildSensors(sim,player);
  let bestPlayIdx=-1,bestPlayScore=-Infinity,bestDiscIdx=0,bestDiscCost=Infinity;
  for(let i=0;i<hand.length;i++){
    const card=hand[i];const c=card.color;const exp=sim.expeditions[player][c]||[];
    if(canPlayCard(card,exp)){const ps=evaluatePlay(g,sensors,card,c);if(ps>bestPlayScore){bestPlayScore=ps;bestPlayIdx=i;}}
    const dc=evaluateDiscard(g,sensors,card,c);if(dc<bestDiscCost){bestDiscCost=dc;bestDiscIdx=i;}
  }
  const action=(bestPlayIdx>=0&&bestPlayScore>0)?'play':'discard';
  const chosenIdx=action==='play'?bestPlayIdx:bestDiscIdx;
  const card=hand.splice(chosenIdx,1)[0];
  let discardedColor=null,justDiscarded=false;
  if(action==='play'){(sim.expeditions[player][card.color]=sim.expeditions[player][card.color]||[]).push(card);}
  else{if(sim.variant==='single'){sim.singlePile.push(card);justDiscarded=true;}
    else{(sim.discards[card.color]=sim.discards[card.color]||[]).push(card);discardedColor=card.color;}}
  let drew=false;
  if(sim.variant==='classic'){
    let bestDC=null,bestDS=-Infinity;
    for(const c of COLORS){if(c===discardedColor)continue;const pile=sim.discards[c]||[];
      if(pile.length===0)continue;const top=pile[pile.length-1];
      const exp=sim.expeditions[player][c]||[];const oppExp=sim.expeditions[other][c]||[];
      if(canPlayCard(top,exp)){const s=evaluateDraw(g,sensors,c,top,false);if(s>bestDS){bestDS=s;bestDC=c;}}
      else if(oppExp.length>0&&canPlayCard(top,oppExp)){const s=evaluateDraw(g,sensors,c,top,true);if(s>bestDS){bestDS=s;bestDC=c;}}}
    if(bestDC&&bestDS>g.drawDiscardThresh){hand.push(sim.discards[bestDC].pop());drew=true;}
  }else if(!justDiscarded&&sim.singlePile&&sim.singlePile.length>0){
    const top=sim.singlePile[sim.singlePile.length-1];const exp=sim.expeditions[player][top.color]||[];
    if(canPlayCard(top,exp)){const s=evaluateDraw(g,sensors,top.color,top,false);
      if(s>g.drawDiscardThresh){hand.push(sim.singlePile.pop());drew=true;}}}
  if(!drew){if(sim.deck.length===0)return true;hand.push(sim.deck.pop());if(sim.deck.length===0)return true;}
  return false;
}

function createGameState(variant){
  const deck=shuffle(allCards());const h1=deck.splice(0,8),h2=deck.splice(0,8);
  const e1={},e2={},d={};for(const c of COLORS){e1[c]=[];e2[c]=[];d[c]=[];}
  return{hands:{player1:h1,player2:h2},expeditions:{player1:e1,player2:e2},discards:d,singlePile:[],deck,variant};
}

function playGame(g1,g2,variant){
  const gs=createGameState(variant);let turn='player1',safety=80;
  while(safety-->0){if(genomeTurn(gs,turn,turn==='player1'?g1:g2))break;turn=turn==='player1'?'player2':'player1';}
  const s1=scoreAll(gs.expeditions.player1),s2=scoreAll(gs.expeditions.player2);
  return s1>s2?1:(s1===s2?0.5:0);
}

// ==================== WORKER ====================

if(!isMainThread){
  const {tests, variant, gamesPerTest} = workerData;
  const results=[];
  for(const {name, genome, opponent} of tests){
    let wins=0;
    for(let i=0;i<gamesPerTest;i++){
      const r1=playGame(genome,opponent,variant);
      wins+=(1-r1); // genome is player2
      const r2=playGame(opponent,genome,variant);
      wins+=r2; // genome is player1
    }
    results.push({name, winRate: wins/(gamesPerTest*2)});
  }
  parentPort.postMessage(results);
  process.exit(0);
}

// ==================== MAIN ====================

async function runTests(tests, variant, gamesPerTest, numWorkers){
  const chunks=[];
  const chunkSize=Math.ceil(tests.length/numWorkers);
  for(let i=0;i<tests.length;i+=chunkSize) chunks.push(tests.slice(i,i+chunkSize));

  const promises=chunks.map(chunk=>new Promise((resolve,reject)=>{
    const w=new Worker(__filename, {workerData:{tests:chunk,variant,gamesPerTest}});
    w.on('message',resolve);w.on('error',reject);
  }));

  const allResults=await Promise.all(promises);
  return allResults.flat();
}

async function main(){
  const variant='classic';
  const gamesPerTest=1000;
  const numWorkers=Math.max(1, os.cpus().length-1);

  // Load genome from command line or use a default evolved one
  let genome;
  const genomeFile=process.argv[2];
  if(genomeFile && fs.existsSync(genomeFile)){
    genome=JSON.parse(fs.readFileSync(genomeFile,'utf8'));
    console.log(`Loaded genome from ${genomeFile}`);
  } else {
    console.log('Usage: node ablation.js <genome.json>');
    console.log('No genome file provided — will run after evolution completes.');
    console.log('Save your evolved genome to a JSON file first.');
    process.exit(1);
  }

  const defaultGenome={};
  for(const d of GENE_DEFS) defaultGenome[d.name]=d.def;

  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Lost Cities AI — Ablation Analysis              ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║ Games per test: ${String(gamesPerTest*2).padEnd(36)}║`);
  console.log(`║ Workers: ${String(numWorkers).padEnd(43)}║`);
  console.log(`║ Genes: ${String(GENE_DEFS.length).padEnd(45)}║`);
  console.log('╚════════════════════════════════════════════════════╝\n');

  // 1. Baseline: evolved genome vs default
  console.log('Phase 1: Baseline win rate...');
  const baseTests=[{name:'baseline', genome, opponent:defaultGenome}];
  const baseResults=await runTests(baseTests, variant, gamesPerTest, numWorkers);
  const baselineWR=baseResults[0].winRate;
  console.log(`Baseline: ${(baselineWR*100).toFixed(1)}% vs default\n`);

  // 2. Ablation: reset each gene to default, measure drop
  console.log('Phase 2: Ablation (resetting each gene to default)...');
  const ablationTests=GENE_DEFS.map(d=>{
    const modified={...genome};
    modified[d.name]=d.def;
    return {name:d.name, genome:modified, opponent:defaultGenome};
  });

  const ablationResults=await runTests(ablationTests, variant, gamesPerTest, numWorkers);

  // Calculate impact
  const impacts=ablationResults.map(r=>({
    name:r.name,
    winRate:r.winRate,
    drop:baselineWR-r.winRate,
    dropPct:((baselineWR-r.winRate)/baselineWR*100),
    cat:GENE_DEFS.find(d=>d.name===r.name).cat,
    evolved:genome[r.name],
    default:GENE_DEFS.find(d=>d.name===r.name).def,
  }));

  // Sort by impact (biggest drop first)
  impacts.sort((a,b)=>b.drop-a.drop);

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('ABLATION RESULTS (sorted by impact — biggest drop = most important)');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`${'Gene'.padEnd(25)} ${'Cat'.padEnd(10)} ${'Evolved'.padStart(8)} ${'Default'.padStart(8)} ${'WR'.padStart(7)} ${'Drop'.padStart(7)} ${'Impact'.padStart(8)}`);
  console.log('─'.repeat(80));

  for(const r of impacts){
    const bar='█'.repeat(Math.max(0,Math.round(r.drop*200)));
    const dropStr=r.drop>0?`-${(r.drop*100).toFixed(1)}%`:`+${(Math.abs(r.drop)*100).toFixed(1)}%`;
    const impactStr=r.drop>0.02?'CRITICAL':r.drop>0.01?'HIGH':r.drop>0.005?'MEDIUM':r.drop>0?'LOW':'NONE';
    console.log(`${r.name.padEnd(25)} ${r.cat.padEnd(10)} ${r.evolved.toFixed(2).padStart(8)} ${r.default.toFixed(2).padStart(8)} ${(r.winRate*100).toFixed(1).padStart(6)}% ${dropStr.padStart(7)} ${impactStr.padStart(8)} ${bar}`);
  }

  // Category summary
  console.log('\n════════════════════════════════════════════════════');
  console.log('CATEGORY SUMMARY (avg impact per gene)');
  console.log('════════════════════════════════════════════════════');
  const catImpact={};
  for(const r of impacts){
    if(!catImpact[r.cat]) catImpact[r.cat]={total:0,count:0};
    catImpact[r.cat].total+=r.drop;
    catImpact[r.cat].count++;
  }
  const catSorted=Object.entries(catImpact).sort((a,b)=>b[1].total/b[1].count-a[1].total/a[1].count);
  for(const [cat,{total,count}] of catSorted){
    const avg=(total/count*100).toFixed(2);
    console.log(`${cat.padEnd(12)} avg impact: ${avg}% per gene (${count} genes)`);
  }

  // Pruning recommendation
  console.log('\n════════════════════════════════════════════════════');
  console.log('PRUNING RECOMMENDATION');
  console.log('════════════════════════════════════════════════════');
  const critical=impacts.filter(r=>r.drop>0.02);
  const high=impacts.filter(r=>r.drop>0.01&&r.drop<=0.02);
  const useless=impacts.filter(r=>r.drop<=0);
  console.log(`KEEP (critical+high): ${critical.length+high.length} genes`);
  critical.forEach(r=>console.log(`  ★ ${r.name} (${r.cat})`));
  high.forEach(r=>console.log(`  ● ${r.name} (${r.cat})`));
  console.log(`\nCAN PRUNE (no impact): ${useless.length} genes`);
  useless.forEach(r=>console.log(`  ✗ ${r.name} (${r.cat})`));
}

main().catch(e=>{console.error(e);process.exit(1)});
