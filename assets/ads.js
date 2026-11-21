/* ==========================================================================
   ads.js - the Adcash display slots of the website (not of /practice/).
   --------------------------------------------------------------------------
   ZONE SWITCHES: the list just below. Set "enabled" to true once Adcash has
   approved a zone, false to switch it off. A zone that is off renders
   nothing at all: no script, no box, no "Advertisement" label, no space.
   Another zone never takes its place.

   Two slots, placed in the pages' HTML as
     <div class="adz" data-adz="A">...</div>   (Slot A, leaderboard)
     <div class="adz" data-adz="B">...</div>   (Slot B, rectangle)
     . Slot A: the 728x90 zone from 768px wide up, the 300x100 zone below;
     . Slot B: the 300x250 zone on every screen.
   This file is loaded in <head>: it only decides, once, which zone each slot
   will use, so that assets/site.css reserves the exact space at first paint.
   The Adcash library loads after the page's load event and runs each slot at
   most once per page view, never again on resize, answers or timers.
   At most 2 banners per page. Without the library (ad blocker, slow
   network) the slots stay as they are, empty, and nothing else changes.

   Helper (used by assets/monetization.js on the results of a practice test):
     ECL_ADS.mount(element, 'B')   adds Slot B at the end of element
   Check: add ?ads=check to a page URL and open the browser console (F12).
   ========================================================================== */
(function (g) {
  'use strict';

  /* --------------------------- zone switches ---------------------------- */
  var ZONES = [
    { id: '12471518', enabled: true,  width: 300, height: 100 },  // Slot A below 768px (the original zone)
    { id: '12477038', enabled: false, width: 728, height: 90 },   // Slot A from 768px up: switch on after approval
    { id: '12477046', enabled: false, width: 300, height: 250 }   // Slot B, all screens: switch on after approval
  ];
  /* the Adcash library, with the attributes Adcash gave */
  var LIBRARY = { id: 'aclib', type: 'text/javascript', src: '//acscdn.com/script/aclib.js' };
  var MAX_BANNERS = 2, WAIT_MS = 10000, WIDE = '(min-width: 768px)';
  var LABEL = { en: 'Advertisement', fr: 'Publicité', ar: 'إعلان' };
  /* ---------------------------------------------------------------------- */

  if (g.ECL_ADS) return;
  var doc = document, html = doc.documentElement;
  var CHECK = /[?&]ads=check\b/.test(location.search);
  var OFF = /\/practice(\/|$)/.test(location.pathname);              // the trainer never shows Adcash
  function zone(id) { for (var i = 0; i < ZONES.length; i++) if (ZONES[i].id === id && ZONES[i].enabled === true) return ZONES[i]; return null; }
  function log(m) { if (CHECK && g.console) console.log('[ads] ' + m); }

  /* decided once, now: the zone of each slot for this screen width */
  var wide = !!(g.matchMedia && g.matchMedia(WIDE).matches);
  var PLAN = OFF ? {} : { A: zone(wide ? '12477038' : '12471518'), B: zone('12477046') };
  if (PLAN.A) html.classList.add('adz-on-A');                        // site.css shows and sizes the slot
  if (PLAN.B) html.classList.add('adz-on-B');

  var banners = 0, used = {}, queue = [], lib = null;

  function lang() { var l = (html.lang || 'en').slice(0, 2).toLowerCase(); return LABEL[l] ? l : 'en'; }
  /* a slot built by script (results screen): the same markup as in the pages */
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
      if (!g.aclib || typeof g.aclib.runBanner !== 'function') { box.setAttribute('data-ad-state', 'failed'); return; }
      var s = doc.createElement('script');
      s.type = 'text/javascript';
      s.text = 'aclib.runBanner({ zoneId: \'' + z.id + '\' });';
      box.querySelector('.adz-box').appendChild(s);
      box.setAttribute('data-ad-state', 'run');
      log('slot ' + box.getAttribute('data-adz') + ': runBanner zone ' + z.id);
    } catch (e) { box.setAttribute('data-ad-state', 'failed'); }
  }
  /* claims a slot: true if this box may show its zone (once per slot, 2 banners at most) */
  function claim(box) {
    var slot = box.getAttribute('data-adz'), z = PLAN[slot];
    if (!z || used[slot] || banners >= MAX_BANNERS || box.getAttribute('data-ad-state')) return null;
    used[slot] = 1; banners++;
    box.setAttribute('data-ad-state', 'waiting');
    box.setAttribute('data-ad-zone', z.id);                            // pins the box to this zone's size
    return z;
  }
  function start(box, z) {
    loadLibrary().then(function () { run(box, z); },
      function () { box.setAttribute('data-ad-state', 'failed'); log('Adcash library did not load: slots stay empty'); });
  }

  var loaded = false;
  function onLoad() {
    loaded = true;
    try {
      [].slice.call(doc.querySelectorAll('.adz[data-adz]')).forEach(function (box) {
        var z = claim(box);
        if (!z) { if (!box.getAttribute('data-ad-state')) box.remove(); return; }   // off or over the cap: nothing left behind
        start(box, z);
      });
      queue.forEach(function (q) { start(q.box, q.z); }); queue = [];
    } catch (e) { }
  }

  g.ECL_ADS = {
    /* adds a slot at the end of el; returns it, or null when it may not show */
    mount: function (el, slot) {
      try {
        if (OFF || !el || !PLAN[slot] || used[slot] || banners >= MAX_BANNERS) return null;
        var box = build(slot), z = claim(box);
        if (!z) return null;
        el.appendChild(box);
        if (loaded) start(box, z); else queue.push({ box: box, z: z });
        return box;
      } catch (e) { return null; }
    },
    /* removes Slot A when a test shows its results (it does not run again) */
    remove: function (slot) {
      [].slice.call(doc.querySelectorAll('.adz[data-adz="' + slot + '"]')).forEach(function (b) { b.remove(); });
      used[slot] = 1;
    },
    plan: function () { return { wide: wide, A: PLAN.A ? PLAN.A.id : null, B: PLAN.B ? PLAN.B.id : null, banners: banners }; }
  };

  if (OFF) {
    if (doc.readyState !== 'loading') clean(); else doc.addEventListener('DOMContentLoaded', clean);
  } else if (doc.readyState === 'complete') onLoad();
  else g.addEventListener('load', onLoad);
  function clean() { [].slice.call(doc.querySelectorAll('.adz')).forEach(function (b) { b.remove(); }); }
  log('plan ' + JSON.stringify(g.ECL_ADS.plan()));
})(window);
