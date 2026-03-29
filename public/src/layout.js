// === GOLDEN RATIO (φ) LAYOUT SYSTEM ===
// Every measurement = cardH / φ^n for some integer n.
// cardH is solved from viewport dimensions to guarantee fit.

const PHI = 1.6180339887;

// The universal ruler: size at tier n = cardH / φ^n
// Semantic tiers:
//   n=0: cardH (the card, the base unit)
//   n=1: cardW (card minor dimension)
//   n=2: peek height, card overlap visible strip
//   n=3: textLg, board margin, big section spacing minimum
//   n=4: textMd (fontBase), slotPad, lift, small section spacing minimum
//   n=5: textSm (small labels)
//   n=7: --space-micro (small UI spacing)
//   n=9: border width
function lvl(n, cardH) {
  return cardH / Math.pow(PHI, n);
}

// Card offset: continuous function with 3× ratio between N=2 and N=12
// offset(N) = cardH × 0.367 / N^0.613
const STACK_K = 0.367;
const STACK_EXP = 0.613;
function stackOffset(N, cardH) {
  if (N <= 1) return 0;
  return cardH * STACK_K / Math.pow(N, STACK_EXP);
}

// Pile content height for N cards
function stackContentHeight(N, cardH) {
  return cardH + Math.max(0, N - 1) * stackOffset(N, cardH);
}

// Cone bounding box height ratio (measured from projection math)
const CONE_BBOX_RATIO = 1.30;

// Max cards per color (3 wagers + 2-10 = 12)
const MAX_CARDS_PER_COLOR = 12;

