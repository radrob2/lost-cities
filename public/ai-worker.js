// Monte Carlo AI Worker for Lost Cities — v2 Genome-Driven
// Uses evolved champion genomes for rollout policy instead of greedy heuristics.
// Accepts a `personality` parameter to select which genome drives decisions.

importScripts('src/config.js', 'src/math.js', 'src/rules.js');

// Aliases — canonical implementations, local names for zero-diff on 30+ call sites
const COLORS = CONFIG.colors;
const canPlayCard = canPlayOnExpedition;
const scoreColor = MATH.scoreExpedition;
const ALL_CARDS = allCards();

function scoreAll(exps) {
  let t = 0;
  for (const c of COLORS) t += scoreColor(exps[c] || []);
  return t;
}

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
  const deckSize=sim.deck?sim.deck.length:(sim.deckSize||0);

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
  // If deck is small enough, use minimax for endgame play
  if(sim.deck.length<=12){
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

// ========== ENDGAME SOLVER (Adaptive Minimax with Alpha-Beta) ==========
// Adaptive depth based on deck size:
// deck <= 4: full depth (4 plies) — exact play
// deck <= 8: 3 plies — near-exact
// deck <= 12: 2 plies — good approximation
// Alpha-beta pruning + move ordering keeps it fast.

function getEndgameDepth(deckSize){
  if(deckSize<=4) return 4;
  if(deckSize<=8) return 3;
  return 2;
}


function endgameSolve(sim, startingPlayer){
  const maxDepth=getEndgameDepth(sim.deck.length);
  const result=minimax(sim, startingPlayer, 0, -Infinity, Infinity, maxDepth);
  return result>0?1:(result===0?0.5:0);
}

function minimax(sim, player, depth, alpha, beta, maxDepth){
  // Terminal: game over or depth limit reached — evaluate position
  if(sim.deck.length===0 || depth>=maxDepth){
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

  // Cap moves to prevent explosion — fewer at deeper levels
  const moveLimit=depth<=1?15:(depth<=2?10:6);
  const cappedMoves=moves.slice(0, moveLimit);

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
      val=minimax(sim, other, depth+1, alpha, beta, maxDepth);
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

// ========== GENOME-DIRECT DISCARD DANGER SCORING ==========
// Uses evolved genome's opponent-awareness genes DIRECTLY to score discard safety.
// This bypasses MC's blind spot: random opponent hands can't model that a real
// opponent WILL pick up high cards discarded to their active expeditions.

function computeDiscardDangerScore(gs, card, genome){
  const color=card.color;
  const oppExp=gs.expeditions.player1[color]||[];
  const cardVal=card.value||3; // wagers count as 3
  const g=genome;

  let danger=0;

  // Factor 1: Opponent has an active expedition in this color
  if(oppExp.length>0){
    // Can opponent legally play this card?
    const oppTop=oppExp[oppExp.length-1];
    const oppCanPlay=(card.value===0)? (oppTop.value===0) : (card.value > oppTop.value);

    // Base danger from card value scaled by oppDiscardDanger gene
    danger += cardVal * (g.oppDiscardDanger / 10);

    // Opponent wager commitment — wagers multiply the danger
    let oppWagers=0;
    for(const e of oppExp) if(e.value===0) oppWagers++;
    danger += oppWagers * g.oppWagerFear;

    // Opponent card count — more invested = more dangerous
    danger += oppExp.length * (g.oppColorTrackWeight / 2);

    // If opponent can legally play immediately, much more dangerous
    if(oppCanPlay) danger *= 1.5;

    // Scale by overall opponent awareness gene
    danger *= (0.5 + g.oppAwareness / 3);
  }

  // Factor 2: Opponent has drawn from this color's discard (strong interest signal)
  const oppDrawnColors=new Set();
  if(gs.oppDrawHistory){
    for(const c of gs.oppDrawHistory) oppDrawnColors.add(c);
  }
  if(oppDrawnColors.has(color)){
    danger += cardVal * (g.oppDrawSignalWeight / 5);
    // Even without expedition, drawing from discard means they want this color
    if(oppExp.length===0) danger += g.oppBlockWeight / 2;
  }

  // Factor 3: Opponent has played cards to this color (from oppPlayHistory)
  if(gs.oppPlayHistory){
    const playCount=gs.oppPlayHistory.filter(c=>c===color).length;
    if(playCount>0) danger += playCount * (g.oppColorTrackWeight / 2);
  }

  // Factor 4: High card bias — high cards are intrinsically more dangerous to discard
  if(cardVal>=7) danger += (cardVal-6) * 2;

  // Factor 5: Safe discard bonus — if opponent has NO expedition and NO interest signals
  if(oppExp.length===0 && !oppDrawnColors.has(color)){
    danger -= g.safeDiscardBias;
  }

  return danger;
}

// Normalize danger scores to 0-1 range for blending with MC win rates
function normalizeDiscardScores(dangerScores){
  if(dangerScores.length===0) return [];
  let maxDanger=-Infinity, minDanger=Infinity;
  for(const d of dangerScores){
    if(d>maxDanger) maxDanger=d;
    if(d<minDanger) minDanger=d;
  }
  const range=maxDanger-minDanger;
  if(range<0.001) return dangerScores.map(()=>0.5); // all equal danger
  // Invert: lowest danger = highest safety score (1.0), highest danger = 0.0
  return dangerScores.map(d=>1.0 - (d-minDanger)/range);
}

// ========== MONTE CARLO EVALUATION ==========

function evaluate(gs, variant, simCount, genome, knownOppHand, knownDeck){
  const pool=getUnknownPool(gs, variant);
  const deckSize=gs.deckSize;
  const oppHandSize=pool.length-deckSize;

  // Seer: opponent hand is known; Oracle: both hand and deck are known
  const hasKnownHand=knownOppHand&&knownOppHand.length>0;
  const hasKnownDeck=knownDeck&&knownDeck.length>0;

  if(!hasKnownHand && (oppHandSize<0 || pool.length===0)){
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

  // Oracle with perfect info: fewer sims needed since no randomness
  const effectiveSimCount=hasKnownDeck?Math.min(simCount,50):(hasKnownHand?Math.min(simCount,200):simCount);
  const minSims=Math.min(effectiveSimCount, 80);
  let simsRan=0;
  for(let s=0;s<effectiveSimCount;s++){
    simsRan++;
    let oppHand, deck;
    if(hasKnownHand && hasKnownDeck){
      // Oracle: perfect information — only shuffle remaining unknowns (none)
      oppHand=knownOppHand;
      deck=knownDeck;
    } else if(hasKnownHand){
      // Seer: known hand, random deck
      const deckPool=pool.filter(c=>!knownOppHand.find(k=>k.id===c.id));
      deck=shuffle([...deckPool]);
      oppHand=knownOppHand;
    } else {
      const shuffled=shuffle([...pool]);
      oppHand=shuffled.slice(0, oppHandSize);
      deck=shuffled.slice(oppHandSize);
    }

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

  // ========== GENOME-DIRECT DISCARD SAFETY BLENDING ==========
  // Instead of post-MC penalties, we compute a genome-driven danger score for each
  // discard option and blend it with MC win rates.
  // For PLAY actions: pure MC win rate (MC is good at self-play optimization)
  // For DISCARD actions: 60% MC + 40% genome safety score

  // Step 1: Compute genome danger scores for all unique discard actions
  const discardDangerMap={}; // key: "color_value" → danger score
  for(const pair of pairs){
    if(pair.p1.type==='discard'){
      const key=pair.p1.color+'_'+pair.p1.card.value;
      if(!(key in discardDangerMap)){
        discardDangerMap[key]=computeDiscardDangerScore(gs, pair.p1.card, genome);
      }
    }
  }

  // Step 2: Normalize danger scores to safety scores (0-1)
  const discardKeys=Object.keys(discardDangerMap);
  const discardDangers=discardKeys.map(k=>discardDangerMap[k]);
  const discardSafety=normalizeDiscardScores(discardDangers);
  const safetyMap={};
  for(let i=0;i<discardKeys.length;i++) safetyMap[discardKeys[i]]=discardSafety[i];

  // Step 3: Compute blended scores
  // For plays: finalScore = mcWinRate
  // For discards: finalScore = mcWinRate * 0.6 + genomeSafety * 0.4
  for(const pair of pairs){
    const mcWinRate=pair.wins/simsRan;
    if(pair.p1.type==='discard'){
      const key=pair.p1.color+'_'+pair.p1.card.value;
      const safety=safetyMap[key]||0.5;
      pair.blended=mcWinRate*0.6 + safety*0.4;
      pair.genomeSafety=safety;
      pair.genomeDanger=discardDangerMap[key]||0;
    } else {
      pair.blended=mcWinRate;
      pair.genomeSafety=null;
      pair.genomeDanger=null;
    }
  }

  // Step 4: HARD VETO — Never discard a high card (7+) to opponent's active expedition
  // unless ALL alternatives are worse. Check if a safer discard exists.
  let best=pairs[0];
  for(let i=1;i<pairs.length;i++){
    if(pairs[i].blended>best.blended) best=pairs[i];
  }

  if(best.p1.type==='discard'){
    const cardVal=best.p1.card.value||0;
    const oppExp=gs.expeditions.player1[best.p1.color]||[];
    if(cardVal>=7 && oppExp.length>0){
      // This is a dangerous discard — find a safer alternative
      let saferAlt=null;
      for(const pair of pairs){
        if(pair===best) continue;
        const altDangerous=(pair.p1.type==='discard' && (pair.p1.card.value||0)>=7 &&
          (gs.expeditions.player1[pair.p1.color]||[]).length>0);
        if(!altDangerous && pair.blended>best.blended*0.6){
          // Accept any non-dangerous option that's at least 60% as good
          if(!saferAlt || pair.blended>saferAlt.blended) saferAlt=pair;
        }
      }
      if(saferAlt){
        best=saferAlt;
      } else {
      }
    }
  }

  // Build diagnostic info
  const sorted=[...pairs].sort((a,b)=>b.blended-a.blended);
  const topN=sorted.slice(0,8).map(p=>({
    action: p.p1.type+'_'+p.p1.color+'_'+(p.p1.card.value||'W'),
    draw: p.p2.type+(p.p2.color?'_'+p.p2.color:''),
    mcWinRate: (p.wins/simsRan*100).toFixed(1)+'%',
    blended: (p.blended*100).toFixed(1)+'%',
    safety: p.genomeSafety!==null? p.genomeSafety.toFixed(2) : '-',
    danger: p.genomeDanger!==null? p.genomeDanger.toFixed(1) : '-'
  }));

  // Opponent expedition info
  const oppExps={};
  for(const c of COLORS){
    const exp=gs.expeditions.player1[c]||[];
    if(exp.length>0) oppExps[c]=exp.map(c=>c.value||'W').join(',');
  }

  // What AI is discarding and why it's dangerous
  const chosen=best.p1;
  let dangerNote='';
  if(chosen.type==='discard'){
    const oppExp=gs.expeditions.player1[chosen.color]||[];
    if(oppExp.length>0 && (chosen.card.value||0)>=7){
      dangerNote=`WARNING: Discarding ${chosen.card.value||'W'} of ${chosen.color} — opponent has ${oppExp.length} cards in ${chosen.color}!`;
    }
  }

  return {phase1: best.p1, phase2: best.p2, winRate: best.blended,
          simsRan,
          debug: {
            hand: gs.hands.player2.map(c=>c.color[0].toUpperCase()+(c.value||'W')).join(' '),
            oppExps,
            deckSize: gs.deckSize,
            chosen: chosen.type+'_'+chosen.color+'_'+(chosen.card.value||'W'),
            chosenDraw: best.p2.type+(best.p2.color?'_'+best.p2.color:''),
            dangerNote,
            topMoves: topN,
          }};
}

// ========== HEURISTIC AI ==========
// Pure rule-based AI — no Monte Carlo, no genomes. Fast and strong on discard safety.

function heuristicEvaluate(gs, variant){
  const hand=gs.hands.player2;
  if(hand.length===0) return null;
  const deckSize=gs.deckSize;
  const myExps=gs.expeditions.player2;
  const oppExps=gs.expeditions.player1;

  // Build color info
  const handByColor={};
  for(const c of COLORS) handByColor[c]=[];
  for(const card of hand) handByColor[card.color].push(card);

  // Track what's known/unknown
  const seen=new Set();
  for(const p of ['player1','player2'])
    for(const c of COLORS)
      for(const card of (gs.expeditions[p][c]||[])) seen.add(card.id);
  if(variant==='classic')
    for(const c of COLORS)
      for(const card of (gs.discards[c]||[])) seen.add(card.id);
  else
    for(const card of (gs.singlePile||[])) seen.add(card.id);
  for(const card of hand) seen.add(card.id);

  // Count how many expeditions we already have
  let myExpCount=0;
  for(const c of COLORS) if((myExps[c]||[]).length>0) myExpCount++;

  // Project score for a hypothetical expedition sequence
  function projectScore(exp, handCards){
    const combined=[...exp];
    const sorted=handCards.filter(h=>h.value>0).sort((a,b)=>a.value-b.value);
    let topVal=exp.length>0?exp[exp.length-1].value:-1;
    for(const c of sorted){
      if(c.value>topVal){combined.push(c);topVal=c.value;}
    }
    return scoreColor(combined);
  }

  // === SCORE EACH PLAY OPTION ===
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

    // Project: what's our score now vs after playing this card + remaining hand
    const currentScore=scoreColor(exp);
    const remaining=handInColor.filter(h=>h.id!==card.id);
    const afterPlay=projectScore([...exp, card], remaining);
    const delta=afterPlay-currentScore;

    if(isWager){
      // Wager: high multiplier risk/reward
      if(commitment>0){
        const hasNumbers=exp.some(e=>e.value>0);
        if(hasNumbers) continue; // can't play wager after number
      }
      // Project with vs without wager
      const withoutWager=projectScore(exp, remaining);
      const wagerDelta=afterPlay-withoutWager;
      if(wagerDelta>0) score=wagerDelta;
      else score=wagerDelta*0.5; // penalize negative wagers less heavily
      // Timing bonus: early is better
      if(deckSize>35) score+=8;
      else if(deckSize>25) score+=3;
      else score-=5;
      // Need cards to back it up
      if(handCount>=4) score+=5;
      else if(handCount>=3) score+=2;
      else score-=8;
    } else {
      // Number card
      if(commitment>0){
        // Extending — use projected delta
        score=Math.max(delta, card.value*0.5);
        // 8+ bonus chase
        const futureCount=commitment+1+remaining.filter(h=>h.value>card.value).length;
        if(futureCount>=8) score+=20;
        else if(futureCount>=6) score+=8;
        // Wager multiplier bonus
        const wagerCount=exp.filter(e=>e.value===0).length;
        if(wagerCount>0) score+=card.value*wagerCount*0.3;
        // Play low cards first to keep options open
        if(card.value<=4) score+=3;
      } else {
        // Starting new expedition — use full projection
        if(delta>-5) score=delta*0.5+handCount*3;
        else score=delta*0.3;
        // Penalize starting late without enough cards
        if(deckSize<15) score-=10;
        else if(deckSize<25 && handCount<3) score-=8;
        // Don't over-expand
        if(myExpCount>=3) score-=5;
        if(myExpCount>=4) score-=10;
        // Low starting cards are better — room to build
        if(card.value<=4 && handCount>=3) score+=5;
        if(card.value>=8 && handCount<=2) score-=15;
      }
    }

    playOptions.push({card, score, action:'play'});
  }

  // === OPPONENT HAND ANALYSIS (Seer/Oracle) ===
  const oppHand=(gs.hands.player1&&gs.hands.player1.length>0)?gs.hands.player1:null;
  const oppHandByColor={};
  if(oppHand){
    for(const c of COLORS) oppHandByColor[c]=[];
    for(const card of oppHand) oppHandByColor[card.color].push(card);
  }

  // === SCORE EACH DISCARD OPTION ===
  const discardOptions=[];
  for(const card of hand){
    const c=card.color;
    const exp=myExps[c]||[];
    const oppExp=oppExps[c]||[];
    let safety=0;

    // CRITICAL: Never discard to opponent's active expedition
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

    // Opponent draw history signals
    if(gs.oppDrawHistory){
      const drewFromColor=gs.oppDrawHistory.filter(dc=>dc===c).length;
      if(drewFromColor>0) safety-=12*drewFromColor;
    }

    // === SEER/ORACLE: Opponent hand awareness for discards ===
    if(oppHand){
      const oppCardsInColor=oppHandByColor[c]||[];
      if(oppCardsInColor.length>0){
        // Opponent holds cards in this color — discarding here is dangerous
        // Check if opponent can play cards that connect to our discard
        const oppPlayable=oppCardsInColor.filter(oc=>oc.value>0 && oc.value>(card.value||0));
        if(oppExp.length>0){
          // Opponent has expedition AND hand cards in this color
          safety-=15*oppCardsInColor.length;
          // Extra penalty if opponent has cards that chain from our discard
          if(oppPlayable.length>0) safety-=10*oppPlayable.length;
        } else if(oppCardsInColor.length>=2){
          // Opponent has multiple cards — might start expedition from our discard
          safety-=8*oppCardsInColor.length;
          if(card.value<=4) safety-=10; // low cards help them start
        } else {
          // Single card — mild danger
          safety-=5;
        }
        // Wager in opponent hand + our discard = very bad
        const oppWagersInHand=oppCardsInColor.filter(oc=>oc.value===0).length;
        if(oppWagersInHand>0 && card.value>0) safety-=12*oppWagersInHand;
      } else {
        // Opponent has NO cards in this color — safe to discard here
        safety+=10;
      }
    }

    // Value to us
    if(exp.length===0){
      if(handByColor[c].length<=1) safety+=12;
      safety+=3;
      if(card.value<=4) safety+=4;
    } else {
      safety-=15;
      if(canPlayCard(card, exp)){
        // Playable card — terrible to discard
        safety-=20-(card.value||0);
      }
    }

    // High cards cost more to discard
    if(card.value>=7) safety-=card.value*1.5;

    // Wagers
    if(card.value===0){
      if(exp.length===0 && handByColor[c].length<=2) safety+=8;
      else if(exp.length>0) safety-=12;
    }

    // Orphan bonus
    if(handByColor[c].filter(h=>h.id!==card.id).length===0) safety+=6;

    discardOptions.push({card, score:safety, action:'discard'});
  }

  // === DECIDE: PLAY or DISCARD ===
  playOptions.sort((a,b)=>b.score-a.score);
  discardOptions.sort((a,b)=>b.score-a.score);

  let phase1;
  const bestPlay=playOptions[0];
  const bestDiscard=discardOptions[0];

  // Play if positive score, or if discarding is very dangerous
  if(bestPlay && (bestPlay.score>0 || (bestDiscard && bestDiscard.score<-50 && bestPlay.score>-10))){
    phase1={type:'play', card:bestPlay.card, color:bestPlay.card.color,
            idx:hand.findIndex(c=>c.id===bestPlay.card.id)};
  } else {
    phase1={type:'discard', card:bestDiscard.card, color:bestDiscard.card.color,
            idx:hand.findIndex(c=>c.id===bestDiscard.card.id)};
  }

  // === DRAW DECISION ===
  let phase2={type:'deck'};
  const discardedColor=phase1.type==='discard'?phase1.color:null;
  const justDiscarded=phase1.type==='discard';

  if(variant==='classic'){
    let bestDrawScore=-Infinity;
    let bestDrawAction=null;
    for(const c of COLORS){
      if(c===discardedColor) continue;
      const pile=gs.discards[c]||[];
      if(pile.length===0) continue;
      const top=pile[pile.length-1];
      const myExp=myExps[c]||[];
      const oppExp=oppExps[c]||[];
      let drawScore=0;

      // Draw if card fits our expedition
      if(myExp.length>0 && canPlayCard(top, myExp)){
        drawScore=8+top.value;
        if(top.value>5) drawScore+=5;
      }
      // Also consider drawing for a color we have many hand cards in
      if(myExp.length===0 && handByColor[c].length>=3 && canPlayCard(top, [])){
        drawScore=Math.max(drawScore, 3+top.value*0.5);
      }
      // Deny opponent
      if(oppExp.length>0 && canPlayCard(top, oppExp)){
        const oppWagers=oppExp.filter(e=>e.value===0).length;
        drawScore=Math.max(drawScore, 12+top.value+oppWagers*4);
      }
      drawScore-=2; // info leak penalty

      if(drawScore>bestDrawScore){
        bestDrawScore=drawScore;
        bestDrawAction={type:'discard', color:c};
      }
    }
    if(bestDrawAction && bestDrawScore>6){
      phase2=bestDrawAction;
    }
  } else if(!justDiscarded && (gs.singlePile||[]).length>0){
    const top=gs.singlePile[gs.singlePile.length-1];
    const myExp=myExps[top.color]||[];
    const oppExp=oppExps[top.color]||[];
    let drawScore=0;
    if(myExp.length>0 && canPlayCard(top, myExp)) drawScore=8+top.value;
    if(oppExp.length>0 && canPlayCard(top, oppExp))
      drawScore=Math.max(drawScore, 12+top.value);
    if(drawScore>6) phase2={type:'single'};
  }

  // Build debug info
  const topPlays=playOptions.slice(0,4).map(p=>({
    action:'play_'+p.card.color+'_'+(p.card.value||'W'),
    draw:phase2.type+(phase2.color?'_'+phase2.color:''),
    mcWinRate:'-',
    blended:(p.score).toFixed(1),
    safety:'-', danger:'-'
  }));
  const topDiscards=discardOptions.slice(0,4).map(d=>({
    action:'disc_'+d.card.color+'_'+(d.card.value||'W'),
    draw:phase2.type+(phase2.color?'_'+phase2.color:''),
    mcWinRate:'-',
    blended:(d.score).toFixed(1),
    safety:(d.score).toFixed(1), danger:(-d.score).toFixed(1)
  }));
  const topMoves=[...topPlays,...topDiscards];

  const oppExpsDebug={};
  for(const c of COLORS){
    const exp=oppExps[c]||[];
    if(exp.length>0) oppExpsDebug[c]=exp.map(c=>c.value||'W').join(',');
  }

  return {
    phase1, phase2, winRate:0.5, simsRan:0,
    debug:{
      hand:hand.map(c=>c.color[0].toUpperCase()+(c.value||'W')).join(' '),
      oppExps:oppExpsDebug,
      deckSize,
      chosen:phase1.type+'_'+phase1.color+'_'+(phase1.card.value||'W'),
      chosenDraw:phase2.type+(phase2.color?'_'+phase2.color:''),
      dangerNote:'[Heuristic AI]',
      topMoves,
    }
  };
}

// ========== WORKER MESSAGE HANDLER ==========
self.onmessage=function(e){
  const {gameState, variant, simCount, personality}=e.data;
  const t0=performance.now();
  let result;
  if(personality==='heuristic'){
    result=heuristicEvaluate(gameState, variant);
  } else if(personality==='seer'||personality==='oracle'){
    // Seer/Oracle use enhanced heuristic with known opponent hand
    result=heuristicEvaluate(gameState, variant);
  } else {
    const genomeSet=variant==='single'?GENOMES_SINGLE:GENOMES;
    const gKey=personality||'scholar';
    const genome=genomeSet[gKey]||genomeSet.scholar;
    result=evaluate(gameState, variant, simCount||500, genome, null, null);
  }
  const elapsed=Math.round(performance.now()-t0);
  self.postMessage({result, elapsed});
};
