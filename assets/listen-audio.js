/* ==========================================================================
   listen-audio.js - recorded voices of the website (Kokoro TTS).
   Every recording is made once with Kokoro TTS, a free open-source voice
   model run on GitHub's own machines (no API, no key, no billing), and
   served as a plain MP3 file:

     . LISTENING (assets/audio/listening/, tools/listening-audio/): the man
       (am_michael) and the woman (af_heart) of the listening questions,
       one file per line, named after the question (L04-2.mp3 = 2nd line of
       question L04), listed in manifest.js (window.ECL_LISTEN_AUDIO);
     . READ ALOUD (assets/audio/read/, tools/read-audio/): the questions,
       choices, answers and explanations of grammar, vocabulary, idioms...,
       read by am_michael, and the Listen buttons of the lessons. A file is
       named after its text (hash()): the choice letters ("A.") and "The
       correct answer is:" are separate clips, because the choices are
       shuffled. assets/audio/read/index.js (window.ECL_READ_AUDIO) says the
       recordings exist.

   Users: the trainer (practice/: Speech.speak() is wrapped below, the
   shared engine tts.js is unchanged) and the site pages (site.js, through
   window.ECL_LISTEN). A text with no recording, a file that does not load,
   or a browser that refuses to play falls back to the browser's voice.
   ========================================================================== */
