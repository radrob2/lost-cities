// Monte Carlo AI Worker for Lost Cities — v2 Genome-Driven
// Uses evolved champion genomes for rollout policy instead of greedy heuristics.
// Accepts a `personality` parameter to select which genome drives decisions.

const COLORS = ['red','green','blue','white','yellow'];

// ==================== CHAMPION GENOMES ====================
const GENOMES = {
  explorer: {"earlyPlayThresh":9.31874987331733,"midPlayThresh":12.927747552815191,"latePlayThresh":23.953296628822002,"earlyPhaseBound":28.89448038265574,"latePhaseBound":20.090963223465774,"phaseBlendWidth":13.110359833540794,"endgameUrgency":1.3930433092565988,"maxExpeditions":2.564510721041944,"newExpMinProjected":13.212085830885115,"newExpLatePenalty":1.8889327514291065,"eightCardWeight":15.88621712964005,"concentrationBonus":5.260495859361455,"abandonThreshold":-2.425330226933994,"cardCountVsValue":0.9949403214434336,"focusVsSpread":0.6159129829070484,"colorSynergyWeight":3.5135224224740336,"orphanPenalty":5.953544807689881,"wagerMinProjected":18.873937005442034,"wagerEarlyBonus":13.720180018854538,"wagerLatePenalty":13.646236004820702,"wagerStackBonus":7.679413165897502,"wagerHoldValue":5.000340302926176,"wagerRiskTolerance":0.6663256481291748,"wagerMinHandCards":1.4101030739129106,"wagerAsVariance":-0.01613435215426895,"oppAwareness":2.837880056306286,"oppBlockWeight":6.176970088345348,"oppDiscardDanger":11.925211527046864,"oppWagerFear":4.887215542690004,"oppDenyDrawWeight":8.182970828359938,"oppColorTrackWeight":4.656485960735941,"oppDrawSignalWeight":6.290235078677773,"counterPlayWeight":3.4128140681196903,"oppMirrorPenalty":0.04260792863760354,"oppExpCountFear":2.0907138224177224,"drawDiscardThresh":0.16557551930880265,"drawExpBonus":13.37981782961586,"drawDenyBonus":7.3899336675818095,"drawDenyWagerMult":5.050021269442776,"drawUnknownValue":6.097414089391934,"drawForNewExpThresh":7.944308675093936,"drawDenyOnlyThresh":8.19976034657429,"drawInfoLeakPenalty":0.13461117338374073,"riskSeekWhenBehind":0.07099063224430768,"riskAvoidWhenAhead":0.6792181367154906,"scoreDiffSensitivity":0.12677643277004366,"variancePreference":-0.4768789501272819,"highCardBias":-0.12263821235024785,"safeDiscardBias":3.9081161985955037,"rushWhenAheadBy":36.65421944877993,"stallWhenBehindBy":12.793085252635638,"tempoAwareness":0.659305307518351,"drawSourceTempo":0.055870524633331975,"holdVsPlayBias":-2.1106903812860374,"cardCountingWeight":1.3881618370864597,"deckRichnessWeight":0.016236499227603174,"colorDepletionTrack":0.9452516371897146,"oppHandSizeWeight":2.3695480594956266,"perfectInfoEndgame":12.637109847666203},
  scholar: {"earlyPlayThresh":27.41458273030203,"midPlayThresh":24.02146808471833,"latePlayThresh":27.740234570634527,"earlyPhaseBound":26.24352369238649,"latePhaseBound":9.830090316752639,"phaseBlendWidth":11.853987617340742,"endgameUrgency":0.7393050557950864,"maxExpeditions":4.470923774163784,"newExpMinProjected":4.027997791375466,"newExpLatePenalty":16.97252066564923,"eightCardWeight":18.763952034423227,"concentrationBonus":13.620165348144901,"abandonThreshold":-12.456013409627218,"cardCountVsValue":0.15071386037466916,"focusVsSpread":0.8338219242435676,"colorSynergyWeight":0.572947251108662,"orphanPenalty":4.82508376404907,"wagerMinProjected":9.713831153087575,"wagerEarlyBonus":11.241909971781777,"wagerLatePenalty":25.25349171648392,"wagerStackBonus":6.66823464514405,"wagerHoldValue":4.943973832458745,"wagerRiskTolerance":0.6675591048406593,"wagerMinHandCards":2.26579047848381,"wagerAsVariance":-0.8433285253898228,"oppAwareness":1.9389498608370561,"oppBlockWeight":4.882305625437415,"oppDiscardDanger":0.8892960209970202,"oppWagerFear":10.144764932441483,"oppDenyDrawWeight":6.607768798097611,"oppColorTrackWeight":4.571426389398585,"oppDrawSignalWeight":3.0310497508587844,"counterPlayWeight":-1.928836384619399,"oppMirrorPenalty":6.4076680429603305,"oppExpCountFear":0.08390601460483982,"drawDiscardThresh":7.776383792933275,"drawExpBonus":1.969866313888824,"drawDenyBonus":11.93226560113024,"drawDenyWagerMult":6.960485597669393,"drawUnknownValue":3.7994211051734395,"drawForNewExpThresh":8.324228599822298,"drawDenyOnlyThresh":15.652262412670165,"drawInfoLeakPenalty":2.4766908493602893,"riskSeekWhenBehind":1.7153451914592046,"riskAvoidWhenAhead":0.763348524382764,"scoreDiffSensitivity":0.015599481186279275,"variancePreference":0.20906470017638634,"highCardBias":0.6315172888560046,"safeDiscardBias":1.3864530904228245,"rushWhenAheadBy":30.02309202567958,"stallWhenBehindBy":50.91813679710356,"tempoAwareness":1.2270913690590266,"drawSourceTempo":0.9540428395448917,"holdVsPlayBias":2.9711048131622233,"cardCountingWeight":0.3787955556068201,"deckRichnessWeight":3.581636794768773,"colorDepletionTrack":0.4178444285593681,"oppHandSizeWeight":0.5849528235976023,"perfectInfoEndgame":4.423677263365867},
  collector: {"earlyPlayThresh":16.666024576888887,"midPlayThresh":7.974388469085201,"latePlayThresh":13.29633260471197,"earlyPhaseBound":18.82474526522712,"latePhaseBound":19.17414647596463,"phaseBlendWidth":3.3691653080445247,"endgameUrgency":1.958603422301596,"maxExpeditions":2.82820618950739,"newExpMinProjected":25,"newExpLatePenalty":20.504508506891984,"eightCardWeight":12.984154788207633,"concentrationBonus":10.663316125910002,"abandonThreshold":-13.000881955695016,"cardCountVsValue":0.6862224025027535,"focusVsSpread":0.380391192361908,"colorSynergyWeight":0,"orphanPenalty":3.7778633836307773,"wagerMinProjected":2.3705470044466193,"wagerEarlyBonus":6.21886757256967,"wagerLatePenalty":13.869616151446635,"wagerStackBonus":15,"wagerHoldValue":5.214357796414745,"wagerRiskTolerance":1,"wagerMinHandCards":2.7351820371481925,"wagerAsVariance":0.2507621906519585,"oppAwareness":2.1032536236440165,"oppBlockWeight":3.4099293390166374,"oppDiscardDanger":1.8882222395506854,"oppWagerFear":14.99221422982933,"oppDenyDrawWeight":7.410151314893678,"oppColorTrackWeight":3.8928522219746133,"oppDrawSignalWeight":5.582062366769723,"counterPlayWeight":-1.570311284857519,"oppMirrorPenalty":6.186880198677198,"oppExpCountFear":0,"drawDiscardThresh":7.60138691269342,"drawExpBonus":1.7148879282831935,"drawDenyBonus":5.488288466411535,"drawDenyWagerMult":8.707442686475131,"drawUnknownValue":8.976711441072341,"drawForNewExpThresh":0,"drawDenyOnlyThresh":11.262606108215934,"drawInfoLeakPenalty":2.7830469017756077,"riskSeekWhenBehind":1.6043641347745536,"riskAvoidWhenAhead":0.48931450541129246,"scoreDiffSensitivity":0.01771178346868158,"variancePreference":-0.22466516607561604,"highCardBias":2.5767243805079203,"safeDiscardBias":3.2604458348400818,"rushWhenAheadBy":37.05759145438644,"stallWhenBehindBy":60,"tempoAwareness":0.32748490981062106,"drawSourceTempo":0.17908673720448337,"holdVsPlayBias":2.641983309793816,"cardCountingWeight":0.6185640550551857,"deckRichnessWeight":0.8421946202742763,"colorDepletionTrack":0,"oppHandSizeWeight":1.2148745302651043,"perfectInfoEndgame":6.652678226647355},
  spy: {"earlyPlayThresh":24.377489812228134,"midPlayThresh":19.735630538988588,"latePlayThresh":-2.56712947336775,"earlyPhaseBound":24.87671141664473,"latePhaseBound":21.113495441463893,"phaseBlendWidth":14.64535962720168,"endgameUrgency":0.9469747790882799,"maxExpeditions":4.305768236334643,"newExpMinProjected":14.12414334375498,"newExpLatePenalty":15.34898240889365,"eightCardWeight":0.4802710469583893,"concentrationBonus":9.464993737681732,"abandonThreshold":-21.106119765383795,"cardCountVsValue":0.2222472287391397,"focusVsSpread":0.9538592939474391,"colorSynergyWeight":1.1356876128342708,"orphanPenalty":1.2923214222229107,"wagerMinProjected":24.653968248648532,"wagerEarlyBonus":4.460952922184313,"wagerLatePenalty":10.271143107319983,"wagerStackBonus":11.715926279690105,"wagerHoldValue":4.227845652164732,"wagerRiskTolerance":0.5036634408032932,"wagerMinHandCards":0.2889584796555822,"wagerAsVariance":-0.27474717522939107,"oppAwareness":0.1863242508407783,"oppBlockWeight":8.870496378054034,"oppDiscardDanger":8.621144591502134,"oppWagerFear":5.110929881144405,"oppDenyDrawWeight":0.16698328915388672,"oppColorTrackWeight":3.0775813971228425,"oppDrawSignalWeight":4.704519303845309,"counterPlayWeight":-4.9835586014739714,"oppMirrorPenalty":3.314511488299341,"oppExpCountFear":3.4616153816570283,"drawDiscardThresh":14.96067369919702,"drawExpBonus":0.8057386382920251,"drawDenyBonus":14.470815789198245,"drawDenyWagerMult":6.0947545067669076,"drawUnknownValue":4.611870409803725,"drawForNewExpThresh":12.912083978022087,"drawDenyOnlyThresh":4.058915323344362,"drawInfoLeakPenalty":0.8618508254845814,"riskSeekWhenBehind":0.990162913190507,"riskAvoidWhenAhead":0.42624888203363875,"scoreDiffSensitivity":0.06333503957266427,"variancePreference":0.7025570258979648,"highCardBias":4.477991435532115,"safeDiscardBias":4.926550889966056,"rushWhenAheadBy":58.18359714901086,"stallWhenBehindBy":35.95126610285539,"tempoAwareness":1.4622997909003255,"drawSourceTempo":-0.3468295404171644,"holdVsPlayBias":-1.1776023056443017,"cardCountingWeight":0.631121696213842,"deckRichnessWeight":0.2122452547308018,"colorDepletionTrack":0.9987989956165935,"oppHandSizeWeight":2.4137698069063647,"perfectInfoEndgame":6.8753454443930115},
  gambler: {"earlyPlayThresh":20.064308426506912,"midPlayThresh":13.522197369266024,"latePlayThresh":-4.092235491811039,"earlyPhaseBound":29.155971015900136,"latePhaseBound":15.454167042247754,"phaseBlendWidth":12.715511475497228,"endgameUrgency":1.9695986453194205,"maxExpeditions":3.4512203681005316,"newExpMinProjected":10.173336242044904,"newExpLatePenalty":27.47483900825367,"eightCardWeight":0.9562118157135702,"concentrationBonus":4.761903968488136,"abandonThreshold":-12.282095325831932,"cardCountVsValue":0.20880220333571575,"focusVsSpread":0.47928357060866866,"colorSynergyWeight":7.489076780585881,"orphanPenalty":0.6208369644979772,"wagerMinProjected":0.3326318131069339,"wagerEarlyBonus":8.331248340573687,"wagerLatePenalty":5.016581659532207,"wagerStackBonus":12.005469929584315,"wagerHoldValue":0.9199570941409152,"wagerRiskTolerance":0.193313230798831,"wagerMinHandCards":0.7153624350170862,"wagerAsVariance":-0.7842180596119994,"oppAwareness":0.33116059492345506,"oppBlockWeight":8.096117715437723,"oppDiscardDanger":13.169871930272379,"oppWagerFear":4.086848643303843,"oppDenyDrawWeight":3.312562308177733,"oppColorTrackWeight":4.365465558582329,"oppDrawSignalWeight":2.550143035864453,"counterPlayWeight":-0.775766511316438,"oppMirrorPenalty":0.17738845759118327,"oppExpCountFear":2.0193422208353686,"drawDiscardThresh":19.698270855373995,"drawExpBonus":5.5735785784307215,"drawDenyBonus":9.143218251178315,"drawDenyWagerMult":0.025482128761608713,"drawUnknownValue":7.844944881941149,"drawForNewExpThresh":15.51502447693368,"drawDenyOnlyThresh":10.48931321624427,"drawInfoLeakPenalty":0.04027471569626573,"riskSeekWhenBehind":1.9061722006294834,"riskAvoidWhenAhead":1.911484723304512,"scoreDiffSensitivity":0.18320245567347102,"variancePreference":0.3658913821046763,"highCardBias":2.1295713734839072,"safeDiscardBias":3.2056061840679453,"rushWhenAheadBy":12.27432561679267,"stallWhenBehindBy":9.749238702067679,"tempoAwareness":0.08219343169771554,"drawSourceTempo":0.020239977200193326,"holdVsPlayBias":-1.8670637227568494,"cardCountingWeight":2.2672896809699044,"deckRichnessWeight":3.314123359755481,"colorDepletionTrack":2.9546053745551353,"oppHandSizeWeight":1.7388623909174727,"perfectInfoEndgame":16.513387422551546}
};