function computeLayout() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const isLandscape = vw > vh;

  // Skip if viewport hasn't changed
  if (computeLayout._vh === vh && computeLayout._vw === vw) return computeLayout._result;

  const numColors = typeof COLORS !== 'undefined' ? COLORS.length : 5;

  // --- Section height ratios (multiples of cardH) ---
  const peekR       = 1 / (PHI * PHI);                    // n=2: 0.382
  const infoRowR    = 1 / (PHI * PHI * PHI);               // n=3: 0.236
  const maxN        = MAX_CARDS_PER_COLOR;
  const stackContentR = 1 + (maxN - 1) * STACK_K / Math.pow(maxN, STACK_EXP);
  const stackScoreR = 1 / Math.pow(PHI, 4);                // n=4: textSm line-height, in normal flow
  const stackRowR   = stackContentR + stackScoreR;

  // Slot height = card + slotPad
  const slotPadR    = 1 / Math.pow(PHI, 4);                // n=4
  const slotHR      = 1 + slotPadR;

  // Middle section: discards + draw pile (portrait has draw pile below, landscape has it as 6th col)
  const colGapR     = 1 / Math.pow(PHI, 7);                // n=7
  const drawPileCardR  = 1 / PHI;                             // n=1 (cardW, landscape-oriented)
  const drawPileLabelR = 1 / Math.pow(PHI, 4);                // n=4 (textSm line-height)
  const midR = isLandscape
    ? slotHR + drawPileLabelR
    : slotHR + colGapR + drawPileCardR + drawPileLabelR;

  // Hand area
  const liftR       = 1 / Math.pow(PHI, 4);                // n=4
  const handR       = CONE_BBOX_RATIO + liftR;

  // Board margin
  const marginR     = 1 / (PHI * PHI * PHI);               // n=3

  // --- Section spacing minimums ---
  const bigGapMinR  = 1 / (PHI * PHI * PHI);               // n=3 (2 big section spacings)
  const smallGapMinR = 1 / Math.pow(PHI, 4);               // n=4 (4 small section spacings)
  const totalMinGapR = 2 * bigGapMinR + 4 * smallGapMinR;

  // --- Solve for cardH ---
  // Vertical constraint
  const totalR = peekR + 2 * infoRowR + 2 * stackRowR + midR + handR
               + totalMinGapR + 2 * marginR;
  const cardH_v = Math.floor(vh / totalR);

  // Horizontal constraint — no column gap, column width IS the content space
  const colWR = 1 / PHI + slotPadR;  // cardW + card padding
  const totalWR = numColors * colWR + 2 * marginR;
  const totalWR_land = totalWR + colWR; // 6th col for draw pile in landscape
  const cardH_h = Math.floor(vw / (isLandscape ? totalWR_land : totalWR));

  // Take the smaller — no hardcoded pixel caps
  let cardH = Math.min(cardH_v, cardH_h);
  cardH = Math.max(cardH, 12); // absolute floor for usability

  // --- Derive all sizes ---
  const cardW       = Math.round(lvl(1, cardH));
  const colW        = Math.round(cardW + lvl(4, cardH));
  const boardMargin = Math.round(lvl(3, cardH));

  // Text sizes
  const textLg = lvl(3, cardH);
  const textMd = lvl(4, cardH);
  const textSm = Math.max(lvl(5, cardH), 9);

  // Line heights (one tier above text size)
  const lineLg = lvl(2, cardH);
  const lineMd = lvl(3, cardH);
  const lineSm = lvl(4, cardH);

  // Spacing
  const slotPad = Math.round(lvl(4, cardH));
  const lift    = Math.round(lvl(4, cardH));
  const gapCol  = Math.round(lvl(7, cardH));
  const borderW = Math.max(1, Math.round(lvl(9, cardH)));

  // --- Section heights in pixels ---
  const sH = {
    oppPeek:  Math.round(cardH * peekR),
    infoRow:  Math.round(cardH * infoRowR),
    stackRow: Math.round(cardH * stackRowR),
    mid:      Math.round(cardH * midR),
    hand:     Math.round(cardH * handR),
  };

  // --- Elastic section spacing distribution ---
  // Fixed content + min section spacings
  const fixedH = sH.oppPeek + 2 * sH.infoRow + 2 * sH.stackRow + sH.mid + sH.hand + 2 * boardMargin;
  const bigGapMin = Math.round(lvl(3, cardH));
  const smallGapMin = Math.round(lvl(4, cardH));
  const totalMinGapPx = 2 * bigGapMin + 4 * smallGapMin;
  const spareH = vh - fixedH - totalMinGapPx;

  // Distribute surplus proportionally (big section spacings get φ× weight)
  const bigW = PHI, smallW = 1;
  const totalWeight = 2 * bigW + 4 * smallW;
  const surplus = Math.max(0, spareH);
  const bigGapPx = Math.round(bigGapMin + surplus * bigW / totalWeight);
  const smallGapPx = Math.round(smallGapMin + surplus * smallW / totalWeight);

  // --- Set CSS custom properties ---
  const root = document.documentElement.style;
  root.setProperty('--card-h', cardH + 'px');
  root.setProperty('--card-w', cardW + 'px');
  root.setProperty('--col-w', colW + 'px');
  root.setProperty('--text-sm', textSm.toFixed(1) + 'px');
  root.setProperty('--text-md', textMd.toFixed(1) + 'px');
  root.setProperty('--text-lg', textLg.toFixed(1) + 'px');
  root.setProperty('--line-sm', lineSm.toFixed(1) + 'px');
  root.setProperty('--line-md', lineMd.toFixed(1) + 'px');
  root.setProperty('--line-lg', lineLg.toFixed(1) + 'px');
  root.setProperty('--gap-lg', bigGapPx + 'px');
  root.setProperty('--gap-sm', smallGapPx + 'px');
  root.setProperty('--slot-pad', slotPad + 'px');
  root.setProperty('--lift', lift + 'px');
  root.setProperty('--border-w', borderW + 'px');
  root.setProperty('--board-margin', boardMargin + 'px');
  root.setProperty('--num-colors', numColors);

  // --- Apply fixed heights to sections ---
  const setH = (id, h) => { const el = document.getElementById(id); if (el) el.style.height = h + 'px'; };
  setH('opp-hand-row', sH.oppPeek);
  setH('hand-area', sH.hand);

  // --- Store result ---
  const result = {
    cardW, cardH, isLandscape, sH, colW, boardMargin,
    bigGapPx, smallGapPx, slotPad, lift, borderW,
    textSm, textMd, textLg, lineSm, lineMd, lineLg,
    stackContentR, stackScoreR, slotHR,
    stackContentH: Math.round(stackContentHeight(MAX_CARDS_PER_COLOR, cardH)),
    stackScoreH: Math.round(lineSm),
    numColors, peekR, infoRowR, stackRowR, midR, handR,
  };
  computeLayout._vh = vh;
  computeLayout._vw = vw;
  computeLayout._result = result;
  return result;
}

// Expose globally
window.PHI = PHI;
window.lvl = lvl;
window.stackOffset = stackOffset;
window.stackContentHeight = stackContentHeight;
window.computeLayout = computeLayout;
window.STACK_K = STACK_K;
window.STACK_EXP = STACK_EXP;
window.MAX_CARDS_PER_COLOR = MAX_CARDS_PER_COLOR;
window.CONE_BBOX_RATIO = CONE_BBOX_RATIO;
