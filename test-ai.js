const ai = require('/tmp/ai-test-module.js');
const COLORS = ai.COLORS;
const genome = ai.GENOMES.scholar;

function createDeck(){
  let deck=[];
  COLORS.forEach(c=>{
    for(let i=0;i<3;i++)deck.push({color:c,value:0,id:c+'_w'+i});
    for(let v=2;v<=10;v++)deck.push({color:c,value:v,id:c+'_'+v});
  });
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  return deck;
}
function calcScore(exps){
  let total=0;
  for(const c of COLORS){
    const cards=exps[c]||[];if(cards.length===0) continue;
    const w=cards.filter(c=>c.value===0).length;
    const sum=cards.reduce((s,c)=>s+c.value,0);
    let score=(sum-20)*(1+w);
    if(cards.length>=8) score+=20;
    total+=score;
  }
  return total;
}

const deck = createDeck();
const gs = {
  hands: { player1: deck.splice(0,8), player2: deck.splice(0,8) },
  expeditions: { player1:{red:[],green:[],blue:[],white:[],yellow:[]}, player2:{red:[],green:[],blue:[],white:[],yellow:[]} },
  discards: { red:[], green:[], blue:[], white:[], yellow:[] },
  deck, deckSize: deck.length, currentTurn:'player1', phase:'play', variant:'classic', lastDiscardedColor:null, oppDrawHistory:[]
};

console.log('=== AI TEST (Scholar genome vs Dummy) ===\n');
let warnings = 0;

for(let turn=0; turn<40 && gs.deck.length>0; turn++){
  if(gs.currentTurn==='player1'){
    const hand=gs.hands.player1; const card=hand[0]; hand.splice(0,1);
    gs.discards[card.color].push(card); gs.lastDiscardedColor=card.color;
    if(gs.deck.length===0) break;
    hand.push(gs.deck.pop()); gs.deckSize=gs.deck.length;
    gs.currentTurn='player2'; gs.phase='play'; continue;
  }
  const t0=Date.now();
  const result=ai.evaluate(gs, 'classic', 300, genome);
  const ms=Date.now()-t0;
  const wr=(result.winRate*100).toFixed(1);
  console.log('T'+(Math.floor(turn/2)+1)+' | '+result.debug.chosen+' -> '+result.debug.chosenDraw+' ('+wr+'%, '+ms+'ms) | Deck:'+gs.deckSize);
  if(result.debug.dangerNote){ console.log('  !! '+result.debug.dangerNote); warnings++; }

  const p1=result.phase1;
  const card=gs.hands.player2.find(c=>c.id===p1.card.id);
  gs.hands.player2=gs.hands.player2.filter(c=>c.id!==card.id);
  if(p1.type==='play'){ gs.expeditions.player2[card.color].push(card); gs.lastDiscardedColor=null; }
  else { gs.discards[card.color].push(card); gs.lastDiscardedColor=card.color; }
  const p2=result.phase2;
  if(p2.type==='deck'){ if(gs.deck.length===0)break; gs.hands.player2.push(gs.deck.pop()); gs.deckSize=gs.deck.length; }
  else { const pile=gs.discards[p2.color]; if(pile.length>0) gs.hands.player2.push(pile.pop()); }
  gs.currentTurn='player1'; gs.phase='play';
}

console.log('\n=== RESULTS ===');
for(const c of COLORS){ const e=gs.expeditions.player2[c]; if(e.length>0) console.log('AI '+c+': '+e.map(c=>(c.value||'W')).join(', ')); }
for(const c of COLORS){ const e=gs.expeditions.player1[c]; if(e.length>0) console.log('Dummy '+c+': '+e.map(c=>(c.value||'W')).join(', ')); }
console.log('\nAI Score:', calcScore(gs.expeditions.player2));
console.log('Dummy Score:', calcScore(gs.expeditions.player1));
console.log('Dangerous discards:', warnings);
