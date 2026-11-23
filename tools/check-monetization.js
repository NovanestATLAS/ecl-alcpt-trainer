#!/usr/bin/env node
/* Offline check of assets/monetization-config.js and the Adsterra banner switches of assets/ads.js (no browser needed).
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
const https = (u) => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u.trim());
const text = (v) => (v && typeof v === 'object' ? (v.en || '') : String(v == null ? '' : v)).trim();
let errors = 0, warns = 0;
const out = (lvl, msg) => { console.log((lvl + '    ').slice(0, 5) + ' ' + msg); if (lvl === 'ERROR') errors++; if (lvl === 'WARN') warns++; };

let M, site;
try { M = load(A('monetization-config.js')).ECL_MONETIZATION; site = load(A('config.js')).ECL_CONFIG || {}; }
catch (e) { out('ERROR', 'cannot read the config files: ' + e.message); process.exit(1); }
if (!M) { out('ERROR', 'monetization-config.js does not define window.ECL_MONETIZATION'); process.exit(1); }

['italki', 'studyResources'].forEach((k) => {
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

/* Recommended English Study Resources */
const SR = M.studyResources || {};
if (SR.enabled !== true) out('OFF', 'studyResources disabled: no cards');
else if (!Array.isArray(SR.items)) out('ERROR', 'studyResources.items must be an array');
else {
  const ids = {}; let live = 0;
  SR.items.forEach((p, i) => {
    const n = (p && p.id) || '#' + (i + 1);
    if (!p || !p.id) return out('ERROR', 'item ' + n + ': needs an id');
    if (ids[p.id]) out('ERROR', 'item ' + n + ': duplicate id'); ids[p.id] = 1;
    if (p.enabled !== true) return out('OFF', 'item ' + n + ' disabled: renders nothing');
    if (p.id === 'italki') { live++; return out('OK', 'item italki: texts from the italki section, link from assets/config.js'); }
    const bad = [];
    if (!text(p.title || p.name)) bad.push('name is empty');
    if (!https(p.url)) bad.push('url is empty or not https');
    if (bad.length) return out('ERROR', 'item ' + n + ': ' + bad.join('; ') + ' (skipped, nothing renders)');
    if (p.image) out('WARN', 'item ' + n + ': image is set; cards are text-only until an approved creative is wired in');
    live++; out('OK', 'item ' + n + ': ' + p.url);
  });
  if (!live) out('INFO', 'studyResources: no item enabled, nothing renders');
}

/* Adsterra: the banner switches at the top of assets/ads.js */
const ads = fs.readFileSync(A('ads.js'), 'utf8');
const units = [...ads.matchAll(/(\w+):\s+\{ key: '([^']*)', enabled: (true|false), width: (\d+), height: (\d+) \}/g)];
if (units.length !== 3) out('ERROR', 'assets/ads.js: expected 3 banner switches, found ' + units.length);
units.forEach((u) => {
  if (u[3] === 'true' && !/^[0-9a-f]{32}$/.test(u[2])) return out('ERROR', 'adsterra ' + u[1] + ': the key must be the 32-character key from Adsterra');
  out(u[3] === 'true' ? 'OK' : 'OFF', 'adsterra ' + u[1] + ' (' + u[4] + 'x' + u[5] + ')' + (u[3] === 'true' ? ' on' : ' off'));
});
if (!/var SERVER = 'https:\/\/[a-z0-9.-]+\/[^']*\/';/.test(ads)) out('ERROR', 'assets/ads.js: the Adsterra script address (SERVER) is missing');

console.log('\n' + (errors ? errors + ' error(s)' : 'No errors') + (warns ? ', ' + warns + ' warning(s)' : '') + '.');
process.exit(errors ? 1 : 0);