// ==================== SINGLE PILE CHAMPION GENOMES ====================
const GENOMES_SINGLE = {
  explorer: {"earlyPlayThresh":-2.594,"midPlayThresh":26.937,"latePlayThresh":-3.53,"earlyPhaseBound":37.149,"latePhaseBound":16.303,"phaseBlendWidth":6.836,"endgameUrgency":1.654,"maxExpeditions":2.571,"newExpMinProjected":11.366,"newExpLatePenalty":11.985,"eightCardWeight":0.045,"concentrationBonus":10.523,"abandonThreshold":-16.829,"cardCountVsValue":0.398,"focusVsSpread":0.446,"colorSynergyWeight":0.248,"orphanPenalty":5.982,"wagerMinProjected":27.355,"wagerEarlyBonus":11.314,"wagerLatePenalty":21.412,"wagerStackBonus":5.618,"wagerHoldValue":2.242,"wagerRiskTolerance":0.149,"wagerMinHandCards":0.803,"wagerAsVariance":0.38,"oppAwareness":0.768,"oppBlockWeight":5.173,"oppDiscardDanger":1.629,"oppWagerFear":7.344,"oppDenyDrawWeight":3.972,"oppColorTrackWeight":0.257,"oppDrawSignalWeight":6.591,"counterPlayWeight":-2.939,"oppMirrorPenalty":6.601,"oppExpCountFear":4.422,"drawDiscardThresh":12.076,"drawExpBonus":8.33,"drawDenyBonus":4.539,"drawDenyWagerMult":9.765,"drawUnknownValue":9.649,"drawForNewExpThresh":14.585,"drawDenyOnlyThresh":8.87,"drawInfoLeakPenalty":4.299,"riskSeekWhenBehind":1.959,"riskAvoidWhenAhead":0.812,"scoreDiffSensitivity":0.117,"variancePreference":-0.097,"highCardBias":-0.784,"safeDiscardBias":2.373,"rushWhenAheadBy":57.907,"stallWhenBehindBy":55.506,"tempoAwareness":1.131,"drawSourceTempo":-0.829,"holdVsPlayBias":1.592,"cardCountingWeight":1.271,"deckRichnessWeight":4.393,"colorDepletionTrack":0.79,"oppHandSizeWeight":1.67,"perfectInfoEndgame":13.26},
  scholar: {"earlyPlayThresh":27.639,"midPlayThresh":-17.407,"latePlayThresh":-11.682,"earlyPhaseBound":25.011,"latePhaseBound":15.052,"phaseBlendWidth":6.945,"endgameUrgency":0,"maxExpeditions":1.661,"newExpMinProjected":10,"newExpLatePenalty":17.523,"eightCardWeight":8.818,"concentrationBonus":4.622,"abandonThreshold":-36.043,"cardCountVsValue":0.614,"focusVsSpread":0.063,"colorSynergyWeight":0,"orphanPenalty":1.11,"wagerMinProjected":15,"wagerEarlyBonus":8.646,"wagerLatePenalty":1.202,"wagerStackBonus":15,"wagerHoldValue":4.701,"wagerRiskTolerance":0.304,"wagerMinHandCards":4,"wagerAsVariance":-0.006,"oppAwareness":2,"oppBlockWeight":0,"oppDiscardDanger":8.452,"oppWagerFear":2.533,"oppDenyDrawWeight":1.169,"oppColorTrackWeight":3.359,"oppDrawSignalWeight":2.168,"counterPlayWeight":-1.581,"oppMirrorPenalty":3.873,"oppExpCountFear":0,"drawDiscardThresh":8.473,"drawExpBonus":6.283,"drawDenyBonus":4.573,"drawDenyWagerMult":9.06,"drawUnknownValue":8.58,"drawForNewExpThresh":13.63,"drawDenyOnlyThresh":11.217,"drawInfoLeakPenalty":3.528,"riskSeekWhenBehind":1.876,"riskAvoidWhenAhead":1.5,"scoreDiffSensitivity":0.186,"variancePreference":-0.699,"highCardBias":-0.716,"safeDiscardBias":4,"rushWhenAheadBy":60,"stallWhenBehindBy":14.234,"tempoAwareness":2,"drawSourceTempo":-0.624,"holdVsPlayBias":2.972,"cardCountingWeight":1.067,"deckRichnessWeight":1.253,"colorDepletionTrack":2.184,"oppHandSizeWeight":2.02,"perfectInfoEndgame":10.78},
  collector: {"earlyPlayThresh":16.357,"midPlayThresh":29.26,"latePlayThresh":21.955,"earlyPhaseBound":27.356,"latePhaseBound":23.694,"phaseBlendWidth":13.904,"endgameUrgency":1.987,"maxExpeditions":4.039,"newExpMinProjected":22.298,"newExpLatePenalty":24.467,"eightCardWeight":19.962,"concentrationBonus":1.537,"abandonThreshold":-34.146,"cardCountVsValue":0.921,"focusVsSpread":0.273,"colorSynergyWeight":0.035,"orphanPenalty":3.09,"wagerMinProjected":-9.647,"wagerEarlyBonus":12.384,"wagerLatePenalty":0.332,"wagerStackBonus":12.886,"wagerHoldValue":6.68,"wagerRiskTolerance":0.567,"wagerMinHandCards":0.004,"wagerAsVariance":0.813,"oppAwareness":2.543,"oppBlockWeight":5.028,"oppDiscardDanger":13.729,"oppWagerFear":10.442,"oppDenyDrawWeight":11.347,"oppColorTrackWeight":1.418,"oppDrawSignalWeight":1.025,"counterPlayWeight":0.253,"oppMirrorPenalty":4.841,"oppExpCountFear":2.297,"drawDiscardThresh":5.077,"drawExpBonus":17.093,"drawDenyBonus":14.105,"drawDenyWagerMult":0.117,"drawUnknownValue":4.325,"drawForNewExpThresh":14.219,"drawDenyOnlyThresh":18.727,"drawInfoLeakPenalty":2.084,"riskSeekWhenBehind":1.56,"riskAvoidWhenAhead":0.821,"scoreDiffSensitivity":0.006,"variancePreference":-0.681,"highCardBias":-2.407,"safeDiscardBias":3.834,"rushWhenAheadBy":5.51,"stallWhenBehindBy":21.111,"tempoAwareness":1.879,"drawSourceTempo":0.543,"holdVsPlayBias":-2.427,"cardCountingWeight":0.823,"deckRichnessWeight":1.489,"colorDepletionTrack":1.773,"oppHandSizeWeight":2.805,"perfectInfoEndgame":10.918},
  spy: {"earlyPlayThresh":14.707,"midPlayThresh":7.555,"latePlayThresh":17.777,"earlyPhaseBound":28.857,"latePhaseBound":15.681,"phaseBlendWidth":5.887,"endgameUrgency":0.629,"maxExpeditions":3.952,"newExpMinProjected":25,"newExpLatePenalty":30,"eightCardWeight":6.693,"concentrationBonus":9.704,"abandonThreshold":-37.655,"cardCountVsValue":0.811,"focusVsSpread":0.496,"colorSynergyWeight":10,"orphanPenalty":8.711,"wagerMinProjected":21.21,"wagerEarlyBonus":4.927,"wagerLatePenalty":6.055,"wagerStackBonus":0,"wagerHoldValue":0.097,"wagerRiskTolerance":0.327,"wagerMinHandCards":2.844,"wagerAsVariance":0.273,"oppAwareness":2.5,"oppBlockWeight":7.408,"oppDiscardDanger":12,"oppWagerFear":13.755,"oppDenyDrawWeight":10,"oppColorTrackWeight":0,"oppDrawSignalWeight":1.172,"counterPlayWeight":4.273,"oppMirrorPenalty":5,"oppExpCountFear":1.513,"drawDiscardThresh":0,"drawExpBonus":24.456,"drawDenyBonus":15.555,"drawDenyWagerMult":6.332,"drawUnknownValue":3.357,"drawForNewExpThresh":0,"drawDenyOnlyThresh":11.903,"drawInfoLeakPenalty":3.011,"riskSeekWhenBehind":0,"riskAvoidWhenAhead":0.668,"scoreDiffSensitivity":0.158,"variancePreference":0.218,"highCardBias":-5,"safeDiscardBias":4,"rushWhenAheadBy":15.874,"stallWhenBehindBy":8.794,"tempoAwareness":1.075,"drawSourceTempo":-0.654,"holdVsPlayBias":2.792,"cardCountingWeight":2.797,"deckRichnessWeight":4.696,"colorDepletionTrack":0,"oppHandSizeWeight":0.468,"perfectInfoEndgame":14.91},
  gambler: {"earlyPlayThresh":6.652,"midPlayThresh":11.903,"latePlayThresh":-9.336,"earlyPhaseBound":23.867,"latePhaseBound":17.263,"phaseBlendWidth":1.036,"endgameUrgency":1.273,"maxExpeditions":2.041,"newExpMinProjected":11.421,"newExpLatePenalty":0.843,"eightCardWeight":19.223,"concentrationBonus":12.484,"abandonThreshold":-27.757,"cardCountVsValue":0.414,"focusVsSpread":0.194,"colorSynergyWeight":5.324,"orphanPenalty":2.755,"wagerMinProjected":-6.578,"wagerEarlyBonus":9.295,"wagerLatePenalty":29.964,"wagerStackBonus":1.845,"wagerHoldValue":7.961,"wagerRiskTolerance":0.121,"wagerMinHandCards":2.425,"wagerAsVariance":-0.692,"oppAwareness":1.373,"oppBlockWeight":6.692,"oppDiscardDanger":10.569,"oppWagerFear":11.588,"oppDenyDrawWeight":10.076,"oppColorTrackWeight":2.782,"oppDrawSignalWeight":6.841,"counterPlayWeight":4.517,"oppMirrorPenalty":7.301,"oppExpCountFear":4.612,"drawDiscardThresh":9.827,"drawExpBonus":21.328,"drawDenyBonus":9.391,"drawDenyWagerMult":6.723,"drawUnknownValue":4.41,"drawForNewExpThresh":11.578,"drawDenyOnlyThresh":14.96,"drawInfoLeakPenalty":2.487,"riskSeekWhenBehind":1.813,"riskAvoidWhenAhead":0.303,"scoreDiffSensitivity":0.058,"variancePreference":0.887,"highCardBias":1.959,"safeDiscardBias":0.651,"rushWhenAheadBy":21.532,"stallWhenBehindBy":59.89,"tempoAwareness":0.539,"drawSourceTempo":-0.107,"holdVsPlayBias":-1.829,"cardCountingWeight":0.826,"deckRichnessWeight":4.004,"colorDepletionTrack":1.389,"oppHandSizeWeight":2.025,"perfectInfoEndgame":19.865},
};

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

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

