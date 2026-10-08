/* =========================================================================
   tts.js  —  Moteur audio  (ECL English Trainer v5.9.3, edition web)
   -------------------------------------------------------------------------
   Deux moteurs, un seul comportement visible :

     1. cordova-plugin-tts-advanced  (window.TTS)   -> PRIORITAIRE en APK
     2. Web Speech API (window.speechSynthesis)     -> navigateur / test PC

   Le module choisit tout seul, se replie tout seul, et n'affiche jamais un
   bouton qui ne parlerait pas.

   Corrige les 8 causes reelles de « l'audio ne lit pas » dans un APK :
     1. getVoices() vide au demarrage    -> attente 'voiceschanged' + polling
     2. WebView verrouille avant geste   -> unlock() silencieux au 1er tap
     3. Texte long coupe / muet          -> decoupage en fragments
     4. Coupure automatique apres ~15 s  -> watchdog pause()/resume()
     5. Utterance ramassee par le GC     -> reference conservee
     6. onend qui ne se declenche pas    -> minuteur de securite
     7. speak() ignore si deja en cours  -> cancel() systematique avant
     8. Aucune voix anglaise installee   -> plugin natif puis message clair

   Nouveautes v4 :
     - lecture sequencee avec suivi du fragment lu (surlignage)
     - pause / reprise reelles
     - liberation propre du focus audio (publicite video, appel entrant)
     - fragments plus longs quand le moteur natif est present
   ========================================================================= */
