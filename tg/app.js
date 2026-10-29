/* ==========================================================================
   tg/app.js - Telegram mini app of the ECL & ALCPT English Trainer
   --------------------------------------------------------------------------
   A light version of the trainer made for Telegram: 9 trainings of 50
   questions (data.js), rounds of 10, 20 or 50, listening with the site's
   recorded voices, a mistake review and the app/website popup.
   Telegram parts: theme colors, Back button, Main button, haptics, progress
   kept in Telegram's CloudStorage (follows the user to other devices).
   Outside Telegram (a normal browser) the page still works on its own.
   The website (/, /practice/) does not load this file.
   ========================================================================== */
(function () {
  'use strict';

  /* Bot username without @ (for example 'ECLTrainerBot'). When set, "Share"
     sends a link to the bot instead of a link to the website. */
  var BOT_USERNAME = '';

  var D = window.TG_DATA || { sets: [], n: 50 };
  var tg = (window.Telegram && window.Telegram.WebApp) || null;
  var IN_TG = !!(tg && tg.initData);
  var PLATFORM = (tg && tg.platform) || 'unknown';
  var IS_IOS = PLATFORM === 'ios' || /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  var SITE = 'https://ecl-alcpt-trainer.com/';
  var PLAY = 'https://play.google.com/store/apps/details?id=com.ecltrainer.english' +
    '&referrer=utm_source%3Dtelegram%26utm_medium%3Dminiapp%26utm_campaign%3D';
  var SITE_TRAINER = SITE + 'practice/?utm_source=telegram&utm_medium=miniapp&utm_campaign=';
  var AUDIO_BASE = '../assets/audio/listening/';
  var N = D.n || 50;
  var LENS = [10, 20, 50];
  var KIND = { s: 'Short statement', r: 'Question and answer', d: 'Short dialog', c: 'Conversation', k: 'Short talk' };
  var SECTIONS = [
    { name: 'Grammar', color: '#4E7CF6', icon: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>' },
    { name: 'Vocabulary', color: '#F29B30', icon: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>' },
    { name: 'Idioms', color: '#9B5CF0', icon: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h7"/>' },
    { name: 'Listening', color: '#2EAA62', icon: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>' },
    { name: 'Test', color: '#E5533B', icon: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>' }
  ];
  var REVIEW_ICON = '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>';
  var CHEV = '<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1l6 6-6 6"/></svg>';
  var PLAY_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';

  var BYID = {};
  D.sets.forEach(function (s) { BYID[s.id] = s; });
  var app = document.getElementById('app');

  /* ------------------------------ progress ------------------------------ */
  function fresh() {
    return { u: 0, st: {}, best: {}, day: '', today: 0, streak: 0, a: 0, c: 0, rounds: 0, promo: 0, len: 10 };
  }
  var P = fresh();
  try {
    var saved = JSON.parse(localStorage.getItem('tg_p') || 'null');
    if (saved && typeof saved === 'object') P = merge(saved);
  } catch (e) { }
  function merge(o) {
    var p = fresh(), k;
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k) && k in p) p[k] = o[k];
    if (LENS.indexOf(p.len) < 0) p.len = 10;
    return p;
  }
  var cloudTimer = null;
  function save() {
    P.u = Date.now();
    var s = JSON.stringify(P);
    try { localStorage.setItem('tg_p', s); } catch (e) { }
    if (cloudOK() && s.length < 4000) {
      clearTimeout(cloudTimer);
      cloudTimer = setTimeout(function () { try { tg.CloudStorage.setItem('p', JSON.stringify(P)); } catch (e) { } }, 1200);
    }
  }
  function cloudOK() { return IN_TG && tg.CloudStorage && ver('6.9'); }
  function cloudLoad() {
    if (!cloudOK()) return;
    try {
      tg.CloudStorage.getItem('p', function (err, val) {
        if (err || !val) return;
        try {
          var c = JSON.parse(val);
          if (c && c.u > P.u) {
            P = merge(c);
            try { localStorage.setItem('tg_p', JSON.stringify(P)); } catch (e) { }
            if (VIEW === 'home') renderHome();
          }
        } catch (e) { }
      });
    } catch (e) { }
  }
  function states(id) {
    var s = P.st[id];
    return (typeof s === 'string' && s.length === N) ? s : new Array(N + 1).join('0');
  }
  function setState(id, i, v) { var s = states(id); P.st[id] = s.slice(0, i) + v + s.slice(i + 1); }
  function count(s, ch) { var n = 0; for (var i = 0; i < s.length; i++) if (s[i] === ch) n++; return n; }
  function dayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); }
  function streakNow() { return (P.day === dayStr() || P.day === yesterday()) ? P.streak : 0; }
  function mark(id, i, right) {
    var t = dayStr();
    if (P.day !== t) { P.streak = (P.day === yesterday()) ? P.streak + 1 : 1; P.day = t; P.today = 0; }
    P.today++; P.a++; if (right) P.c++;
    setState(id, i, right ? '2' : '1');
    save();
  }
  function mistakes() {
    var out = [];
    D.sets.forEach(function (s) {
      var st = states(s.id);
      for (var i = 0; i < N; i++) if (st[i] === '1') out.push({ s: s.id, i: i });
    });
    return out;
  }

  /* ----------------------------- helpers ------------------------------- */
  function ver(v) { try { return !!(tg && tg.isVersionAtLeast && tg.isVersionAtLeast(v)); } catch (e) { return false; } }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) { return esc(s).replace(/\*([^*]+)\*/g, '<b>$1</b>').replace(/\s*-&gt;\s*/g, ' → '); }
  function plain(s) { return String(s).replace(/\*/g, ''); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function hap(kind) {
    if (!IN_TG || !tg.HapticFeedback || !ver('6.1')) return;
    try {
      if (kind === 'success' || kind === 'error') tg.HapticFeedback.notificationOccurred(kind);
      else tg.HapticFeedback.impactOccurred(kind || 'light');
    } catch (e) { }
  }
  function ico(color, path) {
    return '<span class="ico" style="background:' + color + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg></span>';
  }
  function sectionOf(set) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].name === set.sec) return SECTIONS[i]; return SECTIONS[0]; }
  function openLink(url) {
    if (IN_TG && tg.openLink) { try { tg.openLink(url); return; } catch (e) { } }
    window.open(url, '_blank', 'noopener');
  }
  var toastEl = null, toastT = null;
  function toast(msg) {
    if (IN_TG && tg.showAlert && ver('6.2')) { try { tg.showAlert(msg); return; } catch (e) { } }
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'status');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:calc(var(--bottom) + 24px);transform:translateX(-50%);' +
        'background:rgba(0,0,0,.8);color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;z-index:20;max-width:90%';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, 2200);
  }

  /* ------------------------- Telegram buttons -------------------------- */
  var mainAction = null;
  function setMain(text, fn) {
    mainAction = fn;
    if (IN_TG && tg.MainButton) {
      try { tg.MainButton.setParams({ text: text, is_visible: true, is_active: true }); } catch (e) { }
    }
    var b = document.getElementById('mainBtn');
    if (b) { b.textContent = text; b.classList.remove('hidden'); }
  }
  function hideMain() {
    mainAction = null;
    if (IN_TG && tg.MainButton) { try { tg.MainButton.hide(); } catch (e) { } }
  }
  function backButton(show) {
    if (!IN_TG || !tg.BackButton || !ver('6.1')) return;
    try { if (show) tg.BackButton.show(); else tg.BackButton.hide(); } catch (e) { }
  }
  function swipes(on) {
    if (!IN_TG || !ver('7.7')) return;
    try { if (on) tg.enableVerticalSwipes(); else tg.disableVerticalSwipes(); } catch (e) { }
  }
  function applyTheme() {
    if (!IN_TG) return;
    try {
      if (ver('6.1')) { tg.setHeaderColor('secondary_bg_color'); tg.setBackgroundColor('secondary_bg_color'); }
      if (ver('7.10')) tg.setBottomBarColor('secondary_bg_color');
    } catch (e) { }
  }

  /* ------------------------------- home -------------------------------- */
  var VIEW = 'home';
  function renderHome() {
    VIEW = 'home';
    stopAudio(); hideMain(); backButton(false); swipes(true);
    var user = IN_TG && tg.initDataUnsafe && tg.initDataUnsafe.user;
    var hi = user && user.first_name ? 'Hi ' + esc(user.first_name) + ', ready to practice?' : 'ECL &amp; ALCPT practice';
    var today = P.day === dayStr() ? P.today : 0;
    var h = '<div class="brand"><img src="../assets/img/logo-192.png" alt="" width="42" height="42">' +
      '<div><b>ECL &amp; ALCPT Trainer</b><span>' + hi + '</span></div></div>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + today + '</b><span>Today</span></div>' +
      '<div class="stat"><b>' + streakNow() + '</b><span>Day streak</span></div>' +
      '<div class="stat"><b>' + (P.a ? Math.round(P.c / P.a * 100) + '%' : '&ndash;') + '</b><span>Correct</span></div>' +
      '</div>' +
      '<div class="h seg-l"><span>Questions per round</span></div>' +
      '<div class="seg" role="group" aria-label="Questions per round">' +
      LENS.map(function (n) { return '<button type="button" data-len="' + n + '" aria-pressed="' + (P.len === n) + '">' + n + '</button>'; }).join('') +
      '</div>';
    SECTIONS.forEach(function (sec) {
      var sets = D.sets.filter(function (s) { return s.sec === sec.name; });
      if (!sets.length) return;
      h += '<div class="h">' + sec.name + '</div><div class="group">';
      sets.forEach(function (s) {
        var st = states(s.id), done = count(st, '2'), tried = N - count(st, '0');
        var sub = tried ? done + ' / ' + N + ' mastered' + (P.best[s.id] != null ? ' &middot; best ' + P.best[s.id] + '%' : '') : esc(s.desc);
        h += '<button type="button" class="row" data-set="' + s.id + '">' + ico(sec.color, sec.icon) +
          '<span class="t"><b>' + esc(s.title) + '</b><span>' + sub + '</span>' +
          (tried ? '<span class="bar"><i style="width:' + (done / N * 100) + '%"></i></span>' : '') + '</span>' + CHEV + '</button>';
      });
      h += '</div>';
    });
    var m = mistakes().length;
    if (m) {
      h += '<div class="h">Review</div><div class="group"><button type="button" class="row" data-set="mistakes">' +
        ico('#8E8E93', REVIEW_ICON) + '<span class="t"><b>My mistakes</b><span>' + m + ' question' + (m > 1 ? 's' : '') +
        ' to answer again</span></span>' + CHEV + '</button></div>';
    }
    h += '<button type="button" class="promo" data-promo><img src="../assets/img/logo-192.png" alt="" width="40" height="40">' +
      '<span class="t"><b>Want more questions?</b><span>' + (IS_IOS ? 'Open the full trainer on the website' : 'Free Android app and website') +
      '</span></span><em>Open</em></button>' +
      '<p class="foot">' + D.sets.length + ' trainings &times; ' + N + ' questions. Independent practice tool, not affiliated with DLIELC.<br>' +
      '<button type="button" data-reset>Reset my progress</button></p>';
    app.innerHTML = h;
    window.scrollTo(0, 0);
  }

  /* ------------------------------ rounds ------------------------------- */
  var R = null;
  function startRound(key) {
    var picks = [];
    if (key === 'mistakes') {
      picks = shuffle(mistakes());
    } else {
      var st = states(key), g = { '0': [], '1': [], '2': [] };
      for (var i = 0; i < N; i++) g[st[i]].push({ s: key, i: i });
      picks = shuffle(g['0']).concat(shuffle(g['1']), shuffle(g['2']));
    }
    picks = picks.slice(0, P.len);
    if (!picks.length) { toast('No mistakes to review. Well done!'); renderHome(); return; }
    R = {
      key: key, idx: 0, score: 0, res: [], answered: false,
      items: picks.map(function (p) { return { s: p.s, i: p.i, q: BYID[p.s].items[p.i], perm: shuffle([0, 1, 2, 3]) }; })
    };
    hap('light');
    renderQuestion();
  }
  function roundTitle() { return R.key === 'mistakes' ? 'My mistakes' : BYID[R.key].title; }
  function topBar() {
    var n = R.items.length;
    return '<div class="qtop">' + (IN_TG ? '' : '<button type="button" data-home style="color:var(--link)">&lsaquo; Home</button>') +
      '<b>' + esc(roundTitle()) + '</b><span>' + Math.min(R.idx + 1, n) + ' / ' + n + '</span></div>' +
      '<div class="prog"><i style="width:' + (R.idx / n * 100) + '%"></i></div>';
  }
  function renderQuestion() {
    VIEW = 'quiz';
    stopAudio(); hideMain(); backButton(true); swipes(false);
    R.answered = false;
    var it = R.items[R.idx], q = it.q, h = topBar();
    if (q.L) {
      h += '<div class="card"><div class="play"><button type="button" class="pbtn" data-play aria-label="Listen">' + PLAY_ICO + '</button>' +
        '<span class="t"><b>' + KIND[q.k] + '</b><span id="pst">Tap to listen</span></span></div></div>' +
        '<div class="card"><p class="q">' + fmt(q.q) + '</p></div>';
    } else {
      var tag = q.t || (R.key === 'mistakes' ? BYID[it.s].title : '');
      h += '<div class="card">' + (tag ? '<span class="tag">' + esc(tag) + '</span>' : '') + '<p class="q">' + fmt(q.q) + '</p></div>';
    }
    h += '<div class="opts">' + it.perm.map(function (o, p) {
      return '<button type="button" class="opt" data-p="' + p + '"><span class="k">' + 'ABCD'[p] + '</span><span>' + fmt(q.o[o]) + '</span></button>';
    }).join('') + '</div><div id="ex"></div>' +
      '<button type="button" class="big main hidden" id="mainBtn"></button>';
    app.innerHTML = h;
    window.scrollTo(0, 0);
    if (q.L) setTimeout(function () { if (R && R.items[R.idx] === it && !R.answered) playListen(q); }, 350);
  }
  function answer(p) {
    if (!R || R.answered) return;
    R.answered = true;
    var it = R.items[R.idx], q = it.q, chosen = it.perm[p], right = chosen === q.a;
    var btns = app.querySelectorAll('.opt');
    for (var k = 0; k < btns.length; k++) {
      var o = it.perm[k];
      btns[k].disabled = true;
      if (o === q.a) btns[k].classList.add('ok');
      else if (k === p) btns[k].classList.add('bad');
      else btns[k].classList.add('dim');
    }
    hap(right ? 'success' : 'error');
    if (right) R.score++;
    R.res.push({ it: it, right: right });
    mark(it.s, it.i, right);
    var ex = '<div class="card ex"><div class="v ' + (right ? 'ok">Correct!' : 'bad">Not quite. The answer is: ' + fmt(q.o[q.a])) + '</div>' +
      (q.e ? '<p>' + fmt(q.e) + '</p>' : '');
    if (q.L) {
      ex += '<div class="script">' + q.L.map(function (l) {
        return '<p><i>' + (l[0] === 'W' ? 'Woman' : 'Man') + ':</i> ' + esc(l[1]) + '</p>';
      }).join('') + '</div>';
    }
    document.getElementById('ex').innerHTML = ex + '</div>';
    var last = R.idx + 1 >= R.items.length;
    setMain(last ? 'See my result' : 'Next question', next);
    var box = document.getElementById('ex');
    if (box && box.getBoundingClientRect().bottom > (window.innerHeight || 600)) {
      try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { box.scrollIntoView(false); }
    }
  }
  function next() {
    if (!R) return;
    if (!R.answered) return;
    R.idx++;
    if (R.idx >= R.items.length) renderResult(); else renderQuestion();
  }

  /* ------------------------------ result ------------------------------- */
  function renderResult() {
    VIEW = 'result';
    stopAudio(); hideMain(); backButton(true); swipes(true);
    var n = R.items.length, pct = Math.round(R.score / n * 100), best = null;
    if (R.key !== 'mistakes') {
      best = Math.max(P.best[R.key] || 0, pct);
      P.best[R.key] = best;
    }
    P.rounds++;
    save();
    var msg = pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Good work' : pct >= 50 ? 'Keep going' : 'Keep practicing';
    var C = 2 * Math.PI * 52, col = pct >= 70 ? 'var(--ok)' : pct >= 50 ? '#F29B30' : 'var(--danger)';
    var h = '<div class="qtop">' + (IN_TG ? '' : '<button type="button" data-home style="color:var(--link)">&lsaquo; Home</button>') +
      '<b>' + esc(roundTitle()) + '</b><span>Result</span></div>' +
      '<div class="card res"><div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="52" fill="none" stroke="var(--sep)" stroke-width="10"/>' +
      '<circle cx="60" cy="60" r="52" fill="none" stroke="' + col + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' +
      (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><b>' + pct + '%</b></div>' +
      '<h2>' + msg + '</h2><p>' + R.score + ' of ' + n + ' correct' + (best != null ? ' &middot; best ' + best + '%' : '') + '</p>' +
      (R.key !== 'mistakes' ? '<p>' + count(states(R.key), '2') + ' / ' + N + ' mastered in this training</p>' : '') + '</div>' +
      '<button type="button" class="big main hidden" id="mainBtn"></button>';
    var m = mistakes().length;
    if (m && R.key !== 'mistakes') h += '<button type="button" class="big alt" data-set="mistakes">Review my mistakes (' + m + ')</button>';
    h += '<button type="button" class="big alt" data-share>Share my score</button>';
    var wrong = R.res.filter(function (r) { return !r.right; });
    if (wrong.length) {
      h += '<div class="h" style="margin-top:8px">To remember</div><div class="wrong">' + wrong.map(function (r) {
        var q = r.it.q;
        return '<div class="card"><p>' + fmt(q.q) + '</p><p class="c">&check; ' + fmt(q.o[q.a]) + '</p></div>';
      }).join('') + '</div>';
    }
    app.innerHTML = h;
    window.scrollTo(0, 0);
    var again = R.key;
    if (again === 'mistakes' && !m) setMain('Back to trainings', renderHome);
    else setMain(again === 'mistakes' ? 'Review again' : 'Next round', function () { startRound(again); });
    hap(pct >= 70 ? 'success' : 'light');
    maybePromo();
  }
  function share() {
    var text = 'I scored ' + Math.round(R.score / R.items.length * 100) + '% in ' + roundTitle() +
      ' on the ECL & ALCPT Trainer. Free practice for the ECL and ALCPT tests:';
    var url = BOT_USERNAME ? 'https://t.me/' + BOT_USERNAME : SITE;
    var link = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
    if (IN_TG && tg.openTelegramLink && ver('6.1')) { try { tg.openTelegramLink(link); return; } catch (e) { } }
    window.open(link, '_blank', 'noopener');
  }

  /* ----------------------------- listening ----------------------------- */
  var AU = null, TOK = 0;
  function pstatus(t, on) {
    var s = document.getElementById('pst'), b = app.querySelector('.pbtn');
    if (s) s.textContent = t;
    if (b) b.classList.toggle('on', !!on);
  }
  function stopAudio() {
    TOK++;
    if (AU) { AU.onended = AU.onerror = null; try { AU.pause(); } catch (e) { } }
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { }
  }
  function playListen(q) {
    stopAudio();
    var tok = TOK, i = 0;
    pstatus('Playing…', true);
    (function step() {
      if (tok !== TOK) return;
      if (i >= q.L.length) { pstatus('Tap to listen again', false); return; }
      var line = q.L[i++];
      playLine(line, tok, function () { if (tok === TOK) setTimeout(step, i < q.L.length ? 450 : 0); });
    })();
  }
  function playLine(line, tok, done) {
    var called = false;
    function once() { if (!called) { called = true; done(); } }
    function fallback() { if (!called && tok === TOK) speak(line[1], line[0], once); }
    if (!AU) { AU = new Audio(); AU.preload = 'auto'; }
    AU.onended = once;
    AU.onerror = fallback;
    AU.src = AUDIO_BASE + line[2];
    try {
      var pr = AU.play();
      if (pr && pr.catch) pr.catch(function (err) {
        if (tok !== TOK) return;
        if (err && err.name === 'NotAllowedError') { TOK++; pstatus('Tap ▶ to listen', false); }
        else fallback();
      });
    } catch (e) { fallback(); }
  }
  function speak(text, who, done) {
    var S = window.speechSynthesis;
    if (!S || !window.SpeechSynthesisUtterance) { done(); return; }
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.95; u.pitch = who === 'W' ? 1.1 : 0.9;
      u.onend = done; u.onerror = done;
      S.speak(u);
    } catch (e) { done(); }
  }

  /* ---------------------------- app popup ------------------------------ */
  var sheet = document.getElementById('sheet'), sheetBg = document.getElementById('sheetBg');
  function openSheet(campaign) {
    sheet.dataset.c = campaign || 'home';
    document.getElementById('goPlay').classList.toggle('hidden', IS_IOS);
    document.getElementById('sheetP').textContent = IS_IOS
      ? 'The full trainer has 4,309 questions, 5,037 recorded listening questions and 80 timed practice sets. Open it on the website (the app is for Android).'
      : 'The full trainer has 4,309 questions, 5,037 recorded listening questions and 80 timed practice sets. Free on Android (works offline) and on the website.';
    sheet.classList.remove('hidden'); sheetBg.classList.remove('hidden');
    void sheet.offsetWidth;
    sheet.classList.add('open'); sheetBg.classList.add('open');
    P.promo = Date.now(); save();
    hap('light');
  }
  function closeSheet() {
    sheet.classList.remove('open'); sheetBg.classList.remove('open');
    setTimeout(function () { sheet.classList.add('hidden'); sheetBg.classList.add('hidden'); }, 250);
  }
  /* after a round: the first time, then at most once a day */
  function maybePromo() {
    if (Date.now() - (P.promo || 0) < 24 * 3600 * 1000) return;
    setTimeout(function () { if (VIEW === 'result') openSheet('result'); }, 900);
  }
  document.getElementById('goPlay').addEventListener('click', function () { openLink(PLAY + 'tg-' + sheet.dataset.c); closeSheet(); });
  document.getElementById('goSite').addEventListener('click', function () { openLink(SITE_TRAINER + 'tg-' + sheet.dataset.c); closeSheet(); });
  document.getElementById('sheetX').addEventListener('click', closeSheet);
  sheetBg.addEventListener('click', closeSheet);

  /* ------------------------------ events ------------------------------- */
  app.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : null;
    if (!t) return;
    if (t.hasAttribute('data-p')) answer(+t.getAttribute('data-p'));
    else if (t.hasAttribute('data-play')) { hap('light'); if (R) playListen(R.items[R.idx].q); }
    else if (t.id === 'mainBtn') { if (mainAction) mainAction(); }
    else if (t.hasAttribute('data-set')) startRound(t.getAttribute('data-set'));
    else if (t.hasAttribute('data-len')) { P.len = +t.getAttribute('data-len'); save(); hap('light'); renderHome(); }
    else if (t.hasAttribute('data-promo')) openSheet('home');
    else if (t.hasAttribute('data-share')) share();
    else if (t.hasAttribute('data-home')) renderHome();
    else if (t.hasAttribute('data-reset')) resetAll();
  });
  document.addEventListener('keydown', function (e) {
    if (!sheet.classList.contains('hidden') && e.key === 'Escape') { closeSheet(); return; }
    if (VIEW === 'quiz' && !R.answered) {
      var k = '1234'.indexOf(e.key); if (k < 0) k = 'abcd'.indexOf((e.key || '').toLowerCase());
      if (k >= 0 && !e.ctrlKey && !e.metaKey) { answer(k); e.preventDefault(); }
    } else if ((e.key === 'Enter' || e.key === ' ') && mainAction && VIEW !== 'home') {
      e.preventDefault(); mainAction();
    }
  });
  function resetAll() {
    function go(ok) { if (!ok) return; var len = P.len; P = fresh(); P.len = len; save(); renderHome(); toast('Progress erased'); }
    if (IN_TG && tg.showConfirm && ver('6.2')) { try { tg.showConfirm('Erase your scores and progress in all trainings?', go); return; } catch (e) { } }
    go(window.confirm('Erase your scores and progress in all trainings?'));
  }

  /* ------------------------------- start ------------------------------- */
  if (tg) {
    try { tg.ready(); } catch (e) { }
    if (IN_TG) {
      document.documentElement.classList.add('tg');
      try { tg.expand(); } catch (e) { }
      applyTheme();
      try { tg.onEvent('themeChanged', applyTheme); } catch (e) { }
      try { tg.MainButton.onClick(function () { if (mainAction) mainAction(); }); } catch (e) { }
      try { tg.BackButton.onClick(function () { if (!sheet.classList.contains('hidden')) closeSheet(); else renderHome(); }); } catch (e) { }
    }
  }
  renderHome();
  cloudLoad();
})();
