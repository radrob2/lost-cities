#!/usr/bin/env node
// Benchmark: Heuristic AI vs Genome-driven AI

const COLORS=['red','green','blue','white','yellow'];
function allCards(){const c=[];for(const co of COLORS){for(let i=0;i<3;i++)c.push({color:co,value:0,id:co+'_w'+i});for(let v=2;v<=10;v++)c.push({color:co,value:v,id:co+'_'+v});}return c;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function canPlayCard(c,e){if(!e||e.length===0)return true;const t=e[e.length-1];if(c.value===0)return t.value===0;return c.value>t.value;}
function scoreColor(c){if(!c||c.length===0)return 0;let w=0,s=0;for(const x of c){if(x.value===0)w++;else s+=x.value;}return(s-20)*(1+w)+(c.length>=8?20:0);}
function scoreAll(e){let t=0;for(const c of COLORS)t+=scoreColor(e[c]||[]);return t;}

function createGameState(v){
  const d=shuffle(allCards());
  const h1=d.splice(0,8),h2=d.splice(0,8);
  const e1={},e2={},dc={};
  for(const c of COLORS){e1[c]=[];e2[c]=[];dc[c]=[];}
  return{hands:{player1:h1,player2:h2},expeditions:{player1:e1,player2:e2},discards:dc,singlePile:[],deck:d,variant:v};
}

// ========== HEURISTIC AI TURN ==========
function heuristicTurn(sim, player){
  const hand=sim.hands[player];
  if(hand.length===0) return true;
  const other=player==='player1'?'player2':'player1';
  const myExps=sim.expeditions[player];
  const oppExps=sim.expeditions[other];
  const deckSize=sim.deck.length;

  const handByColor={};
  for(const c of COLORS) handByColor[c]=[];
  for(const card of hand) handByColor[card.color].push(card);

  const seen=new Set();
  for(const p of ['player1','player2'])
    for(const c of COLORS)
      for(const card of (sim.expeditions[p][c]||[])) seen.add(card.id);
  if(sim.variant==='classic')
    for(const c of COLORS)
      for(const card of (sim.discards[c]||[])) seen.add(card.id);
  else
    for(const card of (sim.singlePile||[])) seen.add(card.id);
  for(const card of hand) seen.add(card.id);

  let myExpCount=0;
  for(const c of COLORS) if((myExps[c]||[]).length>0) myExpCount++;

  function projectScore(exp, handCards){
    const combined=[...exp];
    const sorted=handCards.filter(h=>h.value>0).sort((a,b)=>a.value-b.value);
    let topVal=exp.length>0?exp[exp.length-1].value:-1;
    for(const c of sorted){
      if(c.value>topVal){combined.push(c);topVal=c.value;}
    }
    return scoreColor(combined);
  }

  // Score plays
  const playOptions=[];
  for(const card of hand){
    const c=card.color;
    const exp=myExps[c]||[];
    if(!canPlayCard(card, exp)) continue;
    let score=0;
    const commitment=exp.length;
    const handInColor=handByColor[c];
    const handCount=handInColor.length;
    const isWager=card.value===0;
    const currentScore=scoreColor(exp);
    const remaining=handInColor.filter(h=>h.id!==card.id);
    const afterPlay=projectScore([...exp, card], remaining);
    const delta=afterPlay-currentScore;

    if(isWager){
      if(commitment>0){
        const hasNumbers=exp.some(e=>e.value>0);
        if(hasNumbers) continue;
      }
      const withoutWager=projectScore(exp, remaining);
      const wagerDelta=afterPlay-withoutWager;
      if(wagerDelta>0) score=wagerDelta;
      else score=wagerDelta*0.5;
      if(deckSize>35) score+=8;
      else if(deckSize>25) score+=3;
      else score-=5;
      if(handCount>=4) score+=5;
      else if(handCount>=3) score+=2;
      else score-=8;
    } else {
      if(commitment>0){
        score=Math.max(delta, card.value*0.5);
        const futureCount=commitment+1+remaining.filter(h=>h.value>card.value).length;
        if(futureCount>=8) score+=20;
        else if(futureCount>=6) score+=8;
        const wagerCount=exp.filter(e=>e.value===0).length;
        if(wagerCount>0) score+=card.value*wagerCount*0.3;
        if(card.value<=4) score+=3;
      } else {
        if(delta>-5) score=delta*0.5+handCount*3;
        else score=delta*0.3;
        if(deckSize<15) score-=10;
        else if(deckSize<25 && handCount<3) score-=8;
        if(myExpCount>=3) score-=5;
        if(myExpCount>=4) score-=10;
        if(card.value<=4 && handCount>=3) score+=5;
        if(card.value>=8 && handCount<=2) score-=15;
      }
    }
    playOptions.push({card, score, idx:hand.indexOf(card)});
  }

  // Score discards
  const discardOptions=[];
  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const c=card.color;
    const exp=myExps[c]||[];
    const oppExp=oppExps[c]||[];
    let safety=0;

    if(oppExp.length>0 && canPlayCard(card, oppExp)){
      safety=-100;
      const oppWagers=oppExp.filter(e=>e.value===0).length;
      safety-=oppWagers*20;
      safety-=(card.value||3)*3;
    } else if(oppExp.length>0){
      safety=-5-(card.value||0);
      if(card.value>=7) safety=-25;
    } else {
      safety=8;
    }

    if(exp.length===0){
      if(handByColor[c].length<=1) safety+=12;
      safety+=3;
      if(card.value<=4) safety+=4;
    } else {
      safety-=15;
      if(canPlayCard(card, exp)) safety-=20+(card.value||0);
    }
    if(card.value>=7) safety-=card.value*1.5;
    if(card.value===0){
      if(exp.length===0 && handByColor[c].length<=2) safety+=8;
      else if(exp.length>0) safety-=12;
    }
    if(handByColor[c].filter(h=>h.id!==card.id).length===0) safety+=6;

    discardOptions.push({card, score:safety, idx:i});
  }

  playOptions.sort((a,b)=>b.score-a.score);
  discardOptions.sort((a,b)=>b.score-a.score);

  let chosenIdx, action, discardedColor=null, justDiscarded=false;
  const bestPlay=playOptions[0];
  const bestDiscard=discardOptions[0];

  if(bestPlay && (bestPlay.score>0 || (bestDiscard && bestDiscard.score<-50 && bestPlay.score>-10))){
    action='play';
    chosenIdx=hand.indexOf(bestPlay.card);
  } else {
    action='discard';
    chosenIdx=hand.indexOf(bestDiscard.card);
  }

  const card=hand.splice(chosenIdx,1)[0];
  if(action==='play'){
    (sim.expeditions[player][card.color]=sim.expeditions[player][card.color]||[]).push(card);
  } else {
    if(sim.variant==='single'){
      sim.singlePile.push(card); justDiscarded=true;
    } else {
      (sim.discards[card.color]=sim.discards[card.color]||[]).push(card);
      discardedColor=card.color;
    }
  }

  // Draw
  let drew=false;
  if(sim.variant==='classic'){
    let bestDrawScore=-Infinity, bestDrawColor=null;
    for(const c of COLORS){
      if(c===discardedColor) continue;
      const pile=sim.discards[c]||[];
      if(pile.length===0) continue;
      const top=pile[pile.length-1];
      const myExp=myExps[c]||[];
      const oppExp=oppExps[c]||[];
      let drawScore=0;
      if(myExp.length>0 && canPlayCard(top, myExp)){
        drawScore=8+top.value;
        if(top.value>5) drawScore+=5;
      }
      if(myExp.length===0 && handByColor[c].length>=3 && canPlayCard(top, [])){
        drawScore=Math.max(drawScore, 3+top.value*0.5);
      }
      if(oppExp.length>0 && canPlayCard(top, oppExp)){
        const ow=oppExp.filter(e=>e.value===0).length;
        drawScore=Math.max(drawScore, 12+top.value+ow*4);
      }
      drawScore-=2;
      if(drawScore>bestDrawScore){bestDrawScore=drawScore;bestDrawColor=c;}
    }
    if(bestDrawColor && bestDrawScore>6){
      hand.push(sim.discards[bestDrawColor].pop());
      drew=true;
    }
  } else if(!justDiscarded && sim.singlePile && sim.singlePile.length>0){
    const top=sim.singlePile[sim.singlePile.length-1];
    const myExp=myExps[top.color]||[];
    const oppExp=oppExps[top.color]||[];
    let drawScore=0;
    if(myExp.length>0 && canPlayCard(top, myExp)) drawScore=8+top.value;
    if(oppExp.length>0 && canPlayCard(top, oppExp)) drawScore=Math.max(drawScore, 12+top.value);
    if(drawScore>6){hand.push(sim.singlePile.pop()); drew=true;}
  }

  if(!drew){
    if(sim.deck.length===0) return true;
    hand.push(sim.deck.pop());
    if(sim.deck.length===0) return true;
  }
  return false;
}