(function (global) {
  'use strict';

  var VOICE_KEY = 'et_voice', RATE_KEY = 'et_rate', PITCH_KEY = 'et_pitch';
  var DEFAULT_US_VOICE = 'en-us-x-iol-network';
  var NVOICE_KEY = 'et_nvoice';   // voix du moteur Android natif

  var synth = global.speechSynthesis || null;
  var voices = [];
  var voicesReady = false;
  var unlocked = false;
  var queue = [];
  var idx = 0;
  var speaking = false;
  var paused = false;
  /* Position courante de la lecture native : le plugin ne sait pas reprendre
     apres un stop(), il faut donc pouvoir relancer le segment interrompu.  */
  var curSegs = null, curSi = 0, curNext = null, playGen = 0;
  var nativeResume = null;   // relance la boucle native au segment courant
  var keepAlive = [];
  var guardTimer = null;
  var resumeTimer = null;
  var listeners = {};
  var nativeTTS = null;
  var lastError = null;
  var currentMeta = null;

  /* ---------------------------------------------------------------- utils */
  function emit(name, payload) {
    (listeners[name] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { }
    });
  }
  function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
  function off(name) { listeners[name] = []; }

  function pref(k, d) {
    try { var v = localStorage.getItem(k); return v === null ? d : v; }
    catch (e) { return d; }
  }
  function setPref(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  /* ------------------------------------------------- (1) chargement voix */
  function collectVoices() {
    if (!synth) return [];
    var v = [];
    try { v = synth.getVoices() || []; } catch (e) { v = []; }
    if (v.length) { voices = v; voicesReady = true; }
    return voices;
  }
  function waitForVoices(cb, tries) {
    tries = tries === undefined ? 40 : tries;
    collectVoices();
    if (voicesReady || tries <= 0) { cb(voices); return; }
    setTimeout(function () { waitForVoices(cb, tries - 1); }, 150);
  }
  function englishVoices() {
    return voices.filter(function (v) {
      return /en[-_]US/i.test(v.lang || '') || /^en-us/i.test(v.voiceURI || v.name || '');
    });
  }
  function pickVoice() {
    var wanted = pref(VOICE_KEY, ''), all = englishVoices(), i;
    if (wanted) {
      for (i = 0; i < all.length; i++) {
        if (all[i].voiceURI === wanted || all[i].name === wanted) return all[i];
      }
    }
    for (i = 0; i < all.length; i++) {
      var wid = String(all[i].voiceURI || all[i].name || '').toLowerCase();
      if (wid.indexOf(DEFAULT_US_VOICE) >= 0) return all[i];
    }
    /* Web edition: the best MALE American voice first, close to the Google
       male voice of the Android app (natural Microsoft voices in Edge,
       Google male voices on Android, Apple male voices, then Windows
       voices). Female voices come after; novelty voices last. */
    return bestWebVoice(all);
  }
  function bestWebVoice(list) {
    var ranked = (list || englishVoices()).slice().sort(function (a, b) { return voiceRank(b) - voiceRank(a); });
    return ranked[0] || null;
  }
  function voiceRank(v) {
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
    if (/en-us-x-(iol|iom|tpd)/i.test(n)) return 92;            // Google male voices (Android)
    if (/\b(Evan|Nathan|Tom|Aaron)\b/i.test(n)) return nat ? 90 : 86;   // Apple male voices
    if (/\bAlex\b/i.test(n)) return 88;
    if (/Microsoft (Mark|David)/i.test(n)) return 80;            // Windows male voices
    if (/\bFred\b/i.test(n)) return 40;
    if (nat && /Microsoft/i.test(n)) return 60;                  // natural female voices
    if (/Google US English/i.test(n)) return 58;
    if (isGoogle(v.name, v.voiceURI)) return 55;
    if (/Samantha|Ava|Allison|Susan|Zoe|Nicky|Joelle|Noelle/i.test(n)) return 50;
    return v.localService ? 20 : 15;
  }

  /* -------------------------------------------------- (2) deverrouillage */
  function unlock() {
    if (unlocked || !synth) return;
    try {
      var u = new SpeechSynthesisUtterance(' ');
      u.volume = 0; u.rate = 1; u.lang = 'en-US';
      synth.speak(u); synth.cancel();
      unlocked = true;
    } catch (e) { }
  }

  /* ------------------------------------------- (3) decoupage intelligent */
  /* Marqueur interne d'un silence : remplace un blanc a trous (_____ ou
     ………). Le silence n'est JAMAIS confie au moteur (aucun moteur Android ne
     gere SSML de facon fiable : le plugin cordova-plugin-tts-advanced lit
     haute). Il est produit par le lecteur lui-meme : on coupe le texte au
     niveau du blanc et on temporise entre les morceaux avec setTimeout.     */
  var BLANK = '\u0001';               // caractere de controle, jamais lu
  var BLANK_MS = 400;

  function setBlankMs(ms) { BLANK_MS = Math.max(0, ms | 0); }

  function normalize(text) {
    return String(text || '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, ', ')
      .replace(/[\u2026]+|\.{3,}/g, ' ' + BLANK + ' ')   // ……… -> silence
      .replace(/_{2,}/g, ' ' + BLANK + ' ')              // _____ -> silence
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Decoupe un fragment en une suite d'elements a jouer dans l'ordre :
       { say: "texte" }   -> a prononcer
       { pause: 2500 }    -> silence de N ms, rien n'est prononce
     Aucun code de silence n'atteint jamais le moteur vocal.                 */
  function toSegments(t) {
    var segs = [], parts = t.split(BLANK);
    for (var i = 0; i < parts.length; i++) {
      var say = parts[i].replace(/\s+/g, ' ').trim();
      if (say) segs.push({ say: say });
      if (i < parts.length - 1) segs.push({ pause: BLANK_MS });
    }
    return segs;
  }
  function defaultMax() { return detectNative() ? 320 : 170; }
  function chunk(text, max) {
    max = max || defaultMax();
    var clean = normalize(text);
    if (!clean) return [];
    if (clean.length <= max) return [clean];

    var sentences = clean.match(/[^.!?;:]+[.!?;:]*\s*/g) || [clean];
    var out = [], buf = '';
    sentences.forEach(function (s) {
      s = s.trim();
      if (!s) return;
      while (s.length > max) {
        var cut = s.lastIndexOf(',', max);
        if (cut < max * 0.4) cut = s.lastIndexOf(' ', max);
        if (cut < 1) cut = max;
        out.push(s.slice(0, cut).trim());
        s = s.slice(cut).trim();
      }
      if ((buf + ' ' + s).trim().length <= max) buf = (buf + ' ' + s).trim();
      else { if (buf) out.push(buf); buf = s; }
    });
    if (buf) out.push(buf);
    return out.filter(function (x) { return x.length; });
  }

  /* -------------------------------------------------- (4) anti-coupure */
  function startResumeWatchdog() {
    stopResumeWatchdog();
    resumeTimer = setInterval(function () {
      if (!synth || paused) return;
      if (synth.speaking && !synth.paused) {
        try { synth.pause(); synth.resume(); } catch (e) { }
      }
    }, 7000);
  }
  function stopResumeWatchdog() {
    if (resumeTimer) { clearInterval(resumeTimer); resumeTimer = null; }
  }
  function clearGuard() { if (guardTimer) { clearTimeout(guardTimer); guardTimer = null; } }

  /* --------------------------------------------------------- lecture web */
  /* Chaque entree de `queue` est un fragment surlignable (une phrase, un
     paragraphe, un choix). On le decoupe en segments say/pause : les say sont
     prononces, les pause sont de vrais silences (setTimeout), jamais confies
     au moteur.                                                              */
  function speakChunk() {
    if (!speaking || paused) return;
    if (idx >= queue.length) { finish(); return; }

    emit('chunk', { index: idx, total: queue.length, text: queue[idx], meta: currentMeta });
    var segs = toSegments(normalize(queue[idx]));
    playSegmentsWeb(segs, 0, function () {
      idx++;
      setTimeout(speakChunk, 40);
    });
  }

  function playSegmentsWeb(segs, si, done) {
    if (!speaking) return;
    if (paused) { setTimeout(function () { playSegmentsWeb(segs, si, done); }, 200); return; }
    if (si >= segs.length) { done(); return; }

    var seg = segs[si];
    if (seg.pause) {                       // vrai silence, rien n'est prononce
      guardTimer = setTimeout(function () { playSegmentsWeb(segs, si + 1, done); }, seg.pause);
      return;
    }

    var u = new SpeechSynthesisUtterance(seg.say);
    var v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang || 'en-US'; } else { u.lang = 'en-US'; }
    u.rate = parseFloat(pref(RATE_KEY, '0.92')) || 0.92;
    u.pitch = parseFloat(pref(PITCH_KEY, '1')) || 1;
    u.volume = 1;

    keepAlive.push(u);
    if (keepAlive.length > 30) keepAlive.shift();

    var advanced = false;
    function next() {
      if (advanced) return;
      advanced = true; clearGuard();
      playSegmentsWeb(segs, si + 1, done);
    }
    u.onend = next;
    u.onerror = function (e) {
      lastError = (e && e.error) || 'unknown';
      if (lastError === 'interrupted' || lastError === 'canceled') { advanced = true; clearGuard(); return; }
      next();
    };
    try { synth.cancel(); synth.speak(u); }
    catch (e) { next(); return; }

    var est = Math.max(2500, seg.say.length * 62 / (u.rate || 1) + 1800);
    clearGuard();
    guardTimer = setTimeout(function () {
      if (!advanced) { try { synth.cancel(); } catch (e) { } next(); }
    }, est);
  }

  function finish() {
    speaking = false; paused = false;
    queue = []; idx = 0; currentMeta = null;
    clearGuard(); stopResumeWatchdog();
    emit('end', {});
  }

  /* ------------------------- catalogue des voix ------------------------- */
  /* Deux sources possibles : le moteur Android natif (voix installees sur le
     telephone, generalement fournies par Google) et la Web Speech API. Le
     catalogue les presente sous la meme forme :
        { id, name, lang, google, native }                                  */
  var nativeVoiceCache = null;

  function isGoogle(name, id) {
    var t = String(name || '') + ' ' + String(id || '');
    /* Les voix Google portent soit le mot Google, soit l'identifiant de la
       forme en-us-x-* propre a leur moteur.                      */
    return /google/i.test(t) || /-x-/.test(String(id || ''));
  }
  function isEnglish(lang, id) {
    return /en[-_]US/i.test(String(lang || '')) || /^en-us/i.test(String(id || ''));
  }

  function normaliseNative(list) {
    var out = [], i, v, id, name, lang;
    if (!list || !list.length) return out;
    for (i = 0; i < list.length; i++) {
      v = list[i];
      if (typeof v === 'string') { id = v; name = v; lang = v; }
      else {
        id = v.identifier || v.voiceURI || v.name || '';
        name = v.name || id;
        lang = v.language || v.locale || v.lang || '';
      }
      if (!id) continue;
      if (!isEnglish(lang, id)) continue;
      out.push({ id: String(id), name: String(name), lang: String(lang),
                 google: isGoogle(name, id), native: true });
    }
    return out;
  }

  function fetchNativeVoices(cb) {
    if (nativeVoiceCache) { cb(nativeVoiceCache); return; }
    if (!detectNative() || typeof nativeTTS.getVoices !== 'function') { cb([]); return; }
    var res;
    try { res = nativeTTS.getVoices(); } catch (e) { cb([]); return; }
    if (res && typeof res.then === 'function') {
      res.then(function (l) { nativeVoiceCache = normaliseNative(l); cb(nativeVoiceCache); },
               function () { cb([]); });
    } else {
      nativeVoiceCache = normaliseNative(res);
      cb(nativeVoiceCache);
    }
  }

  function webVoiceList() {
    collectVoices();
    return englishVoices().map(function (v) {
      return { id: v.voiceURI || v.name, name: v.name, lang: v.lang || '',
               google: isGoogle(v.name, v.voiceURI), native: false };
    });
  }

  /* ----------------------------------------------- (8) moteur natif */
  function detectNative() {
    if (!nativeTTS && global.TTS && typeof global.TTS.speak === 'function') {
      nativeTTS = global.TTS;
    }
    return nativeTTS;
  }

  function speakNative(parts, done) {
    var i = 0, first = true;

    function step() {
      if (!speaking) { done(); return; }
      if (paused) { setTimeout(step, 250); return; }
      if (i >= parts.length) { done(); return; }

      emit('chunk', { index: i, total: parts.length, text: parts[i], meta: currentMeta });
      var segs = toSegments(normalize(parts[i]));
      i++;
      playSegmentsNative(segs, 0, step);
    }

    nativeResume = playSegmentsNative;
    function playSegmentsNative(segs, si, next) {
      if (!speaking) { done(); return; }
      curSegs = segs; curSi = si; curNext = next;      // point de reprise
      if (paused) return;                              // resume() relancera
      if (si >= segs.length) { next(); return; }
      var gen = playGen;

      var seg = segs[si];
      if (seg.pause) {                    // VRAI silence : rien n'est envoye au moteur
        setTimeout(function () { playSegmentsNative(segs, si + 1, next); }, seg.pause);
        return;
      }

      var chosen = pref(NVOICE_KEY, '') || DEFAULT_US_VOICE;
      var rate = parseFloat(pref(RATE_KEY, '0.92')) || 0.92;
      var opt = { text: seg.say, locale: 'en-US', rate: rate, cancel: first };
      if (chosen) opt.identifier = chosen;
      first = false;

      var advanced = false;
      function cont() {
        if (advanced || gen !== playGen) return;       // lecture annulee entre-temps
        advanced = true;
        playSegmentsNative(segs, si + 1, next);
      }

      var p;
      try { p = nativeTTS.speak(opt); } catch (e) { p = null; }
      if (p && typeof p.then === 'function') p.then(cont, cont);
      else setTimeout(cont, seg.say.length * 62 / rate + 300);
    }

    step();
  }

  /* ------------------------------------------------------------- API */
  var Speech = {

    init: function () {
      if (synth && typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', collectVoices);
      }
      if (synth) synth.onvoiceschanged = collectVoices;
      waitForVoices(function () { emit('ready', voices); });

      ['touchend', 'click', 'keydown'].forEach(function (ev) {
        document.addEventListener(ev, function once() {
          unlock();
          document.removeEventListener(ev, once);
        }, { once: true, passive: true });
      });

      /* Liberation du focus audio : arriere-plan, appel entrant,
         publicite video plein ecran. */
      document.addEventListener('pause', function () { Speech.stop(); }, false);
      document.addEventListener('resign', function () { Speech.stop(); }, false);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) Speech.stop();
      }, false);

      document.addEventListener('deviceready', function () {
        detectNative();
        collectVoices();
        emit('engine', { native: !!nativeTTS });
      }, false);
      return this;
    },

    available: function () { return !!(synth || detectNative()); },

    usable: function () {
      if (detectNative()) return true;
      if (!synth) return false;
      collectVoices();
      return voices.length > 0;
    },

    engineName: function () {
      if (detectNative()) return 'Native Android engine';
      if (synth && voices.length) return 'Web Speech API';
      return 'none';
    },

    openInstall: function () {
      if (nativeTTS && typeof nativeTTS.openInstallTts === 'function') {
        try { nativeTTS.openInstallTts(); return true; } catch (e) { }
      }
      return false;
    },

    hasEnglishVoice: function () { return englishVoices().length > 0 || !!detectNative(); },
    voices: function () { return englishVoices().length ? englishVoices() : voices; },

    on: on, off: off,

    setVoice: function (uri) { setPref(VOICE_KEY, uri || ''); },
    getVoice: function () { return pref(VOICE_KEY, ''); },

    /* Catalogue unifie : natif d'abord, Web Speech en repli.
       listVoices(function (tableau) { ... })                              */
    listVoices: function (cb) {
      fetchNativeVoices(function (nat) {
        if (nat && nat.length) { cb(nat); return; }
        var web = webVoiceList();
        if (web.length) { cb(web); return; }
        /* Le moteur natif est present mais ne sait pas enumerer ses voix :
           on attend le chargement des voix du navigateur avant d'abandonner. */
        waitForVoices(function () { cb(webVoiceList()); }, 12);
      });
    },

    /* Identifiant de la voix actuellement retenue, natif ou web. */
    getVoiceId: function () {
      return pref(NVOICE_KEY, '') || pref(VOICE_KEY, '') || DEFAULT_US_VOICE;
    },

    /* Enregistre la voix choisie. `native` indique la source.
       Une chaine vide remet la selection automatique.                     */
    setVoiceId: function (id, native) {
      if (!id) { setPref(NVOICE_KEY, ''); setPref(VOICE_KEY, ''); return; }
      if (native) { setPref(NVOICE_KEY, id); setPref(VOICE_KEY, ''); }
      else { setPref(VOICE_KEY, id); setPref(NVOICE_KEY, ''); }
    },

    defaultVoiceId: function () {
      if (detectNative()) return DEFAULT_US_VOICE;
      collectVoices();
      var b = bestWebVoice();
      return b ? (b.voiceURI || b.name) : DEFAULT_US_VOICE;
    },
    useDefaultVoice: function () {
      if (detectNative()) { setPref(NVOICE_KEY, DEFAULT_US_VOICE); setPref(VOICE_KEY, ''); }
      else { setPref(NVOICE_KEY, ''); setPref(VOICE_KEY, ''); }
    },

    setBlankMs: function (ms) { setBlankMs(ms); },
    getBlankMs: function () { return BLANK_MS; },
    /* Select the requested Google US voice by default. The exact Android
       identifier is stored for native Cordova builds; browser previews use
       the best available US voice without exposing non-US voices. A user's
       later US voice choice is preserved. */
    autoSelectGoogle: function (cb) {
      cb = cb || function () {};

      var migrated = pref('et_voice_forced_v3', '');
      var native = !!detectNative();
      /* Earlier website builds saved "Google US English" automatically:
         forget that once, so the male American default applies.          */
      if (!native && !pref('et_voice_web_male', '')) {
        setPref(VOICE_KEY, '');
        setPref('et_voice_web_male', '1');
      }
      if (!migrated) {
        if (native) {
          setPref(NVOICE_KEY, DEFAULT_US_VOICE);
          setPref(VOICE_KEY, '');
          setPref('et_voice_forced_v3', '1');
          cb({ id: DEFAULT_US_VOICE, native: true });
          return;
        }
        /* Do not persist an Android-only identifier during browser preview. */
        setPref(NVOICE_KEY, '');
        setPref('et_voice_forced_v3', '1');
      }

      var currentNative = pref(NVOICE_KEY, '');
      var currentWeb = pref(VOICE_KEY, '');
      if (native && currentNative) { cb({ id: currentNative, native: true }); return; }
      if (!native && currentWeb) { cb({ id: currentWeb, native: false }); return; }
      if (native) {
        setPref(NVOICE_KEY, DEFAULT_US_VOICE);
        setPref(VOICE_KEY, '');
        cb({ id: DEFAULT_US_VOICE, native: true });
        return;
      }

      /* Website: nothing is saved, so the automatic choice (the best male
         American voice of this browser) is made again on every visit.     */
      waitForVoices(function () {
        var b = bestWebVoice();
        cb(b ? { id: b.voiceURI || b.name, name: b.name, native: false } : false);
      }, 12);
    },

    /* Ouvre l'ecran Android de gestion de la synthese vocale. */
    openVoiceSettings: function () {
      nativeVoiceCache = null;
      return Speech.openInstall();
    },
    setRate: function (r) { setPref(RATE_KEY, String(r)); },
    getRate: function () { return parseFloat(pref(RATE_KEY, '0.92')) || 0.92; },
    setPitch: function (p) { setPref(PITCH_KEY, String(p)); },
    getPitch: function () { return parseFloat(pref(PITCH_KEY, '1')) || 1; },

    /* speak(texte)               -> lecture simple
       speak(tableau,{keepUnits}) -> un fragment par entree, l'evenement
                                     'chunk' renvoie l'index (surlignage) */
    speak: function (text, opts) {
      opts = opts || {};
      this.stop();

      var parts;
      if (Object.prototype.toString.call(text) === '[object Array]') {
        parts = [];
        text.forEach(function (t) {
          if (opts.keepUnits) { var n = normalize(t); if (n) parts.push(n); }
          else parts = parts.concat(chunk(t, opts.max));
        });
      } else {
        parts = chunk(text, opts.max);
      }
      if (!parts.length) return;

      unlock();
      speaking = true; paused = false;
      currentMeta = opts.meta || null;
      emit('start', { parts: parts.length, meta: currentMeta });

      if (detectNative() && opts.preferNative !== false) {
        speakNative(parts, function () { finish(); });
        return;
      }
      if (!synth) { emit('error', 'no-engine'); finish(); return; }

      queue = parts; idx = 0;
      startResumeWatchdog();
      if (!voicesReady) waitForVoices(function () { speakChunk(); }, 20);
      else speakChunk();
    },

    pause: function () {
      if (!speaking || paused) return;
      paused = true;
      playGen++;                       // toute suite de lecture en vol est perimee
      clearGuard();
      if (synth) { try { synth.pause(); } catch (e) { } }
      if (nativeTTS) { try { if (nativeTTS.stop) nativeTTS.stop(); } catch (e) { } }
      emit('pause', {});
    },

    resume: function () {
      if (!speaking || !paused) return;
      paused = false;
      if (nativeTTS && curSegs) {
        /* Le moteur natif ne reprend pas : on relit la phrase interrompue. */
        var segs = curSegs, si = curSi, next = curNext;
        curSegs = null;
        emit('resume', {});
        if (nativeResume) nativeResume(segs, si, next);
        return;
      }
      if (synth && synth.paused) { try { synth.resume(); } catch (e) { } }
      else if (!nativeTTS) speakChunk();
      emit('resume', {});
    },

    isPaused: function () { return paused; },

    stop: function () {
      speaking = false; paused = false;
      queue = []; idx = 0; currentMeta = null;
      clearGuard(); stopResumeWatchdog();
      if (nativeTTS) {
        try {
          if (typeof nativeTTS.stop === 'function') nativeTTS.stop();
          else nativeTTS.speak({ text: '', cancel: true });
        } catch (e) { }
      }
      if (synth) { try { synth.cancel(); } catch (e) { } }
      emit('end', {});
    },

    isSpeaking: function () { return speaking; },

    diagnose: function () {
      return {
        webSpeech: !!synth,
        nativePlugin: !!detectNative(),
        engine: Speech.engineName(),
        voicesLoaded: voices.length,
        usEnglishVoices: englishVoices().map(function (v) { return v.name + ' (' + v.lang + ')'; }),
        preferredVoice: DEFAULT_US_VOICE,
        unlocked: unlocked,
        chunkSize: defaultMax(),
        lastError: lastError
      };
    }
  };

  global.Speech = Speech;
})(window);
