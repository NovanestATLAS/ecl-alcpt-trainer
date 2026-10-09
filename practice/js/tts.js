/* =========================================================================
   tts.js  —  Moteur audio  (ECL English Trainer v5.9.26)
   -------------------------------------------------------------------------
   UN SEUL FICHIER pour l'application Android ET le site web (v5.9.26) :
   le site charge web-shims.js avant ce fichier (window.ECL_WEB), ce qui
   suffit a distinguer les deux editions.

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

   v5.9.26 — VOIX DES QUESTIONS D'ECOUTE
     speak(lignes, { roles: ['M','W',...], gap: 450, rateMul: 0.8 })
     . M = l'homme, W = la femme. Application : en-us-x-iol-network (homme)
       et en-us-x-tpc-network (femme) par defaut, changeables dans Settings.
       Voix absente : variante -local, puis une autre voix du meme sexe.
     . Site : la voix d'homme et la voix de femme les plus naturelles du
       navigateur (Edge : Andrew, Aria ; Chrome : Google US English ;
       Apple : Aaron, Samantha...). Une seule voix : hauteur differente.
     . gap : silence entre deux repliques ; rateMul : lecture ralentie.
     . Site, voix de lecture par defaut : la plus NATURELLE (et non plus
       la premiere voix d'homme : Microsoft David sous Chrome Windows).
   ========================================================================= */
