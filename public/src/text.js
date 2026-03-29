// text.js — Unified text formatter enforcing phi-scale: font-size at tier n, line-height at tier n-1
// L0 utility — no dependencies. Loaded before rendering.js and all consumers.

/**
 * Renders text with phi-scale sizing enforcement.
 * Font-size at tier n, line-height at tier n-1. You cannot have one without the other.
 *
 * @param {string} content - Text/HTML content
 * @param {number} tier - Phi-scale tier (3=lg, 4=md, 5=sm)
 * @param {object} [opts]
 * @param {string} [opts.font='cinzel'] - 'cinzel' or 'crimson'
 * @param {string} [opts.color] - CSS color
 * @param {number} [opts.opacity] - 0-1
 * @param {string|number} [opts.weight] - font-weight
 * @param {string} [opts.align] - text-align
 * @param {boolean} [opts.tabular] - tabular-nums
 * @param {boolean} [opts.uppercase] - text-transform:uppercase
 * @param {string} [opts.letterSpacing] - CSS letter-spacing
 * @param {string} [opts.extraStyle] - additional inline CSS
 * @param {string} [opts.tag='span'] - HTML tag
 * @param {boolean} [opts.block] - display:block
 * @param {string} [opts.cls] - CSS class(es)
 * @returns {string} HTML string
 */
function renderText(content, tier, opts) {
  opts = opts || {};
  const fonts = { cinzel: "'Cinzel',serif", crimson: "'Crimson Text',serif" };
  const sizes = { 3: '--text-lg', 4: '--text-md', 5: '--text-sm' };
  const lines = { 3: '--line-lg', 4: '--line-md', 5: '--line-sm' };

  // line-height is always one tier up (n-1): tier 5 text gets tier 4 line-height
  const sizeVar = sizes[tier] || '--text-md';
  const lineVar = lines[tier - 1] || lines[tier] || '--line-md';

  let style = 'font-size:var(' + sizeVar + ');line-height:var(' + lineVar + ')';
  style += ';font-family:' + (fonts[opts.font || 'cinzel'] || fonts.cinzel);
  if (opts.color) style += ';color:' + opts.color;
  if (opts.opacity !== undefined) style += ';opacity:' + opts.opacity;
  if (opts.weight) style += ';font-weight:' + opts.weight;
  if (opts.align) style += ';text-align:' + opts.align;
  if (opts.tabular) style += ';font-variant-numeric:tabular-nums';
  if (opts.uppercase) style += ';text-transform:uppercase';
  if (opts.letterSpacing) style += ';letter-spacing:' + opts.letterSpacing;
  if (opts.block) style += ';display:block';
  if (opts.extraStyle) style += ';' + opts.extraStyle;

  const tag = opts.tag || 'span';
  const cls = opts.cls ? ' class="' + opts.cls + '"' : '';
  return '<' + tag + cls + ' style="' + style + '">' + content + '</' + tag + '>';
}
