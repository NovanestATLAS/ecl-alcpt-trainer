/* ECL & ALCPT English Trainer - website script (all pages except /practice/) */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isAndroid || isIOS || /Mobi/i.test(ua)) html.classList.add('is-phone');
  if (isAndroid) html.classList.add('is-android');
  if (isIOS) html.classList.add('is-ios');

  /* mobile menu */
  var menuBtn = doc.querySelector('.menu-btn'), nav = doc.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* "Privacy choices": reopens Google's consent message where it applies */
  doc.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-privacy-choices]') : null;
    if (!t) return;
    if (window.googlefc && window.googlefc.callbackQueue) {
      e.preventDefault();
      window.googlefc.callbackQueue.push(function () {
        try { window.googlefc.showRevocationMessage(); } catch (x) { location.href = t.getAttribute('href'); }
      });
    }
  });

  /* manual AdSense units, only once their slot number is filled in config.js */
  var C = window.ECL_CONFIG || {};
  doc.querySelectorAll('.ad-slot[data-slot]').forEach(function (box) {
    var id = (C.slots || {})[box.getAttribute('data-slot')];
    if (!id || !C.adsenseClient) return;
    box.innerHTML = '<span class="ad-label">Advertisements</span><ins class="adsbygoogle" style="display:block" ' +
      'data-ad-client="' + C.adsenseClient + '" data-ad-slot="' + id + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (x) { }
  });

  /* live filter for long lists (idioms, irregular verbs, phrasal verbs, vocabulary) */
  doc.querySelectorAll('[data-filter]').forEach(function (input) {
    var scope = doc.querySelector(input.getAttribute('data-filter'));
    if (!scope) return;
    var items = scope.querySelectorAll('[data-item]');
    var count = doc.querySelector(input.getAttribute('data-count') || '#none');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase(), shown = 0;
      items.forEach(function (it) {
        var hit = !q || it.getAttribute('data-item').indexOf(q) >= 0;
        it.hidden = !hit; if (hit) shown++;
      });
      scope.querySelectorAll('[data-group]').forEach(function (g) {
        g.hidden = !g.querySelector('[data-item]:not([hidden])');
      });
      if (count) count.textContent = q ? shown + ' found' : '';
    });
  });

  /* ---------------------------- read aloud ---------------------------------
     The most NATURAL American voice of the browser reads the lessons and the
     questions (Microsoft Edge: Andrew; Chrome: Google US English; Apple:
     Alex or Aaron...). Listening conversations use the best MAN's voice and
     the best WOMAN's voice, the closest ones to the Android app's voices
     (en-us-x-iol and en-us-x-tpc). Voices chosen in the trainer's settings
     (same browser) are used first. One voice only: the woman gets a higher
     pitch.                                                               */
  var synth = window.speechSynthesis || null, voice = null, voiceM = null, voiceF = null, speakingBtn = null, seqGen = 0;
  var NOVELTY = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Kathy|Princess|Deranged|Hysterical|Grandpa|Grandma|Rocko|Shelley|Sandy|Flo|Eddy|Reed)\b/i;
  function vn(v) { return String(v.name || '') + ' ' + String(v.voiceURI || ''); }
  function rank(v) {                                   // a man's voice, 0 = not one
    var n = vn(v);
    if (NOVELTY.test(n)) return 0;
    var nat = /natural|neural|online|premium|enhanced/i.test(n), r = 0;
    if (/\bAndrew\b/i.test(n)) r = 100;
    else if (/\bGuy\b/i.test(n)) r = 99;
    else if (/\bChristopher\b/i.test(n)) r = 98;
    else if (/\bBrian(Multilingual)?\b/i.test(n) || /AndrewMultilingual/i.test(n)) r = 97;
    else if (/\bEric\b/i.test(n)) r = 96;
    else if (/\b(Roger|Steffan|Davis|Tony|Jason|Brandon|Kai|Ryan)\b/i.test(n)) r = 95;
    if (r) return nat ? r : r - 30;
    if (/en-us-x-(iol|iom|tpd)/i.test(n) || /#male/i.test(n)) return 92;
    if (/\b(Evan|Nathan|Tom|Aaron|Alex)\b/i.test(n) && /premium|enhanced/i.test(n)) return 90;
    if (/\bAlex\b/i.test(n)) return 85;
    if (/\bAaron\b/i.test(n)) return 84;
    if (/\b(Evan|Nathan)\b/i.test(n)) return 83;
    if (/\bTom\b/i.test(n)) return 82;
    if (/Microsoft (Mark|David)/i.test(n)) return 55;
    if (/\bFred\b/i.test(n)) return 10;
    return 0;
  }
  function rankF(v) {                                  // a woman's voice, 0 = not one
    var n = vn(v);
    if (NOVELTY.test(n)) return 0;
    var nat = /natural|neural|online|premium|enhanced/i.test(n), r = 0;
    if (/\bAria\b/i.test(n)) r = 100;
    else if (/\bJenny\b/i.test(n)) r = 99;
    else if (/\b(Ava|Emma)(Multilingual)?\b/i.test(n) && /Microsoft/i.test(n)) r = 98;
    else if (/\b(Michelle|Nancy|Sara|Jane|Amber|Ashley|Cora|Elizabeth|Monica)\b/i.test(n)) r = 96;
    if (r) return nat ? r : r - 30;
    if (/en-us-x-(tpc|sfg|tpf|iob|iog)/i.test(n) || /#female/i.test(n)) return 92;
    if (/\b(Ava|Allison|Samantha|Susan|Zoe|Joelle|Noelle)\b/i.test(n) && /premium|enhanced/i.test(n)) return 90;
    if (/Google US English/i.test(n)) return 88;
    if (/\bSamantha\b/i.test(n)) return 84;
    if (/\b(Allison|Ava)\b/i.test(n)) return 83;
    if (/\b(Susan|Zoe)\b/i.test(n)) return 82;
    if (/\b(Nicky|Joelle|Noelle|Victoria)\b/i.test(n)) return 79;
    if (/Microsoft Zira/i.test(n)) return 52;
    return 0;
  }
  function quality(v) { var q = Math.max(rank(v), rankF(v) - 1); return q > 0 ? q : (v.localService ? 20 : 15); }
  function usVoices() {
    return (synth.getVoices() || []).filter(function (x) {
      return /en[-_]US/i.test(x.lang || '') || /^en-us/i.test(x.voiceURI || '');
    });
  }
  function enVoices() { return (synth.getVoices() || []).filter(function (x) { return /^en([-_]|$)/i.test(x.lang || ''); }); }
  function best(list, f) { var b = null, bs = 0; list.forEach(function (v) { var s = f(v); if (s > bs) { bs = s; b = v; } }); return b; }
  function saved(key) {
    var want = '', every = synth.getVoices() || [];
    try { want = localStorage.getItem(key) || ''; } catch (e) { }
    for (var i = 0; want && i < every.length; i++) if (every[i].voiceURI === want || every[i].name === want) return every[i];
    return null;
  }
  function pickVoice() {
    if (!synth) return null;
    return saved('et_voice') || best(usVoices(), quality) || usVoices()[0] || enVoices()[0] || null;
  }
  function pickVoiceM() {
    if (!synth) return null;
    return saved('et_lvw_m') || best(usVoices(), rank) || best(enVoices(), rank) || pickVoice();
  }
  function pickVoiceF() {
    if (!synth) return null;
    return saved('et_lvw_w') || best(usVoices(), rankF) || best(enVoices(), rankF) || pickVoice();
  }
  function rate() {
    var r = 0.92;
    try { r = parseFloat(localStorage.getItem('et_rate')) || 0.92; } catch (e) { }
    if (html.classList.contains('slow-voice')) r = Math.min(r, 0.78);
    return Math.min(1.4, Math.max(0.6, r));
  }
  function stopSpeak() {
    seqGen++;
    if (synth) synth.cancel();
    if (speakingBtn) speakingBtn.setAttribute('aria-pressed', 'false');
    speakingBtn = null;
  }
  function utter(text, who) {
    var u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'en-US'; u.rate = rate();
    if (!voice) voice = pickVoice();
    if (who && (!voiceM || !voiceF)) { voiceM = pickVoiceM(); voiceF = pickVoiceF(); }
    var one = !voiceM || !voiceF || voiceM === voiceF;
    if (who === 'W') { if (voiceF) u.voice = voiceF; if (one) u.pitch = 1.25; }
    else if (who === 'M') { if (voiceM) u.voice = voiceM; if (one) u.pitch = 0.9; }
    else if (voice) u.voice = voice;
    if (u.voice && u.voice.lang) u.lang = u.voice.lang;
    return u;
  }
  /* lines: [['M', 'text'], ['W', 'text'], ...] read one after the other */
  function speakSeq(lines, btn) {
    if (!synth || !lines || !lines.length) return;
    if (btn && btn === speakingBtn) { stopSpeak(); return; }
    var was = synth.speaking || synth.pending;
    stopSpeak();
    var gen = seqGen, i = 0;
    if (btn) { speakingBtn = btn; btn.setAttribute('aria-pressed', 'true'); }
    function done() { if (btn && speakingBtn === btn) { btn.setAttribute('aria-pressed', 'false'); speakingBtn = null; } }
    function next() {
      if (gen !== seqGen) return;
      if (i >= lines.length) { done(); return; }
      var L = lines[i++], u = utter(L[1], L[0]), fired = false;
      u.onend = u.onerror = function () {
        if (fired) return; fired = true;
        if (gen !== seqGen) return;
        setTimeout(next, i < lines.length ? 450 : 0);
      };
      synth.speak(u);
    }
    if (was) setTimeout(next, 60); else next();
  }
  function speak(text, btn) { if (text) speakSeq([['', text]], btn); }
  window.ECL_SAY = function (t) { speak(t, null); };
  if (!synth) html.classList.add('no-voice');
  else {
    voice = pickVoice();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', function () { voice = pickVoice(); voiceM = null; voiceF = null; });
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-say], [data-seq]') : null;
    if (!b) return;
    e.preventDefault();
    if (b.hasAttribute('data-seq')) {
      var lines = [];
      try { lines = JSON.parse(b.getAttribute('data-seq')); } catch (x) { }
      speakSeq(lines, b);
      var it = b.closest('.qc-item');
      if (it) it.classList.add('heard');
    } else speak(b.getAttribute('data-say'), b);
  });
  doc.querySelectorAll('.qc-slow').forEach(function (c) {
    try { c.checked = localStorage.getItem('ecl_slow') === '1'; } catch (e) { }
    html.classList.toggle('slow-voice', c.checked);
    c.addEventListener('change', function () {
      html.classList.toggle('slow-voice', c.checked);
      try { localStorage.setItem('ecl_slow', c.checked ? '1' : '0'); } catch (e) { }
    });
  });

  /* ------------------- quick check, practice pages, tests -------------------
     . practice (lesson Quick check, practice pages): the explanation appears
       as soon as you answer;
     . test (data-mode="test"): choose freely, then "Check my answers" scores
       every question at once, by part, with an optional timer.
     A question gets the class "answered" once its answer is shown: only then
     can its words be translated (translate.js).                            */
  function reveal(it, picked) {
    var a = +it.getAttribute('data-a'), bs = it.querySelectorAll('.bub'), ok = picked === a;
    bs.forEach(function (x) { x.disabled = true; x.classList.remove('pick'); });
    it.classList.add('answered');
    if (picked >= 0) bs[picked].classList.add('pick');
    bs[a].classList.add('right');
    if (picked >= 0 && !ok) bs[picked].classList.add('wrong');
    var exp = it.querySelector('.qc-exp'), tx = it.querySelector('.qc-tx'), fb = it.querySelector('.qc-fb');
    var head = ok ? 'Correct.' : (picked < 0 ? 'No answer. The answer is ' : 'Not quite. The answer is ') + 'ABCD'.charAt(a) + '.';
    if (exp) {
      fb.innerHTML = '<div class="correction' + (ok ? '' : ' bad') + '"><p><b>' + head + '</b></p></div>';
      exp.hidden = false;
      fb.firstChild.appendChild(exp);
      if (tx) { tx.hidden = false; fb.firstChild.appendChild(tx); }
      var st = it.querySelector('.show-text'); if (st) st.hidden = true;
    } else {
      fb.innerHTML = '<div class="correction' + (ok ? '' : ' bad') + '"><p><b>' + head + '</b></p><p>' + (it.getAttribute('data-e') || '') + '</p></div>';
    }
    return ok;
  }
  function unreveal(it) {
    it.querySelectorAll('.bub').forEach(function (x) { x.disabled = false; x.classList.remove('pick', 'right', 'wrong'); });
    it.classList.remove('answered', 'heard', 'shown-text');
    var exp = it.querySelector('.qc-exp'), tx = it.querySelector('.qc-tx'), fb = it.querySelector('.qc-fb');
    if (exp) { exp.hidden = true; it.insertBefore(exp, fb); }
    if (tx) { tx.hidden = true; it.insertBefore(tx, exp || fb); }
    fb.innerHTML = '';
    var st = it.querySelector('.show-text'); if (st) st.hidden = false;
  }
  /* "Show the text": in practice, every listening item can show what is
     said, before or after the answer; in a test, only when this browser
     has no voice (otherwise the text comes with the answers).           */
  function addShowText(au) {
    if (au.querySelector('.show-text')) return;
    var b = doc.createElement('button'); b.type = 'button'; b.className = 'btn btn-line btn-small show-text'; b.textContent = 'Show the text';
    b.addEventListener('click', function () {
      var it = au.closest('.qc-item'), tx = it.querySelector('.qc-tx');
      if (tx) { tx.hidden = false; it.classList.add('shown-text'); }
      b.hidden = true;
    });
    au.appendChild(b);
  }
  doc.querySelectorAll('.qc-listen .qc-audio').forEach(function (au) {
    var test = au.closest('.qc[data-mode="test"]');
    if (!synth || !test) addShowText(au);
  });

  doc.querySelectorAll('.qc').forEach(function (qc) {
    var items = qc.querySelectorAll('.qc-item'), score = qc.querySelector('.qc-score'), again = qc.querySelector('.qc-again');
    var test = qc.getAttribute('data-mode') === 'test';
    if (!test) {
      var done = 0, right = 0;
      var update = function () {
        if (done === items.length) {
          score.textContent = right + ' / ' + items.length + ' correct. ' +
            (right === items.length ? 'Excellent!' : 'Read the explanations, then try again.');
          again.hidden = false;
        } else score.textContent = done ? right + ' of ' + done + ' correct so far' : '';
      };
      items.forEach(function (it) {
        it.addEventListener('click', function (e) {
          var b = e.target.closest('.bub');
          if (!b || b.disabled) return;
          done++; if (reveal(it, +b.getAttribute('data-i'))) right++;
          update();
        });
      });
      if (again) again.addEventListener('click', function () {
        done = 0; right = 0; stopSpeak();
        items.forEach(unreveal);
        again.hidden = true; update();
        qc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    /* ---------- test mode ---------- */
    var prog = qc.querySelector('.qc-prog b'), check = qc.querySelector('.qc-check'), warn = qc.querySelector('.qc-warn');
    var result = qc.querySelector('.qc-result'), tbtn = qc.querySelector('.qc-timer'), clock = qc.querySelector('.qc-clock');
    var minutes = +qc.getAttribute('data-minutes') || 0, left = 0, timer = 0, checked = false, warned = false;
    function chosen(it) { var p = it.querySelector('.bub.pick'); return p ? +p.getAttribute('data-i') : -1; }
    function count() { var c = 0; items.forEach(function (it) { if (chosen(it) >= 0) c++; }); return c; }
    function fmtTime(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    function stopTimer() { clearInterval(timer); timer = 0; }
    items.forEach(function (it) {
      it.addEventListener('click', function (e) {
        var b = e.target.closest('.bub');
        if (!b || b.disabled || checked) return;
        it.querySelectorAll('.bub').forEach(function (x) { x.classList.toggle('pick', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        it.classList.add('chosen');
        prog.textContent = count();
        if (warned && count() === items.length) { warn.hidden = true; warned = false; }
      });
    });
    function grade() {
      checked = true; stopTimer(); stopSpeak();
      var parts = {}, order = [], right = 0;
      items.forEach(function (it) {
        var sec = it.getAttribute('data-sec') || 'Questions';
        if (!parts[sec]) { parts[sec] = { r: 0, n: 0 }; order.push(sec); }
        var ok = reveal(it, chosen(it));
        parts[sec].n++; if (ok) { parts[sec].r++; right++; }
      });
      var p = Math.round(100 * right / items.length);
      result.innerHTML = '<p class="qc-big">' + right + ' / ' + items.length + ' <span>' + p + '%</span></p>' +
        (order.length > 1 ? '<ul class="qc-parts">' + order.map(function (s) {
          var x = parts[s], q = Math.round(100 * x.r / x.n);
          return '<li><span>' + s + '</span><span class="qc-meter"><i style="width:' + q + '%"></i></span><b>' + x.r + ' / ' + x.n + '</b></li>';
        }).join('') + '</ul>' : '') +
        '<p class="qc-note">' + (p >= 80 ? 'Very good. Take longer timed tests to build speed and stamina.'
          : p >= 60 ? 'Good base. Read the explanations of your mistakes, then practice your weakest part.'
          : 'Start with the lessons, then take this test again in a week.') +
        ' Scroll up: every question now shows its answer and explanation.</p>';
      result.hidden = false; warn.hidden = true; check.hidden = true; again.hidden = false;
      if (tbtn) tbtn.hidden = true;
      qc.classList.add('graded');
      result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    check.addEventListener('click', function () {
      var c = count();
      if (c < items.length && !warned) {
        warned = true; warn.hidden = false;
        warn.textContent = (items.length - c) + ' question' + (items.length - c > 1 ? 's are' : ' is') +
          ' not answered yet. Press the button again to check anyway.';
        return;
      }
      grade();
    });
    if (tbtn) tbtn.addEventListener('click', function () {
      if (timer) { stopTimer(); tbtn.textContent = 'Resume the timer'; return; }
      if (!left) left = minutes * 60;
      clock.hidden = false; clock.textContent = fmtTime(left);
      tbtn.textContent = 'Pause the timer';
      timer = setInterval(function () {
        left--;
        clock.textContent = fmtTime(Math.max(0, left));
        clock.classList.toggle('low', left <= 60);
        if (left <= 0) { stopTimer(); clock.textContent = 'Time is up'; grade(); }
      }, 1000);
    });
    again.addEventListener('click', function () {
      checked = false; warned = false; left = 0; stopTimer(); stopSpeak();
      items.forEach(function (it) { unreveal(it); it.classList.remove('chosen'); });
      prog.textContent = '0'; result.hidden = true; result.innerHTML = ''; check.hidden = false; again.hidden = true;
      qc.classList.remove('graded');
      if (tbtn) { tbtn.hidden = false; tbtn.textContent = 'Start the ' + minutes + '-minute timer'; }
      if (clock) { clock.hidden = true; clock.classList.remove('low'); }
      qc.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ------------------ hide the meanings to test yourself ------------------ */
  doc.querySelectorAll('[data-hide-m]').forEach(function (btn) {
    var target = doc.querySelector(btn.getAttribute('data-hide-m'));
    if (!target) return;
    btn.addEventListener('click', function () {
      var on = !target.classList.contains('hide-m');
      target.classList.toggle('hide-m', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (!on) target.querySelectorAll('.show').forEach(function (x) { x.classList.remove('show'); });
    });
    target.addEventListener('click', function (e) {
      if (!target.classList.contains('hide-m') || e.target.closest('.say, a, button')) return;
      var it = e.target.closest('.wl-item, .idioms > div');
      if (it) it.classList.toggle('show');
    });
  });

  /* ----------------------- flashcards and quiz ----------------------- */
  var cardsEl = doc.getElementById('cards-data');
  var CARDS = [];
  try { CARDS = cardsEl ? JSON.parse(cardsEl.textContent) : []; } catch (e) { CARDS = []; }
  var thMain = doc.querySelector('main[class*="th-"]');
  var TH = thMain ? ((thMain.className.match(/th-[a-z]+/) || [''])[0]) : '';
  function pool(group) { return CARDS.filter(function (c) { return !group || group === 'all' || c.g === group; }); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function kw(s) { return esc(s).replace(/\*([^*]+)\*/g, '<span class="kw">$1</span>'); }
  function bare(s) { return String(s).replace(/\*/g, ''); }
  function openDlg(d) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
  function closeDlg(d) { stopSpeak(); try { d.close(); } catch (e) { d.removeAttribute('open'); } }
  function dialog(cls, title, body) {
    var d = doc.createElement('dialog');
    d.className = cls + (TH ? ' ' + TH : '');
    d.innerHTML = '<div class="dlg-in"><div class="dlg-top"><h2>' + title + '</h2><span class="dlg-n"></span>' +
      '<button type="button" class="dlg-x" aria-label="Close">&times;</button></div>' + body + '</div>';
    d.querySelector('.dlg-x').addEventListener('click', function () { closeDlg(d); });
    d.addEventListener('click', function (e) { if (e.target === d) closeDlg(d); });
    d.addEventListener('close', stopSpeak);
    doc.body.appendChild(d);
    return d;
  }

  var fc = null, fcList = [], fcI = 0;
  function fcShow() {
    var c = fcList[fcI], card = fc.querySelector('.fc-card');
    card.style.transition = 'none'; card.classList.remove('flip'); void card.offsetWidth; card.style.transition = '';
    fc.querySelector('.fc-term').textContent = c.f;
    fc.querySelector('.fc-mean').textContent = c.b;
    fc.querySelector('.fc-t2').textContent = c.f;
    fc.querySelector('.fc-ex').innerHTML = kw(c.x || '');
    fc.querySelector('.dlg-n').textContent = (fcI + 1) + ' / ' + fcList.length;
  }
  function fcGo(d) { stopSpeak(); fcI = (fcI + d + fcList.length) % fcList.length; fcShow(); }
  function openFlashcards(group) {
    fcList = shuffle(pool(group).slice());
    if (!fcList.length) return;
    if (!fc) {
      fc = dialog('fc-dlg', 'Flashcards',
        '<div class="fc-stage"><button type="button" class="fc-card" aria-label="Flip the card">' +
        '<span class="fc-face fc-front"><b class="fc-term"></b><span class="fc-hint">Click, or press Space, to see the meaning</span></span>' +
        '<span class="fc-face fc-back"><small class="fc-t2"></small><b class="fc-mean"></b><span class="fc-ex"></span></span></button></div>' +
        '<div class="dlg-row"><button type="button" class="btn btn-line btn-small fc-prev">&larr; Previous</button>' +
        '<button type="button" class="btn btn-line btn-small fc-say">Listen</button>' +
        '<button type="button" class="btn btn-line btn-small fc-shuf">Shuffle</button>' +
        '<button type="button" class="btn btn-th btn-small fc-next">Next &rarr;</button></div>');
      var card = fc.querySelector('.fc-card');
      card.addEventListener('click', function () { card.classList.toggle('flip'); });
      fc.querySelector('.fc-prev').addEventListener('click', function () { fcGo(-1); });
      fc.querySelector('.fc-next').addEventListener('click', function () { fcGo(1); });
      fc.querySelector('.fc-shuf').addEventListener('click', function () { shuffle(fcList); fcI = 0; fcShow(); });
      fc.querySelector('.fc-say').addEventListener('click', function (e) {
        var c = fcList[fcI];
        speak(card.classList.contains('flip') ? bare(c.x || c.b) : c.f, e.currentTarget);
      });
      fc.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); fcGo(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); fcGo(-1); }
      });
    }
    fcI = 0; fcShow(); openDlg(fc);
    fc.querySelector('.fc-card').focus();
  }

  var fq = null, qList = [], qI = 0, qRight = 0, qAnswered = false, qGroup = 'all';
  function makeQ(c, from) {
    var opts = [c.b], seen = {}, others = shuffle(from.filter(function (o) { return o.f !== c.f; }));
    seen[c.b.toLowerCase()] = 1;
    for (var i = 0; i < others.length && opts.length < 4; i++) {
      var b = others[i].b;
      if (!seen[b.toLowerCase()]) { seen[b.toLowerCase()] = 1; opts.push(b); }
    }
    shuffle(opts);
    return { c: c, o: opts, a: opts.indexOf(c.b) };
  }
  function fqShow() {
    var q = qList[qI], c = q.c, m = /\*([^*]+)\*/.exec(c.x || ''), ctx = fq.querySelector('.fq-ctx');
    qAnswered = false;
    fq.querySelector('.fq-body').classList.remove('answered');
    fq.querySelector('.dlg-n').textContent = 'Question ' + (qI + 1) + ' of ' + qList.length;
    if (m) {
      fq.querySelector('.fq-q').innerHTML = 'In this sentence, what does <span class="kw">' + esc(m[1]) + '</span> mean?';
      ctx.innerHTML = kw(c.x); ctx.hidden = false;
    } else {
      fq.querySelector('.fq-q').innerHTML = 'What does <span class="kw">' + esc(c.f) + '</span> mean?';
      ctx.hidden = true;
    }
    fq.querySelector('.bubbles').innerHTML = q.o.map(function (o, i) {
      return '<li><button type="button" class="bub" data-i="' + i + '"><span class="b">' + 'ABCD'.charAt(i) + '</span><span>' + esc(o) + '</span></button></li>';
    }).join('');
    fq.querySelector('.fq-fb').innerHTML = '';
    fq.querySelector('.fq-next').hidden = true;
    fq.querySelector('.fq-body').hidden = false;
    fq.querySelector('.fq-end').hidden = true;
  }
  function fqAnswer(i) {
    if (qAnswered) return;
    qAnswered = true;
    fq.querySelector('.fq-body').classList.add('answered');     // translation allowed from now on
    var q = qList[qI], ok = i === q.a, bs = fq.querySelectorAll('.bub');
    bs.forEach(function (x) { x.disabled = true; });
    bs[i].classList.add('pick'); bs[q.a].classList.add('right');
    if (!ok) bs[i].classList.add('wrong'); else qRight++;
    var ex = /\*/.test(q.c.x || '') ? '' : '<p>' + esc(q.c.x || '') + '</p>';
    fq.querySelector('.fq-fb').innerHTML = '<div class="correction' + (ok ? '' : ' bad') + '"><p><b>' + (ok ? 'Correct.' : 'Not quite.') +
      '</b> <i>' + esc(q.c.f) + '</i>: ' + esc(q.c.b) + '</p>' + ex + '</div>';
    var nx = fq.querySelector('.fq-next');
    nx.textContent = qI + 1 < qList.length ? 'Next question' : 'See my score';
    nx.hidden = false; nx.focus();
  }
  function fqEnd() {
    fq.querySelector('.fq-body').hidden = true;
    fq.querySelector('.fq-end').hidden = false;
    fq.querySelector('.dlg-n').textContent = '';
    fq.querySelector('.fq-score').textContent = qRight + ' / ' + qList.length;
    fq.querySelector('.fq-again').focus();
  }
  function openQuiz(group) {
    qGroup = group;
    var from = pool(group);
    if (from.length < 4) from = CARDS;
    if (from.length < 4) return;
    qList = shuffle(pool(group).slice()).slice(0, 10).map(function (c) { return makeQ(c, from); });
    qI = 0; qRight = 0;
    if (!fq) {
      fq = dialog('fq-dlg', 'Quiz',
        '<div class="fq-body"><p class="fq-q"></p><p class="fq-ctx" hidden></p><ol class="bubbles"></ol>' +
        '<div class="fq-fb" aria-live="polite"></div><div class="dlg-row"><button type="button" class="btn btn-th fq-next" hidden>Next question</button></div></div>' +
        '<div class="fq-end" hidden><p>Your score</p><p class="fq-score"></p><div class="dlg-row">' +
        '<button type="button" class="btn btn-line fq-close">Close</button><button type="button" class="btn btn-brass fq-again">New quiz</button></div></div>');
      fq.querySelector('.bubbles').addEventListener('click', function (e) {
        var b = e.target.closest('.bub');
        if (b && !b.disabled) fqAnswer(+b.getAttribute('data-i'));
      });
      fq.querySelector('.fq-next').addEventListener('click', function () {
        if (qI + 1 < qList.length) { qI++; fqShow(); var f = fq.querySelector('.bub'); if (f) f.focus(); } else fqEnd();
      });
      fq.querySelector('.fq-again').addEventListener('click', function () { openQuiz(qGroup); });
      fq.querySelector('.fq-close').addEventListener('click', function () { closeDlg(fq); });
      fq.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey || fq.querySelector('.fq-body').hidden) return;
        var k = (e.key || '').toUpperCase(), i = 'ABCD'.indexOf(k);
        if (k.length !== 1) i = -1;
        if (i < 0 && /^[1-4]$/.test(e.key)) i = +e.key - 1;
        if (i >= 0 && i < qList[qI].o.length) { e.preventDefault(); fqAnswer(i); }
      });
    }
    fqShow();
    if (!fq.open) openDlg(fq);
    var f = fq.querySelector('.bub'); if (f) f.focus();
  }
  doc.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-fc], [data-fq]') : null;
    if (!t || !CARDS.length) return;
    e.preventDefault();
    if (t.hasAttribute('data-fc')) openFlashcards(t.getAttribute('data-fc'));
    else openQuiz(t.getAttribute('data-fq'));
  });

  /* ------------------------- answer-sheet demo --------------------------- */
  var demo = doc.getElementById('demo');
  var dataEl = doc.getElementById('demo-data');
  if (!demo || !dataEl) return;
  var Q = JSON.parse(dataEl.textContent), qi = 0;
  var $q = demo.querySelector('.sheet-q'), $list = demo.querySelector('.bubbles'),
      $fb = demo.querySelector('.sheet-fb'), $n = demo.querySelector('[data-n]'),
      $next = demo.querySelector('[data-next]'), $more = demo.querySelector('[data-more]'),
      $dots = demo.querySelectorAll('.progress i'), $listen = demo.querySelector('.listen');
  var L = 'ABCD';

  function render() {
    var q = Q[qi];
    stopSpeak();
    $n.textContent = qi + 1;
    $q.innerHTML = kw(q.q);
    $list.innerHTML = q.o.map(function (o, i) {
      return '<li><button type="button" class="bub" data-i="' + i + '"><span class="b">' + L[i] +
        '</span><span>' + kw(o) + '</span></button></li>';
    }).join('');
    $fb.innerHTML = '';
    $next.hidden = true;
    demo.classList.remove('answered');
  }
  $list.addEventListener('click', function (e) {
    var b = e.target.closest('.bub');
    if (!b || b.disabled) return;
    answer(+b.getAttribute('data-i'));
  });
  function answer(i) {
    var q = Q[qi], ok = i === q.a;
    var bs = $list.querySelectorAll('.bub');
    bs.forEach(function (x) { x.disabled = true; });
    bs[i].classList.add('pick');
    demo.classList.add('answered');                 // translation allowed from now on
    setTimeout(function () {
      bs[q.a].classList.add('right');
      if (!ok) bs[i].classList.add('wrong');
      $fb.innerHTML = '<div class="correction' + (ok ? '' : ' bad') + '"><p><b>' +
        (ok ? 'Correct.' : 'Not quite. The answer is ' + L[q.a] + ': ' + kw(q.o[q.a]) + '.') +
        '</b></p><p>' + kw(q.e) + '</p></div>';
      $dots[qi].className = ok ? 'done-ok' : 'done-bad';
      if (qi < Q.length - 1) { $next.hidden = false; $next.focus({ preventScroll: true }); }
      else { $more.classList.add('btn-brass'); $more.classList.remove('btn-line'); $more.focus({ preventScroll: true }); }
    }, 180);
  }
  $next.addEventListener('click', function () {
    if (qi < Q.length - 1) {
      qi++; render();
      var first = $list.querySelector('.bub');
      if (first) first.focus({ preventScroll: true });
    }
  });
  /* keys A-D or 1-4 answer while the sheet is on screen and nothing else has the focus */
  doc.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var a = doc.activeElement;
    if (a && a !== doc.body && !demo.contains(a)) return;
    var r = demo.getBoundingClientRect();
    if (r.bottom < 0 || r.top > (window.innerHeight || 800)) return;
    var k = (e.key || '').toUpperCase(), i = L.indexOf(k);
    if (k.length !== 1) i = -1;
    if (i < 0 && /^[1-4]$/.test(e.key)) i = +e.key - 1;
    if (i >= 0) { var b = $list.querySelectorAll('.bub')[i]; if (b && !b.disabled) { e.preventDefault(); answer(i); } }
  });

  /* Listen: the question and its four choices, in the American voice */
  if (!synth || !$listen) { if ($listen) $listen.hidden = true; }
  else {
    $listen.addEventListener('click', function () {
      var q = Q[qi];
      var text = bare(q.q).replace(/_{2,}/g, ', blank, ') + '. ' +
        q.o.map(function (o, i) { return L[i] + ', ' + bare(o) + '.'; }).join(' ');
      speak(text, $listen);
    });
  }
  render();
})();
