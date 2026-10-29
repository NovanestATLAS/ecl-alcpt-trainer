/* ==========================================================================
   web-shims.js - loaded BEFORE app.js on the website.
   The Android app uses native plugins (AdMob ads, Android share menu,
   Google Play review). On the web they are replaced here, so app.js runs
   unchanged:
     . Ads      -> no full-screen ads; display ads come from AdSense (web.js)
     . sharing  -> the browser's share sheet, or download + copy as fallback
     . review   -> not used (the web points people to the app instead)
   ========================================================================== */
(function (g) {
  'use strict';
  var PLAY = 'https://play.google.com/store/apps/details?id=com.ecltrainer.english';
  function playLink(campaign) {
    return PLAY + '&referrer=' + encodeURIComponent('utm_source=ecl-alcpt-trainer.com&utm_medium=website&utm_campaign=' + campaign);
  }
  var W = g.ECL_WEB = { playLink: playLink, onSetEnd: null };

  /* First visit: follow the computer's dark or light setting. */
  try {
    if (localStorage.getItem('ecl_theme') === null && g.matchMedia &&
        g.matchMedia('(prefers-color-scheme: dark)').matches) {
      localStorage.setItem('ecl_theme', JSON.stringify('navy'));
    }
  } catch (e) { }

  /* No vibration on computers (the setting stays available on phones). */
  try {
    if (!/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent || '') && localStorage.getItem('ecl_haptic') === null) {
      localStorage.setItem('ecl_haptic', '0');
    }
  } catch (e) { }

  /* ------------------- voices: the browser's own American voices -----------
     Questions, choices and explanations (grammar, vocabulary, idioms, Auto
     mode) are read by the voice built into the computer or phone (Windows:
     Microsoft David, the woman Microsoft Zira; Apple: Alex or Aaron,
     Samantha...), not by an online voice: Chrome's online voices (Google US
     English) can fall silent without any error. The listening questions keep
     their recordings; these voices read them only when a recording cannot
     play. The choice goes into the saved voices the trainer (tts.js) and the
     site pages (site.js) already read: a built-in voice chosen later in
     Settings is kept; a saved online voice is replaced once. */
  (function () {
    var synth = g.speechSynthesis;
    if (!synth || !synth.getVoices) return;
    var KEYS = { read: 'et_voice', M: 'et_lvw_m', W: 'et_lvw_w' }, MEMO = 'ecl_web_local_voices';
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
    function id(v) { return v.voiceURI || v.name; }
    function nm(v) { return String(v.name || '') + ' ' + String(v.voiceURI || ''); }
    function us(v) { return /en[-_]US/i.test(v.lang || '') || /^en-us/i.test(v.voiceURI || ''); }
    var ODD = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Kathy|Princess|Deranged|Hysterical|Grandpa|Grandma|Rocko|Shelley|Sandy|Flo|Eddy|Reed)\b/i;
    function man(v) {
      var n = nm(v);
      if (ODD.test(n) || /female|woman/i.test(n)) return 0;
      if (/Microsoft David/i.test(n)) return 100;
      if (/Microsoft (Mark|Guy|Andrew)/i.test(n)) return 95;
      if (/\b(Alex|Aaron|Evan|Nathan|Tom)\b/i.test(n)) return 90;
      if (/en-us-x-(iol|iom|tpd)/i.test(n) || /#male/i.test(n)) return 88;
      if (/\bmale\b/i.test(n)) return 60;
      if (/\bFred\b/i.test(n)) return 10;
      return 0;
    }
    function woman(v) {
      var n = nm(v);
      if (ODD.test(n)) return 0;
      if (/Microsoft Zira/i.test(n)) return 100;
      if (/Microsoft (Aria|Jenny)/i.test(n)) return 95;
      if (/\b(Samantha|Allison|Ava|Susan|Zoe|Joelle|Noelle|Nicky)\b/i.test(n)) return 90;
      if (/en-us-x-(tpc|sfg|tpf|iob|iog)/i.test(n) || /#female/i.test(n)) return 88;
      if (/\b(female|woman)\b/i.test(n)) return 60;
      return 0;
    }
    function best(list, f) { var b = null, bs = 0; list.forEach(function (v) { var x = f(v); if (x > bs) { bs = x; b = v; } }); return b; }
    var done = false;
    function apply() {
      if (done) return;
      var all = synth.getVoices() || [];
      if (!all.length) return;
      var local = all.filter(function (v) { return v.localService !== false && us(v); });
      if (!local.length) { done = true; return; }          // no built-in American voice: keep the automatic choice
      var m = best(local, man), w = best(local, woman);
      var pick = { read: m || w || local[0], M: m, W: w };
      var memo = {}; try { memo = JSON.parse(get(MEMO) || '{}') || {}; } catch (e) { memo = {}; }
      Object.keys(KEYS).forEach(function (r) {
        var v = pick[r]; if (!v) return;
        var cur = get(KEYS[r]), saved = null;
        all.forEach(function (x) { if (cur && (x.voiceURI === cur || x.name === cur)) saved = x; });
        /* empty, set by us before, or a saved online voice: use the built-in voice */
        if (!cur || cur === memo[r] || !saved || saved.localService === false) { put(KEYS[r], id(v)); memo[r] = id(v); }
      });
      put(MEMO, JSON.stringify(memo));
      done = true;
    }
    apply();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', apply);
    var n = 0, t = setInterval(function () { apply(); if (done || ++n > 40) clearInterval(t); }, 150);
  })();

  /* ---------------------------------- ads --------------------------------- */
  g.Ads = {
    init: function () { return Promise.resolve(); },
    screen: function (kind) { document.documentElement.setAttribute('data-screen', kind || 'normal'); },
    questionAnswered: function () { },
    maybeInterstitial: function () { if (W.onSetEnd) { try { W.onSetEnd(); } catch (e) { } } },
    maybeInterstitialMidRun: function () { },
    onFullscreen: function () { },
    lastAdAt: function () { return 0; },
    holdFor: function () { },
    testModeSaved: function () { return false; },
    testMode: function () { return false; },
    setTestMode: function () { },
    hasPrivacyOptions: function () { return !!(g.googlefc && g.googlefc.callbackQueue); },
    showPrivacyOptions: function () {
      if (g.googlefc && g.googlefc.callbackQueue) {
        g.googlefc.callbackQueue.push(function () { try { g.googlefc.showRevocationMessage(); } catch (e) { } });
      }
    },
    state: function () {
      return { plugin: false, ready: false, interstitialLoaded: false, launch: 0, answersPerAd: 0,
        answeredSinceAd: 0, adsShown: 0, secondsSinceLastAd: -1, graceLeftSeconds: 0, testMode: false,
        holdLeftSeconds: 0, lastDecision: 'Website: no full-screen ads. Display ads come from Google AdSense.' };
    }
  };

  /* -------------------------------- sharing ------------------------------- */
  function toFile(uri, name) {
    try {
      var parts = String(uri).split(','), mime = ((parts[0] || '').match(/:(.*?);/) || [])[1] || 'image/png';
      var bin = atob(parts[1]), n = bin.length, u8 = new Uint8Array(n);
      while (n--) u8[n] = bin.charCodeAt(n);
      return new File([u8], name, { type: mime });
    } catch (e) { return null; }
  }
  function say(msg) { if (typeof g.toast === 'function') g.toast(msg); }
  function fallback(msg, uri) {
    if (uri) {
      var a = document.createElement('a');
      a.href = uri; a.download = 'ecl-practice-score.png';
      document.body.appendChild(a); a.click(); a.remove();
    }
    var copied = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(msg); copied = true; } } catch (e) { }
    say(uri ? (copied ? 'Image saved. The text is copied: paste it with the image.' : 'Image saved.')
            : (copied ? 'Text copied: paste it where you want to share it.' : 'Sharing is not available in this browser'));
  }
  g.plugins = g.plugins || {};
  g.plugins.socialsharing = {
    shareWithOptions: function (opt, ok, fail) {
      opt = opt || {};
      var msg = String(opt.message || '').split(PLAY).join(playLink('web-share'));
      var uri = (opt.files || [])[0] || null;
      var file = uri ? toFile(uri, 'ecl-practice-score.png') : null;
      function done(r) { if (ok) ok(r || { completed: true }); }
      if (navigator.share) {
        var data = { title: opt.subject || 'My English practice score', text: msg };
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
        navigator.share(data).then(function () { done(); }, function (e) {
          if (e && e.name === 'AbortError') { done({ completed: false }); return; }
          fallback(msg, uri); done({ completed: false });
        });
        return;
      }
      fallback(msg, uri); done({ completed: false });
    }
  };
})(window);
