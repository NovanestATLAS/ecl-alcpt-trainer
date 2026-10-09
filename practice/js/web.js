/* ==========================================================================
   web.js - loaded AFTER app.js on the website.
     . browser Back button moves back inside the trainer
     . links such as practice/?go=grammar or ?set=g_x_Modals open a section
     . keyboard: A-D or 1-4 to answer, Enter for next, L to listen
     . texts that only made sense on Android are adapted
     . "Get the app" card, slim banner and an occasional end-of-set prompt
     . AdSense units in the right column and on the results screen, once
       their numbers are filled in assets/config.js
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

  /* --------------------------- slim app banner --------------------------- */
  var banner = doc.getElementById('appBanner');
  if (banner && !isIOS && ls('banner_hidden') !== '1') banner.hidden = false;
  var bx = banner && banner.querySelector('button');
  if (bx) bx.addEventListener('click', function () { banner.hidden = true; ls('banner_hidden', '1'); });

  /* ------------------------ end-of-set app prompt ------------------------ */
  var dlg = doc.getElementById('promo');
  W.onSetEnd = function () {
    if (!dlg || isIOS) return;
    var sets = (parseInt(ls('sets'), 10) || 0) + 1;
    ls('sets', String(sets));
    var last = parseInt(ls('promo_at'), 10) || 0, now = Date.now();
    if (sets < 2 || now - last < 3 * 24 * 3600 * 1000) return;
    ls('promo_at', String(now));
    setTimeout(function () {
      if (g.S && g.S.view !== 'result') return;
      try { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); } catch (e) { }
    }, 600);
  };
  if (dlg) dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-close]')) { try { dlg.close(); } catch (x) { dlg.removeAttribute('open'); } }
  });

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
        n.innerHTML = 'Voices come from your browser and your computer. By default the trainer uses the best ' +
          '<b>male American voice</b> it finds. <b>Microsoft Edge</b> has the most natural ones (Andrew, Guy, ' +
          'Christopher); <b>Google Chrome</b> on Windows uses Microsoft David or Mark, and also offers ' +
          '"Google US English" (female). Pick a voice in the list above, then use <b>Test the voice</b>.';
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
      var a = doc.createElement('p'); a.className = 'fr';
      a.innerHTML = 'Also available as a free Android app that works offline: ' +
        '<a data-google-vignette="false" href="' + W.playLink('settings') + '" target="_blank" rel="noopener">Google Play</a>.';
      c.appendChild(a);
    });
  }

  /* The voice list says "Preferred Google US" (Android). On the web the
     automatic choice is the best male American voice of the browser.      */
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
      if (sp[1]) sp[1].textContent = nm ? 'The best male American voice found in this browser. Choose another voice below if you prefer.'
        : 'This browser has no male American voice: an English (United States) voice is used.';
    }
    var b0 = box.querySelector('p.fr > b');
    if (b0 && b0.textContent === 'All the voices of this device') b0.textContent = 'All the voices of this browser';
    box.querySelectorAll('p.fr').forEach(function (p) {
      if (/listed by Android/.test(p.textContent)) p.textContent = 'This browser lists no English voice. Open the trainer in Google Chrome or Microsoft Edge.';
    });
    var o = box.querySelector('option[value="__default__"]');
    if (o && !o.getAttribute('data-w')) {
      o.setAttribute('data-w', '1');
      o.textContent = 'Automatic: best male US voice' + (nm ? ' (' + nm + ')' : '');
    }
  }
  var appPickVoice = g.pickVoice;
  if (typeof appPickVoice === 'function') {
    g.pickVoice = function (idx) {
      if (idx === '__default__') {
        if (g.Speech && g.Speech.useDefaultVoice) g.Speech.useDefaultVoice();
        if (typeof g.toast === 'function') g.toast('Automatic voice: the best male American voice');
        if (typeof g.voiceNowInfo === 'function') g.voiceNowInfo();
        if (typeof g.testVoice === 'function') g.testVoice();
        return;
      }
      return appPickVoice.apply(this, arguments);
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
    if (v === 'result' && !root.querySelector('.w-adres')) {
      var after = null;
      root.querySelectorAll('.navrow').forEach(function (n) {
        if (n.querySelector('button[onclick*="goTab(\'home\')"]')) after = n;
      });
      if (after && (C.slots || {}).results) {
        var box = doc.createElement('div'); box.className = 'w-adres';
        after.insertAdjacentElement('afterend', box);
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
      else if (want.start === 'review') g.startSmartReview();
      else if (want.go && g.VIEWS[want.go]) g.go(want.go);
    }, 100);
  }
})(window);
