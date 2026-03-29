// rendering.js — Card rendering, hand display (cone perspective), board layout, scoring display

let yourTurnUntil=0;
let idleStart=0;     // timestamp when idle began
let idleShown=false;  // whether overlay is currently visible
const IDLE_MS=30000;  // 30 seconds

function cardHTML(card, extra=''){
  if(card.ghost){
    return `<div class="card color-${card.color} ${extra}" data-id="${card.id}" style="background:transparent;border-style:dashed;opacity:0.5"></div>`;
  }
  const isWager = card.value===0;
  const valText = isWager ? '&#x1F91D;' : card.value;
  const corner = isWager ? '&#x1F91D;' : card.value;
  const cbSym = colorblindMode ? `<div class="cb-sym">${COLOR_SYMBOLS[card.color]}</div>` : '';
  return `<div class="card color-${card.color} ${isWager?'wager':''} ${extra}" data-id="${card.id}">
    <div class="card-corner">${corner}</div>
    <div class="card-value">${valText}</div>
    ${cbSym}
  </div>`;
}

// computeLayout() is now in src/layout.js

function renderGame(){
  if(!gameState)return;

  // Compute layout — φ-derived, deterministic, only changes on resize
  const layout=computeLayout();
  const sH=layout.sH;

  // Apply fixed pixel heights + section spacing hierarchy to all sections
  const oppHandRow=document.getElementById('opp-hand-row');
  const oppInfoRow=document.querySelector('#game-screen .board-area .info-row');
  const myInfoRow=document.querySelectorAll('#game-screen .board-area .info-row')[1];
  const oppRow=document.getElementById('opp-row');
  const myRow=document.getElementById('my-row');
  const midSec=document.getElementById('middle-section');
  // Section heights
  if(oppInfoRow) oppInfoRow.style.height=sH.infoRow+'px';
  if(myInfoRow) myInfoRow.style.height=sH.infoRow+'px';
  if(oppRow) oppRow.style.height=sH.stackRow+'px';
  if(myRow) myRow.style.height=sH.stackRow+'px';
  if(midSec) midSec.style.height=sH.mid+'px';
  // Section spacing: peek[sm]info[sm]stacks[BIG]mid[BIG]stacks[sm]info[sm]hand
  if(oppHandRow) oppHandRow.style.marginBottom=layout.smallGapPx+'px';
  if(oppInfoRow) oppInfoRow.style.marginBottom=layout.smallGapPx+'px';
  if(oppRow) oppRow.style.marginBottom=layout.bigGapPx+'px';
  if(midSec) midSec.style.marginBottom=layout.bigGapPx+'px';
  if(myRow) myRow.style.marginBottom=layout.smallGapPx+'px';
  if(myInfoRow) myInfoRow.style.marginBottom=layout.smallGapPx+'px';

  // Animation snapshots handled by explicit animateMove calls
  const isMyTurn = gameState.currentTurn===mySlot;
  const inPlayPhase = gameState.phase==='play';
  const inDrawPhase = gameState.phase==='draw';

  // Turn state — reflected in info rows and hand glow
  const phaseBar=document.getElementById('phase-bar');
  const oppStatus=document.getElementById('opp-status');
  const gameScreenEl=document.getElementById('game-screen');
  const wasMyTurn=gameScreenEl&&gameScreenEl.classList.contains('your-turn-glow');
  if(isMyTurn && !wasMyTurn && gameState.phase==='play'){
    SFX.yourTurn();
    yourTurnUntil=Date.now()+2000;
  }
  // Player hint (center of my info row)
  if(phaseBar){
    const showYourTurn=isMyTurn&&inPlayPhase&&Date.now()<yourTurnUntil;
    let phaseText='';
    if(showYourTurn) phaseText='YOUR TURN';
    else if(!isMyTurn) phaseText='Waiting...';
    else if(inPlayPhase) phaseText=selectedCard?'Play or discard':'Select a card';
    else phaseText='Draw a card';
    if(showYourTurn){
      phaseBar.innerHTML=renderText(phaseText,3,{font:'cinzel',color:'var(--gold-bright)',weight:700,uppercase:true,cls:'your-turn-announce'});
    } else {
      const phaseColor=(isMyTurn&&inDrawPhase)?'var(--gold-bright)':'var(--parchment-dark)';
      const phaseOpacity=isMyTurn?undefined:0.4;
      const phaseStyle=isMyTurn?undefined:'font-style:italic';
      phaseBar.innerHTML=renderText(phaseText,4,{font:'crimson',color:phaseColor,opacity:phaseOpacity,extraStyle:phaseStyle});
    }
  }
  // Opponent status (center of opp info row)
  if(oppStatus){
    if(isMyTurn) oppStatus.innerHTML='';
    else oppStatus.innerHTML=renderText('thinking...',4,{font:'crimson',color:'var(--parchment-dark)',opacity:0.4,extraStyle:'font-style:italic'});
  }
  // Idle overlay — 30s of inactivity during play phase
  const idleOverlay=document.getElementById('idle-overlay');
  if(idleOverlay){
    if(isMyTurn && inPlayPhase && !selectedCard){
      if(!idleStart) idleStart=Date.now();
      if(!idleShown && Date.now()-idleStart>=IDLE_MS){
        idleShown=true;
        idleOverlay.classList.add('visible');
        idleOverlay.innerHTML=
          renderText('YOUR TURN',3,{font:'cinzel',color:'var(--gold-bright)',weight:700,uppercase:true,block:true,align:'center',extraStyle:'animation:idlePulse 2s ease-in-out infinite'})+
          renderText('tap anywhere',5,{font:'crimson',color:'var(--parchment)',opacity:0.6,block:true,align:'center',extraStyle:'margin-top:1em'});
        SFX.yourTurn();
      }
    } else {
      idleStart=0;
      if(idleShown){
        idleShown=false;
        idleOverlay.classList.remove('visible');
        idleOverlay.innerHTML='';
      }
    }
  }

  // Screen edge glow
  if(gameScreenEl){
    gameScreenEl.classList.toggle('your-turn-glow',isMyTurn);
  }

  // Title + notification for multiplayer
  document.title=isMyTurn?'\uD83D\uDFE1 Your Turn \u2014 Venture':'Venture';
  if(isMyTurn && !wasMyTurn && !isAIGame && document.hidden){
    notifyTurn();
  }

  // Draw pile count (used by discard row render)
  const drawPileLen = getCards(gameState,'drawPile').length;

  // Live score totals (per-stack scores rendered in renderBoard via stackScoreLabelAt)
  const oppTotalEl=document.getElementById('opp-total-score');
  const myTotalEl=document.getElementById('my-total-score');
  if(liveScoreEnabled && gameState.expeditions){
    const oppSlotName=mySlot==='player1'?'player2':'player1';
    const myS=calcScore(gameState.expeditions[mySlot]);
    const oppS=calcScore(gameState.expeditions[oppSlotName]);
    if(oppTotalEl){
      if(oppS.total===0) oppTotalEl.innerHTML='';
      else oppTotalEl.innerHTML=renderText(oppS.total,4,{weight:700,tabular:true,color:oppS.total>=0?'var(--gold-bright)':'#e07060'});
    }
    if(myTotalEl){
      if(myS.total===0) myTotalEl.innerHTML='';
      else myTotalEl.innerHTML=renderText(myS.total,4,{weight:700,tabular:true,color:myS.total>=0?'var(--gold-bright)':'#e07060'});
    }
  } else {
    if(oppTotalEl) oppTotalEl.innerHTML='';
    if(myTotalEl) myTotalEl.innerHTML='';
  }

  // Phase bar handled above in turn state section

  // Draw pile target highlight handled in renderBoard discard row

  renderHand();
  renderBoard(layout);

  // Opponent hand: cone perspective mirrored, clipped to peek height
  if(oppHandRow){
    const oppSlotN=mySlot==='player1'?'player2':'player1';
    const oppHandLen=getCards(gameState,'hands',oppSlotN).length;
    const oppContainerW=oppHandRow.offsetWidth||oppHandRow.parentElement?.offsetWidth||375;
    const oppCone=computeCone(oppHandLen, oppContainerW);
    const {cardW:oCW, cardH:oCH, R:oR, h:oH, d:oD, slantH:oSH, POV:oPOV, cardWRad:oWR, cardHSlant:oHS, stepRad:oSR, focalLen:oFL}=oppCone;
    const oCX=oppContainerW/2;

    // Project cards to find bounds
    let oMinY=Infinity, oMaxY=-Infinity;
    const oppCards=[];
    for(let i=0;i<oppHandLen;i++){
      const phi=(i-(oppHandLen-1)/2)*oSR;
      const tl=conePoint(oR,oH,oSH, phi-oWR/2, 0);
      const tr=conePoint(oR,oH,oSH, phi+oWR/2, 0);
      const bl=conePoint(oR,oH,oSH, phi-oWR/2, oHS);
      const br=conePoint(oR,oH,oSH, phi+oWR/2, oHS);
      const ptl=coneProject(tl,oPOV,oFL), ptr=coneProject(tr,oPOV,oFL);
      const pbl=coneProject(bl,oPOV,oFL), pbr=coneProject(br,oPOV,oFL);
      if(!ptl||!ptr||!pbl||!pbr) continue;
      for(const p of [ptl,ptr,pbl,pbr]){
        if(p.y<oMinY) oMinY=p.y;
        if(p.y>oMaxY) oMaxY=p.y;
      }
      oppCards.push({phi,ptl,ptr,pbl,pbr});
    }

    // Height is set by computeLayout — don't change it here
    const projHOpp=oMaxY-oMinY;
    const visibleH=oppHandRow.offsetHeight||Math.round(oCH*0.35);

    // Mirror vertically: flip Y so cards appear to fan from top edge
    // Offset so the "bottom" (rim edge) of cards sits at y=0 (top of visible area)
    const mirrorOffY=oMaxY+visibleH-projHOpp;

    let html='';
    for(const cd of oppCards){
      // Mirror: negate Y, shift into container. Flip X for mirrored fan direction
      const sx=[0, oCW, 0, oCW];
      const sy=[0, 0, oCH, oCH];
      const dx=[cd.ptl.x+oCX, cd.ptr.x+oCX, cd.pbl.x+oCX, cd.pbr.x+oCX];
      // Mirror Y: subtract from oMaxY, then offset so bottom of fan shows at container bottom
      const dy=[
        -(cd.ptl.y-oMaxY)+(visibleH-projHOpp),
        -(cd.ptr.y-oMaxY)+(visibleH-projHOpp),
        -(cd.pbl.y-oMaxY)+(visibleH-projHOpp),
        -(cd.pbr.y-oMaxY)+(visibleH-projHOpp)
      ];

      const m=computeHomography(
        sx[0],sy[0],sx[1],sy[1],sx[2],sy[2],sx[3],sy[3],
        dx[0],dy[0],dx[1],dy[1],dx[2],dy[2],dx[3],dy[3]
      );
      if(!m) continue;
      const cssMatrix=`matrix3d(${m[0]},${m[3]},0,${m[6]}, ${m[1]},${m[4]},0,${m[7]}, 0,0,1,0, ${m[2]},${m[5]},0,${m[8]})`;
      html+=`<div class="card card-back" style="position:absolute;left:0;top:0;transform:${cssMatrix};transform-origin:0 0"></div>`;
    }
    oppHandRow.innerHTML=html;
  }

  // Name labels (symmetric: left-aligned, tier 5 uppercase)
  const labelOpts={color:'var(--parchment-dark)',opacity:0.5,uppercase:true,letterSpacing:'1.5px'};
  const oppNameLabel=document.getElementById('opp-name-label');
  if(oppNameLabel) oppNameLabel.innerHTML=renderText(document.getElementById('opponent-name-store')?.textContent||'Opponent',5,labelOpts);
  const myNameLabel=document.getElementById('my-name-label');
  if(myNameLabel) myNameLabel.innerHTML=renderText(getName?getName():'YOU',5,labelOpts);

  // Layout is now fully deterministic (fixed stack heights, fixed hand height)
  // — no overflow correction loop needed.
}

