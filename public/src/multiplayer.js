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
      const store=document.getElementById('opponent-name-store');if(store)store.textContent=p[oppSlot].name;
    }
  });
  listeners.push(()=>pRef.off('value',l2));
}

// Session save/restore
// Uses sessionStorage (per-tab) so multiple tabs don't conflict.
// Falls back to localStorage for cross-tab reconnect after browser restart.
function saveSession(){
  const data=JSON.stringify({myId,mySlot,roomCode,variant});
  sessionStorage.setItem('expedition-session',data);
  localStorage.setItem('expedition-session',data);
}
function clearSession(){
  sessionStorage.removeItem('expedition-session');
  localStorage.removeItem('expedition-session');
}

async function tryReconnect(){
  // Prefer sessionStorage (same tab refresh), fallback to localStorage (browser restart)
  const raw=sessionStorage.getItem('expedition-session')||localStorage.getItem('expedition-session');
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
    // Clear localStorage so another tab doesn't also reconnect to same game
    localStorage.removeItem('expedition-session');
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

// ===== MATCHMAKING =====
// Write to matchmaking/{variant}/{playerId}, listen for another player,
// first player to arrive creates the room, second joins it.

let matchmakingRef=null;
let matchmakingListener=null;
let matchmakingTimeout=null;
let matchmakingTimerInterval=null;

async function findOpponent(){
  const name=getName();
  if(!name){document.getElementById('lobby-error').textContent='Enter your name';return}
  myId=genId();
  const mmPath='matchmaking/'+variant;
  matchmakingRef=db.ref(mmPath);

  showScreen('matchmaking-screen');
  document.getElementById('matchmaking-text').textContent='Searching for an opponent...';

  // Start countdown timer display
  let secondsLeft=60;
  const timerEl=document.getElementById('matchmaking-timer');
  timerEl.textContent='Timeout in '+secondsLeft+'s';
  matchmakingTimerInterval=setInterval(()=>{
    secondsLeft--;
    if(secondsLeft>0) timerEl.textContent='Timeout in '+secondsLeft+'s';
    else timerEl.textContent='';
  },1000);

  // Timeout after 60 seconds
  matchmakingTimeout=setTimeout(()=>{
    cancelMatchmaking();
    toast('No opponents found');
  },60000);

  const myRef=matchmakingRef.child(myId);
  try{
    // Write our entry
    await myRef.set({id:myId,name:name,timestamp:firebase.database.ServerValue.TIMESTAMP});
    // Set up onDisconnect cleanup
    myRef.onDisconnect().remove();

    // Listen for all entries in this variant's matchmaking queue
    matchmakingListener=matchmakingRef.on('value',async snap=>{
      const data=snap.val();
      if(!data)return;
      const entries=Object.keys(data).filter(k=>k!==myId);
      if(entries.length===0)return; // still waiting alone

      // Found an opponent — pick the first one (by key)
      const oppId=entries[0];
      const opp=data[oppId];

      // Determine who creates the room: lexicographically smaller id is player1
      if(myId<oppId){
        // We are player1 — create the room
        roomCode=genRoomCode();
        roomRef=db.ref('rooms/'+roomCode);
        mySlot='player1';
        try{
          await roomRef.set({
            players:{player1:{id:myId,name:name},player2:{id:opp.id,name:opp.name}},
            status:'waiting',variant:variant,
            createdAt:firebase.database.ServerValue.TIMESTAMP
          });
          // Write the room code to matchmaking so the other player can find it
          await matchmakingRef.child(myId).update({roomCode:roomCode});
          // Clean up both matchmaking entries after a short delay
          // (the other player will read roomCode and join)
          cleanupMatchmakingState();
          saveSession();
          requestNotificationPermission();
          startGame();
        }catch(e){
          console.error('Matchmaking room creation error:',e);
          cancelMatchmaking();
          toast('Connection error');
        }
      }else{
        // We are player2 — wait for player1 to create the room
        // Check if the opponent has written a roomCode yet
        const oppData=data[oppId];
        if(!oppData.roomCode)return; // wait for player1 to write roomCode
        roomCode=oppData.roomCode;
        roomRef=db.ref('rooms/'+roomCode);
        mySlot='player2';
        variant=variant; // already set
        cleanupMatchmakingState();
        // Remove our matchmaking entry
        try{await db.ref('matchmaking/'+variant+'/'+myId).remove();}catch(e){}
        try{await db.ref('matchmaking/'+variant+'/'+oppId).remove();}catch(e){}
        saveSession();
        requestNotificationPermission();
        startGame();
      }
    });
  }catch(e){
    console.error('Matchmaking error:',e);
    cancelMatchmaking();
    document.getElementById('lobby-error').textContent='Connection error. Try again.';
  }
}

function cleanupMatchmakingState(){
  if(matchmakingListener&&matchmakingRef){
    matchmakingRef.off('value',matchmakingListener);
    matchmakingListener=null;
  }
  if(matchmakingTimeout){clearTimeout(matchmakingTimeout);matchmakingTimeout=null}
  if(matchmakingTimerInterval){clearInterval(matchmakingTimerInterval);matchmakingTimerInterval=null}
  // Cancel onDisconnect since we matched successfully
  if(matchmakingRef&&myId){
    matchmakingRef.child(myId).onDisconnect().cancel();
  }
}

async function cancelMatchmaking(){
  // Remove our matchmaking entry
  if(matchmakingRef&&myId){
    try{await matchmakingRef.child(myId).remove();}catch(e){console.error(e)}
  }
  cleanupMatchmakingState();
  matchmakingRef=null;
  showScreen('lobby-screen');
}