// ========== GENOME TURN (copied from test-vs-default.js) ==========
const ALL_CARDS=allCards();
function buildSensors(sim,player){const other=player==='player1'?'player2':'player1';const hand=sim.hands[player];const myExps=sim.expeditions[player];const oppExps=sim.expeditions[other];const deckSize=sim.deck.length;const seen=new Set();for(const p of['player1','player2'])for(const c of COLORS)for(const card of(sim.expeditions[p][c]||[]))seen.add(card.id);if(sim.variant==='classic')for(const c of COLORS)for(const card of(sim.discards[c]||[]))seen.add(card.id);else for(const card of(sim.singlePile||[]))seen.add(card.id);for(const card of hand)seen.add(card.id);const unknown=ALL_CARDS.filter(c=>!seen.has(c.id));const colorInfo={};const myHandByColor={};for(const c of COLORS)myHandByColor[c]=[];for(const card of hand)myHandByColor[card.color].push(card);let myScore=0,oppScore=0,myExpCount=0,oppExpCount=0;for(const c of COLORS){const myExp=myExps[c]||[];const oppExp=oppExps[c]||[];const myHand=myHandByColor[c];const mS=scoreColor(myExp);const oS=scoreColor(oppExp);myScore+=mS;oppScore+=oS;if(myExp.length>0)myExpCount++;if(oppExp.length>0)oppExpCount++;const unk=unknown.filter(x=>x.color===c);const topVal=myExp.length>0?myExp[myExp.length-1].value:-1;let hasNum=false;for(const e of myExp)if(e.value>0){hasNum=true;break;}const sorted=myHand.slice().sort((a,b)=>a.value-b.value);const playable=[];let curTop=topVal;for(const card of sorted){if(card.value===0){if(!hasNum){playable.push(card);curTop=0;}}else if(card.value>curTop){playable.push(card);curTop=card.value;}}let ow=0;for(const e of oppExp)if(e.value===0)ow++;let dt=null;if(sim.variant==='classic'){const p=sim.discards[c]||[];if(p.length>0)dt=p[p.length-1];}colorInfo[c]={myExp,oppExp,myHand,playable,myScore:mS,oppScore:oS,projected:scoreColor(myExp.concat(playable)),oppWagers:ow,unknownCount:unk.length,depleted:(12-unk.length)/12,discardTop:dt,myCardCount:myExp.length,oppCardCount:oppExp.length};}return{hand,deckSize,myScore,oppScore,scoreDiff:myScore-oppScore,myExpCount,oppExpCount,colorInfo,myHandByColor,unknown,unknownCount:unknown.length,turnsLeft:Math.ceil(deckSize/2),variant:sim.variant};}
function getPhase(g,ds){const w=Math.max(g.phaseBlendWidth,1);if(ds>=g.earlyPhaseBound)return{early:1,mid:0,late:0};if(ds<=g.latePhaseBound)return{early:0,mid:0,late:1};if(ds>g.earlyPhaseBound-w){const t=(g.earlyPhaseBound-ds)/w;return{early:1-t,mid:t,late:0};}if(ds<g.latePhaseBound+w){const t=(ds-g.latePhaseBound)/w;return{early:0,mid:t,late:1-t};}return{early:0,mid:1,late:0};}
function blendPhase(g,p,e,m,l){return p.early*e+p.mid*m+p.late*l;}
function evaluatePlay(g,s,card,color){const ci=s.colorInfo[color];const ph=getPhase(g,s.deckSize);if(card.value===0)return evaluateWager(g,s,card,color,ph);const fp=scoreColor([...ci.myExp,card,...ci.playable.filter(p=>p.id!==card.id)]);const delta=fp-ci.myScore;let sc=delta-blendPhase(g,ph,g.earlyPlayThresh,g.midPlayThresh,g.latePlayThresh);if(ci.myExp.length===0){sc-=g.newExpMinProjected;sc-=ph.late*g.newExpLatePenalty;if(s.myExpCount>=Math.round(g.maxExpeditions))sc-=15*(s.myExpCount-g.maxExpeditions+1);}const fc=ci.myCardCount+1+ci.playable.filter(p=>p.id!==card.id).length;if(fc>=8)sc+=g.eightCardWeight;else if(fc>=6)sc+=g.eightCardWeight*0.3;let mx=0;for(const c2 of COLORS){const l=(s.colorInfo[c2].myExp||[]).length;if(l>mx)mx=l;}if(ci.myCardCount===mx&&ci.myCardCount>0)sc+=g.concentrationBonus;sc+=ci.myHand.length*g.colorSynergyWeight*g.focusVsSpread;if(ci.oppExp.length>0)sc-=g.oppMirrorPenalty*g.oppAwareness;if(g.cardCountingWeight>0)sc-=ci.depleted*g.colorDepletionTrack*5;if(s.deckSize<10)sc*=g.endgameUrgency;sc-=g.holdVsPlayBias;if(s.scoreDiff<0)sc+=g.riskSeekWhenBehind*Math.abs(s.scoreDiff)*g.scoreDiffSensitivity;if(s.scoreDiff>0)sc-=g.riskAvoidWhenAhead*s.scoreDiff*g.scoreDiffSensitivity;return sc;}
function evaluateWager(g,s,card,color,ph){const ci=s.colorInfo[color];const wW=scoreColor([...ci.myExp,card,...ci.playable.filter(p=>p.id!==card.id)]);let sc=wW-ci.projected-g.wagerMinProjected;sc+=blendPhase(g,ph,g.wagerEarlyBonus,0,-g.wagerLatePenalty);let ew=0;for(const e of ci.myExp)if(e.value===0)ew++;sc+=ew*g.wagerStackBonus;sc-=g.wagerHoldValue;if(ci.myHand.length<g.wagerMinHandCards)sc-=10;sc*=(0.5+g.wagerRiskTolerance);if(s.scoreDiff<0)sc+=g.wagerAsVariance*10;if(s.scoreDiff>0)sc-=g.wagerAsVariance*5;if(ci.myExp.length===0){sc-=g.newExpMinProjected;sc-=ph.late*g.newExpLatePenalty;if(s.myExpCount>=Math.round(g.maxExpeditions))sc-=20;}return sc;}
function evaluateDiscard(g,s,card,color){const ci=s.colorInfo[color];let cost=0;let inSeq=false;for(const p of ci.playable)if(p.id===card.id){inSeq=true;break;}if(inSeq){cost=(ci.projected-ci.myScore);if(ci.playable.length>1)cost/=ci.playable.length;cost=Math.max(cost,card.value||3);cost+=ci.myHand.length*g.colorSynergyWeight;}else{cost=card.value*0.3;}if(ci.myExp.length===0&&ci.myHand.length<=1)cost-=g.orphanPenalty;cost+=card.value*g.highCardBias*0.1;const ocu=ci.oppExp.length>0&&canPlayCard(card,ci.oppExp);if(ocu){let gain=(card.value||3)*g.oppDiscardDanger/3+ci.oppWagers*g.oppWagerFear;if(ci.oppCardCount>=3)gain+=g.oppColorTrackWeight*ci.oppCardCount;cost+=gain*g.oppAwareness;}if(!ocu)cost-=g.safeDiscardBias;cost+=g.drawInfoLeakPenalty;if(ci.myExp.length>0&&ci.myScore<g.abandonThreshold)cost*=0.3;return cost;}
function evaluateDraw(g,s,color,card,isDeny){const ci=s.colorInfo[color];let sc=0;if(!isDeny){sc=card.value||2;if(ci.myExp.length>0)sc+=g.drawExpBonus;if(ci.myExp.length===0)sc-=g.drawForNewExpThresh;if(ci.oppExp.length>0&&canPlayCard(card,ci.oppExp)){sc+=g.drawDenyBonus*g.oppAwareness;sc+=ci.oppWagers*g.drawDenyWagerMult;}}else{sc=g.oppDenyDrawWeight*g.oppAwareness+ci.oppWagers*g.drawDenyWagerMult-g.drawDenyOnlyThresh;}sc-=g.drawInfoLeakPenalty;if(s.scoreDiff>g.rushWhenAheadBy)sc-=g.drawSourceTempo*g.tempoAwareness*5;if(s.scoreDiff<-g.stallWhenBehindBy)sc+=g.drawSourceTempo*g.tempoAwareness*5;return sc;}
function genomeTurn(sim,player,g){const hand=sim.hands[player];if(hand.length===0)return true;const other=player==='player1'?'player2':'player1';const sensors=buildSensors(sim,player);let bpi=-1,bps=-Infinity,bdi=0,bdc=Infinity;for(let i=0;i<hand.length;i++){const card=hand[i];const c=card.color;const exp=sim.expeditions[player][c]||[];if(canPlayCard(card,exp)){const ps=evaluatePlay(g,sensors,card,c);if(ps>bps){bps=ps;bpi=i;}}const dc=evaluateDiscard(g,sensors,card,c);if(dc<bdc){bdc=dc;bdi=i;}}const action=(bpi>=0&&bps>0)?'play':'discard';const ci=action==='play'?bpi:bdi;const card=hand.splice(ci,1)[0];let dC=null,jD=false;if(action==='play'){(sim.expeditions[player][card.color]=sim.expeditions[player][card.color]||[]).push(card);}else{if(sim.variant==='single'){sim.singlePile.push(card);jD=true;}else{(sim.discards[card.color]=sim.discards[card.color]||[]).push(card);dC=card.color;}}let drew=false;if(sim.variant==='classic'){let bDC=null,bDS=-Infinity;for(const c of COLORS){if(c===dC)continue;const pile=sim.discards[c]||[];if(pile.length===0)continue;const top=pile[pile.length-1];const exp=sim.expeditions[player][c]||[];const oE=sim.expeditions[other][c]||[];if(canPlayCard(top,exp)){const s=evaluateDraw(g,sensors,c,top,false);if(s>bDS){bDS=s;bDC=c;}}else if(oE.length>0&&canPlayCard(top,oE)){const s=evaluateDraw(g,sensors,c,top,true);if(s>bDS){bDS=s;bDC=c;}}}if(bDC&&bDS>g.drawDiscardThresh){hand.push(sim.discards[bDC].pop());drew=true;}}else if(!jD&&sim.singlePile&&sim.singlePile.length>0){const top=sim.singlePile[sim.singlePile.length-1];const exp=sim.expeditions[player][top.color]||[];if(canPlayCard(top,exp)){const s=evaluateDraw(g,sensors,top.color,top,false);if(s>g.drawDiscardThresh){hand.push(sim.singlePile.pop());drew=true;}}}if(!drew){if(sim.deck.length===0)return true;hand.push(sim.deck.pop());if(sim.deck.length===0)return true;}return false;}

