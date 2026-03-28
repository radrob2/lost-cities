// --- ONBOARDING TUTORIAL ---
// Depends on: SFX, showScreen, localStorage

let tutorialSlide=0;
const TUTORIAL_TOTAL=4;

function showTutorial(){
  tutorialSlide=0;
  renderTutorialSlide();
  document.getElementById('tutorial-overlay').classList.add('active');
}

function closeTutorial(){
  SFX.select();
  document.getElementById('tutorial-overlay').classList.remove('active');
  localStorage.setItem('expedition-onboarded','1');
}

function renderTutorialSlide(){
  const slides=document.querySelectorAll('.tutorial-slide');
  const dots=document.querySelectorAll('.tutorial-dot');
  slides.forEach((s,i)=>{s.classList.toggle('active',i===tutorialSlide)});
  dots.forEach((d,i)=>{d.classList.toggle('active',i===tutorialSlide)});
  const btn=document.getElementById('tutorial-next-btn');
  const skip=document.getElementById('tutorial-skip');
  if(tutorialSlide===TUTORIAL_TOTAL-1){
    btn.textContent='Got it!';
    btn.classList.add('primary');
    skip.style.display='none';
  }else{
    btn.textContent='Next';
    btn.classList.remove('primary');
    skip.style.display='';
  }
}

function advanceTutorial(){
  SFX.select();
  if(tutorialSlide>=TUTORIAL_TOTAL-1){closeTutorial();return}
  tutorialSlide++;
  renderTutorialSlide();
}

function goToTutorialSlide(i){
  if(i===tutorialSlide)return;
  SFX.select();
  tutorialSlide=i;
  renderTutorialSlide();
}

// Swipe support for tutorial
(function(){
  const el=document.getElementById('tutorial-overlay');
  let startX=0,startY=0;
  el.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY},{passive:true});
  el.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-startX;
    const dy=e.changedTouches[0].clientY-startY;
    if(Math.abs(dx)<50||Math.abs(dy)>Math.abs(dx))return;
    if(dx<0&&tutorialSlide<TUTORIAL_TOTAL-1){SFX.select();tutorialSlide++;renderTutorialSlide()}
    else if(dx>0&&tutorialSlide>0){SFX.select();tutorialSlide--;renderTutorialSlide()}
  },{passive:true});
})();

// No auto-start — tutorial is accessible via "How to Play" button in lobby