// ==================== RICH SENSORY SYSTEM ====================

function buildSensors(sim, player){
  const other=player==='player1'?'player2':'player1';
  const hand=sim.hands[player];
  const myExps=sim.expeditions[player];
  const oppExps=sim.expeditions[other];
  const deckSize=sim.deck.length;

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

  const unknown=ALL_CARDS.filter(c=>!seen.has(c.id));

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

    const unknownInColor=unknown.filter(x=>x.color===c);
    const totalInColor=12;
    const seenInColor=totalInColor-unknownInColor.length;

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

    let oppWagers=0;
    for(const e of oppExp) if(e.value===0) oppWagers++;

    const projected=scoreColor(myExp.concat(playable));

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
      depleted:seenInColor/totalInColor,
      discardTop,
      myCardCount:myExp.length,
      oppCardCount:oppExp.length,
    };
  }

  return {
    hand, deckSize, myScore, oppScore,
    scoreDiff:myScore-oppScore,
    myExpCount, oppExpCount,
    colorInfo, myHandByColor,
    unknown, unknownCount:unknown.length,
    oppPlayed:sim.oppPlayed||{}, oppDiscarded:sim.oppDiscarded||{}, oppDrew:sim.oppDrew||{},
    turnsLeft:Math.ceil(deckSize/2),
    variant:sim.variant,
  };
}

