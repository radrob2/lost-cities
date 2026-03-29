// ===== ANIMATION SYSTEM =====
// True FLIP on actual elements. No clones ever.
// 1. Grab card's position BEFORE state change
// 2. Commit state + render (card appears in new spot)
// 3. Set transform to snap it back to old position visually
// 4. Transition transform to none (slides to real position)

const ANIM_MS=300;

// Call BEFORE commit: returns {id, rect} for the card
function grabPos(cardId){
  const el=document.querySelector(`[data-id="${cardId}"]`);
  if(!el) return null;
  return {id:cardId, rect:el.getBoundingClientRect()};
}

// Call AFTER commit+render: slides card from old position to new
function slideFrom(saved){
  if(!saved) return;
  requestAnimationFrame(()=>{
    const el=document.querySelector(`[data-id="${saved.id}"]`);
    if(!el) return;
    const to=el.getBoundingClientRect();
    const dx=saved.rect.left-to.left;
    const dy=saved.rect.top-to.top;
    if(Math.abs(dx)<3 && Math.abs(dy)<3) return;
    el.style.transition='none';
    el.style.transform=`translate(${dx}px,${dy}px)`;
    el.offsetHeight;
    el.style.transition=`transform ${ANIM_MS}ms cubic-bezier(.2,.8,.3,1)`;
    el.style.transform='';
    el.addEventListener('transitionend',()=>{el.style.transition='';},{once:true});
  });
}

// For draw pile draws: card doesn't exist yet, so we grab the draw pile's position
// and slide the new card from there
function slideFromEl(sourceEl, cardId){
  if(!sourceEl) return;
  const rect=sourceEl.getBoundingClientRect();
  requestAnimationFrame(()=>{
    const el=document.querySelector(`[data-id="${cardId}"]`);
    if(!el) return;
    const to=el.getBoundingClientRect();
    const dx=rect.left-to.left;
    const dy=rect.top-to.top;
    el.style.transition='none';
    el.style.transform=`translate(${dx}px,${dy}px)`;
    el.offsetHeight;
    el.style.transition=`transform ${ANIM_MS}ms cubic-bezier(.2,.8,.3,1)`;
    el.style.transform='';
    el.addEventListener('transitionend',()=>{el.style.transition='';},{once:true});
  });
}

// Legacy stub — still called by aiFallbackTurn
function onAnimationsDone(cb){cb()}
