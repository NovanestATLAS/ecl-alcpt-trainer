/* ==========================================================================
   ads.js - the Adsterra display banners of the website and of the web trainer.
   --------------------------------------------------------------------------
   BANNER SWITCHES: the list just below. Each line is one Adsterra banner
   unit (Adsterra > Websites > the site > Get code: the 'key' in atOptions).
   Set "enabled" to false to switch a size off: a size that is off renders
   nothing at all (no script, no box, no "Advertisement" label, no space).

   Slots, placed in the pages' HTML as <div class="adz" data-adz="X">...</div>:
     A  below the top of the page (once): 728x90 from 768px wide up, 320x50 below;
     M  300x250, between sections of guides, lessons and topic pages (3 at most);
     Q  300x250, between sets of 10 questions in long practice tests (4 at most);
     B  300x250, near the footer and under test results.
   The web trainer (/practice/) asks for its ads itself (practice/js/web.js):
     T  320x50, at the top of the trainer on phones and tablets, after answers
        of a practice set, every 10th question of timed tests, on the exam
        break and on results screens;
     B  300x250, under results and in the right-hand column of wide screens.
   This file is loaded in <head>: it decides, once, which banner each slot
   uses, so that the CSS reserves the exact space at first paint. Banners
   load after the page's load event. Each banner runs in its own small frame
   with Adsterra's code exactly as given, so several banners can share a page.
   Ads never run inside a question or between a question and its answers.
   Without the ad server (ad blocker, slow network) slots stay empty and
   nothing else changes.

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
    mobile: { key: 'f0cc2c86a781c88af8be45889334df1e', enabled: true, width: 320, height: 50 }    // Slot A below 768px; trainer T
  };
  /* Adsterra's script address, as in the code Adsterra gave (the key is added at the end) */
  var SERVER = 'https://bauval.org/22/';
  var MAX_BANNERS = 8, MAX = { Q: 4, M: 3 }, WIDE = '(min-width: 768px)';
  var LABEL = { en: 'Advertisement', fr: 'Publicité', ar: 'إعلان' };
  /* ---------------------------------------------------------------------- */

  if (g.ECL_ADS) return;
  var doc = document, html = doc.documentElement;
  var CHECK = /[?&]ads=check\b/.test(location.search);
  var TRAINER = /\/practice(\/|$)/.test(location.pathname);
  function unit(name) { var u = UNITS[name]; return u && u.enabled === true && /^[0-9a-f]{32}$/.test(u.key) ? { name: name, key: u.key, width: u.width, height: u.height } : null; }
  function log(m) { if (CHECK && g.console) console.log('[ads] ' + m); }

  /* decided once, now: the banner of each slot for this screen width */
  var wide = !!(g.matchMedia && g.matchMedia(WIDE).matches);
  var PLAN = TRAINER ? { T: unit('mobile'), B: unit('rect') }
    : { A: unit(wide ? 'leader' : 'mobile'), M: unit('rect'), Q: unit('rect'), B: unit('rect') };
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
  function start(box, u) { if (!loaded) queue.push({ box: box, u: u }); else run(box, u); }
  /* claims a page slot: A and B once per page, M and Q up to MAX, MAX_BANNERS in all */
  function claim(box) {
    var slot = box.getAttribute('data-adz'), u = PLAN[slot];
    if (!u || box.getAttribute('data-ad-state') || banners >= MAX_BANNERS) return null;
    if (MAX[slot] ? (used[slot] || 0) >= MAX[slot] : used[slot]) return null;
    used[slot] = (used[slot] || 0) + 1; banners++;
    box.setAttribute('data-ad-state', 'waiting');
    box.setAttribute('data-ad-zone', u.name);                          // pins the box to this banner's size
    return u;
  }

  /* trainer: the slot at the top of the page (phones and tablets; wide screens have the right-hand column) */
  function trainerStatic(box) {
    var u = PLAN.T;
    if (!u || box.getAttribute('data-adz') !== 'T' || (g.matchMedia && g.matchMedia('(min-width: 1280px)').matches)) return null;
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
        var box = build(slot), u = claim(box);
        if (!u) return null;
        el.appendChild(box); start(box, u);
        return box;
      } catch (e) { return null; }
    },
    /* trainer: a new banner right after el, each time a new screen asks for one */
    fresh: function (el, slot) {
      try {
        var u = PLAN[slot];
        if (!TRAINER || !el || !u || !el.parentNode) return null;
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
      Object.keys(PLAN).forEach(function (k) { p[k] = PLAN[k] ? PLAN[k].width + 'x' + PLAN[k].height : null; });
      return p;
    }
  };

  if (doc.readyState === 'complete') onLoad(); else g.addEventListener('load', onLoad);
  log('plan ' + JSON.stringify(g.ECL_ADS.plan()));
})(window);
