/* ==========================================================================
   ads.js - the Adsterra display banners of the website and of the web trainer.
   --------------------------------------------------------------------------
   BANNER SWITCHES: the list just below. Each line is one Adsterra banner
   unit (Adsterra > Websites > the site > Get code: the 'key' in atOptions).
   Set "enabled" to false to switch a size off: a size that is off renders
   nothing at all (no script, no box, no "Advertisement" label, no space).

   Slots, placed in the pages' HTML as <div class="adz" data-adz="X">...</div>:
     N  the native banner (once): a grid of content cards, right after the page
        header, the first ad on every page. Adsterra pays it per impression;
        its plain banners pay per click, so N carries the site.
     B  300x250, near the footer and under test results: the one plain banner left.
     A, M, Q  plain banners (top, between sections, between question sets): off,
        see SLOTS_OFF. Their boxes stay in the HTML and render nothing.
   The web trainer (/practice/) places its ads itself (practice/js/web.js):
     N  on phones and tablets, at the top of the trainer on the home and results
        screens (it steps aside while a question is on screen, so questions keep
        their place); on wide screens, in the right-hand column.
     T, B  plain banners: off.
   Adsterra allows each native code once per page: a second N is never added
   while one is on the page. Up to 2 more native codes can be asked from
   Adsterra support; each would get its own line in UNITS.
   This file is loaded in <head>: it decides, once, what each slot shows, so
   the CSS reserves the space at first paint. Ads load after the page's load
   event. Plain banners run in their own small frame (Adsterra's atOptions code
   is global); the native banner runs on the page itself, as Adsterra gives it,
   and waits until its box is on show. Ads never run inside a question or
   between a question and its answers. Without the ad server (ad blocker, slow
   network) a native box goes away and nothing else changes.

   Helpers:  ECL_ADS.mount(element, 'B')   adds a slot at the end of element
             ECL_ADS.fresh(element, 'T')   trainer: adds a new banner after element
   Check: add ?ads=check to a page URL and open the browser console (F12).
   ========================================================================== */
