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
     The best MALE American voice of the browser, as in the Android app
     (natural Microsoft voices in Edge, Google male voices on Android, Apple
     male voices, Microsoft David or Mark on Windows). A voice chosen in the
     trainer's settings is used instead when this browser has it.          */
  var synth = window.speechSynthesis || null, voice = null, speakingBtn = null;
  function rank(v) {
    var n = String(v.name || '') + ' ' + String(v.voiceURI || '');
    if (/\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Kathy|Princess|Deranged|Hysterical|Grandpa|Grandma|Rocko|Shelley|Sandy|Flo|Eddy|Reed)\b/i.test(n)) return 1;
    var nat = /natural|neural|online|premium|enhanced/i.test(n), r = 0;
    if (/\bAndrew\b/i.test(n)) r = 100;
    else if (/\bGuy\b/i.test(n)) r = 99;
    else if (/\bChristopher\b/i.test(n)) r = 98;
    else if (/AndrewMultilingual/i.test(n)) r = 97;
    else if (/\bBrian\b|BrianMultilingual/i.test(n)) r = 96;
    else if (/\bEric\b/i.test(n)) r = 95;
    else if (/\b(Roger|Steffan|Davis|Tony|Jason|Brandon|Kai)\b/i.test(n)) r = 94;
    if (r) return nat ? r : r - 12;
    if (/en-us-x-(iol|iom|tpd)/i.test(n)) return 92;
    if (/\b(Evan|Nathan|Tom|Aaron)\b/i.test(n)) return nat ? 90 : 86;
    if (/\bAlex\b/i.test(n)) return 88;
    if (/Microsoft (Mark|David)/i.test(n)) return 80;
    if (/\bFred\b/i.test(n)) return 40;
    if (nat && /Microsoft/i.test(n)) return 60;
    if (/Google US English/i.test(n)) return 58;
    if (/google|-x-/i.test(n)) return 55;
    if (/Samantha|Ava|Allison|Susan|Zoe|Nicky|Joelle|Noelle/i.test(n)) return 50;
    return v.localService ? 20 : 15;
  }
  function pickVoice() {
    if (!synth) return null;
    var all = (synth.getVoices() || []).filter(function (x) {
      return /en[-_]US/i.test(x.lang || '') || /^en-us/i.test(x.voiceURI || '');
    });
    var want = '';
    try { want = localStorage.getItem('et_voice') || ''; } catch (e) { }
    for (var i = 0; want && i < all.length; i++) if (all[i].voiceURI === want || all[i].name === want) return all[i];
    all.sort(function (a, b) { return rank(b) - rank(a); });
    return all[0] || null;
  }
  function rate() {
    var r = 0.92;
    try { r = parseFloat(localStorage.getItem('et_rate')) || 0.92; } catch (e) { }
    return Math.min(1.4, Math.max(0.6, r));
  }
  function stopSpeak() {
    if (synth) synth.cancel();
    if (speakingBtn) speakingBtn.setAttribute('aria-pressed', 'false');
    speakingBtn = null;
  }
  function speak(text, btn) {
    if (!synth || !text) return;
    if (btn && btn === speakingBtn) { stopSpeak(); return; }
    var was = synth.speaking || synth.pending;
    stopSpeak();
    var u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'en-US'; u.rate = rate();
    if (!voice) voice = pickVoice();
    if (voice) u.voice = voice;
    if (btn) { speakingBtn = btn; btn.setAttribute('aria-pressed', 'true'); }
    u.onend = u.onerror = function () {
      if (btn && speakingBtn === btn) { btn.setAttribute('aria-pressed', 'false'); speakingBtn = null; }
    };
    if (was) setTimeout(function () { synth.speak(u); }, 60); else synth.speak(u);
  }
  window.ECL_SAY = function (t) { speak(t, null); };
  if (!synth) html.classList.add('no-voice');
  else {
    voice = pickVoice();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', function () { voice = pickVoice(); });
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-say]') : null;
    if (!b) return;
    e.preventDefault();
    speak(b.getAttribute('data-say'), b);
  });

  /* ---------------------- lesson quick check -------------------------- */
  doc.querySelectorAll('.qc').forEach(function (qc) {
    var items = qc.querySelectorAll('.qc-item'), score = qc.querySelector('.qc-score'), again = qc.querySelector('.qc-again');
    var done = 0, right = 0;
    function update() {
      if (done === items.length) {
        score.textContent = right + ' / ' + items.length + ' correct. ' +
          (right === items.length ? 'Excellent!' : 'Read the explanations, then try again.');
        again.hidden = false;
      } else score.textContent = done ? right + ' of ' + done + ' correct so far' : '';
    }
    items.forEach(function (it) {
      it.addEventListener('click', function (e) {
        var b = e.target.closest('.bub');
        if (!b || b.disabled) return;
        var i = +b.getAttribute('data-i'), a = +it.getAttribute('data-a'), bs = it.querySelectorAll('.bub'), ok = i === a;
        bs.forEach(function (x) { x.disabled = true; });
        it.classList.add('answered');          // translation is allowed from now on
        bs[i].classList.add('pick');
        bs[a].classList.add('right');
        if (!ok) bs[i].classList.add('wrong');
        done++; if (ok) right++;
        it.querySelector('.qc-fb').innerHTML = '<div class="correction' + (ok ? '' : ' bad') + '"><p><b>' +
          (ok ? 'Correct.' : 'Not quite. The answer is ' + 'ABCD'.charAt(a) + '.') + '</b></p><p>' + it.getAttribute('data-e') + '</p></div>';
        update();
      });
    });
    if (again) again.addEventListener('click', function () {
      done = 0; right = 0;
      items.forEach(function (it) {
        it.querySelectorAll('.bub').forEach(function (x) { x.disabled = false; x.classList.remove('pick', 'right', 'wrong'); });
        it.classList.remove('answered');
        it.querySelector('.qc-fb').innerHTML = '';
      });
      again.hidden = true; update();
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
