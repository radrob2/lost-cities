// ===== MULTIPLAYER (Firebase RTDB) =====
// Depends on: globals (db, myId, mySlot, roomCode, roomRef, variant, gameState, listeners),
//             COLORS, genId, genRoomCode, showScreen, renderGame, showGameOver, toast,
//             requestNotificationPermission, createDeck, saveSession, clearSession

function showJoin(){showScreen('join-screen');document.getElementById('room-code-input').focus()}
function getName(screen){
  const id=screen==='join'?'join-player-name':'player-name';
  let n=document.getElementById(id).value.trim();
  if(!n)n='Explorer';return n.substring(0,12);
}

async function createRoom(){
  const name=getName();
  if(!name){document.getElementById('lobby-error').textContent='Enter your name';return}
  myId=genId(); roomCode=genRoomCode(); roomRef=db.ref('rooms/'+roomCode);
  try{
    await roomRef.set({players:{player1:{id:myId,name:name},player2:null},status:'waiting',variant:variant,createdAt:firebase.database.ServerValue.TIMESTAMP});
    mySlot='player1';
    document.getElementById('display-code').textContent=roomCode;
    showScreen('waiting-screen');
    saveSession();
    requestNotificationPermission();
    const ref=roomRef.child('players/player2');
    const l=ref.on('value',snap=>{if(snap.val())startGame()});
    listeners.push(()=>ref.off('value',l));
  }catch(e){document.getElementById('lobby-error').textContent='Connection error. Try again.';console.error(e)}
}

async function joinRoom(){
  const code=document.getElementById('room-code-input').value.trim().toUpperCase();
  if(code.length!==4){document.getElementById('join-error').textContent='Enter a 4-letter code';return}
  const name=getName('join');
  myId=genId(); roomCode=code; roomRef=db.ref('rooms/'+roomCode);
  try{
    const snap=await roomRef.once('value');
    const data=snap.val();
    if(!data){document.getElementById('join-error').textContent='Room not found';return}
    if(data.status!=='waiting'){document.getElementById('join-error').textContent='Game already started';return}
    if(data.players.player2){document.getElementById('join-error').textContent='Room is full';return}
    await roomRef.child('players/player2').set({id:myId,name:name});
    variant=data.variant||'classic';
    mySlot='player2'; saveSession(); requestNotificationPermission(); startGame();
  }catch(e){document.getElementById('join-error').textContent='Error joining room';console.error(e)}
}

async function startGame(){
  showScreen('game-screen');
  if(mySlot==='player1'){
    const deck=createDeck();
    const hand1=deck.splice(0,8), hand2=deck.splice(0,8);
    const exps={}, discard={};
    COLORS.forEach(c=>{exps[c]=[];discard[c]=[]});
    const firstPlayer=typeof seriesFirstPlayer!=='undefined'?seriesFirstPlayer:(Math.random()<0.5?'player1':'player2');
    await roomRef.child('game').set({
      deck, hands:{player1:hand1,player2:hand2},
      expeditions:{player1:exps,player2:exps},
      discards:discard, singlePile:[],
      currentTurn:firstPlayer, phase:'play',
      lastDiscardedColor:null, justDiscarded:false, status:'playing'
    });
    await roomRef.child('status').set('playing');
  }
  // Read variant from room
  const vSnap=await roomRef.child('variant').once('value');
  if(vSnap.val()) variant=vSnap.val();

  const gRef=roomRef.child('game');
  const l=gRef.on('value',snap=>{
    const data=snap.val(); if(!data)return;
    gameState=data; renderGame();
    if(data.status==='finished')showGameOver();
  });
  listeners.push(()=>gRef.off('value',l));
  const pRef=roomRef.child('players');
  const l2=pRef.on('value',snap=>{
    const p=snap.val(); if(!p)return;
    const oppSlot=mySlot==='player1'?'player2':'player1';
    if(p[oppSlot]){
      document.getElementById('opponent-name').textContent=p[oppSlot].name;
      const ol=document.getElementById('opp-label');if(ol)ol.textContent=p[oppSlot].name+"'s Expeditions";
    }
  });
  listeners.push(()=>pRef.off('value',l2));
}

// Session save/restore
function saveSession(){
  localStorage.setItem('expedition-session',JSON.stringify({myId,mySlot,roomCode,variant}));
}
function clearSession(){
  localStorage.removeItem('expedition-session');
}

async function tryReconnect(){
  const raw=localStorage.getItem('expedition-session');
  if(!raw)return;
  try{
    const s=JSON.parse(raw);
    const ref=db.ref('rooms/'+s.roomCode);
    const snap=await ref.once('value');
    const data=snap.val();
    if(!data||!data.game){clearSession();return}
    const player=data.players&&data.players[s.mySlot];
    if(!player||player.id!==s.myId){clearSession();return}
    myId=s.myId; mySlot=s.mySlot; roomCode=s.roomCode; variant=s.variant||'classic';
    roomRef=ref;
    startGame();
    toast('Reconnected');
  }catch(e){clearSession();console.error(e)}
}

function leaveGame(){
  listeners.forEach(fn=>fn()); listeners=[];
  roomRef=null;roomCode=null;gameState=null;selectedCard=null;
  seriesScore={you:0,opp:0};seriesFirstPlayer='player1';
  clearSession();
  document.title='Expedition';
  showScreen('lobby-screen');
}
