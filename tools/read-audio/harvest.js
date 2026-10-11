#!/usr/bin/env node
/* Collects every text the website reads aloud outside the listening
   questions, exactly as it is spoken, and writes tools/read-audio/texts.json
   for generate.py.

     . trainer (practice/): the trainer's own functions are called for every
       grammar, vocabulary, idiom... question (speakQuestionAndChoices,
       speakAnswer) and every idiom card; what they send to Speech.speak() is
       recorded;
     . site pages: the Listen buttons (data-say), the flashcards and the
       answer-sheet demo.
   Each text is split into clips with the website's own ECL_LISTEN.clips()
   and named with ECL_LISTEN.hash(), so recordings and playback always match.

   node tools/read-audio/harvest.js     (CHROME_PATH=/usr/bin/google-chrome to use an installed Chrome)
*/
'use strict';
const path = require('path'), fs = require('fs'), http = require('http');
let pw;
try { pw = require('playwright'); } catch (e) {
  try { pw = require('playwright-core'); } catch (e2) { pw = require('/opt/node22/lib/node_modules/playwright'); }
}
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'texts.json');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };

function serve() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, path.normalize(p));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, '127.0.0.1', () => ok(srv));
  });
}

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const opts = { headless: true };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  const browser = await pw.chromium.launch(opts);
  const ctx = await browser.newContext();
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // no ads, no analytics
  const page = await ctx.newPage();
  const texts = new Map();          // clip text -> where it comes from
  function addAll(list, from) { list.forEach((t) => { if (t && !texts.has(t)) texts.set(t, from); }); }

  /* ---- trainer ---- */
  await page.goto(base + '/practice/');
  await page.waitForFunction(() => window.BANKS && Object.keys(BANKS).length > 5 && window.ECL_LISTEN, null, { timeout: 30000 });
  const trainer = await page.evaluate(() => {
    const said = [];
    window.audioOK = () => true;                    // also where the browser has no voice
    const real = Speech.speak;
    Speech.speak = (t) => { (Array.isArray(t) ? t : [t]).forEach((x) => said.push(String(x))); };
    let n = 0;
    Object.keys(BANKS).forEach((k) => {
      if (BANKS[k].section === 'listen') return;
      BANKS[k].data.forEach((it) => {
        if (!it || !it.o) return;
        const q = poolItem(it);
        speakQuestionAndChoices(q, true);
        speakAnswer(q);
        n++;
      });
    });
    (window.IDIOMS_LIB || []).forEach((x) => said.push(x.i + '. ' + x.x));
    Speech.speak = real;
    const clips = [];
    said.forEach((s) => ECL_LISTEN.clips(s).forEach((c) => clips.push(c.t)));
    /* every choice letter, whatever the order of the choices */
    'ABCDEF'.split('').forEach((l) => clips.push(l + '.'));
    return { n, clips };
  });
  addAll(trainer.clips, 'practice');
  console.log('trainer: %d questions, %d clips', trainer.n, new Set(trainer.clips).size);

  /* ---- site pages ---- */
  const pages = [];
  (function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const f = path.join(d, e.name);
      if (e.isDirectory()) { if (!/^(\.git|node_modules|practice|assets|tools)$/.test(e.name)) walk(f); }
      else if (e.name.endsWith('.html') && /assets\/site\.js/.test(fs.readFileSync(f, 'utf8'))) pages.push(path.relative(ROOT, f));
    });
  })(ROOT);
  let siteN = 0;
  for (const p of pages.sort()) {
    await page.goto(base + '/' + p.split(path.sep).join('/'));
    await page.waitForFunction(() => window.ECL_LISTEN, null, { timeout: 15000 }).catch(() => null);
    const got = await page.evaluate(() => {
      if (!window.ECL_LISTEN) return null;
      const bare = (s) => String(s).replace(/\*/g, '');
      const said = [];
      document.querySelectorAll('[data-say]').forEach((b) => said.push(b.getAttribute('data-say')));
      try {
        const el = document.getElementById('cards-data');
        (el ? JSON.parse(el.textContent) : []).forEach((c) => { said.push(c.f); said.push(bare(c.x || c.b)); });
      } catch (e) { }
      try {
        const d = document.getElementById('demo-data'), L = 'ABCD';
        (d ? JSON.parse(d.textContent) : []).forEach((q) => said.push(bare(q.q).replace(/_{2,}/g, ', blank, ') + '. ' +
          q.o.map((o, i) => L[i] + ', ' + bare(o) + '.').join(' ')));
      } catch (e) { }
      const clips = [];
      said.forEach((s) => { if (s) ECL_LISTEN.clips(s).forEach((c) => clips.push(c.t)); });
      return clips;
    });
    if (got === null) { console.log('  (no listen-audio.js on ' + p + ')'); continue; }
    siteN += got.length;
    addAll(got, p);
  }
  console.log('site pages: %d pages, %d clips', pages.length, siteN);

  const items = await page.evaluate((list) => list.map((t) => ({ t, h: ECL_LISTEN.hash(t) })), [...texts.keys()]);
  items.sort((a, b) => (a.h < b.h ? -1 : 1));
  fs.writeFileSync(OUT, JSON.stringify({ v: 1, count: items.length, items }, null, 0).replace(/\},\{/g, '},\n{') + '\n');
  console.log('%d texts, %d characters -> %s', items.length, items.reduce((n, x) => n + x.t.length, 0), path.relative(ROOT, OUT));
  await browser.close();
  srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