function renderHand(){
  const container=document.getElementById('hand-cards');
  const hand=getCards(gameState,'hands',mySlot);
  const sorted=[...hand].sort((a,b)=>{
    const ci=COLORS.indexOf(a.color)-COLORS.indexOf(b.color);
    return ci!==0 ? ci : a.value-b.value;
  });
  const n=sorted.length;
  const containerW=container.parentElement.offsetWidth||375;
  const cone=computeCone(n, containerW);
  const {cardW, cardH, R, h, d, slantH, POV, cardWRad, cardHSlant, stepRad, focalLen}=cone;
  const centerX=containerW/2;

  // Project all card corners to find bounding box
  let minSY=Infinity, maxSY=-Infinity;
  const cardData=[];
  for(let i=0;i<n;i++){
    const phi=(i-(n-1)/2)*stepRad;
    const tl=conePoint(R,h,slantH, phi-cardWRad/2, 0);
    const tr=conePoint(R,h,slantH, phi+cardWRad/2, 0);
    const bl=conePoint(R,h,slantH, phi-cardWRad/2, cardHSlant);
    const br=conePoint(R,h,slantH, phi+cardWRad/2, cardHSlant);
    const ptl=coneProject(tl,POV,focalLen);
    const ptr=coneProject(tr,POV,focalLen);
    const pbl=coneProject(bl,POV,focalLen);
    const pbr=coneProject(br,POV,focalLen);
    if(!ptl||!ptr||!pbl||!pbr) continue;
    for(const p of [ptl,ptr,pbl,pbr]){
      if(p.y<minSY) minSY=p.y;
      if(p.y>maxSY) maxSY=p.y;
    }
    // Selected card X = average of all 4 projected corners (keeps center constant)
    const centerSX = (ptl.x + ptr.x + pbl.x + pbr.x) / 4;
    cardData.push({i, phi, ptl, ptr, pbl, pbr, centerSX});
  }

  const projH=maxSY-minSY;
  const liftPx=lvl(4, cardH); // n=4: same as fontBase, slotPad
  // Set hand-cards height to actual content size so flex centering in hand-area works
  container.style.height=Math.ceil(projH+liftPx)+'px';
  const offsetSY=-minSY+liftPx;

  container.innerHTML=sorted.map((c,idx)=>{
    const sel = selectedCard && selectedCard.id===c.id ? 'selected' : '';
    const cd=cardData.find(d=>d.i===idx);
    if(!cd) return '';

    if(sel){
      // Selected: flat, same X center as cone position, lifted, on top of everything
      const x=cd.centerSX+centerX-cardW/2;
      return `<div onclick="selectCard('${c.id}')" style="left:${x.toFixed(1)}px;top:0;z-index:3000">${cardHTML(c,sel)}</div>`;
    }

    // Unselected: cone perspective via homography matrix3d
    const sx=[0, cardW, 0, cardW];
    const sy=[0, 0, cardH, cardH];
    const dx=[cd.ptl.x+centerX, cd.ptr.x+centerX, cd.pbl.x+centerX, cd.pbr.x+centerX];
    const dy=[cd.ptl.y+offsetSY, cd.ptr.y+offsetSY, cd.pbl.y+offsetSY, cd.pbr.y+offsetSY];

    const m=computeHomography(
      sx[0],sy[0],sx[1],sy[1],sx[2],sy[2],sx[3],sy[3],
      dx[0],dy[0],dx[1],dy[1],dx[2],dy[2],dx[3],dy[3]
    );
    if(!m) return '';

    const cssMatrix=`matrix3d(${m[0]},${m[3]},0,${m[6]}, ${m[1]},${m[4]},0,${m[7]}, 0,0,1,0, ${m[2]},${m[5]},0,${m[8]})`;
    return `<div onclick="selectCard('${c.id}')" style="left:0;top:0;transform:${cssMatrix};transform-origin:0 0;z-index:${idx}">${cardHTML(c,'')}</div>`;
  }).join('');
}

