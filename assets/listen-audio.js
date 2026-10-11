/* ==========================================================================
   listen-audio.js - recorded voices for the LISTENING questions (website).
   The recordings are made once with Kokoro TTS, a free open-source voice
   model run locally (am_michael for the man, af_heart for the woman, speed
   1.0), by tools/listening-audio/generate.py. They are saved as MP3 files
   named after the question (assets/audio/listening/L04-2.mp3 = 2nd line of
   question L04) and listed in the question-to-audio manifest
   assets/audio/listening/manifest.js (window.ECL_LISTEN_AUDIO), which
   loads before this file.

   Only the listening questions use them:
     . the trainer (practice/): Listening practice and the listening part of
       the ECL and ALCPT timed exams. Speech.speak() calls that carry the
       voices of the man and the woman (opts.roles) play the MP3 files;
       every other reading (grammar, vocabulary, idioms...) is unchanged;
     . the test pages (tests/): the Play buttons of the listening items
       (data-seq), through window.ECL_LISTEN in site.js.
   A line with no recording, a file that does not load, or a browser that
   refuses to play falls back to the voices of the browser, as before.
   No API and no key are used here: the files are plain static MP3.
   ========================================================================== */
(function (g) {
  'use strict';
  /* 'M|text' -> 'L04-2.mp3?v=hash' (the hash changes with the text, so a
     corrected line is never played from an old cached file) */
  var M = g.ECL_LISTEN_AUDIO || { items: {} };
  var files = {};
  Object.keys(M.items || {}).forEach(function (id) {
    (M.items[id] || []).forEach(function (l) { files[(l.role === 'W' ? 'W' : 'M') + '|' + l.text] = l.file + '?v=' + l.hash; });
  });
  var DEF_RATE = 0.92;                     // reading speed the browser voices use by default

  /* folder of the MP3 files, next to the manifest */
  var base = '/assets/audio/listening/';
  try {
    var me = document.currentScript && document.currentScript.src;
    if (me) base = me.replace(/assets\/listen-audio\.js(\?.*)?$/, 'assets/audio/listening/');
  } catch (e) { }

  function who(r) { return r === 'W' ? 'W' : 'M'; }
  function fileOf(role, text) { return files[who(role) + '|' + String(text == null ? '' : text)] || ''; }
  /* lines: [['M', 'text'], ['W', 'text'], ...] */
  function has(lines) {
    if (!lines || !lines.length) return false;
    for (var i = 0; i < lines.length; i++) {
      var r = lines[i][0];
      if ((r !== 'M' && r !== 'W') || !fileOf(r, lines[i][1])) return false;
    }
    return true;
  }
  function url(line) { return base + fileOf(line[0], line[1]); }
  function prefetch(u) { try { if (g.fetch) g.fetch(u).catch(function () { }); } catch (e) { } }

  var SILENT = 'data:audio/mpeg;base64,//NExAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExFMAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKYAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
  var el = null;
  function audio() {
    if (!el) { el = new Audio(); el.preload = 'auto'; }
    return el;
  }
  /* first tap or key: the audio element may play later without a new gesture
     (Safari, phones) */
  ['touchend', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function once() {
      document.removeEventListener(ev, once, true);
      try { var a = audio(); if (!a.src) { a.src = SILENT; var p = a.play(); if (p && p.catch) p.catch(function () { }); } } catch (e) { }
    }, true);
  });

  var gen = 0;
  /* play(lines, { rate, gap, onend, onfail(i) }) -> { stop, pause, resume, paused }
     rate: 1 = the speed of the recording; gap: silence between two lines (ms);
     onfail(i): line i could not be played (the caller reads lines i... itself) */
  function play(lines, o) {
    o = o || {};
    var my = ++gen, i = 0, a = audio(), guard = null, gapT = null, isPaused = false, over = false;
    var rate = Math.max(0.5, Math.min(2, o.rate || 1));
    function clear() { if (guard) { clearTimeout(guard); guard = null; } if (gapT) { clearTimeout(gapT); gapT = null; } }
    function live() { return my === gen && !over; }
    function end() { if (!live()) return; over = true; clear(); detach(); if (o.onend) o.onend(); }
    function fail() { if (!live()) return; over = true; clear(); detach(); try { a.pause(); } catch (e) { } if (o.onfail) o.onfail(i); }
    function detach() { a.onended = a.onerror = a.onloadedmetadata = null; }
    function next() {
      if (!live() || isPaused) return;
      if (i >= lines.length) { end(); return; }
      if (i + 1 < lines.length) prefetch(url(lines[i + 1]));
      a.onended = function () {
        if (!live()) return;
        clear(); i++;
        if (i >= lines.length) { end(); return; }
        gapT = setTimeout(function () { gapT = null; next(); }, o.gap || 0);
      };
      a.onerror = fail;
      /* a recording that never says it has ended still moves on */
      a.onloadedmetadata = function () {
        if (!live() || !isFinite(a.duration)) return;
        if (guard) clearTimeout(guard);
        guard = setTimeout(function () { if (live() && !isPaused && a.onended) a.onended(); }, a.duration * 1000 / rate + 4000);
      };
      a.src = url(lines[i]);
      a.defaultPlaybackRate = rate; a.playbackRate = rate;
      try { a.preservesPitch = true; a.webkitPreservesPitch = true; } catch (e) { }
      var p;
      try { p = a.play(); } catch (e) { fail(); return; }
      if (p && p.catch) p.catch(function (e) { if (!e || e.name !== 'AbortError') fail(); });
    }
    next();
    return {
      stop: function () { if (my === gen) gen++; over = true; clear(); detach(); try { a.pause(); } catch (e) { } },
      pause: function () { if (!live() || isPaused) return; isPaused = true; if (guard) { clearTimeout(guard); guard = null; } try { a.pause(); } catch (e) { } },
      resume: function () {
        if (!live() || !isPaused) return;
        isPaused = false;
        if (gapT || !a.src || a.ended) { if (!gapT) next(); return; }
        var p = a.play(); if (p && p.catch) p.catch(function () { fail(); });
      },
      paused: function () { return isPaused; }
    };
  }

  g.ECL_LISTEN = { has: has, play: play, count: function () { return Object.keys(files).length; }, defRate: DEF_RATE };

  /* ------------------------ trainer (practice/) ---------------------------
     Wraps the shared audio engine (tts.js) without changing it: a listening
     question (Speech.speak with opts.roles) plays the recordings and sends
     the same 'start' and 'end' events, so buttons, autoplay, the exam timer
     and the answer window behave exactly as before.                       */
  var S = g.Speech;
  if (!S || typeof S.speak !== 'function' || S.listenAudio) return;
  var raw = { speak: S.speak, stop: S.stop, pause: S.pause, resume: S.resume, isSpeaking: S.isSpeaking, isPaused: S.isPaused, on: S.on, off: S.off };
  var subs = {}, cur = null;
  function emit(n, p) { (subs[n] || []).slice().forEach(function (fn) { try { fn(p); } catch (e) { } }); }
  function stopMine() { if (cur) { var c = cur; cur = null; c.stop(); } }
  var quiet = { stop: function () { } };   // tts.js speak() without its own stop() (and its 'end' event)

  S.on = function (n, fn) { (subs[n] = subs[n] || []).push(fn); return raw.on.apply(S, arguments); };
  S.off = function (n) { subs[n] = []; return raw.off.apply(S, arguments); };
  S.speak = function (text, opts) {
    opts = opts || {};
    if (opts.roles && Object.prototype.toString.call(text) === '[object Array]') {
      var lines = text.map(function (t, k) { return [who(opts.roles[k]), t]; });
      if (has(lines)) {
        S.stop();                            // same 'end' as before a new reading
        var rate = (S.getRate ? S.getRate() : DEF_RATE) / DEF_RATE * (opts.rateMul > 0 ? opts.rateMul : 1);
        var c = cur = play(lines, {
          rate: rate, gap: opts.gap || 0,
          onend: function () { if (cur === c) { cur = null; emit('end', {}); } },
          onfail: function (i) {
            if (cur !== c) return;
            cur = null;                      // the browser voices read what is left
            var o2 = {}; for (var k in opts) if (opts.hasOwnProperty(k)) o2[k] = opts[k];
            o2.roles = opts.roles.slice(i);
            raw.speak.call(quiet, text.slice(i), o2);
          }
        });
        emit('start', { parts: lines.length, meta: opts.meta || null });
        return;
      }
    }
    stopMine();
    return raw.speak.apply(S, arguments);
  };
  S.stop = function () { stopMine(); return raw.stop.apply(S, arguments); };
  S.isSpeaking = function () { return !!cur || raw.isSpeaking.apply(S, arguments); };
  S.isPaused = function () { return cur ? cur.paused() : raw.isPaused.apply(S, arguments); };
  S.pause = function () { if (cur) { cur.pause(); emit('pause', {}); return; } return raw.pause.apply(S, arguments); };
  S.resume = function () { if (cur) { cur.resume(); emit('resume', {}); return; } return raw.resume.apply(S, arguments); };
  S.listenAudio = true;
})(window);
