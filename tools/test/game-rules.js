// Test harness — imports from production modules.
// No duplicated logic. Single source of truth.
const CONFIG = require('../../public/src/config');
const MATH = require('../../public/src/math');
const RULES = require('../../public/src/rules');

module.exports = {
  COLORS: CONFIG.colors,
  calculateScore: MATH.scoreExpedition,
  canPlayOnExpedition: RULES.canPlayOnExpedition,
  createDrawPile: RULES.createDrawPile,
};