// ==================== GENOME-DRIVEN DECISION ENGINE ====================

function getPhase(g, deckSize){
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

  const curScore=ci.myScore;
  const futurePlayable=ci.playable.filter(p=>p.id!==card.id);
  const fullProjected=scoreColor([...ci.myExp, card, ...futurePlayable]);
  const delta=fullProjected-curScore;

  const threshold=blendPhase(g, phase, g.earlyPlayThresh, g.midPlayThresh, g.latePlayThresh);
  score=delta-threshold;

  if(card.value===0){
    return evaluateWager(g, sensors, card, color, phase);
  }

  if(ci.myExp.length===0){
    score-=g.newExpMinProjected;
    score-=phase.late*g.newExpLatePenalty;
    if(sensors.myExpCount>=Math.round(g.maxExpeditions)){
      score-=15*(sensors.myExpCount-g.maxExpeditions+1);
    }
  }

  const futureCount=ci.myCardCount+1+futurePlayable.length;
  if(futureCount>=8) score+=g.eightCardWeight;
  else if(futureCount>=6) score+=g.eightCardWeight*0.3;

  let maxExpLen=0;
  for(const c2 of COLORS){
    const len=(sensors.colorInfo[c2].myExp||[]).length;
    if(len>maxExpLen) maxExpLen=len;
  }
  if(ci.myCardCount===maxExpLen && ci.myCardCount>0) score+=g.concentrationBonus;

  score+=ci.myHand.length*g.colorSynergyWeight*g.focusVsSpread;
  if(ci.oppExp.length>0) score-=g.oppMirrorPenalty*g.oppAwareness;

  if(g.cardCountingWeight>0){
    score-=ci.depleted*g.colorDepletionTrack*5;
  }

  if(sensors.deckSize<10) score*=g.endgameUrgency;
  score-=g.holdVsPlayBias;

  if(sensors.scoreDiff<0) score+=g.riskSeekWhenBehind*Math.abs(sensors.scoreDiff)*g.scoreDiffSensitivity;
  if(sensors.scoreDiff>0) score-=g.riskAvoidWhenAhead*sensors.scoreDiff*g.scoreDiffSensitivity;

  return score;
}