(function (g) {
  'use strict';
  var DEF_RATE = 0.92;                     // reading speed the browser voices use by default
  var READ_GAP = 300;                      // silence between two parts (question, choice A...)

  var root = '/assets/';
  try {
    var me = document.currentScript && document.currentScript.src;
    if (me) root = me.replace(/listen-audio\.js(\?.*)?$/, '');
  } catch (e) { }
  var LBASE = root + 'audio/listening/', RBASE = root + 'audio/read/';

  /* listening: 'M|text' -> 'L04-2.mp3?v=hash' (the hash changes with the
     text, so a corrected line is never played from an old cached file) */
  var M = g.ECL_LISTEN_AUDIO || { items: {} };
  var files = {};
  Object.keys(M.items || {}).forEach(function (id) {
    (M.items[id] || []).forEach(function (l) { files[(l.role === 'W' ? 'W' : 'M') + '|' + l.text] = l.file + '?v=' + l.hash; });
  });
  function fileOf(role, text) { return files[(role === 'W' ? 'W' : 'M') + '|' + String(text == null ? '' : text)] || ''; }

  /* read aloud: file name = cyrb53 hash of the text, in base 36
     (tools/read-audio/generate.py computes the same) */
  var R = g.ECL_READ_AUDIO && g.ECL_READ_AUDIO.count ? g.ECL_READ_AUDIO : null;
  function hash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, ch;
    for (i = 0; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  var LETTER = /^([A-F])\. ([\s\S]+)$/, ANSWER = /^The correct answer is: ([\s\S]+)\.$/;
  /* a text as it is recorded: [{t: text of the clip, g: silence before it}] */
  function clips(text) {
    text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!text) return [];
    var m = LETTER.exec(text);
    if (m) return [{ t: m[1] + '.', g: 0 }, { t: m[2], g: 80 }];
    m = ANSWER.exec(text);
    if (m) return [{ t: 'The correct answer is:', g: 0 }, { t: m[1], g: 80 }];
    return [{ t: text, g: 0 }];
  }

  /* lines: [['M' or 'W', listening line] or ['', text to read], ...]
     -> [{u: url, g: silence before (ms), k: index of the line}], or null
     when a listening line has no recording */
  function plan(lines, gap) {
    if (!lines || !lines.length) return null;
    var items = [];
    for (var i = 0; i < lines.length; i++) {
      var r = lines[i][0], t = lines[i][1], gi = i ? (gap || 0) : 0;
      if (r === 'M' || r === 'W') {
        var f = fileOf(r, t);
        if (!f) return null;
        items.push({ u: LBASE + f, g: gi, k: i });
      } else {
        if (!R) return null;
        var c = clips(t);
        if (!c.length) return null;
        for (var j = 0; j < c.length; j++) items.push({ u: RBASE + hash(c[j].t) + '.mp3', g: j ? c[j].g : gi, k: i });
      }
    }
    return items;
  }
  function has(lines) { return !!plan(lines, 0); }
  function prefetch(u) { try { if (g.fetch) g.fetch(u).catch(function () { }); } catch (e) { } }

  var SILENT = 'data:audio/mpeg;base64,//NExAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExFMAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKYAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
  var el = null;
  function audio() {
    if (!el) { el = new Audio(); el.preload = 'auto'; }
    return el;
  }
  /* Phones (Safari above all) let an audio element play without a new tap
     only once it has played during a tap: it is unlocked, MUTED, on the
     first tap or key. */
  var unlocked = false;
  function unlock() {
    if (unlocked) return;
    var a = audio();
    if (a.src && a.src !== SILENT) return;
    try {
      a.muted = true; a.src = SILENT;
      var p = a.play();
      var done = function (ok) { if (a.src === SILENT) { try { a.pause(); } catch (e) { } a.muted = false; } if (ok) unlocked = true; };
      if (p && p.then) p.then(function () { done(true); }, function () { done(false); });
      else done(true);
    } catch (e) { a.muted = false; }
  }
  ['touchend', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlock, true); });

  var gen = 0;
  /* play(items, { rate, onend, onfail(k) }) -> { stop, pause, resume, paused }
     items: from plan(); rate: 1 = the speed of the recording;
     onfail(k): line k could not be played (the caller reads lines k... itself) */
  function play(items, o) {
    o = o || {};
    var my = ++gen, i = 0, a = audio(), guard = null, gapT = null, startT = null, isPaused = false, over = false;
    var rate = Math.max(0.5, Math.min(2, o.rate || 1));
    function clear() { if (guard) { clearTimeout(guard); guard = null; } if (gapT) { clearTimeout(gapT); gapT = null; } if (startT) { clearTimeout(startT); startT = null; } }
    function live() { return my === gen && !over; }
    function detach() { a.onended = a.onerror = a.onloadedmetadata = a.onplaying = a.onpause = null; }
    function end() { if (!live()) return; over = true; clear(); detach(); if (o.onend) o.onend(); }
    function fail() { if (!live()) return; over = true; clear(); detach(); try { a.pause(); } catch (e) { } if (o.onfail) o.onfail(items[i] ? items[i].k : 0); }
    function next() {
      if (!live() || isPaused) return;
      if (i >= items.length) { end(); return; }
      if (i + 1 < items.length) prefetch(items[i + 1].u);
      a.onended = function () {
        if (!live()) return;
        clear(); i++;
        if (i >= items.length) { end(); return; }
        gapT = setTimeout(function () { gapT = null; next(); }, items[i].g || 0);
      };
      a.onerror = fail;
      /* a recording that does not start within a few seconds (blocked by the
         phone, slow network) gives way to the browser voice */
      a.onplaying = function () { if (startT) { clearTimeout(startT); startT = null; } };
      a.onpause = function () { if (live() && !isPaused && !a.ended && !gapT) fail(); };
      if (startT) clearTimeout(startT);
      startT = setTimeout(function () { startT = null; if (live() && !isPaused && a.paused) fail(); }, 4000);
      /* a recording that never says it has ended still moves on */
      a.onloadedmetadata = function () {
        if (!live() || !isFinite(a.duration)) return;
        if (guard) clearTimeout(guard);
        guard = setTimeout(function () { if (live() && !isPaused && a.onended) a.onended(); }, a.duration * 1000 / rate + 4000);
      };
      a.muted = false;
      a.src = items[i].u;
      a.defaultPlaybackRate = rate; a.playbackRate = rate;
      try { a.preservesPitch = true; a.webkitPreservesPitch = true; } catch (e) { }
      var p;
      try { p = a.play(); } catch (e) { fail(); return; }
      if (p && p.catch) p.catch(function (e) { if (!e || e.name !== 'AbortError') fail(); });
    }
    if (items.length && items[0].g) gapT = setTimeout(function () { gapT = null; next(); }, items[0].g); else next();
    return {
      stop: function () { if (my === gen) gen++; over = true; clear(); detach(); try { a.pause(); } catch (e) { } },
      pause: function () { if (!live() || isPaused) return; isPaused = true; if (guard) { clearTimeout(guard); guard = null; } if (startT) { clearTimeout(startT); startT = null; } try { a.pause(); } catch (e) { } },
      resume: function () {
        if (!live() || !isPaused) return;
        isPaused = false;
        if (gapT || !a.src || a.ended) { if (!gapT) next(); return; }
        var p = a.play(); if (p && p.catch) p.catch(function () { fail(); });
      },
      paused: function () { return isPaused; }
    };
  }

  g.ECL_LISTEN = { has: has, plan: plan, play: play, clips: clips, hash: hash, reads: !!R, defRate: DEF_RATE };

  /* ------------------------ trainer (practice/) ---------------------------
     Wraps the shared audio engine (tts.js) without changing it. Listening
     lines (opts.roles) and every text with a recording play the MP3 files and
     send the same 'start' and 'end' events, so the Listen buttons, Auto mode,
     the exam timer and the answer window behave exactly as before.         */
  var S = g.Speech;
  if (!S || typeof S.speak !== 'function' || S.listenAudio) return;
  var raw = { speak: S.speak, stop: S.stop, pause: S.pause, resume: S.resume, isSpeaking: S.isSpeaking,
              isPaused: S.isPaused, on: S.on, off: S.off, usable: S.usable };
  var subs = {}, cur = null;
  function emit(n, p) { (subs[n] || []).slice().forEach(function (fn) { try { fn(p); } catch (e) { } }); }
  function stopMine() { if (cur) { var c = cur; cur = null; c.stop(); } }
  var quiet = { stop: function () { } };   // tts.js speak() without its own stop() (and its 'end' event)
  function isArr(x) { return Object.prototype.toString.call(x) === '[object Array]'; }

  S.on = function (n, fn) { (subs[n] = subs[n] || []).push(fn); return raw.on.apply(S, arguments); };
  S.off = function (n) { subs[n] = []; return raw.off.apply(S, arguments); };
  S.speak = function (text, opts) {
    opts = opts || {};
    var roles = opts.roles && isArr(text);
    var parts = isArr(text) ? text : [text];
    var lines = parts.map(function (t, k) { return [roles ? (opts.roles[k] === 'W' ? 'W' : 'M') : '', t]; });
    var items = plan(lines, roles ? (opts.gap || 0) : READ_GAP);
    if (items) {
      S.stop();                              // same 'end' as before a new reading
      var rate = (S.getRate ? S.getRate() : DEF_RATE) / DEF_RATE * (opts.rateMul > 0 ? opts.rateMul : 1);
      var c = cur = play(items, {
        rate: rate,
        onend: function () { if (cur === c) { cur = null; emit('end', {}); } },
        onfail: function (k) {
          if (cur !== c) return;
          cur = null;                        // the browser voice reads what is left
          var o2 = {}; for (var x in opts) if (opts.hasOwnProperty(x)) o2[x] = opts[x];
          if (roles) o2.roles = opts.roles.slice(k);
          if (!isArr(text)) { raw.speak.call(quiet, text, o2); return; }
          if (!roles) o2.keepUnits = true;
          raw.speak.call(quiet, text.slice(k), o2);
        }
      });
      emit('start', { parts: items.length, meta: opts.meta || null });
      return;
    }
    stopMine();
    return raw.speak.apply(S, arguments);
  };
  S.stop = function () { stopMine(); return raw.stop.apply(S, arguments); };
  S.isSpeaking = function () { return !!cur || raw.isSpeaking.apply(S, arguments); };
  S.isPaused = function () { return cur ? cur.paused() : raw.isPaused.apply(S, arguments); };
  S.pause = function () { if (cur) { cur.pause(); emit('pause', {}); return; } return raw.pause.apply(S, arguments); };
  S.resume = function () { if (cur) { cur.resume(); emit('resume', {}); return; } return raw.resume.apply(S, arguments); };
  /* the recordings make audio available even where the browser has no voice */
  if (R && raw.usable) S.usable = function () { return true; };
  S.listenAudio = true;
})(window);