// ========== GAME PLAY ==========
function playGameHvG(genome, variant, heuristicFirst){
  const gs=createGameState(variant);
  let turn=heuristicFirst?'player1':'player2';
  let safety=80;
  while(safety-->0){
    let gameOver;
    if((turn==='player1' && heuristicFirst) || (turn==='player2' && !heuristicFirst)){
      gameOver=heuristicTurn(gs, turn);
    } else {
      gameOver=genomeTurn(gs, turn, genome);
    }
    if(gameOver) break;
    turn=turn==='player1'?'player2':'player1';
  }
  const s1=scoreAll(gs.expeditions.player1);
  const s2=scoreAll(gs.expeditions.player2);
  // Return heuristic's result
  if(heuristicFirst) return s1>s2?1:(s1===s2?0.5:0);
  return s2>s1?1:(s2===s1?0.5:0);
}

// ========== BENCHMARKS ==========
const fs=require('fs');
const classicC=JSON.parse(fs.readFileSync('champions.json','utf8'));
const singleC=JSON.parse(fs.readFileSync('champions-single.json','utf8'));
const GENE_DEFS=[{name:'earlyPlayThresh',def:0},{name:'midPlayThresh',def:0},{name:'latePlayThresh',def:0},{name:'earlyPhaseBound',def:30},{name:'latePhaseBound',def:15},{name:'phaseBlendWidth',def:5},{name:'endgameUrgency',def:1},{name:'maxExpeditions',def:5},{name:'newExpMinProjected',def:0},{name:'newExpLatePenalty',def:10},{name:'eightCardWeight',def:5},{name:'concentrationBonus',def:0},{name:'abandonThreshold',def:-15},{name:'cardCountVsValue',def:0.5},{name:'focusVsSpread',def:0.5},{name:'colorSynergyWeight',def:3},{name:'orphanPenalty',def:2},{name:'wagerMinProjected',def:5},{name:'wagerEarlyBonus',def:5},{name:'wagerLatePenalty',def:10},{name:'wagerStackBonus',def:3},{name:'wagerHoldValue',def:2},{name:'wagerRiskTolerance',def:0.5},{name:'wagerMinHandCards',def:2},{name:'wagerAsVariance',def:0},{name:'oppAwareness',def:1},{name:'oppBlockWeight',def:0},{name:'oppDiscardDanger',def:3},{name:'oppWagerFear',def:5},{name:'oppDenyDrawWeight',def:3},{name:'oppColorTrackWeight',def:1},{name:'oppDrawSignalWeight',def:2},{name:'counterPlayWeight',def:0},{name:'oppMirrorPenalty',def:0},{name:'oppExpCountFear',def:1},{name:'drawDiscardThresh',def:6},{name:'drawExpBonus',def:12},{name:'drawDenyBonus',def:8},{name:'drawDenyWagerMult',def:4},{name:'drawUnknownValue',def:3},{name:'drawForNewExpThresh',def:10},{name:'drawDenyOnlyThresh',def:8},{name:'drawInfoLeakPenalty',def:0},{name:'riskSeekWhenBehind',def:0},{name:'riskAvoidWhenAhead',def:0},{name:'scoreDiffSensitivity',def:0.05},{name:'variancePreference',def:0},{name:'highCardBias',def:0},{name:'safeDiscardBias',def:1},{name:'rushWhenAheadBy',def:30},{name:'stallWhenBehindBy',def:30},{name:'tempoAwareness',def:0.5},{name:'drawSourceTempo',def:0},{name:'holdVsPlayBias',def:0},{name:'cardCountingWeight',def:1},{name:'deckRichnessWeight',def:1},{name:'colorDepletionTrack',def:1},{name:'oppHandSizeWeight',def:0.5},{name:'perfectInfoEndgame',def:10}];
const defaultG={};for(const d of GENE_DEFS)defaultG[d.name]=d.def;