function evaluateWager(g, sensors, card, color, phase){
  const ci=sensors.colorInfo[color];
  let score=0;

  const withWager=scoreColor([...ci.myExp, card, ...ci.playable.filter(p=>p.id!==card.id)]);
  const without=ci.projected;
  score=withWager-without;

  score-=g.wagerMinProjected;
  score+=blendPhase(g, phase, g.wagerEarlyBonus, 0, -g.wagerLatePenalty);

  let existingWagers=0;
  for(const e of ci.myExp) if(e.value===0) existingWagers++;
  score+=existingWagers*g.wagerStackBonus;

  score-=g.wagerHoldValue;
  if(ci.myHand.length<g.wagerMinHandCards) score-=10;
  score*=(0.5+g.wagerRiskTolerance);

  if(sensors.scoreDiff<0) score+=g.wagerAsVariance*10;
  if(sensors.scoreDiff>0) score-=g.wagerAsVariance*5;

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
  let cost=0;

  let inSeq=false;
  for(const p of ci.playable) if(p.id===card.id){inSeq=true;break;}

  if(inSeq){
    const without=ci.myScore;
    const withAll=ci.projected;
    cost=(withAll-without);
    if(ci.playable.length>1) cost/=ci.playable.length;
    cost=Math.max(cost, card.value||3);
    cost+=ci.myHand.length*g.colorSynergyWeight;
  } else {
    cost=card.value*0.3;
  }

  if(ci.myExp.length===0 && ci.myHand.length<=1){
    cost-=g.orphanPenalty;
  }

  cost+=card.value*g.highCardBias*0.1;

  const oppCost=evaluateOppGain(g, sensors, card, color)*g.oppAwareness;
  cost+=oppCost;

  const oppCanUse=ci.oppExp.length>0 && canPlayCard(card, ci.oppExp);
  if(!oppCanUse) cost-=g.safeDiscardBias;

  cost+=g.drawInfoLeakPenalty;

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

  if(ci.oppCardCount>=3) gain+=g.oppColorTrackWeight*ci.oppCardCount;

  return gain;
}

