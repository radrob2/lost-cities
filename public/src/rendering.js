// rendering.js — Card rendering, hand display (cone perspective), board layout, scoring display

function cardHTML(card, extra=''){
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

  // Apply fixed pixel heights + gap hierarchy to all sections
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
  // Gap hierarchy: peek[sm]info[sm]stacks[BIG]mid[BIG]stacks[sm]info[sm]hand
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
  if(isMyTurn && !wasMyTurn && gameState.phase==='play') SFX.yourTurn();
  // Player hint
  if(phaseBar){
    if(!isMyTurn) phaseBar.textContent='Waiting...';
    else if(inPlayPhase) phaseBar.textContent=selectedCard?'Play or discard':'Select a card';
    else phaseBar.textContent='Draw a card';
    phaseBar.classList.toggle('draw-phase',isMyTurn&&inDrawPhase);
    phaseBar.style.fontStyle=isMyTurn?'':'italic';
    phaseBar.style.opacity=isMyTurn?'':'0.4';
  }
  // Opponent status
  if(oppStatus){
    if(isMyTurn) oppStatus.textContent='';
    else oppStatus.textContent='thinking...';
    oppStatus.style.fontStyle='italic';
    oppStatus.style.opacity='0.4';
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

  // Deck count (used by discard row render)
  const deckLen = getCards(gameState,'deck').length;

  // Live score totals (per-stack scores rendered in renderBoard via stackScoreLabelAt)
  const oppTotalEl=document.getElementById('opp-total-score');
  const myTotalEl=document.getElementById('my-total-score');
  if(liveScoreEnabled && gameState.expeditions){
    const oppSlotName=mySlot==='player1'?'player2':'player1';
    const myS=calcScore(gameState.expeditions[mySlot]);
    const oppS=calcScore(gameState.expeditions[oppSlotName]);
    if(oppTotalEl){
      if(oppS.total===0) oppTotalEl.textContent='';
      else{oppTotalEl.textContent=oppS.total;oppTotalEl.style.color=oppS.total>=0?'var(--gold-bright)':'#e07060';}
    }
    if(myTotalEl){
      if(myS.total===0) myTotalEl.textContent='';
      else{myTotalEl.textContent=myS.total;myTotalEl.style.color=myS.total>=0?'var(--gold-bright)':'#e07060';}
    }
  } else {
    if(oppTotalEl) oppTotalEl.textContent='';
    if(myTotalEl) myTotalEl.textContent='';
  }

  // Phase bar handled above in turn state section

  // Deck draw target highlight
  // Deck target highlight handled in renderBoard discard row

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

  // Name labels (symmetric: left-aligned)
  const oppNameLabel=document.getElementById('opp-name-label');
  if(oppNameLabel) oppNameLabel.textContent=document.getElementById('opponent-name-store')?.textContent||'Opponent';
  const myNameLabel=document.getElementById('my-name-label');
  if(myNameLabel) myNameLabel.textContent=getName?getName().toUpperCase():'YOU';

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
      return `<div onclick="selectCard('${c.id}')" style="left:${x.toFixed(1)}px;top:0;z-index:100">${cardHTML(c,sel)}</div>`;
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

  const deckLen=getCards(gameState,'deck').length;

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

  const cbLabel=c=>colorblindMode?`<span style="position:absolute;bottom:var(--border-w);left:50%;transform:translateX(-50%);font-size:var(--text-sm);opacity:.4">${COLOR_SYMBOLS[c]}</span>`:'';
  function stackScoreLabelAt(cards, topPx){
    const hasCards=cards&&cards.length>0;
    const show=liveScoreEnabled&&hasCards;
    let score=0,cls='';
    if(hasCards){let w=0,s=0;for(const c of cards){if(c.value===0)w++;else s+=c.value;}score=(s-20)*(1+w)+(cards.length>=8?20:0);cls=score>=0?'color:var(--gold-bright)':'color:#e07060';}
    return `<div style="position:absolute;top:${topPx}px;left:0;right:0;text-align:center;font-family:'Cinzel',serif;font-size:var(--text-sm);line-height:var(--line-sm);${cls};opacity:${show?.7:0};font-variant-numeric:tabular-nums;pointer-events:none">${show?score:''}</div>`;
  }

  // Opponent row — score label floats below actual cards
  oppRow.innerHTML=COLORS.map(c=>{
    const cards=getCards(gameState,'expeditions',oppSlot,c);
    if(cards.length===0){
      return `<div class="card-col" style="height:${sectionH}px"><div class="card empty-slot" style="border-bottom:var(--border-w) solid ${COLOR_HEX[c]}30">${cbLabel(c)}</div></div>`;
    }
    const isExp=expandedStack&&expandedStack.who==='opp'&&expandedStack.color===c;
    const baseSo=cardOffset(cards.length);
    const so=isExp?spreadOffset:baseSo;
    const origin=stackOrigin(cards.length, so, 'opp');
    let inner=cards.map((card,i)=>`<div style="position:absolute;top:${origin+i*so}px;left:calc(var(--slot-pad) / 2);z-index:${isExp?100+i:i};transition:top .25s ease;transform:${jitter(card,i)}">${cardHTML(card)}</div>`).join('');
    // Stack score below last card (toward middle of board)
    const labelTop=origin+(cards.length-1)*so+curCardH;
    inner+=stackScoreLabelAt(cards, labelTop);
    return `<div class="card-col" style="height:${sectionH}px" onclick="toggleExpand('opp','${c}')">${inner}</div>`;
  }).join('');

  // Discard row (classic) — show stacked cards with jitter
  if(variant==='classic'){
    discardRow.innerHTML=COLORS.map(c=>{
      const pile=getCards(gameState,'discards',c);
      const topCard=pile.length>0?pile[pile.length-1]:null;
      const canDiscard=selectedCard && selectedCard.color===c && inPlayPhase && isMyTurn;
      const canDraw=inDrawPhase && isMyTurn && topCard && c!==gameState.lastDiscardedColor;
      if(!topCard){
        const cls=canDiscard?'card target':'card empty-slot';
        return `<div class="card-col"><div class="${cls}" style="${canDiscard?'':`border-bottom:var(--border-w) solid ${COLOR_HEX[c]}30`}" onclick="discardTo('${c}')">${canDiscard?'<span class="target-label">Discard</span>':''}</div></div>`;
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
        stackHTML+=`<div style="position:absolute;top:${i*so}px;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;transform:${jitter(card,i)};pointer-events:none">${cardHTML(card)}</div>`;
      }
      // Top card (interactive)
      const topSo=isExp?(pile.length-1)*spreadOffset:0;
      stackHTML+=`<div style="position:relative;top:${topSo}px;transform:${jitter(topCard,pile.length-1)}">${cardHTML(topCard,extra)}</div>`;
      const labels=(canDraw?'<span class="target-label">Draw</span>':'')+(canDiscard?'<span class="target-label">Discard</span>':'');
      return `<div class="card-col" style="position:relative;${isExp?'z-index:50':''}" onclick="${handler}">${stackHTML}${labels}</div>`;
    }).join('');

    // Render deck
    const isLandscapeLayout=window.innerWidth>window.innerHeight;
    const deckSlot=document.getElementById('deck-slot');
    const deckTarget=isMyTurn && inDrawPhase ? 'target' : '';
    let deckCardsHTML='';
    // Portrait layout: landscape cards in deck. Landscape layout: portrait cards (6th column)
    const deckCardClass=isLandscapeLayout?'card card-back':'card card-back deck-landscape';
    if(deckLen>0){
      const showCount=Math.min(deckLen,10);
      for(let i=0;i<showCount;i++){
        const h=(i*7919+i*i*31)&0xFFFF;
        const rot=((h%100)/100*6-3).toFixed(1);
        const dx=((((h>>4)%100)/100*5-2.5)).toFixed(1);
        const dy=((((h>>8)%100)/100*5-2.5)).toFixed(1);
        deckCardsHTML+=`<div class="${deckCardClass}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(${rot}deg) translate(${dx}px,${dy}px)"></div>`;
      }
    }
    const countLabel=`<div style="text-align:center;font-size:var(--text-sm);line-height:var(--line-sm);color:var(--parchment-dark);opacity:.5;font-family:'Cinzel',serif">${deckLen} left</div>`;

    if(isLandscapeLayout){
      // Landscape: deck as 6th column, appended without shifting the 5 discard columns
      // Don't change grid-template-columns — keep same 5-col layout as other rows
      // Instead, add deck as an absolutely positioned element to the right
      discardRow.style.gridTemplateColumns='';
      discardRow.style.position='relative';
      const slotW='var(--col-w)';
      const slotH='calc(var(--card-h) + var(--slot-pad))';
      const emptySlot=`<div class="card empty-slot" style="width:${slotW};height:${slotH};border-bottom:var(--border-w) solid rgba(212,168,67,.2)"></div>`;
      // Append deck inline as 6th grid item but keep grid at 6 cols with same justify
      discardRow.style.gridTemplateColumns=`repeat(${COLORS.length},var(--col-w)) var(--col-w)`;
      discardRow.style.justifyContent='start';
      // Calculate left padding to keep 5 discard cols centered with the other rows
      const totalGridW=`calc(${COLORS.length} * var(--col-w) + ${COLORS.length-1} * var(--gap-sm))`;
      const rowPad=`calc((100% - ${totalGridW}) / 2)`;
      discardRow.style.paddingLeft=rowPad;
      discardRow.style.paddingRight='0';
      discardRow.innerHTML+=`<div class="card-col ${deckTarget}" id="deck-col" onclick="drawFromDeck()" style="position:relative;width:${slotW};height:${slotH}">${deckLen>0?deckCardsHTML:emptySlot}${countLabel}</div>`;
      if(deckSlot) deckSlot.style.display='none';
    } else {
      // Portrait: deck below discards, landscape oriented, centered
      discardRow.style.gridTemplateColumns='';
      if(deckSlot){
        deckSlot.style.display='flex';
        deckSlot.style.flexDirection='column';
        deckSlot.style.justifyContent='center';
        deckSlot.style.alignItems='center';
        const slotW='calc(var(--card-h) + var(--slot-pad))';
        const slotH='var(--col-w)';
        const emptySlot=`<div class="card empty-slot" style="width:${slotW};height:${slotH};border-bottom:var(--border-w) solid rgba(212,168,67,.2)"></div>`;
        deckSlot.innerHTML=`<div class="${deckTarget}" id="deck-col" onclick="drawFromDeck()" style="position:relative;width:${slotW};height:${slotH}">${deckLen>0?deckCardsHTML:emptySlot}</div>${countLabel}`;
      }
    }
  }

  // My expedition row — score label floats above actual cards
  myRow.innerHTML=COLORS.map(c=>{
    const cards=getCards(gameState,'expeditions',mySlot,c);
    const canPlay=selectedCard && selectedCard.color===c && inPlayPhase && isMyTurn && canPlayOnExpedition(selectedCard,cards);
    const isUndoTarget=canUndo && lastPlayedCard.to==='expedition' && lastPlayedCard.color===c;
    if(cards.length===0){
      const cls=canPlay?'card target':'card empty-slot';
      return `<div class="card-col" style="height:${sectionH}px" onclick="playToExpedition('${c}')"><div class="${cls}" style="${canPlay?'':`border-bottom:var(--border-w) solid ${COLOR_HEX[c]}30`}">${canPlay?'<span class="target-label">Play</span>':''}${canPlay?'':cbLabel(c)}</div></div>`;
    }
    const nextIdx=cards.length;
    const isExp=expandedStack&&expandedStack.who==='my'&&expandedStack.color===c;
    // Always compute offset as if card is already played (so highlight matches final position)
    const withPlayCount=nextIdx+1;
    const baseSo=cardOffset(withPlayCount);
    const so=isExp?spreadOffset:baseSo;
    const origin=stackOrigin(withPlayCount, so, 'my');
    let inner=cards.map((card,i)=>{
      const isTop=i===cards.length-1;
      const extra=isTop&&isUndoTarget?'undoable':'';
      const handler=isTop&&isUndoTarget?` onclick="event.stopPropagation();undoLastPlay()"`:'';;
      return `<div style="position:absolute;top:${origin+i*so}px;left:calc(var(--slot-pad) / 2);z-index:${isExp?100+i:i};transition:top .25s ease;transform:${jitter(card,i)}"${handler}>${cardHTML(card,extra)}${isTop&&isUndoTarget?'<span class="undo-label">undo</span>':''}</div>`;
    }).join('');
    if(canPlay) inner+=`<div style="position:absolute;top:${origin+nextIdx*baseSo}px;left:calc(var(--slot-pad) / 2);z-index:${nextIdx}" onclick="event.stopPropagation();playToExpedition('${c}')"><div class="card target"><span class="target-label">Play</span></div></div>`;
    // Score label right above the first card
    const labelTop=origin-scoreLineH;
    inner+=stackScoreLabelAt(cards, labelTop);
    const stackClick=canPlay||isUndoTarget?`playToExpedition('${c}')`:`toggleExpand('my','${c}')`;
    return `<div class="card-col" style="height:${sectionH}px" onclick="${stackClick}">${inner}</div>`;
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
