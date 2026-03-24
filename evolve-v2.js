#!/usr/bin/env node
/**
 * Lost Cities AI — Evolutionary Tuner v2
 * Rich behavioral genome with ~55 genes across 8 strategic dimensions.
 * Parallel tournament with diversity preservation.
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

const COLORS = ['red','green','blue','white','yellow'];

// ==================== GENOME DEFINITION ====================
const GENE_DEFS = [
  // === 1. GAME PHASE AWARENESS (7 genes) ===
  {name:'earlyPlayThresh',    def:0,   min:-30, max:30,  cat:'phase'},
  {name:'midPlayThresh',      def:0,   min:-30, max:30,  cat:'phase'},
  {name:'latePlayThresh',     def:0,   min:-30, max:30,  cat:'phase'},
  {name:'earlyPhaseBound',    def:30,  min:15,  max:38,  cat:'phase'}, // deck size boundary early/mid
  {name:'latePhaseBound',     def:15,  min:5,   max:25,  cat:'phase'}, // deck size boundary mid/late
  {name:'phaseBlendWidth',    def:5,   min:1,   max:15,  cat:'phase'}, // smooth transition zone
  {name:'endgameUrgency',     def:1,   min:0,   max:3,   cat:'phase'}, // multiplier on all weights in last cards

  // === 2. PORTFOLIO / EXPEDITION MANAGEMENT (10 genes) ===
  {name:'maxExpeditions',     def:5,   min:1.5, max:5,   cat:'portfolio'},
  {name:'newExpMinProjected', def:0,   min:-20, max:25,  cat:'portfolio'}, // projected score to start new
  {name:'newExpLatePenalty',  def:10,  min:0,   max:30,  cat:'portfolio'}, // extra cost late game
  {name:'eightCardWeight',   def:5,   min:0,   max:20,  cat:'portfolio'}, // value of reaching 8+ cards
  {name:'concentrationBonus', def:0,  min:0,   max:15,  cat:'portfolio'}, // bonus for adding to longest
  {name:'abandonThreshold',  def:-15, min:-40, max:0,   cat:'portfolio'}, // projected score to abandon
  {name:'cardCountVsValue',  def:0.5, min:0,   max:1,   cat:'portfolio'}, // 0=value only, 1=count matters
  {name:'focusVsSpread',     def:0.5, min:0,   max:1,   cat:'portfolio'}, // 0=deep few, 1=wide many
  {name:'colorSynergyWeight',def:3,   min:0,   max:10,  cat:'portfolio'}, // bonus per card in same color in hand
  {name:'orphanPenalty',     def:2,   min:0,   max:10,  cat:'portfolio'}, // cost of lone card in uncommitted color

  // === 3. WAGER STRATEGY (8 genes) ===
  {name:'wagerMinProjected', def:5,   min:-10, max:30,  cat:'wager'},
  {name:'wagerEarlyBonus',   def:5,   min:0,   max:15,  cat:'wager'},
  {name:'wagerLatePenalty',  def:10,  min:0,   max:30,  cat:'wager'},
  {name:'wagerStackBonus',   def:3,   min:0,   max:15,  cat:'wager'}, // bonus for 2nd/3rd wager
  {name:'wagerHoldValue',    def:2,   min:0,   max:10,  cat:'wager'}, // optionality of keeping wager
  {name:'wagerRiskTolerance',def:0.5, min:0,   max:1,   cat:'wager'},
  {name:'wagerMinHandCards', def:2,   min:0,   max:5,   cat:'wager'}, // min cards in color to wager
  {name:'wagerAsVariance',   def:0,   min:-1,  max:1,   cat:'wager'}, // +1=seek variance, -1=avoid

  // === 4. OPPONENT MODELING (10 genes) ===
  {name:'oppAwareness',      def:1,   min:0,   max:3,   cat:'opponent'},
  {name:'oppBlockWeight',    def:0,   min:0,   max:10,  cat:'opponent'}, // sacrifice own points to block
  {name:'oppDiscardDanger',  def:3,   min:0,   max:15,  cat:'opponent'}, // fear of feeding opponent
  {name:'oppWagerFear',      def:5,   min:0,   max:15,  cat:'opponent'}, // extra weight when opp has wagers
  {name:'oppDenyDrawWeight', def:3,   min:0,   max:12,  cat:'opponent'}, // draw just to deny
  {name:'oppColorTrackWeight',def:1,  min:0,   max:5,   cat:'opponent'}, // use opp's plays to infer strategy
  {name:'oppDrawSignalWeight',def:2,  min:0,   max:8,   cat:'opponent'}, // opp drawing from discard = signal
  {name:'counterPlayWeight', def:0,   min:-5,  max:5,   cat:'opponent'}, // +compete, -abandon opp's colors
  {name:'oppMirrorPenalty',  def:0,   min:0,   max:10,  cat:'opponent'}, // penalty for same colors as opp
  {name:'oppExpCountFear',   def:1,   min:0,   max:5,   cat:'opponent'}, // fear of opp having many expeditions

  // === 5. DRAW STRATEGY (8 genes) ===
  {name:'drawDiscardThresh', def:6,   min:0,   max:20,  cat:'draw'},
  {name:'drawExpBonus',      def:12,  min:0,   max:25,  cat:'draw'},
  {name:'drawDenyBonus',     def:8,   min:0,   max:20,  cat:'draw'},
  {name:'drawDenyWagerMult', def:4,   min:0,   max:12,  cat:'draw'},
  {name:'drawUnknownValue',  def:3,   min:0,   max:10,  cat:'draw'}, // value of deck draw (mystery)
  {name:'drawForNewExpThresh',def:10, min:0,   max:25,  cat:'draw'}, // threshold to draw for new expedition
  {name:'drawDenyOnlyThresh',def:8,   min:2,   max:25,  cat:'draw'},
  {name:'drawInfoLeakPenalty',def:0,  min:0,   max:5,   cat:'draw'}, // drawing from discard reveals intent

  // === 6. RISK / VARIANCE (6 genes) ===
  {name:'riskSeekWhenBehind', def:0,  min:0,   max:2,   cat:'risk'},
  {name:'riskAvoidWhenAhead', def:0,  min:0,   max:2,   cat:'risk'},
  {name:'scoreDiffSensitivity',def:0.05,min:0, max:0.2, cat:'risk'}, // how much score gap shifts behavior
  {name:'variancePreference', def:0,  min:-1,  max:1,   cat:'risk'}, // base variance preference
  {name:'highCardBias',      def:0,   min:-5,  max:5,   cat:'risk'}, // prefer high cards (+) or low cards (-)
  {name:'safeDiscardBias',   def:1,   min:0,   max:5,   cat:'risk'}, // prefer discarding cards opp can't use

  // === 7. TEMPO CONTROL (5 genes) ===
  {name:'rushWhenAheadBy',   def:30,  min:5,   max:60,  cat:'tempo'}, // score lead to start rushing
  {name:'stallWhenBehindBy', def:30,  min:5,   max:60,  cat:'tempo'},
  {name:'tempoAwareness',    def:0.5, min:0,   max:2,   cat:'tempo'},
  {name:'drawSourceTempo',   def:0,   min:-1,  max:1,   cat:'tempo'}, // +1=deck(rush), -1=discard(stall)
  {name:'holdVsPlayBias',    def:0,   min:-3,  max:3,   cat:'tempo'}, // +hold, -play

  // === 8. INFORMATION / CARD COUNTING (5 genes) ===
  {name:'cardCountingWeight',def:1,   min:0,   max:3,   cat:'info'},
  {name:'deckRichnessWeight',def:1,   min:0,   max:5,   cat:'info'}, // value remaining high cards in deck
  {name:'colorDepletionTrack',def:1,  min:0,   max:3,   cat:'info'}, // know when a color is mostly gone
  {name:'oppHandSizeWeight', def:0.5, min:0,   max:3,   cat:'info'}, // factor opp hand size
  {name:'perfectInfoEndgame',def:10,  min:3,   max:20,  cat:'info'}, // deck size to switch to exact calc
];

const NUM_GENES = GENE_DEFS.length;

// ==================== GAME ENGINE ====================

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
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function canPlayCard(card, exp){
  if(!exp||exp.length===0) return true;
  const top=exp[exp.length-1];
  if(card.value===0) return top.value===0;
  return card.value > top.value;
}

function scoreColor(cards){
  if(!cards||cards.length===0) return 0;
  let wagers=0, sum=0;
  for(const c of cards){ if(c.value===0) wagers++; else sum+=c.value; }
  return (sum-20)*(1+wagers)+(cards.length>=8?20:0);
}

function scoreAll(exps){
  let t=0;
  for(const c of COLORS) t+=scoreColor(exps[c]||[]);
  return t;
}

// ==================== RICH SENSORY SYSTEM ====================

function buildSensors(sim, player){
  const other=player==='player1'?'player2':'player1';
  const hand=sim.hands[player];
  const myExps=sim.expeditions[player];
  const oppExps=sim.expeditions[other];
  const deckSize=sim.deck.length;

  // Cards seen (in all expeditions + discards)
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

  // Unknown pool
  const unknown=ALL_CARDS.filter(c=>!seen.has(c.id));

  // Per-color analysis
  const colorInfo={};
  const myHandByColor={};
  for(const c of COLORS) myHandByColor[c]=[];
  for(const card of hand) myHandByColor[card.color].push(card);

  let myScore=0, oppScore=0, myExpCount=0, oppExpCount=0;

  for(const c of COLORS){
    const myExp=myExps[c]||[];
    const oppExp=oppExps[c]||[];
    const myHand=myHandByColor[c];
    const mScore=scoreColor(myExp);
    const oScore=scoreColor(oppExp);
    myScore+=mScore; oppScore+=oScore;
    if(myExp.length>0) myExpCount++;
    if(oppExp.length>0) oppExpCount++;

    // Cards remaining in this color (unknown)
    const unknownInColor=unknown.filter(x=>x.color===c);
    const totalInColor=12; // 3 wagers + 9 numbers per color
    const seenInColor=totalInColor-unknownInColor.length;

    // Playable sequence
    const topVal=myExp.length>0?myExp[myExp.length-1].value:-1;
    let hasNumbers=false;
    for(const e of myExp) if(e.value>0){hasNumbers=true;break;}
    const sorted=myHand.slice().sort((a,b)=>a.value-b.value);
    const playable=[];
    let curTop=topVal;
    for(const card of sorted){
      if(card.value===0){ if(!hasNumbers){playable.push(card);curTop=0;} }
      else if(card.value>curTop){ playable.push(card); curTop=card.value; }
    }

    // Opponent wagers in this color
    let oppWagers=0;
    for(const e of oppExp) if(e.value===0) oppWagers++;

    // Projected score
    const projected=scoreColor(myExp.concat(playable));

    // Discard pile top (classic)
    let discardTop=null;
    if(sim.variant==='classic'){
      const pile=sim.discards[c]||[];
      if(pile.length>0) discardTop=pile[pile.length-1];
    }

    colorInfo[c]={
      myExp, oppExp, myHand, playable,
      myScore:mScore, oppScore:oScore,
      projected, oppWagers,
      unknownCount:unknownInColor.length,
      depleted:seenInColor/totalInColor, // 0-1, how depleted this color is
      discardTop,
      myCardCount:myExp.length,
      oppCardCount:oppExp.length,
    };
  }

  // Opponent behavior tracking (from simulation history if available)
  const oppPlayed=sim.oppPlayed||{};
  const oppDiscarded=sim.oppDiscarded||{};
  const oppDrew=sim.oppDrew||{};

  return {
    hand, deckSize, myScore, oppScore,
    scoreDiff:myScore-oppScore,
    myExpCount, oppExpCount,
    colorInfo, myHandByColor,
    unknown, unknownCount:unknown.length,
    oppPlayed, oppDiscarded, oppDrew,
    turnsLeft:Math.ceil(deckSize/2),
    variant:sim.variant,
  };
}

// ==================== GENOME-DRIVEN DECISION ENGINE ====================

function getPhase(g, deckSize){
  // Smooth phase blending
  const w=Math.max(g.phaseBlendWidth, 1);
  if(deckSize>=g.earlyPhaseBound) return {early:1, mid:0, late:0};
  if(deckSize<=g.latePhaseBound) return {early:0, mid:0, late:1};
  if(deckSize>g.earlyPhaseBound-w){
    const t=(g.earlyPhaseBound-deckSize)/w;
    return {early:1-t, mid:t, late:0};
  }
  if(deckSize<g.latePhaseBound+w){
    const t=(deckSize-g.latePhaseBound)/w;
    return {early:0, mid:t, late:1-t};
  }
  return {early:0, mid:1, late:0};
}

function blendPhase(g, phase, early, mid, late){
  return phase.early*early + phase.mid*mid + phase.late*late;
}

function evaluatePlay(g, sensors, card, color){
  const ci=sensors.colorInfo[color];
  const phase=getPhase(g, sensors.deckSize);
  let score=0;

  // Base: projected score improvement
  const curScore=ci.myScore;
  const withCard=scoreColor([...ci.myExp, card]);
  // Estimate with future playable cards too
  const futurePlayable=ci.playable.filter(p=>p.id!==card.id);
  const fullProjected=scoreColor([...ci.myExp, card, ...futurePlayable]);
  const delta=fullProjected-curScore;

  // Phase-adjusted threshold
  const threshold=blendPhase(g, phase, g.earlyPlayThresh, g.midPlayThresh, g.latePlayThresh);
  score=delta-threshold;

  // Is this a wager?
  if(card.value===0){
    const wagerScore=evaluateWager(g, sensors, card, color, phase);
    return wagerScore;
  }

  // New expedition penalty
  if(ci.myExp.length===0){
    score-=g.newExpMinProjected;
    const latePen=phase.late*g.newExpLatePenalty;
    score-=latePen;
    // Max expeditions soft cap
    if(sensors.myExpCount>=Math.round(g.maxExpeditions)){
      score-=15*(sensors.myExpCount-g.maxExpeditions+1);
    }
  }

  // 8-card bonus chase
  const futureCount=ci.myCardCount+1+futurePlayable.length;
  if(futureCount>=8) score+=g.eightCardWeight;
  else if(futureCount>=6) score+=g.eightCardWeight*0.3; // getting close

  // Concentration bonus (adding to longest expedition)
  let maxExpLen=0;
  for(const c2 of COLORS){
    const len=(sensors.colorInfo[c2].myExp||[]).length;
    if(len>maxExpLen) maxExpLen=len;
  }
  if(ci.myCardCount===maxExpLen && ci.myCardCount>0) score+=g.concentrationBonus;

  // Focus vs spread
  score+=ci.myHand.length*g.colorSynergyWeight*g.focusVsSpread;

  // Opponent mirror penalty
  if(ci.oppExp.length>0) score-=g.oppMirrorPenalty*g.oppAwareness;

  // Card counting: is this color depleted?
  if(g.cardCountingWeight>0){
    score-=ci.depleted*g.colorDepletionTrack*5; // less value if color is mostly gone
  }

  // Endgame urgency
  if(sensors.deckSize<10) score*=g.endgameUrgency;

  // Hold vs play bias
  score-=g.holdVsPlayBias;

  // Risk adjustment based on score differential
  if(sensors.scoreDiff<0) score+=g.riskSeekWhenBehind*Math.abs(sensors.scoreDiff)*g.scoreDiffSensitivity;
  if(sensors.scoreDiff>0) score-=g.riskAvoidWhenAhead*sensors.scoreDiff*g.scoreDiffSensitivity;

  return score;
}

function evaluateWager(g, sensors, card, color, phase){
  const ci=sensors.colorInfo[color];
  let score=0;

  // Base: projected value with wager
  const withWager=scoreColor([...ci.myExp, card, ...ci.playable.filter(p=>p.id!==card.id)]);
  const without=ci.projected;
  score=withWager-without;

  // Wager-specific genes
  score-=g.wagerMinProjected;
  score+=blendPhase(g, phase, g.wagerEarlyBonus, 0, -g.wagerLatePenalty);

  // Stacking bonus
  let existingWagers=0;
  for(const e of ci.myExp) if(e.value===0) existingWagers++;
  score+=existingWagers*g.wagerStackBonus;

  // Hold value (keeping wager in hand has optionality)
  score-=g.wagerHoldValue;

  // Min hand cards requirement
  if(ci.myHand.length<g.wagerMinHandCards) score-=10;

  // Risk tolerance
  score*=(0.5+g.wagerRiskTolerance);

  // Variance seeking
  if(sensors.scoreDiff<0) score+=g.wagerAsVariance*10;
  if(sensors.scoreDiff>0) score-=g.wagerAsVariance*5;

  // New expedition with wager — extra risky
  if(ci.myExp.length===0){
    score-=g.newExpMinProjected;
    score-=phase.late*g.newExpLatePenalty;
    if(sensors.myExpCount>=Math.round(g.maxExpeditions)) score-=20;
  }

  return score;
}

function evaluateDiscard(g, sensors, card, color){
  const ci=sensors.colorInfo[color];
  const phase=getPhase(g, sensors.deckSize);
  let cost=0; // higher = worse to discard

  // Is this card in our playable sequence?
  let inSeq=false;
  for(const p of ci.playable) if(p.id===card.id){inSeq=true;break;}

  if(inSeq){
    // Cost is projected improvement we'd lose
    const without=ci.myScore;
    const withAll=ci.projected;
    cost=(withAll-without);
    if(ci.playable.length>1) cost/=ci.playable.length;
    cost=Math.max(cost, card.value||3);

    // Synergy: more cards in this color = higher cost to discard any
    cost+=ci.myHand.length*g.colorSynergyWeight;
  } else {
    // Not in sequence — still might be useful later
    cost=card.value*0.3;
  }

  // Orphan discount — lone card in uncommitted color
  if(ci.myExp.length===0 && ci.myHand.length<=1){
    cost-=g.orphanPenalty;
  }

  // High card bias
  cost+=card.value*g.highCardBias*0.1;

  // Opponent danger: can they use this card?
  const oppCost=evaluateOppGain(g, sensors, card, color)*g.oppAwareness;
  cost+=oppCost;

  // Safe discard bias — prefer discarding cards opponent can't use
  const oppCanUse=ci.oppExp.length>0 && canPlayCard(card, ci.oppExp);
  if(!oppCanUse) cost-=g.safeDiscardBias;

  // Information leak — discarding reveals what you DON'T care about
  cost+=g.drawInfoLeakPenalty;

  // Abandon threshold — if this color is hopeless, cheap to discard
  if(ci.myExp.length>0 && ci.myScore<g.abandonThreshold){
    cost*=0.3;
  }

  return cost;
}

function evaluateOppGain(g, sensors, card, color){
  const ci=sensors.colorInfo[color];
  let gain=0;

  if(ci.oppExp.length>0 && canPlayCard(card, ci.oppExp)){
    gain=(card.value||3)*g.oppDiscardDanger/3;
    gain+=ci.oppWagers*g.oppWagerFear;
  }

  // Opponent color tracking — if they've been playing this color heavily
  if(ci.oppCardCount>=3) gain+=g.oppColorTrackWeight*ci.oppCardCount;

  return gain;
}

function evaluateDraw(g, sensors, color, card, isDeny){
  const ci=sensors.colorInfo[color];
  const phase=getPhase(g, sensors.deckSize);
  let score=0;

  if(!isDeny){
    // We can play this card
    score=card.value||2;
    if(ci.myExp.length>0) score+=g.drawExpBonus;
    if(ci.myExp.length===0) score-=g.drawForNewExpThresh; // starting new from draw

    // Deny bonus (we take it AND opponent loses it)
    if(ci.oppExp.length>0 && canPlayCard(card, ci.oppExp)){
      score+=g.drawDenyBonus*g.oppAwareness;
      score+=ci.oppWagers*g.drawDenyWagerMult;
    }
  } else {
    // Pure deny — we can't play it but opponent can
    score=g.oppDenyDrawWeight*g.oppAwareness;
    score+=ci.oppWagers*g.drawDenyWagerMult;
    score-=g.drawDenyOnlyThresh;
  }

  // Information leak — drawing from discard reveals our interest
  score-=g.drawInfoLeakPenalty;

  // Tempo: drawing from discard extends game
  if(sensors.scoreDiff>g.rushWhenAheadBy){
    score-=g.drawSourceTempo*g.tempoAwareness*5; // prefer deck to rush
  }
  if(sensors.scoreDiff<-g.stallWhenBehindBy){
    score+=g.drawSourceTempo*g.tempoAwareness*5; // prefer discard to stall
  }

  return score;
}

// ==================== PARAMETERIZED TURN ====================

function genomeTurn(sim, player, g){
  const hand=sim.hands[player];
  if(hand.length===0) return true;
  const other=player==='player1'?'player2':'player1';

  const sensors=buildSensors(sim, player);

  // === PHASE 1: Play or Discard ===
  let bestPlayIdx=-1, bestPlayScore=-Infinity;
  let bestDiscIdx=0, bestDiscCost=Infinity;

  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const c=card.color;
    const exp=sim.expeditions[player][c]||[];

    // Evaluate play
    if(canPlayCard(card, exp)){
      const ps=evaluatePlay(g, sensors, card, c);
      if(ps>bestPlayScore){bestPlayScore=ps; bestPlayIdx=i;}
    }

    // Evaluate discard
    const dc=evaluateDiscard(g, sensors, card, c);
    if(dc<bestDiscCost){bestDiscCost=dc; bestDiscIdx=i;}
  }

  // Decision: play or discard?
  const action=(bestPlayIdx>=0 && bestPlayScore>0)?'play':'discard';
  const chosenIdx=action==='play'?bestPlayIdx:bestDiscIdx;
  const card=hand.splice(chosenIdx,1)[0];
  let discardedColor=null, justDiscarded=false;

  if(action==='play'){
    (sim.expeditions[player][card.color]=sim.expeditions[player][card.color]||[]).push(card);
    // Track for opponent modeling
    if(!sim.oppPlayed) sim.oppPlayed={};
    if(!sim.oppPlayed[player]) sim.oppPlayed[player]=[];
    sim.oppPlayed[player].push(card);
  } else {
    if(sim.variant==='single'){
      sim.singlePile.push(card); justDiscarded=true;
    } else {
      (sim.discards[card.color]=sim.discards[card.color]||[]).push(card);
      discardedColor=card.color;
    }
    if(!sim.oppDiscarded) sim.oppDiscarded={};
    if(!sim.oppDiscarded[player]) sim.oppDiscarded[player]=[];
    sim.oppDiscarded[player].push(card);
  }

  // === PHASE 2: Draw ===
  let drew=false;

  if(sim.variant==='classic'){
    let bestDC=null, bestDS=-Infinity;
    for(const c of COLORS){
      if(c===discardedColor) continue;
      const pile=sim.discards[c]||[];
      if(pile.length===0) continue;
      const top=pile[pile.length-1];
      const exp=sim.expeditions[player][c]||[];
      const oppExp=sim.expeditions[other][c]||[];

      const canUse=canPlayCard(top, exp);
      const oppCanUse=oppExp.length>0 && canPlayCard(top, oppExp);

      if(canUse){
        const s=evaluateDraw(g, sensors, c, top, false);
        if(s>bestDS){bestDS=s; bestDC=c;}
      } else if(oppCanUse){
        const s=evaluateDraw(g, sensors, c, top, true);
        if(s>bestDS){bestDS=s; bestDC=c;}
      }
    }
    if(bestDC && bestDS>g.drawDiscardThresh){
      const drawn=sim.discards[bestDC].pop();
      hand.push(drawn);
      drew=true;
      // Track
      if(!sim.oppDrew) sim.oppDrew={};
      if(!sim.oppDrew[player]) sim.oppDrew[player]=[];
      sim.oppDrew[player].push(drawn);
    }
  } else if(!justDiscarded && sim.singlePile && sim.singlePile.length>0){
    const top=sim.singlePile[sim.singlePile.length-1];
    const exp=sim.expeditions[player][top.color]||[];
    if(canPlayCard(top, exp)){
      const s=evaluateDraw(g, sensors, top.color, top, false);
      if(s>g.drawDiscardThresh){
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
  const h1=deck.splice(0,8), h2=deck.splice(0,8);
  const exps1={}, exps2={}, discs={};
  for(const c of COLORS){exps1[c]=[]; exps2[c]=[]; discs[c]=[];}
  return {
    hands:{player1:h1,player2:h2},
    expeditions:{player1:exps1,player2:exps2},
    discards:discs, singlePile:[], deck, variant,
    oppPlayed:{}, oppDiscarded:{}, oppDrew:{}
  };
}

function playGame(g1, g2, variant){
  const gs=createGameState(variant);
  let turn='player1', safety=80;
  while(safety-->0){
    if(genomeTurn(gs, turn, turn==='player1'?g1:g2)) break;
    turn=turn==='player1'?'player2':'player1';
  }
  const s1=scoreAll(gs.expeditions.player1), s2=scoreAll(gs.expeditions.player2);
  return s1>s2?1:(s1===s2?0.5:0);
}

// ==================== EVOLUTION ====================

function createDefault(){
  const g={};
  for(const d of GENE_DEFS) g[d.name]=d.def;
  return g;
}

function randomGenome(){
  const g={};
  for(const d of GENE_DEFS) g[d.name]=d.min+Math.random()*(d.max-d.min);
  return g;
}

function mutate(genome, rate, strength){
  const g={...genome};
  for(const d of GENE_DEFS){
    if(Math.random()<rate){
      const range=d.max-d.min;
      g[d.name]=Math.max(d.min, Math.min(d.max, g[d.name]+(Math.random()*2-1)*range*strength));
    }
  }
  return g;
}

function crossover(a, b){
  const child={};
  for(const d of GENE_DEFS){
    // Mix of blend and uniform crossover
    if(Math.random()<0.3){
      // Uniform: pick one parent's value
      child[d.name]=Math.random()<0.5?a[d.name]:b[d.name];
    } else {
      // Blend
      const t=Math.random();
      child[d.name]=a[d.name]*t+b[d.name]*(1-t);
    }
  }
  return child;
}

// Diversity: euclidean distance between two genomes (normalized)
function genomeDist(a, b){
  let sum=0;
  for(const d of GENE_DEFS){
    const range=d.max-d.min;
    if(range===0) continue;
    const diff=(a[d.name]-b[d.name])/range;
    sum+=diff*diff;
  }
  return Math.sqrt(sum/NUM_GENES);
}

// Population diversity metric
function popDiversity(pop){
  let total=0, count=0;
  const n=Math.min(pop.length, 20); // sample
  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      total+=genomeDist(pop[i], pop[j]);
      count++;
    }
  }
  return count>0?(total/count):0;
}

function formatGenome(g){
  const cats={};
  for(const d of GENE_DEFS){
    if(!cats[d.cat]) cats[d.cat]=[];
    cats[d.cat].push(`    ${d.name}: ${g[d.name].toFixed(3)}`);
  }
  let s='';
  for(const [cat, lines] of Object.entries(cats)){
    s+=`  // ${cat}\n${lines.join(',\n')},\n`;
  }
  return '{\n'+s+'}';
}

// ==================== WORKER CODE ====================

if(!isMainThread){
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

async function parallelTournament(population, games, variant, numWorkers){
  const n=population.length;
  const matchups=[];
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) matchups.push({i,j});

  const chunks=[];
  const chunkSize=Math.ceil(matchups.length/numWorkers);
  for(let i=0;i<matchups.length;i+=chunkSize) chunks.push(matchups.slice(i,i+chunkSize));

  const scores=new Array(n).fill(0);
  const promises=chunks.map(chunk=>new Promise((resolve,reject)=>{
    const w=new Worker(__filename, {workerData:{matchups:chunk,population,games,variant}});
    w.on('message', resolve);
    w.on('error', reject);
  }));

  const allResults=await Promise.all(promises);
  for(const results of allResults)
    for(const {i,j,w1,w2} of results){ scores[i]+=w1; scores[j]+=w2; }
  return scores;
}

async function main(){
  const args={generations:100, population:50, games:80, variant:'classic', elites:10, immigrants:5};
  for(let i=2;i<process.argv.length;i++){
    const a=process.argv[i];
    if(a==='--generations'||a==='-g') args.generations=parseInt(process.argv[++i]);
    else if(a==='--population'||a==='-p') args.population=parseInt(process.argv[++i]);
    else if(a==='--games') args.games=parseInt(process.argv[++i]);
    else if(a==='--variant'||a==='-v') args.variant=process.argv[++i];
    else if(a==='--elites'||a==='-e') args.elites=parseInt(process.argv[++i]);
    else if(a==='--immigrants') args.immigrants=parseInt(process.argv[++i]);
  }

  const numCPUs=os.cpus().length;
  const numWorkers=Math.max(1, numCPUs-1);

  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Lost Cities AI — Evolutionary Tuner v2          ║');
  console.log('║   Rich Behavioral Genome + Diversity Preservation ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║ Population: ${String(args.population).padEnd(5)} Generations: ${String(args.generations).padEnd(15)}║`);
  console.log(`║ Games/match: ${String(args.games).padEnd(4)} Elites: ${String(args.elites).padEnd(4)} Immigrants: ${String(args.immigrants).padEnd(4)}║`);
  console.log(`║ Workers: ${String(numWorkers).padEnd(6)} Genes: ${String(NUM_GENES).padEnd(22)}║`);
  console.log(`║ Variant: ${args.variant.padEnd(41)}║`);
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');

  const {generations, population:popSize, games, variant, elites, immigrants}=args;

  // Initialize: default + archetypes + randoms
  let pop=[createDefault()];

  // Seed some archetypes
  const aggressive=randomGenome();
  aggressive.earlyPlayThresh=-15; aggressive.wagerRiskTolerance=0.9;
  aggressive.wagerMinProjected=-5; aggressive.wagerEarlyBonus=12;
  aggressive.maxExpeditions=4; aggressive.holdVsPlayBias=-2;
  pop.push(aggressive);

  const conservative=randomGenome();
  conservative.earlyPlayThresh=10; conservative.wagerRiskTolerance=0.1;
  conservative.wagerMinProjected=15; conservative.newExpMinProjected=10;
  conservative.maxExpeditions=3; conservative.oppAwareness=2;
  pop.push(conservative);

  const focused=randomGenome();
  focused.maxExpeditions=2.5; focused.focusVsSpread=0;
  focused.eightCardWeight=15; focused.concentrationBonus=10;
  focused.orphanPenalty=8;
  pop.push(focused);

  const blocker=randomGenome();
  blocker.oppAwareness=2.5; blocker.oppBlockWeight=8;
  blocker.oppDiscardDanger=12; blocker.oppDenyDrawWeight=10;
  blocker.counterPlayWeight=3; blocker.safeDiscardBias=4;
  pop.push(blocker);

  const tempo=randomGenome();
  tempo.tempoAwareness=1.5; tempo.rushWhenAheadBy=15;
  tempo.drawSourceTempo=0.8; tempo.endgameUrgency=2;
  pop.push(tempo);

  // Fill rest with randoms
  while(pop.length<popSize) pop.push(randomGenome());

  let allTimeBest=null, allTimeBestScore=-Infinity;
  const hallOfFame=[]; // past champions

  for(let gen=0;gen<generations;gen++){
    const t0=Date.now();
    const scores=await parallelTournament(pop, games, variant, numWorkers);

    const maxGames=games*2*(popSize-1);
    let bestIdx=0;
    for(let i=1;i<popSize;i++) if(scores[i]>scores[bestIdx]) bestIdx=i;

    // Hall of fame
    if(gen%10===0 && gen>0) hallOfFame.push({...pop[bestIdx], gen});

    if(scores[bestIdx]>allTimeBestScore){
      allTimeBestScore=scores[bestIdx];
      allTimeBest={...pop[bestIdx]};
    }

    const bestWR=(scores[bestIdx]/maxGames*100).toFixed(1);
    const avgWR=(scores.reduce((a,b)=>a+b,0)/popSize/maxGames*100).toFixed(1);
    const div=popDiversity(pop).toFixed(3);
    const elapsed=((Date.now()-t0)/1000).toFixed(1);
    console.log(`Gen ${String(gen+1).padStart(3)}/${generations} | Best: ${bestWR}% | Div: ${div} | ${elapsed}s`);

    // Sort by score
    const indexed=scores.map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s);

    // Diversity-preserving selection: ensure elites are diverse
    const newPop=[];
    const minDist=0.05; // minimum distance between elites
    for(const {i} of indexed){
      if(newPop.length>=elites) break;
      // Check diversity from already-selected elites
      let tooClose=false;
      for(const e of newPop){
        if(genomeDist(pop[i], e)<minDist){tooClose=true;break;}
      }
      if(!tooClose) newPop.push({...pop[i]});
    }
    // Fill remaining elite slots if diversity filter was too strict
    for(const {i} of indexed){
      if(newPop.length>=elites) break;
      if(!newPop.some(e=>e===pop[i])) newPop.push({...pop[i]});
    }

    // Immigration: fresh random genomes
    for(let i=0;i<immigrants;i++) newPop.push(randomGenome());

    // Breed offspring
    while(newPop.length<popSize){
      const p1=newPop[Math.floor(Math.random()*elites)];
      const p2=newPop[Math.floor(Math.random()*Math.min(newPop.length, elites+immigrants))];
      let child=crossover(p1, p2);
      const progress=gen/generations;
      const rate=0.5*(1-progress*0.3);  // higher mutation rate than v1
      const strength=0.35*(1-progress*0.4);
      child=mutate(child, rate, strength);
      newPop.push(child);
    }

    pop=newPop;
  }

  // Final head-to-head
  console.log('\n════════════════════════════════════════════════════');
  console.log('FINAL: Best evolved vs Default (4000 games)');
  console.log('════════════════════════════════════════════════════');

  const defG=createDefault();
  const finalPop=[allTimeBest, defG];
  const fs=await parallelTournament(finalPop, 2000, variant, numWorkers);
  const total=4000;
  console.log(`Evolved: ${fs[0].toFixed(0)} wins (${(fs[0]/total*100).toFixed(1)}%)`);
  console.log(`Default: ${fs[1].toFixed(0)} wins (${(fs[1]/total*100).toFixed(1)}%)`);

  // Also test against hall of fame
  if(hallOfFame.length>0){
    console.log('\nHall of Fame matchups:');
    for(const hof of hallOfFame){
      const hofPop=[allTimeBest, hof];
      const hs=await parallelTournament(hofPop, 500, variant, numWorkers);
      console.log(`  vs Gen ${hof.gen} champ: ${(hs[0]/1000*100).toFixed(1)}% win`);
    }
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log('Best genome:');
  console.log(formatGenome(allTimeBest));
  console.log('\n// Paste into ai-worker.js:');
  console.log('const EVOLVED = ' + JSON.stringify(allTimeBest, null, 2) + ';');
}

main().catch(e=>{console.error(e);process.exit(1)});