function toggleExpand(who,color){
  SFX.select();
  if(expandedStack && expandedStack.who===who && expandedStack.color===color){
    expandedStack=null;
  } else {
    expandedStack={who,color};
  }
  renderBoard(computeLayout());
}

function renderBoard(layout){
  const oppSlot=mySlot==='player1'?'player2':'player1';
  const isMyTurn=gameState.currentTurn===mySlot;
  const inPlayPhase=gameState.phase==='play';
  const inDrawPhase=gameState.phase==='draw';
  const oppRow=document.getElementById('opp-row');
  const discardRow=document.getElementById('discard-row');
  const myRow=document.getElementById('my-row');
  const singleContainer=document.getElementById('single-pile-area');

  // Undo state
  const canUndo=lastPlayedCard && inDrawPhase && isMyTurn;

  const drawPileLen=getCards(gameState,'drawPile').length;

  // Single pile
  if(variant==='single'){
    singleContainer.style.display='inline-block';
    discardRow.style.display='none';
    const pile=getCards(gameState,'singlePile');
    const topCard=pile.length>0?pile[pile.length-1]:null;
    const canDiscard=selectedCard && inPlayPhase && isMyTurn;
    const canDraw=inDrawPhase && isMyTurn && topCard && !gameState.justDiscarded;
    let inner='';
    if(!topCard){
      const cls=canDiscard?'card target':'card empty-slot';
      inner=`<div class="${cls}" onclick="discardToSingle()">${canDiscard?'<span class="target-label">Discard</span>':''}</div>`;
    } else {
      const isUndoSingle=canUndo && lastPlayedCard.to==='single';
      if(isUndoSingle){
        inner=`<div onclick="undoLastPlay()" style="position:relative">${cardHTML(topCard,'undoable')}<span class="undo-label">undo</span></div>`;
      } else {
        const extra=canDraw?'target':(canDiscard?'target':'');
        const handler=inDrawPhase&&isMyTurn?'drawFromSingle()':'discardToSingle()';
        inner=`<div onclick="${handler}" style="position:relative">${cardHTML(topCard,extra)}${canDraw?'<span class="target-label">Draw</span>':''}${canDiscard?'<span class="target-label">Discard</span>':''}</div>`;
      }
    }
    singleContainer.innerHTML=inner;
  } else {
    singleContainer.style.display='none';
    discardRow.style.display='flex';
  }

  // Card jitter — deterministic per card identity
  function jitter(card,i){
    const h=(card.color.charCodeAt(0)*31+card.value*97+i*53)&0xFFFF;
    const rot=((h%100)/100*6-3).toFixed(1);       // ±3 degrees
    const dx=((((h>>4)%100)/100*5-2.5)).toFixed(1);  // ±2.5px
    const dy=((((h>>8)%100)/100*5-2.5)).toFixed(1);  // ±2.5px
    return `rotate(${rot}deg) translate(${dx}px,${dy}px)`;
  }

  // Layout values — single source of truth from computeLayout()
  const curCardH = layout.cardH;
  const scoreLineH = layout.scoreLineH;
  const cardContentH = layout.stackContentH; // centering reference: excludes score line
  const sectionH = layout.sH.stackRow;       // full section height: includes score line budget
  function cardOffset(count){
    return Math.round(stackOffset(count, curCardH));
  }

  // Pile height for N cards with given card offset
  function pileH(n, co){ return n <= 0 ? 0 : curCardH + Math.max(0, n-1) * co; }

  // Stack origin: centers pile within cardContentH, then offsets for score line position
  // opponent: score line at bottom → pile centered in top portion of section
  // player: score line at top → pile centered in bottom portion of section
  function stackOrigin(n, co, side){
    const ph = pileH(n, co);
    const center = Math.max(0, Math.round((cardContentH - ph) / 2));
    return side === 'opp' ? center : scoreLineH + center;
  }

  // Spread view uses card offset at N=2 (max readable spacing)
  const spreadOffset = cardOffset(2);

  const cbLabel=c=>colorblindMode?renderText(COLOR_SYMBOLS[c], 5, {opacity:.4, extraStyle:'position:absolute;bottom:var(--border-w);left:50%;transform:translateX(-50%)'}):'';

  // Unified pile renderer — outputs the complete card-col (space + pile content).
  // The space handles positioning; the pile is always centered within its content area.
  // Like renderText always pairs font-size with line-height, renderPile always pairs pile with space.
  //
  // opts.color:       expedition color (for border tint on N=0)
  // opts.side:        'opp' | 'my' — owns centering: computes origin, so, score label.
  //                   Omit for discard/draw (no score label budget, flex-centered).
  // opts.height:      section height in px (for play stacks). Omit for auto-height.
  // opts.targetLabel: label for N=0 target ('Play', 'Discard', etc.)
  // opts.so:          override card offset in px (e.g. spreadOffset for expanded). Default: cardOffset(n).
  // opts.zBase:       z-index base (0 normal, 100+ for expanded)
  // opts.perCard:     fn(card, i, isTop) => {extra, handler, suffix}
  // opts.onclick:     column click handler string
  // opts.colStyle:    extra inline CSS on the card-col
  //
  // When opts.side is set ('opp'|'my'), renderPile OWNS centering:
  //   - Computes so (card offset) and origin (pile top) internally
  //   - Computes score label position internally
  //   - opts.so overrides default card offset (e.g. for expanded stacks)
  // When opts.side is omitted (discards), card-col flex-centers the content.
  function renderPile(cards, opts){
    opts=opts||{};
    const n=cards?cards.length:0;
    let inner;

    if(n===0){
      // N=0: card space — centered in the same content area as cards would be
      const label=opts.targetLabel;
      const cls=label?'card target':'card empty-slot';
      const border=label?'':`border-bottom:var(--border-w) solid ${COLOR_HEX[opts.color]}30`;
      const content=label?'<span class="target-label">'+label+'</span>':cbLabel(opts.color);
      if(opts.side){
        // Play stack: position slot where a 1-card pile would sit (within cardContentH)
        const slotTop=stackOrigin(1, 0, opts.side);
        inner=`<div class="${cls}" style="${border};position:absolute;top:${slotTop}px;left:calc(var(--slot-pad) / 2)">${content}</div>`;
      } else {
        // Discard: no score label budget, flex-centered by card-col
        inner=`<div class="${cls}" style="${border}">${content}</div>`;
      }
    } else {
      // N>=1: absolute-positioned cards with jitter
      // When side is set, renderPile owns the centering computation
      const so=opts.so!==undefined?opts.so:cardOffset(n);
      const origin=opts.side?stackOrigin(n, so, opts.side):0;
      const zBase=opts.zBase||0;
      const perCard=opts.perCard;
      inner=cards.map((card,i)=>{
        const pc=perCard?perCard(card,i,i===cards.length-1):{};
        return `<div style="position:absolute;top:${origin+i*so}px;left:calc(var(--slot-pad) / 2);z-index:${zBase+i};transition:top .25s ease;transform:${card.ghost?'':jitter(card,i)}"${pc.handler||''}>${cardHTML(card,pc.extra||'')}${pc.suffix||''}</div>`;
      }).join('');
      // Score label: renderPile computes position when side is set
      if(opts.side){
        const real=cards.filter(c=>!c.ghost);
        if(real.length>0){
          const labelTop=opts.side==='my'?origin-scoreLineH:origin+(n-1)*so+curCardH;
          inner+=stackScoreLabelAt(real, labelTop);
        }
      }
    }

    // Card-col wrapper (the space) — always present, inseparable from pile content
    const hStyle=opts.height?'height:'+opts.height+'px;':'';
    const extra=opts.colStyle||'';
    const onclick=opts.onclick?' onclick="'+opts.onclick+'"':'';
    return `<div class="card-col" style="${hStyle}${extra}"${onclick}>${inner}</div>`;
  }

  function stackScoreLabelAt(cards, topPx){
    const real=cards.filter(c=>!c.ghost);
    const hasCards=real.length>0;
    const show=liveScoreEnabled&&hasCards;
    let score=0,scoreColor='';
    if(hasCards){let w=0,s=0;for(const c of real){if(c.value===0)w++;else s+=c.value;}score=(s-20)*(1+w)+(real.length>=8?20:0);scoreColor=score>=0?'var(--gold-bright)':'#e07060';}
    return renderText(show?score:'', 5, {align:'center', color:scoreColor||undefined, opacity:show?.7:0, tabular:true, tag:'div', extraStyle:`position:absolute;top:${topPx}px;left:0;right:0;pointer-events:none`});
  }

  // Opponent row — renderPile owns centering when side is set
  oppRow.innerHTML=COLORS.map(c=>{
    const cards=getCards(gameState,'expeditions',oppSlot,c);
    const isExp=expandedStack&&expandedStack.who==='opp'&&expandedStack.color===c;
    return renderPile(cards, {color:c, side:'opp', height:sectionH,
      so:isExp?spreadOffset:undefined, zBase:isExp?100:0,
      onclick:cards.length>0?"toggleExpand('opp','"+c+"')":undefined});
  }).join('');

  // Discard row (classic) — show stacked cards with jitter
  if(variant==='classic'){
    discardRow.innerHTML=COLORS.map(c=>{
      const pile=getCards(gameState,'discards',c);
      const topCard=pile.length>0?pile[pile.length-1]:null;
      const canDiscard=selectedCard && selectedCard.color===c && inPlayPhase && isMyTurn;
      const canDraw=inDrawPhase && isMyTurn && topCard && c!==gameState.lastDiscardedColor;
      if(!topCard){
        return renderPile([], {color:c, targetLabel:canDiscard?'Discard':'', onclick:"discardTo('"+c+"')"});
      }
      const isUndoDiscard=canUndo && lastPlayedCard.to==='discard' && lastPlayedCard.color===c;
      if(isUndoDiscard){
        return `<div class="card-col" onclick="undoLastPlay()" style="position:relative">${cardHTML(topCard,'undoable')}<span class="undo-label">undo</span></div>`;
      }
      const extra=canDraw?'target':(canDiscard?'target':'');
      const hasAction=canDraw||canDiscard;
      const handler=hasAction?(inDrawPhase&&isMyTurn?`drawFromDiscard('${c}')`:`discardTo('${c}')`):(pile.length>1?`toggleExpand('discard','${c}')`:'');
      const isExp=expandedStack && expandedStack.who==='discard' && expandedStack.color===c;
      // Show all cards in pile with jitter; expand on tap if no action
      const baseSo=cardOffset(pile.length);
      let stackHTML='';
      for(let i=0;i<pile.length-1;i++){
        const card=pile[i];
        const so=isExp?spreadOffset:0;
        stackHTML+=`<div style="position:absolute;top:${i*so}px;left:calc(var(--slot-pad) / 2);transform:${jitter(card,i)};pointer-events:none">${cardHTML(card)}</div>`;
      }
      // Top card (interactive)
      const topSo=isExp?(pile.length-1)*spreadOffset:0;
      stackHTML+=`<div style="position:relative;top:${topSo}px;transform:${jitter(topCard,pile.length-1)}">${cardHTML(topCard,extra)}</div>`;
      const labels=(canDraw?'<span class="target-label">Draw</span>':'')+(canDiscard?'<span class="target-label">Discard</span>':'');
      return `<div class="card-col" style="position:relative;${isExp?'z-index:3000':''}" onclick="${handler}">${stackHTML}${labels}</div>`;
    }).join('');

    // Render draw pile
    const isLandscapeLayout=window.innerWidth>window.innerHeight;
    const drawPileSlot=document.getElementById('draw-pile-slot');
    const drawPileTarget=isMyTurn && inDrawPhase ? 'target' : '';
    let drawPileCardsHTML='';
    // Portrait layout: landscape cards in draw pile. Landscape layout: portrait cards (6th column)
    const drawPileCardClass=isLandscapeLayout?'card card-back':'card card-back draw-pile-landscape';
    if(drawPileLen>0){
      const showCount=Math.min(drawPileLen,10);
      for(let i=0;i<showCount;i++){
        const h=(i*7919+i*i*31)&0xFFFF;
        const rot=((h%100)/100*6-3).toFixed(1);
        const dx=((((h>>4)%100)/100*5-2.5)).toFixed(1);
        const dy=((((h>>8)%100)/100*5-2.5)).toFixed(1);
        drawPileCardsHTML+=`<div class="${drawPileCardClass}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(${rot}deg) translate(${dx}px,${dy}px)"></div>`;
      }
    }
    const countLabel=renderText(drawPileLen+' left', 5, {align:'center', color:'var(--parchment-dark)', opacity:.5, tag:'div'});

    if(isLandscapeLayout){
      // Landscape: draw pile as 6th column, appended without shifting the 5 discard columns
      // Don't change grid-template-columns — keep same 5-col layout as other rows
      // Instead, add draw pile as an absolutely positioned element to the right
      discardRow.style.gridTemplateColumns='';
      discardRow.style.position='relative';
      const slotW='var(--col-w)';
      const slotH='calc(var(--card-h) + var(--slot-pad))';
      const emptySlot=`<div class="card empty-slot" style="width:${slotW};height:${slotH};border-bottom:var(--border-w) solid rgba(212,168,67,.2)"></div>`;
      // Append draw pile inline as 6th grid item but keep grid at 6 cols with same justify
      discardRow.style.gridTemplateColumns=`repeat(${COLORS.length},var(--col-w)) var(--col-w)`;
      discardRow.style.justifyContent='start';
      // Calculate left padding to keep 5 discard columns centered with the other rows
      const totalGridW=`calc(${COLORS.length} * var(--col-w))`;
      const rowPad=`calc((100% - ${totalGridW}) / 2)`;
      discardRow.style.paddingLeft=rowPad;
      discardRow.style.paddingRight='0';
      discardRow.innerHTML+=`<div class="card-col ${drawPileTarget}" id="draw-pile-col" onclick="drawFromDrawPile()" style="position:relative;width:${slotW};height:${slotH}">${drawPileLen>0?drawPileCardsHTML:emptySlot}${countLabel}</div>`;
      if(drawPileSlot) drawPileSlot.style.display='none';
    } else {
      // Portrait: draw pile below discards, landscape oriented, centered
      discardRow.style.gridTemplateColumns='';
      if(drawPileSlot){
        drawPileSlot.style.display='flex';
        drawPileSlot.style.flexDirection='column';
        drawPileSlot.style.justifyContent='center';
        drawPileSlot.style.alignItems='center';
        const slotW='calc(var(--card-h) + var(--slot-pad))';
        const slotH='var(--col-w)';
        const emptySlot=`<div class="card empty-slot" style="width:${slotW};height:${slotH};border-bottom:var(--border-w) solid rgba(212,168,67,.2)"></div>`;
        drawPileSlot.innerHTML=`<div class="${drawPileTarget}" id="draw-pile-col" onclick="drawFromDrawPile()" style="position:relative;width:${slotW};height:${slotH}">${drawPileLen>0?drawPileCardsHTML:emptySlot}</div>${countLabel}`;
      }
    }
  }

  // My expedition row — renderPile owns centering when side is set.
  // Ghost card: play target is a pile member, included in N count.
  myRow.innerHTML=COLORS.map(c=>{
    const realCards=getCards(gameState,'expeditions',mySlot,c);
    const canPlay=selectedCard && selectedCard.color===c && inPlayPhase && isMyTurn && canPlayOnExpedition(selectedCard,realCards);
    const isUndoTarget=canUndo && lastPlayedCard.to==='expedition' && lastPlayedCard.color===c;
    const ghost=canPlay?{color:c, value:-1, id:'ghost-'+c, ghost:true}:null;
    const cards=ghost?[...realCards, ghost]:realCards;
    if(cards.length===0){
      return renderPile([], {color:c, side:'my', height:sectionH,
        onclick:"playToExpedition('"+c+"')"});
    }
    const isExp=expandedStack&&expandedStack.who==='my'&&expandedStack.color===c;
    const stackClick=canPlay||isUndoTarget?"playToExpedition('"+c+"')":"toggleExpand('my','"+c+"')";
    return renderPile(cards, {
      color:c, side:'my', height:sectionH,
      so:isExp?spreadOffset:undefined, zBase:isExp?100:0,
      onclick:stackClick,
      perCard:(card,i,isTop)=>{
        if(card.ghost) return {
          extra:'target',
          handler:` onclick="event.stopPropagation();playToExpedition('${c}')"`,
          suffix:'<span class="target-label">Play</span>'
        };
        const isTopReal=!ghost?isTop:i===realCards.length-1;
        if(isTopReal&&isUndoTarget) return {
          extra:'undoable',
          handler:` onclick="event.stopPropagation();undoLastPlay()"`,
          suffix:'<span class="undo-label">undo</span>'
        };
        return {};
      }
    });
  }).join('');
}

