/* ==========================================================================
   ads.js - the Adcash display ads of the website and of the web trainer.
   --------------------------------------------------------------------------
   ZONE SWITCHES: the list just below. Set "enabled" to true once Adcash has
   approved a zone, false to switch it off. A zone that is off renders
   nothing at all: no script, no box, no "Advertisement" label, no space.
   Another zone never takes its place.

   Slots, placed in the pages' HTML as <div class="adz" data-adz="X">...</div>:
     A  leaderboard, below the top of the page: the 728x90 zone from 768px
        wide up, the 300x100 zone below (once per page);
     M  300x100, between sections of guides, lessons and topic pages (3 at most);
     Q  300x100, between sets of 10 questions in long practice tests;
     B  300x250 rectangle, near the footer and under test results.
   The web trainer (/practice/) asks for its ads itself (practice/js/web.js):
     T  300x100, at the top of the trainer on phones and tablets, after every
        10th answered question of a practice set, on the break between the two
        parts of an exam, on results screens and in the right-hand column of
        wide screens.
   This file is loaded in <head>: it decides, once, which zone each slot will
   use, so that the CSS reserves the exact space at first paint. The Adcash
   library loads once, after the page's load event. Ads never run inside a
   question or between a question and its answers.
   Without the library (ad blocker, slow network) slots stay empty and
   nothing else changes.

   Helpers:  ECL_ADS.mount(element, 'B')   adds a slot at the end of element
             ECL_ADS.fresh(element, 'T')   trainer: adds a new banner after element
   Check: add ?ads=check to a page URL and open the browser console (F12).
   ========================================================================== */
