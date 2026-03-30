const CONFIG = {
  // Card rules
  colors: ['red', 'green', 'blue', 'white', 'yellow'],
  wagerCount: 3,
  numberRange: [2, 10],
  handSize: 8,

  // Scoring
  scoring: {
    baseCost: 20,
    bonusThreshold: 8,
    bonusPoints: 20,
  },

  // Variants
  variants: {
    classic: { discardPiles: 'perColor' },
    single:  { discardPiles: 'shared' },
  },

  // Color display — values from constants.js
  colorHex: { red: '#c04040', green: '#40a060', blue: '#4080c0', white: '#909098', yellow: '#c0a030' },
  colorLabels: { red: 'Red', green: 'Green', blue: 'Blue', white: 'White', yellow: 'Yellow' },
  colorSymbols: { red: '\u25B2', green: '\u25CF', blue: '\u2248', white: '\u25C6', yellow: '\u2605' },

  // AI personalities — values from constants.js + elo.js AI_RATINGS
  personalities: {
    explorer:  { name: 'Explorer',   emoji: '\u{1F5E1}\uFE0F', rating: 1100 },
    scholar:   { name: 'Scholar',    emoji: '\u{1F6E1}\uFE0F', rating: 1150 },
    collector: { name: 'Collector',  emoji: '\u{1F3DB}\uFE0F', rating: 1100 },
    spy:       { name: 'Spy',        emoji: '\u{1F575}\uFE0F', rating: 1050 },
    gambler:   { name: 'Gambler',    emoji: '\u23F1\uFE0F',    rating: 1000 },
    heuristic: { name: 'Strategist', emoji: '\u{1F9E0}',       rating: 1300 },
    seer:      { name: 'The Seer',   emoji: '\u{1F441}\uFE0F', rating: 1500, boss: true, warn: 'Can see your cards' },
    oracle:    { name: 'The Oracle', emoji: '\u{1F52E}',       rating: 1800, boss: true, warn: 'Knows everything' },
  },

  // AI thresholds — from ai-worker.js
  ai: {
    endgameDeckSize: 6,
    endgameRolloutThreshold: 12,
    minimaxDeckThresholds: [4, 8, 12],
    mcSimulations: 500,
    heuristicDeckPhases: { early: 35, mid: 25, late: 15 },
  },

  // UI thresholds — from rendering.js + animations.js
  ui: {
    idleMs: 30000,
    turnFlashMs: 2000,
    animMs: 300,
    maxDrawPileShow: 10,
    jitter: { degrees: 3, px: 2.5 },
  },

  // ELO — from elo.js
  elo: {
    startRating: 1200,
    historyMax: 50,
    kFactor: { provisional: 32, established: 16, threshold: 20 },
  },

  // Timer — from timer.js
  timer: {
    options: [30, 60, 90],
    warningAt: 10,
    criticalAt: 5,
  },

  // Achievement thresholds — from achievements.js
  achievements: {
    highRoller: 100,
    streakMaster: 5,
    speedRun: 20,
    comebackGap: 30,
    centuryClub: 100,
  },

  // Storage
  storagePrefix: 'expedition',

  // Multiplayer — from multiplayer.js
  matchmakingTimeoutMs: 60000,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
