/* ==========================================================================
   web.js - loaded AFTER app.js on the website.
     . browser Back button moves back inside the trainer
     . links such as practice/?go=grammar or ?set=g_x_Modals open a section
     . keyboard: A-D or 1-4 to answer, Enter for next, L to listen
     . texts that only made sense on Android are adapted
     . AdSense units in the right column and on the results screen, once
       their numbers are filled in assets/config.js
     . one promo card that takes turns between the tutor partners (italki,
       Preply when its link is in config.js) and the free Android app
       (Android phones only): on the results screen, and after every 10th
       answered question of a PRACTICE set, under the Next button. Never in
       timed tests or exams. At most 6 a day; the x hides the one on screen
   ========================================================================== */
(function (g) {
  'use strict';
  var W = g.ECL_WEB || {}, C = g.ECL_CONFIG || {}, doc = document, html = doc.documentElement;
  var root = doc.getElementById('root');
  if (!root || typeof g.go !== 'function') return;

  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isPhone = /Android|iPhone|iPad|iPod|Mobi/i.test(ua) || isIOS;
  if (isIOS) html.classList.add('is-ios');
  if (isPhone) html.classList.add('is-phone');

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem('ecl_web_' + k); localStorage.setItem('ecl_web_' + k, v); } catch (e) { }
    return null;
  }

  /* ----------------------------- ad units ------------------------------- */
  function adUnit(box, slotName) {
    var id = (C.slots || {})[slotName];
    if (!box || !id || !C.adsenseClient || box.getAttribute('data-filled')) return;
    box.setAttribute('data-filled', '1');
    box.innerHTML = '<span class="w-adlabel">Advertisements</span><ins class="adsbygoogle" style="display:block" ' +
      'data-ad-client="' + C.adsenseClient + '" data-ad-slot="' + id + '" data-ad-format="auto" ' +
      'data-full-width-responsive="true"></ins>';
    try { (g.adsbygoogle = g.adsbygoogle || []).push({}); } catch (e) { }
  }
  function railAd() {
    if (g.matchMedia && g.matchMedia('(min-width:1280px)').matches) adUnit(doc.getElementById('railAd'), 'rail');
  }
  railAd();
  if (g.matchMedia) {
    var mq = g.matchMedia('(min-width:1280px)');
    if (mq.addEventListener) mq.addEventListener('change', railAd);
  }

  /* ------------- Auto ads: an anchor ad never hides the tab bar -------------
     A bottom anchor ad (AdSense Auto ads, phones and tablets) is drawn over
     the page. Its height goes into --adh, the variable the app's style.css
     already uses for the banner of the Android app: the tab bar, the toast
     and the end of the page move up above the ad, and back down when it is
     closed. */
  var lastAnchor = -1;
  function anchorAd() {
    var h = 0, vh = g.innerHeight || html.clientHeight;
    doc.querySelectorAll('ins.adsbygoogle[data-anchor-status], ins.adsbygoogle[data-anchor-shown]').forEach(function (a) {
      var st = a.getAttribute('data-anchor-status');
      if (st && st !== 'displayed') return;
      var r = a.getBoundingClientRect();
      if (r.height > 0 && r.top > vh / 2 && r.bottom >= vh - 4) h = Math.max(h, Math.round(vh - r.top));
    });
    if (h !== lastAnchor) {
      lastAnchor = h;
      html.style.setProperty('--adh', h + 'px');
      html.classList.toggle('w-anchor', h > 0);
    }
  }
  setInterval(anchorAd, 1200);
  g.addEventListener('resize', anchorAd);

  /* ---------------------------- privacy link ----------------------------- */
  doc.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-privacy-choices]');
    if (t && g.googlefc && g.googlefc.callbackQueue) { e.preventDefault(); g.Ads.showPrivacyOptions(); }
  });

  /* ------------------- texts written for the Android app ------------------ */
  function patchSettings() {
    root.querySelectorAll('button[onclick*="openVoiceSettings"]').forEach(function (b) {
      b.textContent = 'How to get a better US voice';
      b.removeAttribute('onclick');
      b.addEventListener('click', function () {
        var n = doc.getElementById('wVoiceHelp');
        if (n) { n.remove(); return; }
        n = doc.createElement('div'); n.id = 'wVoiceHelp'; n.className = 'w-note';
        n.innerHTML = 'Voices come from your browser and your device, so the Android voices of the app ' +
          '(<b>en-us-x-iol</b> for the man, <b>en-us-x-tpc</b> for the woman) cannot be chosen on a website. ' +
          'The closest voices, picked automatically:' +
          '<br>&bull; <b>Microsoft Edge</b> (computer): the natural voices, the best ones: Andrew or Guy for the man, Aria or Jenny for the woman.' +
          '<br>&bull; <b>Google Chrome</b> (computer): "Google US English" (a woman); for the man only Microsoft David or Mark, less natural. ' +
          'Open the trainer in Edge for the best listening practice.' +
          '<br>&bull; <b>iPhone, iPad, Mac</b>: Aaron or Evan, Samantha or Ava. Better: download an "Enhanced" voice in ' +
          'Settings &rsaquo; Accessibility &rsaquo; Spoken Content &rsaquo; Voices &rsaquo; English.' +
          '<br>&bull; <b>Android phone</b>: the browser reads with the voice set in Android: Settings &rsaquo; Text-to-speech output ' +
          '(Google engine, English United States, choose a voice). Or install the free Android app, which uses iol and tpc.' +
          '<br>Choose other voices in the lists above, then use <b>Test the two voices</b>.';
        b.insertAdjacentElement('afterend', n);
      });
    });
    var vb = doc.getElementById('voiceBox');
    if (vb && !vb.getAttribute('data-wobs')) {
      vb.setAttribute('data-wobs', '1');
      new MutationObserver(function () { patchVoiceBox(vb); }).observe(vb, { childList: true, subtree: true });
      patchVoiceBox(vb);
    }
    root.querySelectorAll('.banner.bad + p.fr').forEach(function (p) {
      p.innerHTML = 'Your browser did not offer an English (United States) voice. Open this page in ' +
        '<b>Google Chrome</b> or <b>Microsoft Edge</b>, or add an English voice in your computer\'s speech settings.';
    });
    root.querySelectorAll('label.switch').forEach(function (l) {
      if (/Haptic/i.test(l.textContent) && !('vibrate' in navigator && isPhone)) l.style.display = 'none';
    });
    root.querySelectorAll('.gcard p.fr').forEach(function (p) {
      if (/stay on this device/.test(p.textContent)) {
        p.textContent = 'Scores, favourites, the mistake box and preferences stay in this browser on this computer. ' +
          'Export them to move them to another browser.';
      }
    });
    root.querySelectorAll('.gcard').forEach(function (c) {
      var h = c.querySelector('h3');
      if (!h || h.textContent !== 'About' || c.getAttribute('data-w')) return;
      c.setAttribute('data-w', '1');
      var p = c.querySelector('p.fr');
      if (p) p.innerHTML = p.innerHTML.replace('ECL English Trainer, ', 'ECL &amp; ALCPT English Trainer, website edition, ');
    });
  }

  /* The voice list says "Preferred Google US" (Android). On the web the
     automatic choice is the most natural American voice of the browser.   */
  function webVoiceName() {
    var id = (g.Speech && g.Speech.defaultVoiceId) ? g.Speech.defaultVoiceId() : '';
    if (!id || /^en-us-x-/i.test(id)) return '';
    return String(id).replace(/\s*-\s*English \(United States\)\s*$/i, '');
  }
  function patchVoiceBox(box) {
    var nm = webVoiceName();
    var d = box.querySelector('.voice-default');
    if (d && !d.getAttribute('data-w')) {
      d.setAttribute('data-w', '1');
      var b = d.querySelector('b'), sp = d.querySelectorAll('span');
      if (b && nm) b.textContent = nm;
      if (sp[1]) sp[1].textContent = nm ? 'The most natural American voice found in this browser. Choose another voice below if you prefer.'
        : 'This browser lists no American voice: another English voice is used.';
    }
    var b0 = box.querySelector('p.fr > b');
    if (b0 && b0.textContent === 'All the voices of this device') b0.textContent = 'All the voices of this browser';
    var p0 = b0 && b0.parentNode;
    if (p0 && !p0.getAttribute('data-w') && /This device has/.test(p0.innerHTML)) {
      p0.setAttribute('data-w', '1');
      p0.innerHTML = p0.innerHTML.replace('This device has', 'This browser has');
    }
    box.querySelectorAll('p.fr').forEach(function (p) {
      if (/listed by Android/.test(p.textContent)) p.textContent = 'This browser lists no English voice. Open the trainer in Google Chrome or Microsoft Edge.';
    });
    var o = box.querySelector('option[value="__default__"]');
    if (o && !o.getAttribute('data-w')) {
      o.setAttribute('data-w', '1');
      o.textContent = 'Automatic: most natural US voice' + (nm ? ' (' + nm + ')' : '');
    }
  }
  var appPickVoice = g.pickVoice;
  if (typeof appPickVoice === 'function') {
    g.pickVoice = function (idx) {
      if (idx === '__default__') {
        if (g.Speech && g.Speech.useDefaultVoice) g.Speech.useDefaultVoice();
        if (typeof g.toast === 'function') g.toast('Automatic voice: the most natural American voice');
        if (typeof g.voiceNowInfo === 'function') g.voiceNowInfo();
        if (typeof g.testVoice === 'function') g.testVoice();
        return;
      }
      return appPickVoice.apply(this, arguments);
    };
  }

  /* ------------- promo card: tutor partners and the Android app -------------
     Takes turns in a fixed order. Shown under the buttons, never between a
     question and its answers, never during a timed test or an exam. */
  var APP_URL = 'https://play.google.com/store/apps/details?id=com.ecltrainer.english' +
    '&referrer=utm_source%3Decl-alcpt-trainer.com%26utm_medium%3Dwebsite%26utm_campaign%3Dtrainer_';
  var P = C.partners || {};
  var isAndroid = /Android/i.test(ua);
  var EVERY = 10, DAILY = 6;
  function track(name, params) { try { if (g.ECL_TRACK) g.ECL_TRACK(name, params || {}); } catch (e) { } }
  function ok(u) { return typeof u === 'string' && /^https:\/\//.test(u); }
  var PROMOS = {
    italki: function () {
      return ok(P.italki) && { cls: 'tutor', title: 'Speak English with a real tutor',
        text: 'One-to-one video lessons on italki, at the times you choose. Pay per lesson.',
        cta: 'Find a tutor on italki', url: P.italki, rel: 'sponsored nofollow noopener',
        img: '../assets/img/promo/italki-tutor-', imgW: 1400, imgH: 606 };
    },
    preply: function () {
      return ok(P.preply) && { cls: 'tutor', title: 'Practice speaking with a tutor',
        text: 'One-to-one English lessons on Preply, online, at the times you choose.',
        cta: 'Find a tutor on Preply', url: P.preply, rel: 'sponsored nofollow noopener' };
    },
    app: function (place) {
      return isAndroid && { cls: 'app', title: 'Keep practicing offline',
        text: 'The free Android app has the same questions, works without internet and reads each question aloud.',
        cta: 'Get the free app', url: APP_URL + place, rel: 'noopener' };
    }
  };
  var ORDER = ['italki', 'app', 'preply'];
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function quota() {
    var q = {}; try { q = JSON.parse(ls('promo_day') || '{}'); } catch (e) { }
    if (q.d !== today()) q = { d: today(), n: 0 };
    return q;
  }
  function nextPromo(place) {
    var start = +(ls('promo_turn') || 0);
    for (var k = 0; k < ORDER.length; k++) {
      var idx = (start + k) % ORDER.length, p = PROMOS[ORDER[idx]](place);
      if (p) { ls('promo_turn', String(idx + 1)); p.kind = ORDER[idx]; return p; }
    }
    return null;
  }
  var TUTOR_ICO = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#FFD9E0"/>' +
    '<path d="M11 44c2-9 7-13 13-13s11 4 13 13z" fill="#C8102E"/><circle cx="24" cy="21" r="8" fill="#F2C9A5"/>' +
    '<path d="M16 20c0-6 4-9 8-9s8 3 8 8c-2-2-5-3-8-3s-6 2-8 4z" fill="#3A2A22"/>' +
    '<path d="M15 21a9 9 0 0 1 18 0" stroke="#14243D" stroke-width="2" fill="none"/><rect x="13" y="19" width="4" height="6" rx="2" fill="#14243D"/></svg>';
  function promoCard(place, after) {
    var q = quota();
    if (q.n >= DAILY) return null;
    var p = nextPromo(place);
    if (!p) return null;
    q.n++; ls('promo_day', JSON.stringify(q));
    var c = doc.createElement('div');
    c.className = 'w-promo w-promo-' + p.cls;
    c.setAttribute('role', 'complementary');
    c.setAttribute('aria-label', p.kind === 'app' ? 'Android app' : 'Tutor partner');
    if (p.img) {                    // picture banner: the whole picture is the link, the button covers its drawn x
      c.className = 'w-promo w-promo-pic';
      c.setAttribute('lang', 'en'); c.setAttribute('dir', 'ltr');
      c.innerHTML = '<a class="w-promo-go" data-google-vignette="false" target="_blank" rel="' + p.rel + '" href="' + p.url + '">' +
        '<img src="' + p.img + '800.webp" srcset="' + p.img + '800.webp 800w, ' + p.img + '1400.webp 1400w" ' +
        'sizes="(max-width: 760px) calc(100vw - 32px), 680px" width="' + p.imgW + '" height="' + p.imgH + '" decoding="async" ' +
        'alt="' + p.title + '. ' + p.text + ' ' + p.cta + '"></a>' +
        '<button type="button" class="w-promo-x" aria-label="Close" title="Close"></button>';
    } else c.innerHTML = (p.cls === 'app' ? '<img src="../assets/img/logo-128.webp" alt="" width="44" height="44">' : TUTOR_ICO) +
      '<div class="w-promo-t"><b>' + p.title + '</b><span>' + p.text + '</span></div>' +
      '<a class="w-promo-go" data-google-vignette="false" target="_blank" rel="' + p.rel + '" href="' + p.url + '">' + p.cta + '</a>' +
      '<button type="button" class="w-promo-x" aria-label="Close">&times;</button>';
    c.querySelector('.w-promo-go').addEventListener('click', function () {
      track('promo_click', { kind: p.kind, placement: place });
      if (p.kind === 'italki') track('italki_click', { page: '/practice/' });
    });
    c.querySelector('.w-promo-x').addEventListener('click', function () { c.remove(); });
    after.insertAdjacentElement('afterend', c);
    track('promo_view', { kind: p.kind, placement: place });
    return c;
  }

  /* every 10th answered question of a practice set (not timed tests, not exams) */
  var appPick = g.pick;
  if (typeof appPick === 'function') {
    g.pick = function () {
      var was = g.S && g.S.locked;
      var r = appPick.apply(this, arguments);
      var S = g.S;
      if (S && S.view === 'quiz' && !S.sim && !S.exam && !was && S.locked) {
        var n = +(ls('promo_answers') || 0) + 1;
        ls('promo_answers', String(n));
        if (n % EVERY === 0 && S.idx < S.pool.length - 1 && !root.querySelector('.w-promo')) {   // last question: the results card comes next
          var nav = root.querySelector('.navrow');
          if (nav) setTimeout(function () { if (g.S.view === 'quiz' && nav.isConnected) promoCard('quiz', nav); }, 700);
        }
      }
      return r;
    };
  }

  /* ---------------------------- per screen ------------------------------- */
  function decorate(v) {
    html.setAttribute('data-view', v || '');
    if (v === 'quiz') html.classList.toggle('no-listen', !root.querySelector('#listenBtn'));
    if (v === 'quiz' && !root.querySelector('.w-hint') && !isPhone) {
      var nav = root.querySelector('.navrow');
      if (nav) {
        var h = doc.createElement('p'); h.className = 'w-hint';
        h.innerHTML = '<kbd>A</kbd>&ndash;<kbd>D</kbd> answer &nbsp; <kbd>Enter</kbd> next &nbsp; ' +
          (root.querySelector('#listenBtn') ? '<kbd>L</kbd> listen' : '');
        nav.insertAdjacentElement('afterend', h);
      }
    }
    if (v === 'result' && !root.querySelector('.w-adres, .w-promo')) {
      var after = null;
      root.querySelectorAll('.navrow').forEach(function (n) {
        if (n.querySelector('button[onclick*="goTab(\'home\')"]')) after = n;
      });
      var card = after ? promoCard('result', after) : null;
      if (after && (C.slots || {}).results) {
        var box = doc.createElement('div'); box.className = 'w-adres';
        (card || after).insertAdjacentElement('afterend', box);
        adUnit(box, 'results');
      }
    }
    if (v === 'settings') patchSettings();
  }

  /* --------------------- browser Back inside the trainer ------------------ */
  var depth = 0, lastView = null, popping = false, pendingBack = false;
  try { history.replaceState({ ecl: 0 }, ''); } catch (e) { }
  var appBack = g.back;
  g.back = function () {
    if (!popping && depth > 0) { pendingBack = true; history.back(); return; }
    appBack();
  };
  g.addEventListener('popstate', function (e) {
    depth = (e.state && e.state.ecl) || 0;
    popping = true;
    try {
      if (pendingBack) { pendingBack = false; appBack(); }
      else if (g.S && g.S.view === 'quiz') {
        g.quitQuiz();
        if (g.S.view === 'quiz') { depth++; history.pushState({ ecl: depth }, ''); }
      } else if (g.S && g.S.view !== 'home') appBack();
    } finally { setTimeout(function () { popping = false; }, 0); }
  });
  new MutationObserver(function () {
    var v = g.S ? g.S.view : '';
    if (v !== lastView) {
      if (lastView !== null && !popping && v) { depth++; try { history.pushState({ ecl: depth }, ''); } catch (e) { } }
      lastView = v;
    }
    decorate(v);
  }).observe(root, { childList: true });

  /* ------------------------------ keyboard -------------------------------- */
  doc.addEventListener('keydown', function (e) {
    if (!g.S || g.S.view !== 'quiz' || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    var k = (e.key || '').toUpperCase();
    var i = 'ABCDEF'.indexOf(k);
    if (k.length === 1 && i >= 0 && g.S.pool[g.S.idx] && i < g.S.pool[g.S.idx].o.length) {
      e.preventDefault(); g.pick(i); return;
    }
    if (k === 'L') { var b = doc.getElementById('listenBtn'); if (b) { e.preventDefault(); b.click(); } }
  });

  /* ---------------------- deep links into the trainer --------------------- */
  var params = new URLSearchParams(location.search);
  var want = { go: params.get('go'), set: params.get('set'), start: params.get('start') };
  if (want.go || want.set || want.start) {
    var tries = 0, t = setInterval(function () {
      tries++;
      var ready = g.BANKS && Object.keys(g.BANKS).length && g.S && g.S.view === 'home';
      if (!ready && tries < 100) return;
      clearInterval(t);
      if (!ready) return;
      try { history.replaceState({ ecl: 0 }, '', location.pathname); } catch (e) { }
      if (want.set && g.BANKS[want.set]) g.startBank(want.set);
      else if (want.start === 'quick') g.quickMixed();
      else if (want.start === 'listen' && g.LISTEN && g.LISTEN.length) g.quickListen();
      else if (want.start === 'review') g.startSmartReview();
      else if (want.go && g.VIEWS[want.go]) g.go(want.go);
    }, 100);
  }
})(window);
