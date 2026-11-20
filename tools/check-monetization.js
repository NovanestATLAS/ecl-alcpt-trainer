#!/usr/bin/env node
/* Offline check of assets/monetization-config.js (no browser needed).
   Usage:  node tools/check-monetization.js
   Exit code 1 when something an enabled provider needs is wrong; providers that are off are not checked. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const A = (f) => path.join(__dirname, '..', 'assets', f);
function load(file) {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return ctx.window;
}
const CATS = ['english-learning', 'language-learning', 'test-prep', 'education', 'study-tools'];
const FIELDS = ['id', 'provider', 'enabled', 'title', 'description', 'ctaText', 'trackingUrl'];
const https = (u) => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u.trim());
const text = (v) => (v && typeof v === 'object' ? (v.en || '') : String(v == null ? '' : v)).trim();
let errors = 0, warns = 0;
const out = (lvl, msg) => { console.log((lvl + '    ').slice(0, 5) + ' ' + msg); if (lvl === 'ERROR') errors++; if (lvl === 'WARN') warns++; };

let M, site;
try { M = load(A('monetization-config.js')).ECL_MONETIZATION; site = load(A('config.js')).ECL_CONFIG || {}; }
catch (e) { out('ERROR', 'cannot read the config files: ' + e.message); process.exit(1); }
if (!M) { out('ERROR', 'monetization-config.js does not define window.ECL_MONETIZATION'); process.exit(1); }

['italki', 'impact', 'adcash'].forEach((k) => {
  if (!M[k] || typeof M[k].enabled !== 'boolean') out('ERROR', k + '.enabled must be true or false');
});

/* italki */
if (M.italki && M.italki.enabled === false) out('OFF', 'italki disabled: all italki banners and cards are hidden');
else {
  const url = (site.partners || {}).italki;
  if (https(url)) out('OK', 'italki link found in assets/config.js (kept exactly as it is)');
  else out('ERROR', 'assets/config.js > partners.italki is empty or not https');
  if (!M.italki || !text((M.italki.card || {}).title)) out('WARN', 'italki.card.title is empty: no italki card in Study Resources');
}

/* Impact.com */
if (!M.impact || M.impact.enabled !== true) out('OFF', 'impact disabled');
else {
  const list = Array.isArray(M.impact.partners) ? M.impact.partners : null;
  if (!list) out('ERROR', 'impact.partners must be an array');
  else {
    const ids = {}; let live = 0;
    list.forEach((p, i) => {
      const n = (p && p.id) || '#' + (i + 1);
      FIELDS.forEach((f) => { if (!(f in p)) out('WARN', 'impact ' + n + ': missing field "' + f + '"'); });
      if (!p.enabled) return out('OFF', 'impact ' + n + ' disabled');
      const bad = [];
      if (!text(p.title)) bad.push('title is empty');
      if (!https(p.trackingUrl)) bad.push('trackingUrl is empty or not https');
      if (ids[p.id]) bad.push('duplicate id'); ids[p.id] = 1;
      if (bad.length) return out('ERROR', 'impact ' + n + ': ' + bad.join('; '));
      live++;
      if (!CATS.includes(p.category)) out('WARN', 'impact ' + n + ': keep to learning / English partners, set category to one of ' + CATS.join(', '));
      else out('OK', 'impact ' + n + ' ready');
    });
    if (!live) out('INFO', 'impact: no partner enabled yet, nothing renders');
  }
}

/* Adcash */
if (!M.adcash || M.adcash.enabled !== true) out('OFF', 'adcash disabled');
else {
  const lib = /<script[^>]*\ssrc=["']((?:https:)?\/\/[^"']+)["']/i.exec(M.adcash.librarySnippet || '');
  if (lib) out('OK', 'adcash library: ' + lib[1]); else out('ERROR', 'adcash.librarySnippet is empty or has no script src');
  const ids = {}; let live = 0;
  (M.adcash.zones || []).forEach((z, i) => {
    const n = (z && z.id) || '#' + (i + 1);
    if (!z.enabled) return out('OFF', 'adcash zone ' + n + ' disabled');
    const bad = [];
    if (!/^[\w-]+$/.test(String(z.id || ''))) bad.push('id must use letters, numbers, - or _');
    if (ids[z.id]) bad.push('duplicate id'); ids[z.id] = 1;
    if (!['banner', 'native'].includes(z.format)) bad.push('format must be banner or native');
    if (!['footer', 'sidebar'].includes(z.placement)) bad.push('placement must be footer or sidebar');
    if (!/\S/.test(z.snippet || '')) bad.push('snippet is empty');
    else if (/autotag|pop-?under|interstitial|in-?page-?push|video-?slider|\.\s*runPop|\.\s*runPush/i.test(z.snippet) ||
      /aclib\s*\.\s*run(?!Banner\b|Native\b)\w+/i.test(z.snippet)) bad.push('only Banner and Native zone code is allowed');
    if (!(z.width === 'fluid' || (typeof z.width === 'number' && z.width > 0)) || !(typeof z.height === 'number' && z.height > 0)) bad.push('width and height are needed to reserve the space');
    if (!Array.isArray(z.pages) || !z.pages.length) bad.push('pages is empty: it would never show');
    if (bad.length) return out('ERROR', 'adcash zone ' + n + ': ' + bad.join('; '));
    live++; out('OK', 'adcash zone ' + n + ': ' + z.format + ' ' + z.width + 'x' + z.height + ' in the ' + z.placement + ' on ' + z.pages.join(', '));
  });
  if (!live) out('INFO', 'adcash: no zone is ready, nothing renders');
}

console.log('\n' + (errors ? errors + ' error(s)' : 'No errors') + (warns ? ', ' + warns + ' warning(s)' : '') + '.');
process.exit(errors ? 1 : 0);
