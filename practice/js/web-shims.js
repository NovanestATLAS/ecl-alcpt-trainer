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
        var data = { title: opt.subject || 'My ECL practice test score', text: msg };
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