function evaluateDraw(g, sensors, color, card, isDeny){
  const ci=sensors.colorInfo[color];
  const phase=getPhase(g, sensors.deckSize);
  let score=0;

  if(!isDeny){
    score=card.value||2;
    if(ci.myExp.length>0) score+=g.drawExpBonus;
    if(ci.myExp.length===0) score-=g.drawForNewExpThresh;

    if(ci.oppExp.length>0 && canPlayCard(card, ci.oppExp)){
      score+=g.drawDenyBonus*g.oppAwareness;
      score+=ci.oppWagers*g.drawDenyWagerMult;
    }
  } else {
    score=g.oppDenyDrawWeight*g.oppAwareness;
    score+=ci.oppWagers*g.drawDenyWagerMult;
    score-=g.drawDenyOnlyThresh;
  }

  score-=g.drawInfoLeakPenalty;

  if(sensors.scoreDiff>g.rushWhenAheadBy){
    score-=g.drawSourceTempo*g.tempoAwareness*5;
  }
  if(sensors.scoreDiff<-g.stallWhenBehindBy){
    score+=g.drawSourceTempo*g.tempoAwareness*5;
  }

  return score;
}

// ==================== GENOME-DRIVEN TURN ====================

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

    if(canPlayCard(card, exp)){
      const ps=evaluatePlay(g, sensors, card, c);
      if(ps>bestPlayScore){bestPlayScore=ps; bestPlayIdx=i;}
    }

    const dc=evaluateDiscard(g, sensors, card, c);
    if(dc<bestDiscCost){bestDiscCost=dc; bestDiscIdx=i;}
  }

  const action=(bestPlayIdx>=0 && bestPlayScore>0)?'play':'discard';
  const chosenIdx=action==='play'?bestPlayIdx:bestDiscIdx;
  const card=hand.splice(chosenIdx,1)[0];
  let discardedColor=null, justDiscarded=false;

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
      hand.push(sim.discards[bestDC].pop());
      drew=true;
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

// ==================== MONTE CARLO INFRASTRUCTURE ====================

function getUnknownPool(gs, variant){
  const known=new Set();
  for(const c of gs.hands.player2) known.add(c.id);
  for(const p of ['player1','player2'])
    for(const c of COLORS)
      for(const card of (gs.expeditions[p][c]||[])) known.add(card.id);
  if(variant==='classic'){
    for(const c of COLORS)
      for(const card of (gs.discards[c]||[])) known.add(card.id);
  } else {
    for(const card of (gs.singlePile||[])) known.add(card.id);
  }
  return ALL_CARDS.filter(c=>!known.has(c.id));
}

function createSim(gs, oppHand, deck, variant){
  const sim={
    hands:{
      player1: oppHand.map(c=>({...c})),
      player2: gs.hands.player2.map(c=>({...c}))
    },
    expeditions:{player1:{}, player2:{}},
    deck: deck.map(c=>({...c})),
    variant
  };
  for(const p of ['player1','player2'])
    for(const c of COLORS)
      sim.expeditions[p][c]=(gs.expeditions[p][c]||[]).map(x=>({...x}));

  if(variant==='classic'){
    sim.discards={};
    for(const c of COLORS) sim.discards[c]=(gs.discards[c]||[]).map(x=>({...x}));
  } else {
    sim.singlePile=(gs.singlePile||[]).map(x=>({...x}));
  }
  return sim;
}

// Rollout using genome-driven policy for BOTH players
function rollout(sim, startingPlayer, genome){
  // If deck is small enough, use minimax for perfect endgame play
  if(sim.deck.length<=6){
    return endgameSolve(sim, startingPlayer);
  }
  let turn=startingPlayer;
  let safety=80;
  while(safety-->0){
    if(genomeTurn(sim, turn, genome)) break;
    turn=turn==='player1'?'player2':'player1';
  }
  const s1=scoreAll(sim.expeditions.player1);
  const s2=scoreAll(sim.expeditions.player2);
  return s2>s1? 1 : (s2===s1? 0.5 : 0);
}

// ========== ENDGAME SOLVER (Shallow Minimax with Alpha-Beta) ==========
// When deck ≤ 6, use minimax with alpha-beta pruning for 2 plies (my turn + opponent turn)
// then evaluate leaf nodes with score differential. Much stronger than greedy rollout
// for endgame decisions because it considers opponent's best response.

const ENDGAME_MAX_DEPTH=2; // 2 plies = I play, opponent plays, then evaluate

function endgameSolve(sim, startingPlayer){
  const result=minimax(sim, startingPlayer, 0, -Infinity, Infinity);
  return result>0?1:(result===0?0.5:0);
}

