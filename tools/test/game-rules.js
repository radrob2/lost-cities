// Test harness — imports from production config and math.
// No duplicated logic. Single source of truth.
const CONFIG = require('../../public/src/config');
const MATH = require('../../public/src/math');

module.exports = {
  COLORS: CONFIG.colors,
  calculateScore: MATH.scoreExpedition,
  canPlayOnExpedition: function(card, expedition) {
    // This will move to rules.js in Phase 2.
    // For now, keep the implementation here — it's the only copy.
    if (!expedition || expedition.length === 0) return true;
    const top = expedition[expedition.length - 1];
    if (card.value === 0) return top.value === 0;
    return card.value > top.value;
  },
  createDrawPile: function() {
    // This will move to engine.js in Phase 3.
    // For now, keep the implementation here — it's the only copy.
    const drawPile = [];
    CONFIG.colors.forEach(c => {
      for (let i = 0; i < CONFIG.wagerCount; i++)
        drawPile.push({ color: c, value: 0, id: c + '_w' + i });
      for (let v = CONFIG.numberRange[0]; v <= CONFIG.numberRange[1]; v++)
        drawPile.push({ color: c, value: v, id: c + '_' + v });
    });
    for (let i = drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [drawPile[i], drawPile[j]] = [drawPile[j], drawPile[i]];
    }
    return drawPile;
  }
};