(function (global) {
  'use strict';

  var WEB = !!global.ECL_WEB;                 // edition site web
  var VOICE_KEY = 'et_voice', RATE_KEY = 'et_rate', PITCH_KEY = 'et_pitch';
  var DEFAULT_US_VOICE = 'en-us-x-iol-network';
  var NVOICE_KEY = 'et_nvoice';   // voix du moteur Android natif

  /* voix des questions d'ecoute : M = homme, W = femme */
  var LV_NATIVE = { M: 'et_lv_m', W: 'et_lv_w' };     // identifiants Android
  var LV_WEB = { M: 'et_lvw_m', W: 'et_lvw_w' };      // voix du navigateur
  var LV_DEF = { M: 'en-us-x-iol-network', W: 'en-us-x-tpc-network' };
  var LV_CHAIN = {
    M: ['en-us-x-iol-network', 'en-us-x-iol-local', 'en-us-x-iom-network', 'en-us-x-iom-local',
        'en-us-x-tpd-network', 'en-us-x-tpd-local', 'en-us-x-sfg#male_1-local', 'en-us-x-sfg#male_2-local'],
    W: ['en-us-x-tpc-network', 'en-us-x-tpc-local', 'en-us-x-sfg-network', 'en-us-x-sfg-local',
        'en-us-x-tpf-network', 'en-us-x-tpf-local', 'en-us-x-iob-network', 'en-us-x-iob-local',
        'en-us-x-iog-network', 'en-us-x-iog-local', 'en-us-x-sfg#female_1-local', 'en-us-x-sfg#female_2-local']
  };

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
  var curSegs = null, curSi = 0, curNext = null, curRole = '', playGen = 0;
  var nativeResume = null;   // relance la boucle native au segment courant
  var keepAlive = [];
  var guardTimer = null;
  var resumeTimer = null;
  var listeners = {};
  var nativeTTS = null;
  var lastError = null;
  var currentMeta = null;
  /* lecture en cours : voix de chaque fragment, silence avant chaque
     fragment, facteur de vitesse */
  var curRoles = null, curGaps = null, curRateMul = 1;
  /* numero de la lecture web en cours : un minuteur programme pendant une
     lecture precedente (silence entre deux repliques, blanc a trous) ne
     peut plus relancer quoi que ce soit dans la suivante */
  var webGen = 0;

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
  function isUS(v) { return /en[-_]US/i.test(v.lang || '') || /^en-us/i.test(v.voiceURI || v.name || ''); }
  function englishVoices() { return voices.filter(isUS); }
  function anyEnglish() { return voices.filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ''); }); }

  /* ---------------------- qualite des voix du navigateur ------------------
     Note de 0 a 100 par sexe. Les voix « naturelles » de Microsoft Edge
     (Andrew, Guy, Aria, Jenny...) sont les plus proches des voix Google de
     l'application ; viennent ensuite les voix Google du telephone, les voix
     Apple ameliorees, « Google US English » (Chrome), les voix Apple
     ordinaires, et en dernier les voix Windows (David, Mark, Zira).       */
  var NOVELTY = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Kathy|Princess|Deranged|Hysterical|Grandpa|Grandma|Rocko|Shelley|Sandy|Flo|Eddy|Reed)\b/i;
  function vname(v) { return String(v.name || '') + ' ' + String(v.voiceURI || ''); }
  function natural(n) { return /natural|neural|online|premium|enhanced/i.test(n); }
  function maleRank(v) {
    var n = vname(v);
    if (NOVELTY.test(n)) return 0;
    var nat = natural(n), r = 0;
    if (/\bAndrew\b/i.test(n)) r = 100;
    else if (/\bGuy\b/i.test(n)) r = 99;
    else if (/\bChristopher\b/i.test(n)) r = 98;
    else if (/\bBrian(Multilingual)?\b/i.test(n)) r = 97;
    else if (/AndrewMultilingual/i.test(n)) r = 97;
    else if (/\bEric\b/i.test(n)) r = 96;
    else if (/\b(Roger|Steffan|Davis|Tony|Jason|Brandon|Kai|Ryan)\b/i.test(n)) r = 95;
    if (r) return nat ? r : r - 30;
    if (/en-us-x-(iol|iom|tpd)/i.test(n) || /#male/i.test(n)) return 92;      // voix Google (Android)
    if (/\b(Evan|Nathan|Tom|Aaron|Alex)\b/i.test(n) && /premium|enhanced/i.test(n)) return 90;
    if (/\bAlex\b/i.test(n)) return 85;
    if (/\bAaron\b/i.test(n)) return 84;
    if (/\b(Evan|Nathan)\b/i.test(n)) return 83;
    if (/\bTom\b/i.test(n)) return 82;
    if (/Microsoft (Mark|David)/i.test(n)) return 55;                        // voix Windows
    if (/\bFred\b/i.test(n)) return 10;
    if (/\bmale\b/i.test(n) && !/female/i.test(n)) return 40;
    return 0;
  }
  function femaleRank(v) {
    var n = vname(v);
    if (NOVELTY.test(n)) return 0;
    var nat = natural(n), r = 0;
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
    if (/\bfemale\b/i.test(n)) return 40;
    return 0;
  }
  /* voix de lecture : la plus naturelle ; a egalite, une voix d'homme */
  function quality(v) {
    var q = Math.max(maleRank(v), femaleRank(v) - 1);
    if (q > 0) return q;
    return v.localService ? 20 : 15;
  }
  function bestOf(list, f) {
    var best = null, bs = 0;
    (list || []).forEach(function (v) { var s = f(v); if (s > bs) { bs = s; best = v; } });
    return best;
  }
  function bestWebVoice(list) {
    list = list || englishVoices();
    return bestOf(list, quality) || list[0] || null;
  }

  function pickVoice() {
    var wanted = pref(VOICE_KEY, ''), all = englishVoices(), i;
    /* the voice chosen in Settings, whatever its accent or language */
    if (wanted) {
      for (i = 0; i < voices.length; i++) {
        if (voices[i].voiceURI === wanted || voices[i].name === wanted) return voices[i];
      }
    }
    if (!WEB) {
      for (i = 0; i < all.length; i++) {
        var wid = String(all[i].voiceURI || all[i].name || '').toLowerCase();
        if (wid.indexOf(DEFAULT_US_VOICE) >= 0) return all[i];
      }
    }
    return bestWebVoice(all);
  }
  /* voix d'un personnage (M, W) dans le navigateur */
  function bestRoleWeb(role) {
    var f = role === 'W' ? femaleRank : maleRank;
    return bestOf(englishVoices(), f) || bestOf(anyEnglish(), f);
  }
  function roleVoiceWeb(role) {
    var want = pref(LV_WEB[role], ''), i;
    if (want) {
      for (i = 0; i < voices.length; i++) if (voices[i].voiceURI === want || voices[i].name === want) return voices[i];
    }
    return bestRoleWeb(role) || pickVoice();
  }
  function rolePitchWeb(role) {
    var m = roleVoiceWeb('M'), w = roleVoiceWeb('W');
    if (m && w && m !== w) return 1;
    return role === 'W' ? 1.25 : 0.9;           // une seule voix : la femme plus aigue
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
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, ', ')
      .replace(/[…]+|\.{3,}/g, ' ' + BLANK + ' ')   // ……… -> silence
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

  function baseRate() { return parseFloat(pref(RATE_KEY, '0.92')) || 0.92; }

  /* --------------------------------------------------------- lecture web */
  /* Chaque entree de `queue` est un fragment surlignable (une phrase, un
     paragraphe, un choix). On le decoupe en segments say/pause : les say sont
     prononces, les pause sont de vrais silences (setTimeout), jamais confies
     au moteur.                                                              */
  function speakChunk(g0) {
    if (g0 !== undefined && g0 !== webGen) return;     // minuteur d'une lecture terminee
    if (!speaking || paused) return;
    if (idx >= queue.length) { finish(); return; }

    emit('chunk', { index: idx, total: queue.length, text: queue[idx], meta: currentMeta });
    var segs = toSegments(normalize(queue[idx]));
    var role = curRoles ? (curRoles[idx] || '') : '';
    var gen = webGen;
    playSegmentsWeb(segs, 0, function () {
      if (gen !== webGen) return;
      idx++;
      setTimeout(function () { speakChunk(gen); }, 40 + ((curGaps && curGaps[idx]) || 0));
    }, role, gen);
  }

  function playSegmentsWeb(segs, si, done, role, gen) {
    if (gen !== webGen || !speaking) return;
    if (paused) { setTimeout(function () { playSegmentsWeb(segs, si, done, role, gen); }, 200); return; }
    if (si >= segs.length) { done(); return; }

    var seg = segs[si];
    if (seg.pause) {                       // vrai silence, rien n'est prononce
      guardTimer = setTimeout(function () { playSegmentsWeb(segs, si + 1, done, role, gen); }, seg.pause);
      return;
    }

    var u = new SpeechSynthesisUtterance(seg.say);
    var v = role ? roleVoiceWeb(role) : pickVoice();
    if (v) { u.voice = v; u.lang = v.lang || 'en-US'; } else { u.lang = 'en-US'; }
    u.rate = Math.max(0.4, Math.min(2, baseRate() * (curRateMul || 1)));
    u.pitch = role ? rolePitchWeb(role) : (parseFloat(pref(PITCH_KEY, '1')) || 1);
    u.volume = 1;

    keepAlive.push(u);
    if (keepAlive.length > 30) keepAlive.shift();

    var advanced = false, myGuard = null;
    function next() {
      if (advanced) return;
      advanced = true;
      if (myGuard) { clearTimeout(myGuard); if (guardTimer === myGuard) guardTimer = null; }
      playSegmentsWeb(segs, si + 1, done, role, gen);
    }
    u.onend = next;
    u.onerror = function (e) {
      lastError = (e && e.error) || 'unknown';
      /* phrase coupee par une nouvelle lecture : on s'arrete, sans toucher
         au minuteur de securite de la nouvelle lecture */
      if (lastError === 'interrupted' || lastError === 'canceled') { advanced = true; if (myGuard) clearTimeout(myGuard); return; }
      next();
    };
    try { synth.cancel(); synth.speak(u); }
    catch (e) { next(); return; }

    var est = Math.max(2500, seg.say.length * 62 / (u.rate || 1) + 1800);
    clearGuard();
    myGuard = guardTimer = setTimeout(function () {
      if (!advanced && gen === webGen) { try { synth.cancel(); } catch (e) { } next(); }
    }, est);
  }

  function finish() {
    speaking = false; paused = false;
    queue = []; idx = 0; currentMeta = null;
    curRoles = null; curGaps = null; curRateMul = 1;
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

  function normaliseNative(list, every) {
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
      if (!every && !isEnglish(lang, id)) continue;
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

  /* Every voice of the engine, all languages (Settings > Audio). */
  var nativeAllCache = null;
  var badVoice = {};          // voix qui ont echoue pendant cette session
  var badToast = false;
  function fetchNativeAll(cb) {
    if (nativeAllCache) { cb(nativeAllCache); return; }
    if (!detectNative() || typeof nativeTTS.getVoices !== 'function') { cb([]); return; }
    var res;
    try { res = nativeTTS.getVoices(); } catch (e) { cb([]); return; }
    if (res && typeof res.then === 'function') {
      res.then(function (l) { nativeAllCache = normaliseNative(l, true); cb(nativeAllCache); },
               function () { cb([]); });
    } else {
      nativeAllCache = normaliseNative(res, true);
      cb(nativeAllCache);
    }
  }
  function webAllList() {
    collectVoices();
    return voices.map(function (v) {
      return { id: v.voiceURI || v.name, name: v.name, lang: v.lang || '',
               google: isGoogle(v.name, v.voiceURI), native: false };
    });
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
  /* la voix est-elle connue du telephone ? (liste inconnue : on essaie) */
  function nativeKnown(id) {
    if (!nativeAllCache || !nativeAllCache.length) return true;
    for (var i = 0; i < nativeAllCache.length; i++) if (nativeAllCache[i].id === id) return true;
    return false;
  }
  /* voix Android d'un personnage : le choix des reglages (ou iol / tpc),
     sa variante hors ligne, puis une autre voix Google du meme sexe. Toutes
     en echec : '' (aucun nom envoye, le plugin prend la voix anglaise
     americaine du telephone). */
  function roleNative(role) {
    var first = pref(LV_NATIVE[role], '') || LV_DEF[role];
    var chain = [first, first.replace(/-network$/, '-local')].concat(LV_CHAIN[role] || []);
    for (var i = 0; i < chain.length; i++) {
      if (!badVoice[chain[i]] && nativeKnown(chain[i])) return chain[i];
    }
    return '';
  }
  /* voix de lecture : celle des reglages, sa variante hors ligne, puis la
     voix par defaut et sa variante hors ligne */
  function readNative() {
    var first = pref(NVOICE_KEY, '') || DEFAULT_US_VOICE;
    var chain = [first, first.replace(/-network$/, '-local'), DEFAULT_US_VOICE, DEFAULT_US_VOICE.replace(/-network$/, '-local')];
    for (var i = 0; i < chain.length; i++) if (!badVoice[chain[i]]) return chain[i];
    return '';
  }
  function rolePitchNative(role) {
    return roleNative('M') === roleNative('W') ? (role === 'W' ? 1.2 : 0.9) : 1;
  }

  function speakNative(parts, done) {
    var i = 0, first = true;

    function step() {
      if (!speaking) { done(); return; }
      if (paused) { setTimeout(step, 250); return; }
      if (i >= parts.length) { done(); return; }

      emit('chunk', { index: i, total: parts.length, text: parts[i], meta: currentMeta });
      var segs = toSegments(normalize(parts[i]));
      var role = curRoles ? (curRoles[i] || '') : '';
      var gap = (curGaps && curGaps[i]) || 0;
      var gen0 = playGen;
      i++;
      if (gap) setTimeout(function () { if (gen0 === playGen) playSegmentsNative(segs, 0, step, role); }, gap);
      else playSegmentsNative(segs, 0, step, role);
    }

    nativeResume = playSegmentsNative;
    function playSegmentsNative(segs, si, next, role) {
      if (!speaking) { done(); return; }
      curSegs = segs; curSi = si; curNext = next; curRole = role || '';   // point de reprise
      if (paused) return;                              // resume() relancera
      if (si >= segs.length) { next(); return; }
      var gen = playGen;

      var seg = segs[si];
      if (seg.pause) {                    // VRAI silence : rien n'est envoye au moteur
        setTimeout(function () { if (gen === playGen) playSegmentsNative(segs, si + 1, next, role); }, seg.pause);
        return;
      }

      var chosen = role ? roleNative(role) : readNative();   // voix absente : la suivante
      var rate = baseRate() * (curRateMul || 1);
      var opt = { text: seg.say, locale: 'en-US', rate: rate, cancel: first, pitch: role ? rolePitchNative(role) : 1 };
      if (chosen) opt.identifier = chosen;
      first = false;

      var advanced = false;
      function cont() {
        if (advanced || gen !== playGen) return;       // lecture annulee entre-temps
        advanced = true;
        playSegmentsNative(segs, si + 1, next, role);
      }

      /* Echec avec une voix choisie dans les reglages (souvent une voix
         listee par Android mais pas encore telechargee, ou une voix
         « network » sans connexion) : on relit le meme morceau avec la voix
         suivante, et on le signale une fois.                            */
      function fail() {
        if (advanced || gen !== playGen) return;
        if (opt.identifier && !badVoice[opt.identifier]) {
          badVoice[opt.identifier] = true;
          advanced = true;
          if (!badToast && typeof global.toast === 'function') {
            badToast = true;
            global.toast('A voice is not installed yet: another voice is used');
          }
          playSegmentsNative(segs, si, next, role);
          return;
        }
        cont();
      }

      var p;
      try { p = nativeTTS.speak(opt); } catch (e) { p = null; }
      if (p && typeof p.then === 'function') p.then(cont, fail);
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
        /* liste des voix du telephone : sert a choisir les voix d'ecoute */
        setTimeout(function () { try { fetchNativeAll(function () { }); } catch (e) { } }, 1500);
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

    /* Tout le catalogue, toutes langues : Settings > Audio. */
    listAllVoices: function (cb) {
      fetchNativeAll(function (nat) {
        if (nat && nat.length) { cb(nat); return; }
        waitForVoices(function () { cb(webAllList()); }, 12);
      });
    },

    /* Identifiant de la voix actuellement retenue, natif ou web. */
    getVoiceId: function () {
      return pref(NVOICE_KEY, '') || pref(VOICE_KEY, '') || Speech.defaultVoiceId();
    },

    /* Enregistre la voix choisie. `native` indique la source.
       Une chaine vide remet la selection automatique.                     */
    setVoiceId: function (id, native) {
      badVoice = {};                     // un nouveau choix merite un nouvel essai
      if (!id) { setPref(NVOICE_KEY, ''); setPref(VOICE_KEY, ''); return; }
      if (native) { setPref(NVOICE_KEY, id); setPref(VOICE_KEY, ''); }
      else { setPref(VOICE_KEY, id); setPref(NVOICE_KEY, ''); }
    },

    defaultVoiceId: function () {
      if (detectNative() || !WEB) return DEFAULT_US_VOICE;
      collectVoices();
      var b = bestWebVoice();
      return b ? (b.voiceURI || b.name) : DEFAULT_US_VOICE;
    },
    useDefaultVoice: function () {
      if (detectNative()) { setPref(NVOICE_KEY, DEFAULT_US_VOICE); setPref(VOICE_KEY, ''); }
      else { setPref(NVOICE_KEY, ''); setPref(VOICE_KEY, ''); }
    },

    /* ---- voix des questions d'ecoute (v5.9.26) ----
       getRoleVoice(role)  -> choix enregistre ('' = automatique)
       roleDefault(role)   -> la voix automatique (identifiant ou nom)
       roleVoiceId(role)   -> la voix qui sera vraiment utilisee           */
    getRoleVoice: function (role) {
      return pref((detectNative() ? LV_NATIVE : LV_WEB)[role === 'W' ? 'W' : 'M'], '');
    },
    setRoleVoice: function (role, id) {
      role = role === 'W' ? 'W' : 'M';
      badVoice = {}; badToast = false;
      setPref((detectNative() ? LV_NATIVE : LV_WEB)[role], id || '');
    },
    roleDefault: function (role) {
      role = role === 'W' ? 'W' : 'M';
      if (detectNative()) return LV_DEF[role];
      collectVoices();
      var v = bestRoleWeb(role);
      return v ? (v.voiceURI || v.name) : '';
    },
    roleVoiceId: function (role) {
      role = role === 'W' ? 'W' : 'M';
      if (detectNative()) return roleNative(role);
      collectVoices();
      var v = roleVoiceWeb(role);
      return v ? (v.voiceURI || v.name) : '';
    },
    /* une seule voix pour les deux personnages : la hauteur les distingue */
    rolesShareVoice: function () {
      if (detectNative()) return roleNative('M') === roleNative('W');
      collectVoices();
      return rolePitchWeb('M') !== 1;
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
      /* Website: builds before 5.9.26 saved a voice automatically ("Google
         US English", then a male voice): forget it once, so the most
         natural voice of the browser applies.                            */
      if (WEB && !native && !pref('et_voice_web_q', '')) {
        setPref(VOICE_KEY, '');
        setPref('et_voice_web_q', '1');
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
      /* Website and browser preview: nothing is saved, so the automatic
         choice (the most natural voice of this browser) is made again on
         every visit. */
      waitForVoices(function () {
        var b = bestWebVoice();
        cb(b ? { id: b.voiceURI || b.name, name: b.name, native: false } : false);
      }, 12);
    },

    /* Ouvre l'ecran Android de gestion de la synthese vocale. */
    openVoiceSettings: function () {
      nativeVoiceCache = null; nativeAllCache = null;
      return Speech.openInstall();
    },
    setRate: function (r) { setPref(RATE_KEY, String(r)); },
    getRate: function () { return baseRate(); },
    setPitch: function (p) { setPref(PITCH_KEY, String(p)); },
    getPitch: function () { return parseFloat(pref(PITCH_KEY, '1')) || 1; },

    /* speak(texte)               -> lecture simple
       speak(tableau,{keepUnits}) -> un fragment par entree, l'evenement
                                     'chunk' renvoie l'index (surlignage)
       speak(tableau,{roles,gap,rateMul}) -> repliques d'une question
                                     d'ecoute, chacune avec sa voix      */
    speak: function (text, opts) {
      opts = opts || {};
      this.stop();

      var parts, roles = null, gaps = null;
      if (Object.prototype.toString.call(text) === '[object Array]') {
        parts = [];
        if (opts.roles) {
          roles = []; gaps = [];
          text.forEach(function (t, k) {
            /* une longue replique (annonce) est decoupee en phrases, chacune
               gardant la voix de la replique */
            chunk(t, opts.max).forEach(function (b, j) {
              gaps.push(parts.length && j === 0 ? (opts.gap || 0) : 0);
              parts.push(b);
              roles.push(opts.roles[k] === 'W' ? 'W' : 'M');
            });
          });
        } else {
          text.forEach(function (t) {
            if (opts.keepUnits) { var n = normalize(t); if (n) parts.push(n); }
            else parts = parts.concat(chunk(t, opts.max));
          });
        }
      } else {
        parts = chunk(text, opts.max);
      }
      if (!parts.length) return;

      unlock();
      speaking = true; paused = false;
      currentMeta = opts.meta || null;
      curRoles = roles; curGaps = gaps;
      curRateMul = (opts.rateMul > 0) ? opts.rateMul : 1;
      emit('start', { parts: parts.length, meta: currentMeta });

      if (detectNative() && opts.preferNative !== false) {
        speakNative(parts, function () { finish(); });
        return;
      }
      if (!synth) { emit('error', 'no-engine'); finish(); return; }

      queue = parts; idx = 0;
      var g0 = ++webGen;
      startResumeWatchdog();
      if (!voicesReady) waitForVoices(function () { speakChunk(g0); }, 20);
      else speakChunk(g0);
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
        var segs = curSegs, si = curSi, next = curNext, role = curRole;
        curSegs = null;
        emit('resume', {});
        if (nativeResume) nativeResume(segs, si, next, role);
        return;
      }
      if (synth && synth.paused) { try { synth.resume(); } catch (e) { } }
      else if (!nativeTTS) speakChunk(webGen);
      emit('resume', {});
    },

    isPaused: function () { return paused; },

    stop: function () {
      speaking = false; paused = false;
      queue = []; idx = 0; currentMeta = null;
      curRoles = null; curGaps = null; curRateMul = 1;
      playGen++; webGen++;             // un silence programme ne relance plus rien
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

    /* duree probable d'une lecture (ms) : sert de filet si le moteur ne
       signale jamais la fin. Le plugin Android lit a 0,7 x la vitesse
       demandee (Android 8.1 et plus). */
    estimateMs: function (chars, rateMul) {
      var r = baseRate() * (rateMul || 1) * (detectNative() ? 0.7 : 1);
      return Math.round(chars / (12 * Math.max(0.3, r)) * 1000);
    },

    diagnose: function () {
      return {
        webSpeech: !!synth,
        nativePlugin: !!detectNative(),
        engine: Speech.engineName(),
        voicesLoaded: voices.length,
        usEnglishVoices: englishVoices().map(function (v) { return v.name + ' (' + v.lang + ')'; }),
        preferredVoice: DEFAULT_US_VOICE,
        listeningVoices: Speech.roleVoiceId('M') + ' / ' + Speech.roleVoiceId('W'),
        unlocked: unlocked,
        chunkSize: defaultMax(),
        lastError: lastError
      };
    }
  };

  global.Speech = Speech;
})(window);