function minimax(sim, player, depth, alpha, beta){
  // Terminal: game over or depth limit reached — evaluate position
  if(sim.deck.length===0 || depth>=ENDGAME_MAX_DEPTH){
    const s1=scoreAll(sim.expeditions.player1);
    const s2=scoreAll(sim.expeditions.player2);
    return s2-s1;
  }

  const hand=sim.hands[player];
  if(hand.length===0){
    const s1=scoreAll(sim.expeditions.player1);
    const s2=scoreAll(sim.expeditions.player2);
    return s2-s1;
  }

  const other=player==='player1'?'player2':'player1';
  const isMaximizing=(player==='player2');

  // Generate moves — limit branching by only considering top moves
  const moves=generateAllMoves(sim, player);
  if(moves.length===0){
    const s1=scoreAll(sim.expeditions.player1);
    const s2=scoreAll(sim.expeditions.player2);
    return s2-s1;
  }

  // Move ordering: score each move quickly to search best first (improves pruning)
  for(const move of moves){
    const card=sim.hands[player][move.playIdx];
    move.heuristic=0;
    if(move.playType==='play'){
      move.heuristic=card.value||3; // playing is usually better
      const exp=sim.expeditions[player][card.color]||[];
      if(exp.length>0) move.heuristic+=5; // extending expedition is great
    } else {
      move.heuristic=-(card.value||1); // discarding high cards is bad
    }
    if(move.drawType==='discard') move.heuristic+=2; // known card > unknown
  }
  moves.sort((a,b)=>isMaximizing?(b.heuristic-a.heuristic):(a.heuristic-b.heuristic));

  // Cap moves to prevent explosion (top 15 most promising)
  const cappedMoves=moves.slice(0, 15);

  let bestVal=isMaximizing?-Infinity:Infinity;

  for(const move of cappedMoves){
    const undo=applyMove(sim, player, move);
    const gameOver=(sim.deck.length===0);
    let val;
    if(gameOver){
      const s1=scoreAll(sim.expeditions.player1);
      const s2=scoreAll(sim.expeditions.player2);
      val=s2-s1;
    } else {
      val=minimax(sim, other, depth+1, alpha, beta);
    }
    undoMove(sim, player, move, undo);

    if(isMaximizing){
      if(val>bestVal) bestVal=val;
      if(val>alpha) alpha=val;
    } else {
      if(val<bestVal) bestVal=val;
      if(val<beta) beta=val;
    }
    if(beta<=alpha) break;
  }

  return bestVal;
}

function generateAllMoves(sim, player){
  const hand=sim.hands[player];
  const moves=[];
  const variant=sim.variant;
  const seen=new Set();

  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const c=card.color;
    const exp=sim.expeditions[player][c]||[];

    // Play actions
    if(canPlayCard(card, exp)){
      const pkey='P'+c+card.value;
      if(!seen.has(pkey)){
        seen.add(pkey);
        // Draw from deck
        if(sim.deck.length>0) moves.push({playIdx:i, playType:'play', drawType:'deck'});
        // Draw from discard piles
        if(variant==='classic'){
          for(const dc of COLORS){
            const pile=sim.discards[dc]||[];
            if(pile.length>0) moves.push({playIdx:i, playType:'play', drawType:'discard', drawColor:dc});
          }
        } else if(sim.singlePile && sim.singlePile.length>0){
          moves.push({playIdx:i, playType:'play', drawType:'single'});
        }
      }
    }

    // Discard actions
    const dkey='D'+c+card.value;
    if(!seen.has(dkey)){
      seen.add(dkey);
      // Draw from deck
      if(sim.deck.length>0) moves.push({playIdx:i, playType:'discard', drawType:'deck'});
      // Draw from discard (can't draw from same color you just discarded)
      if(variant==='classic'){
        for(const dc of COLORS){
          if(dc===c) continue; // can't draw from color you just discarded
          const pile=sim.discards[dc]||[];
          if(pile.length>0) moves.push({playIdx:i, playType:'discard', drawType:'discard', drawColor:dc});
        }
        // Also: after discarding, the discarded card is on top — opponent could draw it
        // but we can't draw our own discard. Already handled by dc===c check.
      } else {
        // Single pile: can't draw if you just discarded
        // Draw from deck only after discarding to single pile
        // (already added deck draw above)
      }
    }
  }

  // If no moves generated (shouldn't happen), add a fallback
  if(moves.length===0 && hand.length>0){
    moves.push({playIdx:0, playType:'discard', drawType:'deck'});
  }

  return moves;
}

function applyMove(sim, player, move){
  const hand=sim.hands[player];
  const card=hand[move.playIdx];
  const undo={card, playIdx:move.playIdx, playType:move.playType, drawType:move.drawType};

  // Remove card from hand
  hand.splice(move.playIdx, 1);

  // Phase 1: play or discard
  if(move.playType==='play'){
    const exp=(sim.expeditions[player][card.color]=sim.expeditions[player][card.color]||[]);
    exp.push(card);
    undo.playColor=card.color;
  } else {
    if(sim.variant==='single'){
      sim.singlePile.push(card);
      undo.discardedToSingle=true;
    } else {
      const pile=(sim.discards[card.color]=sim.discards[card.color]||[]);
      pile.push(card);
      undo.discardColor=card.color;
    }
  }

  // Phase 2: draw
  undo.drawnCard=null;
  if(move.drawType==='deck'){
    if(sim.deck.length>0){
      const drawn=sim.deck.pop();
      hand.push(drawn);
      undo.drawnCard=drawn;
      undo.drawnFrom='deck';
    }
  } else if(move.drawType==='discard'){
    const pile=sim.discards[move.drawColor];
    if(pile && pile.length>0){
      const drawn=pile.pop();
      hand.push(drawn);
      undo.drawnCard=drawn;
      undo.drawnFrom='discard';
      undo.drawColor=move.drawColor;
    }
  } else if(move.drawType==='single'){
    if(sim.singlePile && sim.singlePile.length>0){
      const drawn=sim.singlePile.pop();
      hand.push(drawn);
      undo.drawnCard=drawn;
      undo.drawnFrom='single';
    }
  }

  return undo;
}

function undoMove(sim, player, move, undo){
  const hand=sim.hands[player];

  // Undo draw (remove drawn card from hand, put back where it came from)
  if(undo.drawnCard){
    const idx=hand.findIndex(c=>c.id===undo.drawnCard.id);
    if(idx>=0) hand.splice(idx,1);
    if(undo.drawnFrom==='deck') sim.deck.push(undo.drawnCard);
    else if(undo.drawnFrom==='discard') sim.discards[undo.drawColor].push(undo.drawnCard);
    else if(undo.drawnFrom==='single') sim.singlePile.push(undo.drawnCard);
  }

  // Undo play/discard
  if(undo.playType==='play'){
    sim.expeditions[player][undo.playColor].pop();
  } else {
    if(undo.discardedToSingle) sim.singlePile.pop();
    else sim.discards[undo.discardColor].pop();
  }

  // Put card back in hand at original position
  hand.splice(undo.playIdx, 0, undo.card);
}