(function (g) {
  'use strict';

  /* --------------------------- zone switches ---------------------------- */
  var ZONES = [
    { id: '12471518', enabled: false, width: 300, height: 100 },  // 300x100: Slot A below 768px, M, Q, T (site rejected by Adcash, Nov 23 2026)
    { id: '12477038', enabled: false, width: 728, height: 90 },   // Slot A from 768px up: switch on after approval
    { id: '12477046', enabled: false, width: 300, height: 250 }   // Slot B, all screens: switch on after approval
  ];
  /* the Adcash library, with the attributes Adcash gave */
  var LIBRARY = { id: 'aclib', type: 'text/javascript', src: '//acscdn.com/script/aclib.js' };
  var MAX_BANNERS = 8, MAX = { Q: 4, M: 3 }, WAIT_MS = 10000, WIDE = '(min-width: 768px)';
  var LABEL = { en: 'Advertisement', fr: 'Publicité', ar: 'إعلان' };
  /* ---------------------------------------------------------------------- */

  if (g.ECL_ADS) return;
  var doc = document, html = doc.documentElement;
  var CHECK = /[?&]ads=check\b/.test(location.search);
  var TRAINER = /\/practice(\/|$)/.test(location.pathname);
  function zone(id) { for (var i = 0; i < ZONES.length; i++) if (ZONES[i].id === id && ZONES[i].enabled === true) return ZONES[i]; return null; }
  function log(m) { if (CHECK && g.console) console.log('[ads] ' + m); }

  /* decided once, now: the zone of each slot for this screen width */
  var wide = !!(g.matchMedia && g.matchMedia(WIDE).matches);
  var PLAN = TRAINER ? { T: zone('12471518'), B: zone('12477046') }
    : { A: zone(wide ? '12477038' : '12471518'), M: zone('12471518'), Q: zone('12471518'), B: zone('12477046') };
  Object.keys(PLAN).forEach(function (k) { if (PLAN[k]) html.classList.add('adz-on-' + k); });   // the CSS shows and sizes the slots

  var banners = 0, used = {}, queue = [], lib = null, loaded = false;

  function lang() { var l = (html.lang || 'en').slice(0, 2).toLowerCase(); return LABEL[l] ? l : 'en'; }
  function build(slot) {
    var box = doc.createElement('div');
    box.className = 'adz'; box.setAttribute('data-adz', slot);
    box.innerHTML = '<p class="adz-label">' + LABEL[lang()] + '</p><div class="adz-box"></div>';
    return box;
  }
  function loadLibrary() {
    if (lib) return lib;
    lib = new Promise(function (resolve, reject) {
      var done = false;
      function ok() { if (!done) { done = true; resolve(); } }
      function bad() { if (!done) { done = true; reject(); } }
      setTimeout(function () { if (g.aclib) ok(); else bad(); }, WAIT_MS);
      var ex = doc.getElementById(LIBRARY.id);
      if (ex) { if (g.aclib) ok(); else { ex.addEventListener('load', ok); ex.addEventListener('error', bad); } return; }
      var s = doc.createElement('script');
      s.id = LIBRARY.id; s.type = LIBRARY.type; s.async = true; s.src = LIBRARY.src;
      s.onload = ok; s.onerror = bad;
      (doc.head || html).appendChild(s);
    });
    return lib;
  }
  /* Adcash draws the banner where the calling script sits: an inline script
     inside the slot's box, exactly like the code Adcash gives */
  function run(box, z) {
    try {
      if (!box.isConnected) return;
      if (!g.aclib || typeof g.aclib.runBanner !== 'function') { box.setAttribute('data-ad-state', 'failed'); return; }
      var s = doc.createElement('script');
      s.type = 'text/javascript';
      s.text = 'aclib.runBanner({ zoneId: \'' + z.id + '\' });';
      box.querySelector('.adz-box').appendChild(s);
      box.setAttribute('data-ad-state', 'run');
      foldIfEmpty(box);
      log('slot ' + box.getAttribute('data-adz') + ': runBanner zone ' + z.id);
    } catch (e) { box.setAttribute('data-ad-state', 'failed'); }
  }
  function start(box, z) {
    if (!loaded) { queue.push({ box: box, z: z }); return; }
    loadLibrary().then(function () { run(box, z); },
      function () { box.setAttribute('data-ad-state', 'failed'); foldIfEmpty(box); log('Adcash library did not load: slots stay empty'); });
  }
  /* claims a page slot: A, M and B once per page, Q up to MAX_Q, MAX_BANNERS in all */
  function claim(box) {
    var slot = box.getAttribute('data-adz'), z = PLAN[slot];
    if (!z || box.getAttribute('data-ad-state') || banners >= MAX_BANNERS) return null;
    if (MAX[slot] ? (used[slot] || 0) >= MAX[slot] : used[slot]) return null;
    used[slot] = (used[slot] || 0) + 1; banners++;
    box.setAttribute('data-ad-state', 'waiting');
    box.setAttribute('data-ad-zone', z.id);                            // pins the box to this zone's size
    return z;
  }

  /* trainer: the slot at the top of the page (phones and tablets; wide screens have the right-hand column) */
  function trainerStatic(box) {
    var z = PLAN.T;
    if (!z || box.getAttribute('data-adz') !== 'T' || (g.matchMedia && g.matchMedia('(min-width: 1280px)').matches)) return null;
    box.setAttribute('data-ad-state', 'waiting'); box.setAttribute('data-ad-zone', z.id);
    return z;
  }
  /* no ad drawn after a while: an empty box that is still below the screen folds away (nothing on screen moves);
     one on screen keeps its space */
  function foldIfEmpty(box) {
    setTimeout(function () {
      try {
        if (!box.isConnected) return;
        var drawn = [].slice.call(box.querySelectorAll('.adz-box > *')).some(function (c) { return c.nodeName !== 'SCRIPT'; });
        if (drawn) return;
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
        var z = TRAINER ? trainerStatic(box) : claim(box);
        if (!z) {                                                       // off or over the cap: nothing left behind
          var li = box.closest('.qc-adbreak'); (li || box).remove(); return;
        }
        start(box, z);
      });
      var q = queue; queue = [];
      q.forEach(function (x) { start(x.box, x.z); });
    } catch (e) { }
  }

  g.ECL_ADS = {
    /* adds a page slot at the end of el (once per slot); returns it, or null */
    mount: function (el, slot) {
      try {
        if (TRAINER || !el || !PLAN[slot]) return null;
        var box = build(slot), z = claim(box);
        if (!z) return null;
        el.appendChild(box); start(box, z);
        return box;
      } catch (e) { return null; }
    },
    /* trainer: a new banner right after el, each time a new screen asks for one */
    fresh: function (el, slot) {
      try {
        var z = PLAN[slot];
        if (!TRAINER || !el || !z || !el.parentNode) return null;
        var box = build(slot);
        box.setAttribute('data-ad-state', 'waiting'); box.setAttribute('data-ad-zone', z.id);
        el.insertAdjacentElement('afterend', box); start(box, z);
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
      Object.keys(PLAN).forEach(function (k) { p[k] = PLAN[k] ? PLAN[k].id : null; });
      return p;
    }
  };

  if (doc.readyState === 'complete') onLoad(); else g.addEventListener('load', onLoad);
  log('plan ' + JSON.stringify(g.ECL_ADS.plan()));
})(window);