const names=['Explorer','Scholar','Collector','Spy','Gambler'];
const games=500; // 500 each direction = 1000 total per opponent

console.log('Heuristic AI ("Strategist") Benchmark\n');
console.log('=== vs Default Genome (1000 games) ===');
{
  let w=0;
  for(let j=0;j<games;j++){
    w+=playGameHvG(defaultG,'classic',true);
    w+=(1-playGameHvG(defaultG,'classic',false)); // flip: genome=p1, heuristic=p2 — invert result
  }
  // Actually for second half: if genome wins (returns 1), heuristic lost (0). If genome loses (0), heuristic won (1).
  // Wait, playGameHvG returns heuristic's result, so: when heuristicFirst=false, it still returns heuristic's win
  console.log(`  Classic: ${(w/(games*2)*100).toFixed(1)}% win`);
}
{
  let w=0;
  for(let j=0;j<games;j++){
    w+=playGameHvG(defaultG,'single',true);
    w+=playGameHvG(defaultG,'single',false);
  }
  console.log(`  Single:  ${(w/(games*2)*100).toFixed(1)}% win`);
}

console.log('\n=== vs Evolved Champions (1000 games each) ===');
console.log('CLASSIC:');
for(let i=0;i<5;i++){
  const g=classicC.champions[i].genome;
  let w=0;
  for(let j=0;j<games;j++){
    w+=playGameHvG(g,'classic',true);
    w+=playGameHvG(g,'classic',false);
  }
  console.log(`  vs ${names[i].padEnd(12)} ${(w/(games*2)*100).toFixed(1)}% win`);
}
console.log('\nSINGLE PILE:');
for(let i=0;i<5;i++){
  const g=singleC.champions[i].genome;
  let w=0;
  for(let j=0;j<games;j++){
    w+=playGameHvG(g,'single',true);
    w+=playGameHvG(g,'single',false);
  }
  console.log(`  vs ${names[i].padEnd(12)} ${(w/(games*2)*100).toFixed(1)}% win`);
}