// ========== ACTION ENUMERATION ==========

function getPhase1Actions(gs){
  const hand=gs.hands.player2;
  const actions=[];
  const seen=new Set();

  for(let i=0;i<hand.length;i++){
    const card=hand[i];
    const exp=gs.expeditions.player2[card.color]||[];

    if(canPlayCard(card, exp)){
      const key='P_'+card.color+'_'+card.value;
      if(!seen.has(key)){
        seen.add(key);
        actions.push({type:'play', idx:i, card, color:card.color});
      }
    }

    const dkey='D_'+card.color+'_'+card.value;
    if(!seen.has(dkey)){
      seen.add(dkey);
      actions.push({type:'discard', idx:i, card, color:card.color});
    }
  }
  return actions;
}

function getPhase2Actions(gs, variant, discardedColor, justDiscarded){
  const actions=[{type:'deck'}];

  if(variant==='classic'){
    for(const c of COLORS){
      if(c===discardedColor) continue;
      const pile=gs.discards[c]||[];
      if(pile.length>0) actions.push({type:'discard', color:c});
    }
  } else if(!justDiscarded){
    if((gs.singlePile||[]).length>0) actions.push({type:'single'});
  }
  return actions;
}

// ========== MONTE CARLO EVALUATION ==========

function evaluate(gs, variant, simCount, genome){
  const pool=getUnknownPool(gs, variant);
  const deckSize=gs.deckSize;
  const oppHandSize=pool.length-deckSize;

  if(oppHandSize<0 || pool.length===0){
    return {phase1:{type:'discard',idx:0,card:gs.hands.player2[0],color:gs.hands.player2[0].color}, phase2:{type:'deck'}};
  }

  const phase1Actions=getPhase1Actions(gs);
  if(phase1Actions.length===0) return null;

  const pairs=[];
  for(const p1 of phase1Actions){
    const discColor=p1.type==='discard'? p1.color : null;
    const justDisc=p1.type==='discard';

    const tempDiscards=variant==='classic'?{}:null;
    const tempSingle=variant==='single'?[...(gs.singlePile||[])]:null;
    if(variant==='classic'){
      for(const c of COLORS) tempDiscards[c]=[...(gs.discards[c]||[])];
      if(p1.type==='discard') tempDiscards[p1.color].push(p1.card);
    } else if(p1.type==='discard'){
      tempSingle.push(p1.card);
    }
    const tempGs={...gs, discards:tempDiscards||gs.discards, singlePile:tempSingle||gs.singlePile};

    const p2Actions=getPhase2Actions(tempGs, variant, discColor, justDisc);
    for(const p2 of p2Actions){
      pairs.push({p1, p2, wins:0});
    }
  }

  const minSims=Math.min(simCount, 80);
  let simsRan=0;
  for(let s=0;s<simCount;s++){
    simsRan++;
    const shuffled=shuffle([...pool]);
    const oppHand=shuffled.slice(0, oppHandSize);
    const deck=shuffled.slice(oppHandSize);

    for(const pair of pairs){
      const sim=createSim(gs, oppHand, deck, variant);

      const p1=pair.p1;
      const cardIdx=sim.hands.player2.findIndex(c=>c.id===p1.card.id);
      if(cardIdx===-1) continue;
      const playedCard=sim.hands.player2.splice(cardIdx,1)[0];

      if(p1.type==='play'){
        sim.expeditions.player2[playedCard.color].push(playedCard);
      } else {
        if(variant==='single'){
          sim.singlePile.push(playedCard);
        } else {
          sim.discards[playedCard.color].push(playedCard);
        }
      }

      const p2=pair.p2;
      let gameOver=false;
      if(p2.type==='deck'){
        if(sim.deck.length===0){gameOver=true;}
        else {
          sim.hands.player2.push(sim.deck.pop());
          if(sim.deck.length===0) gameOver=true;
        }
      } else if(p2.type==='discard'){
        const pile=sim.discards[p2.color];
        if(pile.length>0) sim.hands.player2.push(pile.pop());
      } else if(p2.type==='single'){
        if(sim.singlePile.length>0) sim.hands.player2.push(sim.singlePile.pop());
      }

      if(gameOver){
        const s1=scoreAll(sim.expeditions.player1);
        const s2=scoreAll(sim.expeditions.player2);
        pair.wins+= s2>s1?1:(s2===s1?0.5:0);
      } else {
        pair.wins+=rollout(sim,'player1', genome);
      }
    }

    // Early stopping
    if(s>=minSims && s%20===0){
      let best1=0, best2=0;
      for(const p of pairs){
        if(p.wins>best1){best2=best1; best1=p.wins;}
        else if(p.wins>best2) best2=p.wins;
      }
      const n=s+1;
      const gap=(best1-best2)/n;
      const se=Math.sqrt(0.25/n);
      if(gap>4*se) break;
    }
  }

  let best=pairs[0];
  for(let i=1;i<pairs.length;i++){
    if(pairs[i].wins>best.wins) best=pairs[i];
  }

  return {phase1: best.p1, phase2: best.p2, winRate: best.wins/simsRan,
          simsRan,
          stats: pairs.map(p=>({
            p1: p.p1.type+'_'+p.p1.color+'_'+(p.p1.card.value||'W'),
            p2: p.p2.type+(p.p2.color?'_'+p.p2.color:''),
            wr: (p.wins/simsRan*100).toFixed(1)+'%'
          }))};
}

// ========== WORKER MESSAGE HANDLER ==========
self.onmessage=function(e){
  const {gameState, variant, simCount, personality}=e.data;
  const genomeSet=variant==='single'?GENOMES_SINGLE:GENOMES;
  const genome=genomeSet[personality||'scholar']||genomeSet.scholar;
  const t0=performance.now();
  const result=evaluate(gameState, variant, simCount||500, genome);
  const elapsed=Math.round(performance.now()-t0);
  self.postMessage({result, elapsed});
};