// ===== SCORING =====
function calcScore(expeditions){
  let total=0; const breakdown={};
  COLORS.forEach(c=>{
    const cards=(expeditions&&expeditions[c])||[];
    if(cards.length===0){breakdown[c]={score:0,count:0,wagers:0,sum:0,subtotal:0,bonus:false,values:[]};return}
    const wagers=cards.filter(x=>x.value===0).length;
    const numCards=cards.filter(x=>x.value>0).sort((a,b)=>a.value-b.value);
    const values=numCards.map(x=>x.value);
    const sum=values.reduce((s,v)=>s+v,0);
    const subtotal=sum-20;
    const afterWagers=subtotal*(1+wagers);
    const bonus=cards.length>=8;
    const score=afterWagers+(bonus?20:0);
    breakdown[c]={score,count:cards.length,wagers,sum,subtotal,bonus,values};
    total+=score;
  });
  return {total,breakdown};
}

// Idle overlay dismiss — click anywhere on page
document.addEventListener('click',function(){
  if(idleShown){
    idleShown=false;
    idleStart=0;
    const ov=document.getElementById('idle-overlay');
    if(ov){ov.classList.remove('visible');ov.innerHTML='';}
  }
});

// Periodic idle check — renderGame only fires on state changes, so poll to trigger overlay
setInterval(function(){
  if(idleStart && !idleShown && Date.now()-idleStart>=IDLE_MS){
    if(typeof renderGame==='function') renderGame();
  }
},5000);