(function (g) {
  'use strict';

  /* -------------------------- banner switches --------------------------- */
  var UNITS = {
    leader: { key: '73ac110bdc9f4469ea6cf692c606c99e', enabled: true, width: 728, height: 90 },   // Slot A from 768px up
    rect:   { key: '99380d543d620d0d341032ae6b1158ff', enabled: true, width: 300, height: 250 },  // Slots M, Q, B; trainer B
    mobile: { key: 'f0cc2c86a781c88af8be45889334df1e', enabled: true, width: 320, height: 50 },   // Slot A below 768px; trainer T
    native: { key: '2c94e5ea8157043c58d27d6bfa882a46', enabled: true, kind: 'native' }            // Slot N; trainer N
  };
  /* Adsterra's script address, as in the code Adsterra gave (the key is added at the end).
     Banners and the native unit are served from different paths. */
  var SERVER = 'https://bauval.org/22/', NATIVE = 'https://bauval.org/21/';
  var MAX_BANNERS = 8, MAX = { Q: 1, M: 0 }, WIDE = '(min-width: 768px)';   // the native unit (slot N) carries most of each page now
  var LABEL = { en: 'Advertisement', fr: 'Publicité', ar: 'إعلان' };
  /* plain-banner slots switched off (Adsterra pays plain banners per click): remove a letter to switch it back on */
  var SLOTS_OFF = { pages: { A: 1, M: 1, Q: 1 }, trainer: { T: 1, B: 1 } };
  /* ---------------------------------------------------------------------- */

  if (g.ECL_ADS) return;
  var doc = document, html = doc.documentElement;
  var CHECK = /[?&]ads=check\b/.test(location.search);
  var TRAINER = /\/practice(\/|$)/.test(location.pathname);
  function unit(name) { var u = UNITS[name]; return u && u.enabled === true && /^[0-9a-f]{32}$/.test(u.key) ? { name: name, key: u.key, kind: u.kind || 'banner', width: u.width, height: u.height } : null; }
  function log(m) { if (CHECK && g.console) console.log('[ads] ' + m); }

  /* decided once, now: the banner of each slot for this screen width */
  var wide = !!(g.matchMedia && g.matchMedia(WIDE).matches);
  var OFF = SLOTS_OFF[TRAINER ? 'trainer' : 'pages'];
  function slot(k, name) { return OFF[k] ? null : unit(name); }
  var PLAN = TRAINER ? { T: slot('T', 'mobile'), B: slot('B', 'rect'), N: slot('N', 'native') }
    : { A: slot('A', wide ? 'leader' : 'mobile'), M: slot('M', 'rect'), Q: slot('Q', 'rect'), B: slot('B', 'rect'), N: slot('N', 'native') };
  Object.keys(PLAN).forEach(function (k) { if (PLAN[k]) html.classList.add('adz-on-' + k); });   // the CSS shows and sizes the slots

  var banners = 0, used = {}, queue = [], loaded = false;

  function lang() { var l = (html.lang || 'en').slice(0, 2).toLowerCase(); return LABEL[l] ? l : 'en'; }
  function build(slot) {
    var box = doc.createElement('div');
    box.className = 'adz'; box.setAttribute('data-adz', slot);
    box.innerHTML = '<p class="adz-label">' + LABEL[lang()] + '</p><div class="adz-box"></div>';
    return box;
  }
  /* the banner: Adsterra's code exactly as given, in a frame of the banner's size
     (its atOptions variable then belongs to that banner alone) */
  function run(box, u) {
    if (u.kind === 'native') { runNative(box, u); return; }
    try {
      if (!box.isConnected) return;
      var f = doc.createElement('iframe');
      f.width = u.width; f.height = u.height; f.title = LABEL[lang()];
      f.setAttribute('scrolling', 'no'); f.setAttribute('frameborder', '0');
      f.className = 'adz-frame';
      box.querySelector('.adz-box').appendChild(f);
      var d = f.contentDocument || f.contentWindow.document;
      d.open();
      d.write('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' +
        '<script>atOptions = { \'key\' : \'' + u.key + '\', \'format\' : \'iframe\', \'height\' : ' + u.height + ', \'width\' : ' + u.width + ', \'params\' : {} };<\/script>' +
        '<script src="' + SERVER + u.key + '"><\/script></body></html>');
      d.close();
      box.setAttribute('data-ad-state', 'run');
      foldIfEmpty(box, f);
      log('slot ' + box.getAttribute('data-adz') + ': ' + u.width + 'x' + u.height + ' banner ' + u.key);
    } catch (e) { box.setAttribute('data-ad-state', 'failed'); }
  }
  /* the native banner: Adsterra's code exactly as given, directly on the page (not framed: its script
     fills the container div it finds by id, so it needs the real page, not an iframe) */
  function runNative(box, u) {
    try {
      if (!box.isConnected) return;
      var holder = box.querySelector('.adz-box');
      var div = doc.createElement('div'); div.id = 'container-' + u.key;
      holder.appendChild(div);
      var s = doc.createElement('script');
      s.async = true; s.setAttribute('data-cfasync', 'false'); s.setAttribute('fetchpriority', 'high');
      s.src = NATIVE + u.key;
      s.onerror = function () { var li = box.closest('.qc-adbreak'); (li || box).remove(); log('native script did not load: slot removed'); };
      holder.appendChild(s);
      box.setAttribute('data-ad-state', 'run');
      foldIfEmptyNative(box, div);
      log('slot ' + box.getAttribute('data-adz') + ': native banner ' + u.key);
    } catch (e) { box.setAttribute('data-ad-state', 'failed'); }
  }
  function shown(box) { return box.isConnected && box.getClientRects().length > 0; }
  function start(box, u) {
    if (!loaded) { queue.push({ box: box, u: u }); return; }
    if (u.kind === 'native' && !shown(box)) { whenShown(box, u); return; }
    run(box, u);
  }
  /* the trainer hides its top box while a question is on screen (html[data-view=quiz]): the native ad starts when it shows */
  function whenShown(box, u) {
    if (!g.MutationObserver) return;
    var mo = new MutationObserver(function () {
      if (!box.isConnected) { mo.disconnect(); return; }
      if (shown(box)) { mo.disconnect(); run(box, u); }
    });
    mo.observe(html, { attributes: true, attributeFilter: ['class', 'data-view'] });
  }
  /* Adsterra: one native code once per page */
  function nativeTaken() { return !!doc.querySelector('.adz[data-ad-zone="native"]'); }
  /* claims a page slot: A and B once per page, M and Q up to MAX, MAX_BANNERS in all */
  function claim(box) {
    var slot = box.getAttribute('data-adz'), u = PLAN[slot];
    if (!u || box.getAttribute('data-ad-state') || banners >= MAX_BANNERS) return null;
    if ((slot in MAX) ? (used[slot] || 0) >= MAX[slot] : used[slot]) return null;   // a cap of 0 (e.g. MAX.M) must block every time, not read as "no cap"
    used[slot] = (used[slot] || 0) + 1; banners++;
    box.setAttribute('data-ad-state', 'waiting');
    box.setAttribute('data-ad-zone', u.name);                          // pins the box to this banner's size
    return u;
  }

  /* trainer: the slot at the top of the page (phones and tablets; wide screens have the right-hand column) */
  function trainerStatic(box) {
    var k = box.getAttribute('data-adz'), u = PLAN[k];
    if (!u || (k !== 'T' && k !== 'N') || (g.matchMedia && g.matchMedia('(min-width: 1280px)').matches)) return null;
    if (u.kind === 'native' && nativeTaken()) return null;
    box.setAttribute('data-ad-state', 'waiting'); box.setAttribute('data-ad-zone', u.name);
    return u;
  }
  /* no ad drawn after a while: an empty box that is still below the screen folds away (nothing on screen moves);
     one on screen keeps its space */
  function foldIfEmpty(box, f) {
    setTimeout(function () {
      try {
        if (!box.isConnected) return;
        var b = f.contentDocument && f.contentDocument.body;
        var drawn = !!b && [].slice.call(b.children).some(function (c) { return c.nodeName !== 'SCRIPT'; });
        if (drawn) return;
        box.setAttribute('data-ad-state', 'empty');
        var r = box.getBoundingClientRect(), vh = g.innerHeight || html.clientHeight;
        if (r.top > vh + 50) { var li = box.closest('.qc-adbreak'); (li || box).remove(); log('empty slot ' + box.getAttribute('data-adz') + ' folded'); }
      } catch (e) { }
    }, 8000);
  }
  function foldIfEmptyNative(box, div) {
    setTimeout(function () {
      try {
        if (!box.isConnected || div.children.length > 0) return;
        box.setAttribute('data-ad-state', 'empty');
        var r = box.getBoundingClientRect(), vh = g.innerHeight || html.clientHeight;
        if (r.top > vh + 50) { var li = box.closest('.qc-adbreak'); (li || box).remove(); log('empty slot ' + box.getAttribute('data-adz') + ' folded'); }
      } catch (e) { }
    }, 8000);
  }

  function onLoad() {
    loaded = true;
    try {
      [].slice.call(doc.querySelectorAll('.adz[data-adz]')).forEach(function (box) {
        if (box.getAttribute('data-ad-state')) return;
        var u = TRAINER ? trainerStatic(box) : claim(box);
        if (!u) {                                                       // off or over the cap: nothing left behind
          var li = box.closest('.qc-adbreak'); (li || box).remove(); return;
        }
        start(box, u);
      });
      var q = queue; queue = [];
      q.forEach(function (x) { start(x.box, x.u); });
    } catch (e) { }
  }

  g.ECL_ADS = {
    /* adds a page slot at the end of el (once per slot); returns it, or null */
    mount: function (el, slot) {
      try {
        if (TRAINER || !el || !PLAN[slot]) return null;
        if (PLAN[slot].kind === 'native' && nativeTaken()) return null;
        var box = build(slot), u = claim(box);
        if (!u) return null;
        el.appendChild(box); start(box, u);
        return box;
      } catch (e) { return null; }
    },
    /* trainer: a new ad right after el, each time a new screen asks for one (never a second native unit) */
    fresh: function (el, slot) {
      try {
        var u = PLAN[slot];
        if (!TRAINER || !el || !u || !el.parentNode) return null;
        if (u.kind === 'native' && nativeTaken()) return null;
        var box = build(slot);
        box.setAttribute('data-ad-state', 'waiting'); box.setAttribute('data-ad-zone', u.name);
        el.insertAdjacentElement('afterend', box); start(box, u);
        return box;
      } catch (e) { return null; }
    },
    /* removes a page slot for good (Slot A when a test shows its results) */
    remove: function (slot) {
      [].slice.call(doc.querySelectorAll('.adz[data-adz="' + slot + '"]')).forEach(function (b) { b.remove(); });
      used[slot] = 99;
    },
    on: function (slot) { return !!PLAN[slot]; },
    plan: function () {
      var p = { wide: wide, banners: banners };
      Object.keys(PLAN).forEach(function (k) { p[k] = PLAN[k] ? (PLAN[k].kind === 'native' ? 'native' : PLAN[k].width + 'x' + PLAN[k].height) : null; });
      return p;
    }
  };

  if (doc.readyState === 'complete') onLoad(); else g.addEventListener('load', onLoad);
  log('plan ' + JSON.stringify(g.ECL_ADS.plan()));
})(window);
