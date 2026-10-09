/* ===========================================================================
   ECL ENGLISH TRAINER  —  v4.1
   Preparation a l'epreuve d'anglais ECL
   ---------------------------------------------------------------------------
   Nouveautes v4
     . Barre de navigation permanente (5 destinations)
     . Smart review : les fautes reviennent, espacees dans le temps
     . Favourites, recherche globale, objectif quotidien, serie de jours
     . Statistiques par domaine et sur sept jours
     . Themes, confort de lecture, export / import des donnees
   =========================================================================== */

var APP_VERSION = '5.9.24';

/* Nouvelle apparence (v5.9.23) : css/design.css se pose par-dessus
   css/style.css (couleurs, polices, formes ; aucune fonction touchee).
   Charge d'ici pour ne pas avoir a modifier index.html. Supprimer
   www/css/design.css suffit a retrouver l'ancien aspect.               */
(function () {
  try {
    if (document.querySelector('link[href$="css/design.css"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'css/design.css';
    document.head.appendChild(l);
  } catch (e) { }
})();

/* --------------------------- journal technique ---------------------------
   Toute erreur est consignee ici et consultable dans Settings > Rapport
   technique. Elle n'interrompt jamais l'application : un ecran qui echoue
   affiche une porte de sortie au lieu d'une page blanche.               */
var DIAG = [];
function logError(e, where) {
  var entry = {
    t: new Date().toISOString().slice(11, 19),
    w: where || '',
    m: (e && e.message) ? e.message : String(e),
    s: (e && e.stack) ? String(e.stack).slice(0, 300) : ''
  };
  DIAG.push(entry);
  if (DIAG.length > 25) DIAG.shift();
  try { localStorage.setItem('ecl_diag', JSON.stringify(DIAG)); } catch (x) { }
  return entry;
}
function showErrorBox(txt) {
  var b = document.getElementById('errorBox');
  if (!b) return;
  b.style.display = 'block';
  b.innerHTML = '<button class="err-x" onclick="this.parentNode.style.display=\'none\'">&times;</button>' +
    String(txt).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
(function () {
  window.onerror = function (m, u, l, c, e) {
    var d = logError(e || new Error(m), 'ligne ' + l);
    showErrorBox('Error: ' + d.m + ' (ligne ' + l + ')');
    return true;
  };
  window.addEventListener('unhandledrejection', function (ev) {
    logError(ev && ev.reason, 'promesse');
  });
})();
/* Rend un ecran sans jamais laisser l'application sur une page blanche. */
function safeRender(fn, arg, name) {
  try { fn(arg); }
  catch (e) {
    logError(e, name || 'ecran');
    root.innerHTML = L('<div class="gcard"><h3>Cet ecran n\'a pas pu s\'afficher</h3>' +
      '<p>An error occurred.</p>' +
      '<p class="fr">' + esc((e && e.message) || String(e)) + '</p>' +
      '<button class="btn block" onclick="goTab(\'home\')">Back to home</button></div>');
  }
}

/* ================================ OUTILS ================================ */
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function pct(n, d) { return d ? Math.round(100 * n / d) : 0; }
function LSget(k, d) { try { var v = localStorage.getItem('ecl_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function LSset(k, v) { try { localStorage.setItem('ecl_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
function LSdel(k) { try { localStorage.removeItem('ecl_' + k); } catch (e) { } }
function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function dayKey(off) { var d = new Date(); d.setDate(d.getDate() - (off || 0)); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function nowMs() { return Date.now(); }

/* ======================== NUMERO DE LANCEMENT ===========================
   Compte les demarrages reels de l'application : ouverture apres une
   fermeture complete (balayee des applications recentes) ou apres un arret
   par Android. Revenir dans l'application restee ouverte en arriere-plan ne
   recharge pas la page et ne compte donc pas.
   Utilise par ads.js (rythme des annonces) et par la demande d'avis.
   Un utilisateur qui avait deja l'application avant la v5.9.20 (reglages
   ou progression enregistres) l'a forcement ouverte plusieurs fois : il
   repart directement du 3e lancement.                                    */
var ECL_LAUNCH = (function () {
  var n = parseInt(LSget('launches', 0), 10) || 0;
  if (!n && (LSget('seen', null) !== null || LSget('goal', null) !== null ||
             LSget('hist', null) !== null || LSget('box', null) !== null)) n = 2;
  n += 1;
  LSset('launches', n);
  return n;
})();
window.ECL_LAUNCH = ECL_LAUNCH;

function toast(m) {
  var t = document.getElementById('toast'); if (!t) return;
  t.textContent = m; t.className = 'toast show';
  clearTimeout(t._t); t._t = setTimeout(function () { t.className = 'toast'; }, 2600);
}
function buzz(ms) {
  if (!LSget('haptic', 1)) return;
  try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) { }
}
function copyText(s) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s); toast('Copied to clipboard'); return;
    }
  } catch (e) { }
  var ta = document.createElement('textarea');
  ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('Copied to clipboard'); }
  catch (e) { toast('Copy is not available on this device'); }
  document.body.removeChild(ta);
}

/* ================================ REGIE ================================= */
/* Passerelle vers js/ads.js. Si le module ou le plugin natif sont absents,
   ces appels ne font rien.                                                */
function adScreen(kind) {
  if (window.Ads) { try { Ads.screen(kind); } catch (e) { } }
}
function adAfterSeries() {
  if (!window.Ads) return;
  try { stopSpeak(); Ads.maybeInterstitial(); } catch (e) { }
}
/* Appele a chaque reponse d'un parcours d'entrainement. Sans cela, un
   « Full set » de plusieurs centaines de questions ne compte que pour une
   seule serie et ne declenche donc presque jamais d'annonce.
   JAMAIS en epreuve chronometree : la concentration y prime.            */
/* Compte les reponses pour le rythme des publicites. Le comptage est
   separe de l'affichage : en epreuve chronometree, toucher une reponse ne
   fait que la selectionner (on peut en changer), les questions sont donc
   comptees en bloc a la fin du test. */
function adCountAnswer(n) {
  if (!window.Ads) return;
  try { Ads.questionAnswered(n || 1); } catch (e) { }
}
function adDuringRun() {
  if (!window.Ads || S.sim) return;
  try { Ads.maybeInterstitialMidRun(); } catch (e) { }
}
/* --- Annonce plein ecran : silence complet (v5.9.20) ---------------------
   Sur un parcours long, l'annonce etait demandee au passage a la question
   suivante ; celle-ci s'affichait aussitot et la lecture automatique la
   lisait 0,12 s plus tard, pendant que l'annonce s'ouvrait : l'enonce et
   les choix passaient par-dessus la publicite.
   ads.js previent desormais AVANT d'ouvrir l'annonce (adOpening) et a sa
   fermeture (adClosed). Entre les deux :
     . toute lecture en cours est arretee, la suite automatique annulee ;
     . Speech.speak() ne fait plus rien, quelle que soit la fonction qui
       l'appelle (lecture automatique, bouton Listen, reponse...).
   A la fermeture : en lecture automatique, la question affichee est relue
   depuis le debut ; en mode manuel, silence.                             */
var AD_OPEN = false;
function adOpening() { AD_OPEN = true; stopSpeak(); }
function adClosed() {
  if (!AD_OPEN) return;
  AD_OPEN = false;
  autoResumeSoon();
}
(function gateSpeech() {
  if (!window.Speech || typeof Speech.speak !== 'function' || Speech.adGate) return;
  var raw = Speech.speak;
  Speech.speak = function () {
    if (AD_OPEN) return;
    return raw.apply(Speech, arguments);
  };
  Speech.adGate = true;
})();
if (window.Ads && typeof Ads.onFullscreen === 'function') {
  try { Ads.onFullscreen(adOpening, adClosed); } catch (e) { }
}

/* ================================ AUDIO ================================= */
function audioOK() { return !!(window.Speech && Speech.usable()); }
function spk(text) {
  if (!text) return;
  if (!audioOK()) { toast('Audio unavailable: see Settings'); return; }
  if (Speech.isSpeaking()) { Speech.stop(); return; }
  Speech.speak(text);
}
/* --- Langue de l'interface ----------------------------------------------
   L() traduit le HTML juste avant affichage. L'anglais est la langue par
   defaut ; le drapeau en haut a droite bascule vers le francais accentue. */
function L(html) { return (window.I18N ? I18N.t(html) : html); }


/* --- Mise en relief -----------------------------------------------------
   Les words autrefois ecrits en CAPITALES sont stockes en minuscules entre
   asterisques (*mot*). Le moteur vocal epelait les capitales ; il lit
   desormais un mot normal. A l ecran, l asterisque devient du gras.      */
function fmt(t) { return esc(t).replace(/\*([^*]+)\*/g, '<b class="hl">$1</b>'); }
function plainTxt(t) { return String(t == null ? '' : t).replace(/\*/g, ''); }

function spkNow(t) { if (audioOK() && t) { Speech.stop(); Speech.speak(t); } }
/* Toute interruption volontaire annule aussi l'enchainement automatique. */
function stopSpeak() { autoCancel(); if (window.Speech) Speech.stop(); }

/* --- Preparation du texte pour une lecture EN ANGLAIS uniquement ---------
   La synthese est en mode anglais : on ne lui donne jamais de francais, sous
   peine d'une prononciation absurde. Les explications des banques melangent
   souvent une regle anglaise et sa traduction francaise ; enUS() ne conserve
   que ce qui peut etre lu correctement.                                     */
var CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/* Retire une explication de sa partie francaise. Convention des donnees :
   la partie utile est en anglais ; toute traduction francaise suit en general
   apres un tiret, « = », des parentheses, ou est signalee par des words-outils
   francais. On garde la phrase seulement si elle reste majoritairement anglaise. */
function frenchRatio(t) {
  var fr = (t.match(/\b(le|la|les|un|une|des|du|de|dans|pour|avec|est|sont|ne|pas|que|qui|sur|au|aux|ce|cette|il|elle|nous|vous|leur|plus|tres|donc|car|mais|ou|et|a|sans|apres|avant|entre|chez|selon|ainsi|alors|meme|tout|toute|faux|ami|attention|verbe|nom|sujet|passe|present|futur|regle)\b/gi) || []).length;
  var words = (t.match(/[A-Za-zÀ-ÿ]+/g) || []).length || 1;
  return fr / words;
}
/* Mots exclusivement francais : aucun n'est un mot anglais courant, donc
   ce test ne peut pas faire taire une explication anglaise legitime. */
function frenchLeft(t) {
  var m = String(t).match(/\b(le|les|une|des|du|dans|pour|avec|sont|qui|aux|cette|nous|vous|leur|tres|donc|mais|sans|apres|avant|entre|chez|selon|ainsi|alors|etre|avoir|faire)\b/gi);
  return m ? m.length : 0;
}
/* Les banques de questions sont desormais entierement en anglais : on lit
   donc l'explication en ENTIER. L'ancienne version la coupait au premier
   « - », « = » ou « ( », ce qui n'en laissait presque rien a entendre
   (« *Break out* = to start suddenly » n'etait lu que « Break out »).
   Le test ci-dessous n'est plus qu'un filet de securite.                  */
function enExplanation(e) {
  if (!e) return '';
  e = plainTxt(e).trim();
  if (!e || frenchLeft(e) >= 2) return '';
  return speakable(e);
}
/* Mise en forme pour la VOIX seulement (l'ecran garde le texte d'origine).
   Les definitions de dictionnaire s'ecrivent « rapidly = quickly = fast » :
   le moteur vocal lisait « equals ». Chaque phrase est traitee a part :
   le premier « = » devient « means », les suivants une simple virgule,
   ce qui donne « rapidly means quickly, fast ». Les fleches et barres
   obliques subissent le meme traitement.                                   */
function speakable(t) {
  return String(t).split(/(?<=[.!?])\s+/).map(function (sent) {
    var k = 0;
    return sent.replace(/\s*=\s*/g, function () { return (k++ === 0) ? ' means ' : ', '; })
               .replace(/\s*(?:->|\u2192)\s*/g, ', so ')
               .replace(/\s+\/\s+/g, ' or ');
  }).join(' ').replace(/\s{2,}/g, ' ').trim();
}
/* Enonce d'une question : les blancs restent des blancs (silences),
   la synthese s'en charge. On ne touche pas au texte.                        */
function readQuestion(q) { return q; }

/* Lit l'enonce puis les choix, chacun annonce par sa lettre : « A. ... ».
   On force une courte pause apres la lettre pour qu'elle ne se fonde pas
   dans le mot suivant.                                                       */
function speakQuestionAndChoices(q, playIntro) {
  if (!audioOK()) { toast('Audio unavailable: see Settings'); return; }
  var parts = [];
  if (playIntro !== false) parts.push(plainTxt(q.q));
  q.o.forEach(function (opt, i) {
    // La lettre seule ("A") est prononcee "ah" par certains moteurs anglais.
    // Le point + l'espace forcent une intonation de lettre et une pause nette
    // avant l'option, sans jamais dire "Choice number".
    parts.push((CHOICE_LETTERS[i] || String(i + 1)) + '. ' + plainTxt(opt));
  });
  Speech.speak(parts, { keepUnits: true });
}
/* Apres validation en mode entrainement : lit la bonne reponse et,
   si elle est en anglais, l'explication.                                     */
function speakAnswer(q) {
  if (!audioOK()) return;
  var parts = ['The correct answer is: ' + plainTxt(q.c) + '.'];
  var ex = enExplanation(q.e);
  if (ex) parts.push(ex);
  Speech.speak(parts, { keepUnits: true });
}

/* ====================== LECTURE AUTOMATIQUE (AUTO) ======================
   Un bouton present sur chaque question active ou desactive la lecture
   automatique. Quand elle est ACTIVE :
     . l'enonce et les choix sont lus des l'affichage de la question,
       sans avoir a toucher « Listen » ;
     . des que l'utilisateur repond, la bonne reponse et son explication
       sont lues, puis l'application passe seule a la question suivante
       apres une seconde et demie ;
     . « Next » force le passage immediat et lance la lecture ;
     . « Previous » relit la question (et sa correction si elle a deja
       ete traitee), sans repartir en avant.
   Quand elle est INACTIVE, l'application garde son fonctionnement manuel.

   PIEGE DU MOTEUR VOCAL : Speech emet 'end' aussi bien a la fin normale
   d'une lecture qu'a chaque stop() -- et speak() COMMENCE par un stop().
   Un enchainement naif sur cet evenement se declencherait donc aussitot
   et ferait defiler toute la serie. Chaque lecture recoit donc un numero
   d'ordre : seul le 'end' portant le numero courant declenche la suite,
   et toute interruption incremente le numero, ce qui perime la suite
   restee en vol.                                                          */
var AUTO_GAP_MS = 1500;   // temps d'attente avant la question suivante
var AUTO_SEQ = 0;         // numero d'ordre de la lecture courante
var autoPending = null;   // { seq: n, fn: suite a executer }
var autoTimer = null;     // temporisation entre la correction et la suite
var autoWatch = null;     // filet si 'end' n'arrive jamais (moteur muet)
var APP_PAUSED = false;   // application en arriere-plan

function autoOn() { return !!LSget('autoaudio', 0); }

/* Annule la lecture automatique en cours ainsi que sa suite. */
function autoCancel() {
  AUTO_SEQ++;
  autoPending = null;
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  if (autoWatch) { clearTimeout(autoWatch); autoWatch = null; }
}

/* Execute la suite en attente, une seule fois. */
function autoFire() {
  var p = autoPending;
  autoPending = null;
  if (autoWatch) { clearTimeout(autoWatch); autoWatch = null; }
  if (p && typeof p.fn === 'function') { try { p.fn(); } catch (e) { logError(e, 'autoFire'); } }
}

/* Lit `parts` puis execute `cb`. Le pending est pose APRES speak() : le
   'end' emis par le stop() interne de speak() tombe ainsi dans le vide. */
function speakThen(parts, cb) {
  autoCancel();
  if (AD_OPEN) return;                  // annonce a l'ecran : ni lecture, ni suite
  if (!audioOK()) { if (cb) autoTimer = setTimeout(cb, 400); return; }
  var my = AUTO_SEQ;
  try { Speech.speak(parts, { keepUnits: true }); }
  catch (e) { logError(e, 'speakThen'); if (cb) autoTimer = setTimeout(cb, 400); return; }
  autoPending = { seq: my, fn: cb || null };
  /* Si le moteur reste muet, on enchaine tout de meme au bout d'un delai
     calcule sur la longueur du texte. */
  var chars = parts.join(' ').length;
  autoWatch = setTimeout(function () {
    if (APP_PAUSED || AD_OPEN || document.hidden) { autoCancel(); return; }
    if (autoPending && autoPending.seq === my && my === AUTO_SEQ) autoFire();
  }, Math.max(7000, chars * 95 + 5000));
}

/* Branchement unique sur la fin de lecture. Le setTimeout(0) laisse passer
   toute la chaine synchrone des ecouteurs (dont ceux de tts.js qui
   arretent la voix quand l'application part en arriere-plan) avant de
   decider d'enchainer. */
function autoBind() {
  if (!window.Speech || !Speech.on) return;
  Speech.on('end', function () {
    if (!autoPending || autoPending.seq !== AUTO_SEQ) return;
    var my = AUTO_SEQ;
    setTimeout(function () {
      if (APP_PAUSED || AD_OPEN || document.hidden) { autoCancel(); return; }
      if (autoPending && autoPending.seq === my && my === AUTO_SEQ) autoFire();
    }, 0);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) autoCancel();
  }, false);
  document.addEventListener('pause', function () { APP_PAUSED = true; autoCancel(); }, false);
  document.addEventListener('resign', function () { APP_PAUSED = true; autoCancel(); }, false);
  /* Une annonce plein ecran, un appel ou une notification arretent la voix
     et ne la relancent pas. Si la lecture automatique est active, on reprend
     la question affichee au retour dans l'application.                     */
  function backToApp() {
    APP_PAUSED = false;
    autoResumeSoon();
  }
  document.addEventListener('resume', backToApp, false);
  document.addEventListener('active', backToApp, false);
}
/* Reprise de la lecture automatique apres une interruption (annonce, appel,
   retour dans l'application). Un seul declenchement meme si plusieurs
   signaux arrivent a la suite (fermeture de l'annonce ET retour au premier
   plan) ; la decision est prise au dernier moment.                        */
var autoResumeTimer = null;
function autoResumeSoon() {
  if (autoResumeTimer) clearTimeout(autoResumeTimer);
  autoResumeTimer = setTimeout(function () {
    autoResumeTimer = null;
    if (AD_OPEN || APP_PAUSED || document.hidden) return;
    if (autoOn() && audioOK() && S.view === 'quiz') autoStartQuestion();
  }, 700);
}

/* Enonce + choix de la question courante. */
function autoReadQuestion(cb) {
  var q = S.pool[S.idx]; if (!q) return;
  var parts = [plainTxt(q.q)];
  q.o.forEach(function (opt, i) {
    parts.push((CHOICE_LETTERS[i] || String(i + 1)) + '. ' + plainTxt(opt));
  });
  speakThen(parts, cb);
}
/* Bonne reponse + explication de la question courante. */
function autoReadAnswer(cb) {
  var q = S.pool[S.idx]; if (!q) return;
  var parts = ['The correct answer is: ' + plainTxt(q.c) + '.'];
  var ex = enExplanation(q.e);
  if (ex) parts.push(ex);
  speakThen(parts, cb);
}

/* Lance la lecture de la question affichee. Si elle a deja ete traitee
   (retour en arriere), on relit aussi sa correction, mais SANS repartir
   vers la question suivante : l'utilisateur est revenu volontairement. */
function autoStartQuestion() {
  if (AD_OPEN || !autoOn() || !audioOK() || S.view !== 'quiz') return;
  var answered = !S.sim && S.answers && S.answers[S.idx];
  autoReadQuestion(answered ? function () { autoReadAnswer(null); } : null);
}

/* Bascule du bouton. Le bouton barre signale l'etat inactif. */
function toggleAuto() {
  var on = !autoOn();
  LSset('autoaudio', on ? 1 : 0);
  buzz(8);
  paintAutoBtn();
  if (on) { toast('Auto play on'); autoStartQuestion(); }
  else { stopSpeak(); toast('Auto play off'); }
}
function paintAutoBtn() {
  var el = document.getElementById('autoBtn'); if (!el) return;
  var on = autoOn();
  el.className = 'chip auto' + (on ? ' on' : ' off');
  el.setAttribute('aria-pressed', on ? 'true' : 'false');
  el.innerHTML = ico(on ? 'sound' : 'soundoff', 'inl') + ' Auto';
}

/* ================================ DONNEES =============================== */
var BASE_GRAMMAR = [], GRAMMAR_PLUS = [], EXPRESS_QCM = [], BASE_VOCAB = [], VOCAB_AM = [],
  PHRASALS = [], IDIOMS_QUIZ = [], IDIOMS_LIB = [], MODULE_TEST = [], DRILLS = [];

var BANKS = {};
function buildBanks() {
  BANKS = {};
  function add(key, label, section, data) {
    if (data && data.length) BANKS[key] = { key: key, label: label, section: section, data: data };
  }
  add('g_base', 'Structure & tenses', 'grammar', BASE_GRAMMAR);
  add('g_plus', 'Grammar Plus', 'grammar', GRAMMAR_PLUS);
  var byTheme = {};
  EXPRESS_QCM.forEach(function (q) { (byTheme[q.t] = byTheme[q.t] || []).push(q); });
  Object.keys(byTheme).forEach(function (t) {
    add('g_x_' + t.replace(/\W+/g, '_'), t, 'grammar', byTheme[t]);
  });
  add('v_ctx', 'Vocabulary in Context', 'vocab', BASE_VOCAB);
  add('v_mil', 'American & Military', 'vocab', VOCAB_AM);
  add('i_idm', 'American Idioms', 'idiom', IDIOMS_QUIZ);
  add('i_pv', 'Phrasal Verbs', 'idiom', PHRASALS);
  add('t_mod', 'Module test', 'test', MODULE_TEST);
}
function section(s) {
  return Object.keys(BANKS).map(function (k) { return BANKS[k]; })
    .filter(function (b) { return b.section === s; });
}
function sectionData(s) { var a = []; section(s).forEach(function (b) { a = a.concat(b.data); }); return a; }
function allQuestions() { var a = []; Object.keys(BANKS).forEach(function (k) { a = a.concat(BANKS[k].data); }); return a; }
function sectionOfQuestion(q) {
  var keys = Object.keys(BANKS);
  for (var i = 0; i < keys.length; i++) {
    var b = BANKS[keys[i]];
    for (var j = 0; j < b.data.length; j++) if (b.data[j].q === q) return b.section;
  }
  return 'grammar';
}

/* ========================= FAVORIS ET BOITE A FAUTES ==================== */
function qid(q) { return String(q).slice(0, 70); }

function favs() { return LSget('fav', {}); }
function isFav(q) { return !!favs()[qid(q)]; }
function toggleFav(q, o, a, e) {
  var f = favs(), k = qid(q);
  if (f[k]) { delete f[k]; toast('Removed from favourites'); }
  else { f[k] = { q: q, o: o, a: a, e: e || '', d: nowMs() }; toast('Added to favourites'); }
  LSset('fav', f); buzz(10);
  return !!f[k];
}
function favList() { var f = favs(); return Object.keys(f).map(function (k) { return f[k]; }); }

/* Boite a fautes facon Leitner : niveau 0 a 3, delai croissant.
   Une faute revient le lendemain, puis a 3 jours, puis a 7 jours, puis sort. */
var LEITNER_DAYS = [0, 1, 3, 7];
function box() { return LSget('box', {}); }
function boxAdd(q, o, a, e) {
  var bx = box(), k = qid(q);
  bx[k] = { q: q, o: o, a: a, e: e || '', lvl: 0, due: nowMs(), d: nowMs() };
  LSset('box', bx);
}
function boxPromote(q, ok) {
  var bx = box(), k = qid(q), it = bx[k];
  if (!it) return;
  if (ok) {
    it.lvl = (it.lvl || 0) + 1;
    if (it.lvl >= LEITNER_DAYS.length) {
      delete bx[k]; LSset('box', bx);
      /* Sortie par reussite : comptee pour la demande d'avis (le bouton
         « Clear the mistake box » ne passe pas par ici). */
      LSset('boxout', (parseInt(LSget('boxout', 0), 10) || 0) + 1);
      return;
    }
  } else { it.lvl = 0; }
  it.due = nowMs() + LEITNER_DAYS[it.lvl] * 86400000;
  bx[k] = it; LSset('box', bx);
}
function boxDue() {
  var bx = box(), t = nowMs(), out = [];
  Object.keys(bx).forEach(function (k) { if ((bx[k].due || 0) <= t) out.push(bx[k]); });
  return out;
}
function boxCount() { return Object.keys(box()).length; }

/* ====================== OBJECTIF QUOTIDIEN & ASSIDUITE ================== */
function goalTarget() { return LSget('goal', 20); }
function dailyLog() { return LSget('daily', {}); }
function addAnswered(n) {
  var d = dailyLog(), k = today();
  d[k] = (d[k] || 0) + (n || 1);
  var keys = Object.keys(d).sort();
  while (keys.length > 90) { delete d[keys.shift()]; }
  LSset('daily', d);
  touchStreak();
}
function answeredToday() { return dailyLog()[today()] || 0; }
function touchStreak() {
  var s = LSget('streak', { last: '', n: 0 }), t = today();
  if (s.last === t) return s;
  var y = dayKey(1);
  s.n = (s.last === y) ? (s.n || 0) + 1 : 1;
  s.last = t; LSset('streak', s); return s;
}
function streakDays() {
  var s = LSget('streak', { last: '', n: 0 });
  if (!s.last) return 0;
  if (s.last === today() || s.last === dayKey(1)) return s.n || 0;
  return 0;
}

/* ================================= ETAT ================================= */
var S = {
  view: 'home', title: '', key: null, pool: [], idx: 0, score: 0, wrongs: [],
  locked: false, sim: false, simSel: -1, timerId: null, timeLeft: 0, retry: null,
  reviewMode: false, paused: false
};
var NAV = [];                       /* pile de navigation */
var root = document.getElementById('root');

/* ------------------------- reprise des series --------------------------- */
function runKey(k) { return 'run_' + k; }
function getRun(k) { return k ? LSget(runKey(k), null) : null; }
function clearRun(k) { if (k) LSdel(runKey(k)); }
function saveRun() {
  if (S.sim || !S.key) return;
  if (S.idx >= S.pool.length) { clearRun(S.key); return; }
  var payload = { t: S.title, i: S.idx, s: S.score, p: S.pool, w: S.wrongs, a: S.answers, d: nowMs() };
  if (!LSset(runKey(S.key), payload)) {
    Object.keys(BANKS).forEach(function (k) { if (k !== S.key) clearRun(k); });
    LSset(runKey(S.key), payload);
  }
}
function anyRun() {
  var best = null;
  Object.keys(BANKS).forEach(function (k) {
    var r = getRun(k); if (r && r.i > 0 && (!best || r.d > best.r.d)) best = { k: k, r: r };
  });
  ['all_grammar', 'all_vocab', 'all_idiom'].forEach(function (k) {
    var r = getRun(k); if (r && r.i > 0 && (!best || r.d > best.r.d)) best = { k: k, r: r };
  });
  return best;
}

/* ============================== NAVIGATION ============================== */
var VIEWS = {};
function go(v, arg, replace) {
  stopSpeak(); clearTimer();
  if (!replace && S.view && S.view !== v && VIEWS[S.view]) NAV.push({ v: S.view, a: S.viewArg });
  if (NAV.length > 30) NAV.shift();
  S.view = v; S.viewArg = arg;
  safeRender(VIEWS[v] || VIEWS.home, arg, v);
  adScreen('normal');
  window.scrollTo(0, 0);
}
function back() {
  var prev = NAV.pop();
  stopSpeak(); clearTimer();
  if (!prev) { S.view = 'home'; safeRender(VIEWS.home, null, 'home'); adScreen('normal'); window.scrollTo(0, 0); return; }
  S.view = prev.v; S.viewArg = prev.a;
  safeRender(VIEWS[prev.v] || VIEWS.home, prev.a, prev.v);
  adScreen('normal');
  window.scrollTo(0, 0);
}
function bar(title, right, backFn) {
  return '<div class="topbar"><button class="backbtn" onclick="' + (backFn || 'back()') + '" aria-label="Back">&lsaquo;</button>' +
    '<div class="tb-title">' + esc(title) + '</div>' +
    '<div class="tb-right" id="tbRight">' + (right || '') + '</div></div>';
}

/* --------------------------- barre inferieure --------------------------- */
var TABS = [
  ['home', 'home', 'Home'],
  ['revise', 'revise', 'Review'],
  ['progress', 'chart', 'Progress'],
  ['settings', 'gear', 'Settings']
];
function tabbar(active) {
  return '<nav class="tabbar" role="navigation">' + TABS.map(function (t) {
    return '<button class="tab' + (t[0] === active ? ' on' : '') + '" onclick="goTab(\'' + t[0] + '\')" ' +
      'aria-label="' + t[2] + '">' + ico(t[1]) + '<span class="tl">' + t[2] + '</span></button>';
  }).join('') + '</nav>';
}
function goTab(v) { NAV = []; S.view = ''; go(v, null, true); buzz(8); }

/* ================================ ICONES ================================
   Jeu vectoriel : contrairement aux emoji, ces icones s'affichent de facon
   identique sur tous les telephones et prennent la couleur du theme.     */
var ICONS = {
  home:   '<path d="M3 9.5 12 2l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9.5 22v-8h5v8"/>',
  revise: '<path d="M2.5 4.5v6h6"/><path d="M4.6 15a9 9 0 1 0 2.1-9.4L2.5 10"/>',
  pen:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5l-4 1 1-4z"/>',
  chart:  '<path d="M3 20.5h18"/><path d="M6.5 20.5v-5"/><path d="M12 20.5V6"/><path d="M17.5 20.5v-8"/>',
  gear:   '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.4v2.3M12 19.3v2.3M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.4 12h2.3M19.3 12h2.3M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"/>',
  book:   '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2.5H20v19H6.5A2.5 2.5 0 0 1 4 19V5a2.5 2.5 0 0 1 2.5-2.5z"/>',
  speech: '<path d="M21 14.5a2 2 0 0 1-2 2H8l-4 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/><path d="M8 8.5h8M8 11.8h5"/>',
  star:   '<path d="m12 2.9 2.9 5.85 6.45.94-4.67 4.55 1.1 6.43L12 17.63l-5.78 3.04 1.1-6.43L2.65 9.69l6.45-.94z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  zap:    '<path d="M13.6 2.5 4 14h7l-.6 7.5L20 10h-7z"/>',
  clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 6.8V12l3.6 2.1"/>',
  file:   '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><path d="M8.5 13.2h7M8.5 16.6h7"/>',
  layers: '<path d="M12 2.5 2.5 7.2 12 12l9.5-4.8z"/><path d="M2.5 16.8 12 21.5l9.5-4.7"/><path d="M2.5 12 12 16.7 21.5 12"/>',
  board:  '<path d="M9 3.6H7a2 2 0 0 0-2 2v13.9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5.6a2 2 0 0 0-2-2h-2"/><rect x="9" y="1.9" width="6" height="3.4" rx="1.2"/><path d="M8.6 12.2h6.8M8.6 15.6h4.4"/>',
  search: '<circle cx="10.8" cy="10.8" r="7.3"/><path d="m21 21-5-5"/>',
  flame:  '<path d="M12 2.5s5.6 4.3 5.6 9.4a5.6 5.6 0 0 1-11.2 0c0-2 1-3.7 1-3.7s.8 1.7 2.1 1.7c0-3.5 2.5-7.4 2.5-7.4z"/>',
  none:   '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  sound:  '<path d="M11 4.5 6.5 8.5H3v7h3.5L11 19.5z"/><path d="M15.6 8.9a4.4 4.4 0 0 1 0 6.2"/><path d="M18.4 6.1a8.4 8.4 0 0 1 0 11.8"/>',
  /* Haut-parleur barre : etat « lecture automatique desactivee ». */
  soundoff: '<path d="M11 4.5 6.5 8.5H3v7h3.5L11 19.5z"/><path d="m16.5 9.5 5 5M21.5 9.5l-5 5"/>',
  copy:   '<rect x="8.5" y="8.5" width="12" height="12" rx="2.2"/><path d="M4.8 15.5H4a1.5 1.5 0 0 1-1.5-1.5V4.5A2 2 0 0 1 4.5 2.5h9.6a1.5 1.5 0 0 1 1.5 1.5v.8"/>',
  list:   '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><path d="M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
  play:   '<path d="M7 4.5 19 12 7 19.5z"/>',
  stop:   '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  pause:  '<path d="M9.5 5v14M14.5 5v14"/>',
  share:  '<circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="m8.3 10.7 7.4-4M8.3 13.3l7.4 4"/>'
};
function ico(name, cls) {
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" ' +
    'aria-hidden="true">' + (ICONS[name] || ICONS.none) + '</svg>';
}

/* ================================ ACCUEIL =============================== */
function ring(p) {
  var r = 26, c = 2 * Math.PI * r;
  return '<svg class="ring" viewBox="0 0 64 64" aria-hidden="true">' +
    '<circle class="rbg" cx="32" cy="32" r="' + r + '"/>' +
    '<circle class="rfg" cx="32" cy="32" r="' + r + '" stroke-dasharray="' + c.toFixed(1) +
    '" stroke-dashoffset="' + (c * (1 - Math.min(1, p / 100))).toFixed(1) + '"/></svg>';
}
function greeting() {
  var h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

VIEWS.home = function () {
  var done = answeredToday(), target = goalTarget(), p = pct(done, target);
  var due = boxDue().length;

  /* Bandeau compact : le logo et le nom tiennent sur une seule ligne,
     au lieu du grand bloc centre qui occupait le tiers de l'ecran. */
  var h = '<header class="topbrand">' +
    '<img class="tb-mark" src="img/logo.png" alt="">' +
    '<div class="tb-txt"><span class="tb-name">ECL TRAINER</span>' +
    '<span class="tb-sub">American English</span></div>' +
    '<button class="tb-set" onclick="goTab(\'settings\')" aria-label="Settings">' +
    ico('gear', 'inl') + '</button></header>';

  /* Carnet de marche : salutation, objectif du jour et assiduite. */
  h += '<section class="logbook" aria-label="Daily goal">' +
    '<div class="lb-ring">' + ring(p) + '<span class="lb-num">' + Math.min(done, 999) + '</span></div>' +
    '<div class="lb-txt"><div class="lb-t">' + (done >= target
      ? 'Daily goal reached. ' + done + ' questions.'
      : done + ' of ' + target + ' questions today.') + '</div>' +
    '<div class="lb-s">' + (streakDays() > 1 ? streakDays() + ' days in a row'
      : 'Start your streak') + '</div>' +
    '</div></section>';

  /* Reprise d'une serie interrompue : passe avant tout le reste. */
  var r = anyRun();
  if (r) {
    h += '<button class="resume" onclick="resumeRun(\'' + r.k + '\')">' +
      '<span class="rt">' + ico('clock', 'inl') + ' Continue</span><span class="rl">' + esc(r.r.t) + '</span>' +
      '<span class="rp">Question ' + (r.r.i + 1) + ' of ' + r.r.p.length +
      '<span class="rbar"><i style="width:' + pct(r.r.i, r.r.p.length) + '%"></i></span></span></button>';
  }

  h += '<div class="search-launch" onclick="go(\'search\')" role="button">' +
    ico('search', 'sl-i') + '<span>Search a question, an idiom, a verb\u2026</span></div>';

  /* Trois actions immediates, sur une seule rangee. */
  h += '<div class="quickrow">' +
    '<button class="qa" onclick="quickMixed()">' + ico('zap', 'qa-i') +
      '<span class="qa-t">Quick test</span><span class="qa-s">' + quickN() + ' questions</span></button>' +
    '<button class="qa' + (due ? ' hot' : '') + '" onclick="startSmartReview()">' + ico('revise', 'qa-i') +
      '<span class="qa-t">Review</span><span class="qa-s">' +
      (due ? due + ' to review' : 'My mistakes') + '</span>' +
      (due ? '<span class="qa-b">' + (due > 99 ? '99+' : due) + '</span>' : '') + '</button>' +
    '<button class="qa" onclick="go(\'sim\')">' + ico('clock', 'qa-i') +
      '<span class="qa-t">Practice test</span><span class="qa-s">Timed</span></button>' +
    '</div>';

  h += studyFocusCard();
  h += '<div class="secttl">Areas of study</div>';
  h += '<div class="bigmenu">' +
    big('grammar', 'book', 'Grammar',
        'Tenses, structures, drills, verbs', sectionData('grammar').length, sectionMastery('grammar')) +
    big('vocab', 'speech', 'Vocabulary',
        'Vocabulary in context, American register', sectionData('vocab').length, sectionMastery('vocab')) +
    big('idiom', 'star', 'Idioms &amp; Phrasal',
        'Idiomatic expressions and phrasal verbs', sectionData('idiom').length, sectionMastery('idiom')) +
    big('test', 'target', 'Tests',
        'Module test and timed practice test', MODULE_TEST.length, sectionMastery('test')) +
    big('reference', 'layers', 'Reference Library',
        'Idioms and corrected drills',
        IDIOMS_LIB.length + DRILLS.reduce(function (a, d) { return a + d.items.length; }, 0)) +
    '</div>';

  root.innerHTML = L(h + tabbar('home'));
};
/* Tuile de menu. Mise en page en FLEX (et non en grille) : certains WebView
   Android rendent mal display:grid et renvoyaient le libelle hors de l'ecran.
   La description tient toujours sur UNE ligne, tronquee si necessaire, ce qui
   interdit les empilements d'un mot par ligne.                            */
function tile(onclick, icon, title, desc, badge, progress) {
  return '<button class="tile" onclick="' + onclick + '">' +
    '<span class="tile-ic">' + ico(icon) + '</span>' +
    '<span class="tile-body">' +
      '<span class="tile-h"><span class="tile-t">' + title + '</span>' +
      (badge ? '<b class="tile-n">' + badge + '</b>' : '') + '</span>' +
      '<span class="tile-d">' + desc + '</span>' +
      (progress === null || progress === undefined ? '' :
        '<span class="tile-bar" title="' + progress + '%"><i style="width:' + progress + '%"></i></span>') +
    '</span>' +
    '<span class="tile-go">&rsaquo;</span></button>';
}
function big(v, icon, t, d, badge, progress) {
  return tile("go('" + v + "')", icon, t, d, badge, progress);
}
function big2(fn, icon, t, d, badge) { return tile(fn, icon, t, d, badge); }

/* Moyenne des records d'un domaine : alimente la jauge des tuiles. */
function sectionMastery(sec) {
  var best = LSget('best', {}), sum = 0, n = 0;
  section(sec).forEach(function (b) {
    if (best[b.key] !== undefined) { sum += best[b.key]; n++; }
  });
  return n ? Math.round(sum / n) : null;
}
function studyFocusCard() {
  var areas = [
    { k: 'grammar', t: 'Grammar', icon: 'book' },
    { k: 'vocab', t: 'Vocabulary', icon: 'speech' },
    { k: 'idiom', t: 'Idioms & Phrasal', icon: 'star' }
  ];
  var chosen = null;
  areas.forEach(function (a) {
    var m = sectionMastery(a.k);
    if (m === null) return;
    if (!chosen || m < chosen.m) chosen = { k: a.k, t: a.t, icon: a.icon, m: m };
  });
  if (!chosen) {
    return '<button class="focuscard" onclick="go(\'grammar\')">' +
      '<span class="focus-ic">' + ico('target') + '</span><span class="focus-copy">' +
      '<b>Suggested start</b><span>Build a strong base with Grammar fundamentals.</span></span>' +
      '<span class="focus-go">&rsaquo;</span></button>';
  }
  return '<button class="focuscard" onclick="go(\'' + chosen.k + '\')">' +
    '<span class="focus-ic">' + ico(chosen.icon) + '</span><span class="focus-copy">' +
    '<b>Suggested focus</b><span>' + chosen.t + ' is your lowest current average at ' + chosen.m + '%.</span></span>' +
    '<span class="focus-go">&rsaquo;</span></button>';
}
function entry(onclick, title, sub, badge) {
  return '<button class="row" onclick="' + onclick + '"><span class="rw"><span class="rt2">' + title + '</span>' +
    (sub ? '<span class="rs">' + sub + '</span>' : '') + '</span>' +
    (badge ? '<span class="rb">' + badge + '</span>' : '<span class="rb">&rsaquo;</span>') + '</button>';
}
function bankEntry(b) {
  var best = LSget('best', {}), r = getRun(b.key);
  var sub = b.data.length + ' questions' + (best[b.key] !== undefined ? ' &middot; record ' + best[b.key] + '%' : '');
  if (r && r.i > 0) sub += ' &middot; <b class="hl">reprise Q' + (r.i + 1) + '</b>';
  return entry("startBank('" + b.key + "')", esc(b.label), sub, '');
}

/* ============================ HUB : REVISER ============================= */
VIEWS.revise = function () {
  var due = boxDue().length, tot = boxCount(), nf = favList().length;
  var h = '<header class="phead-lg"><h2>Review</h2>' +
    '<p>Everything you got wrong comes back here, spaced over time, until you master it.</p></header>';

  h += '<div class="bigmenu sm">' +
    big2("startSmartReview()", 'revise', 'Smart review',
      due ? due + ' question' + (due > 1 ? 's' : '') + ' to review today'
        : (tot ? 'Nothing to review today &middot; ' + tot + ' pending' : 'No mistake recorded yet'), due || '') +
    big2("startFavouritetes()", 'star', 'My favourites',
      nf ? nf + ' question' + (nf > 1 ? 's' : '') + ' marked' : 'Mark a question during a quiz', nf || '') +
    big2("quickMix()", 'zap', 'Mixed practice', '20 questions drawn from all banks') +
    '</div>';

  h += '<div class="secttl">By area</div>' +
    '<div class="bigmenu sm">' +
    big2("go('grammar')", 'book', 'Grammar', 'Tenses, structures and drills', sectionData('grammar').length) +
    big2("go('vocab')", 'speech', 'Vocabulary', 'Vocabulary in context', sectionData('vocab').length) +
    big2("go('idiom')", 'star', 'Idioms &amp; Phrasal', 'Expressions and phrasal verbs', sectionData('idiom').length) +
    big2("go('test')", 'target', 'Tests', 'Module test and timed practice test', MODULE_TEST.length) +
    '</div>';

  if (tot) {
    h += '<div class="note">The mistake box holds <b>' + tot + '</b> question' + (tot > 1 ? 's' : '') +
      '. You can review a mistake right away; it then comes back the next day, three days later and a week later. ' +
      'Four correct answers in a row and it leaves the box.</div>' +
      '<div class="navrow"><button class="btn ghost" onclick="clearBox()">Clear the mistake box</button></div>';
  }
  root.innerHTML = L(h + tabbar('revise'));
};
function clearBox() {
  if (!confirm('Clear the mistake box? Missed questions will no longer come back automatically.')) return;
  LSset('box', {}); toast('Mistake box cleared'); VIEWS.revise();
}

/* =============================== LES HUBS =============================== */
VIEWS.grammar = function () {
  var all = sectionData('grammar');
  var h = bar('Grammar');
  h += '<div class="bigmenu sm">' +
    big2("quickDrill('grammar')", 'zap', 'Quick practice', quickN() + ' random questions') +
    big2("startAll('grammar','Grammar - full set')", 'target', 'Full set', 'All banks in sequence', all.length) +
    '</div><div class="secttl">By topic</div>';
  section('grammar').forEach(function (b) { h += bankEntry(b); });
  h += '<div class="secttl">Reference</div>' +
    entry("go('drills')", 'Corrected drills',
      DRILLS.reduce(function (a, d) { return a + d.items.length; }, 0) + ' items with answer key');
  root.innerHTML = L(h + tabbar('revise'));
};

VIEWS.vocab = function () {
  var h = bar('Vocabulary');
  h += '<div class="bigmenu sm">' +
    big2("quickDrill('vocab')", 'zap', 'Quick practice', quickN() + ' random questions') +
    big2("startAll('vocab','Vocabulary - full set')", 'target', 'Full set', 'All banks in sequence', sectionData('vocab').length) +
    '</div><div class="secttl">By bank</div>';
  section('vocab').forEach(function (b) { h += bankEntry(b); });
  root.innerHTML = L(h + tabbar('revise'));
};

VIEWS.idiom = function () {
  var h = bar('Idioms & Phrasal Verbs');
  h += '<div class="bigmenu sm">' +
    big2("quickDrill('idiom')", 'zap', 'Quick practice', quickN() + ' random questions') +
    big2("startAll('idiom','Idioms & Phrasal - full set')", 'target', 'Full set', 'All banks in sequence', sectionData('idiom').length) +
    '</div><div class="secttl">By bank</div>';
  section('idiom').forEach(function (b) { h += bankEntry(b); });
  h += '<div class="secttl">Reference</div>' +
    entry("go('library')", 'Idioms Library', IDIOMS_LIB.length + ' expressions explained');
  root.innerHTML = L(h + tabbar('revise'));
};


VIEWS.reference = function () {
  var h = bar('Reference Library');
  h += '<div class="note">Fast-reference material for revision. Tap audio-enabled entries to hear US English pronunciation.</div>';
  h += '<div class="bigmenu sm">' +
    big2("go('library')", 'star', 'American idioms', 'Meaning and example in context', IDIOMS_LIB.length) +
    big2("go('drills')", 'board', 'Corrected drills', 'Gap-fill practice with answer keys', DRILLS.reduce(function (a, d) { return a + d.items.length; }, 0)) +
    '</div>';
  root.innerHTML = L(h + tabbar('revise'));
};

VIEWS.test = function () {
  var best = LSget('best', {}), r = getRun('t_mod');
  var h = bar('Tests');
  h += '<div class="bigmenu sm">' +
    big2("startBank('t_mod')", 'board', 'Module test',
      'Graded questions' + (best.t_mod !== undefined ? ', record ' + best.t_mod + '%' : '') +
      (r && r.i > 0 ? ', resume at Q' + (r.i + 1) : ''), MODULE_TEST.length) +
    big2("go('sim')", 'clock', 'ECL practice test', 'Timed, feedback at the end') +
    '</div>';
  h += '<div class="note">The module test resumes where you left off. ' +
    'The practice test is always taken in one sitting, as in the real exam.</div>';
  root.innerHTML = L(h + tabbar('revise'));
};

VIEWS.sim = function () {
  var h = bar('ECL practice test');
  h += '<div class="note">Questions drawn at random from the ' + allQuestions().length +
    ' questions in the app. No feedback during the test: ' +
    'select, confirm, and the full report comes at the end.</div>';
  h += '<div class="bigmenu sm">' +
    big2("startSim(20)", 'zap', 'Flash test', '20 questions in ' + simMinutes(20) + ' minutes') +
    big2("startSim(40)", 'clock', 'Half test', '40 questions in ' + simMinutes(40) + ' minutes') +
    big2("startSim(60)", 'target', 'Full session', '60 questions in ' + simMinutes(60) + ' minutes') +
    big2("startSim(100)", 'flame', 'Marathon', '100 questions in ' + simMinutes(100) + ' minutes') +
    '</div>';
  root.innerHTML = L(h + tabbar('revise'));
};


/* ------------------------- RECHERCHE : SAISIE STABLE ---------------------
   Les vues de recherche redessinaient tout l'ecran a chaque lettre tapee.
   Le champ etant detruit puis recree, il perdait le focus et le clavier se
   refermait. On isole desormais les resultats dans un conteneur dedie :
   le champ de saisie n'est jamais retire du document.                     */
function liveSearch(view, value, arg) {
  var box = document.getElementById('sr');
  if (!box) { view(value, arg); return; }   // premier affichage
  S.viewArg = value;
  box.innerHTML = L(view(value, arg, true));   // mode « resultats seuls »
}

/* ============================ RECHERCHE GLOBALE ========================= */
VIEWS.search = function (q, _a, resultsOnly) {
  q = q || '';
  var needle = q.trim().toLowerCase();
  if (needle.length < 2) {
    var empty = '<div class="empty">' + ico('search', 'ei') + '<p>Type at least two letters. ' +
      'Search covers questions and idioms.</p></div>';
    if (resultsOnly) return empty;
    root.innerHTML = L(searchHead(q) + '<div id="sr">' + empty + '</div>' + tabbar('revise'));
    focusSearch('gq', q); return;
  }
  var n = 0, blocks = '';

  var qs = allQuestions().filter(function (x) { return x.q.toLowerCase().indexOf(needle) >= 0; }).slice(0, 20);
  if (qs.length) {
    blocks += '<div class="secttl">Questions (' + qs.length + ')</div>';
    qs.forEach(function (x) {
      n++;
      blocks += '<div class="rev"><div class="rq">' + fmt(x.q) + '</div>' +
        '<div class="ra"><span class="yes">' + fmt(x.o[x.a]) + '</span></div>' +
        (x.e ? '<div class="re">' + fmt(x.e) + '</div>' : '') + '</div>';
    });
  }
  var ids = IDIOMS_LIB.filter(function (x) {
    return x.i.toLowerCase().indexOf(needle) >= 0 || x.m.toLowerCase().indexOf(needle) >= 0;
  }).slice(0, 15);
  if (ids.length) {
    blocks += '<div class="secttl">Idioms (' + ids.length + ')</div>';
    ids.forEach(function (it) {
      n++;
      blocks += '<div class="icard"><div class="idm">' + esc(it.i) + '</div>' +
        '<div class="im">' + esc(it.m) + '</div><div class="ix">&ldquo;' + esc(it.x) + '&rdquo;</div></div>';
    });
  }
  var out = n ? blocks : '<div class="empty">' + ico('none', 'ei') +
    '<p>No result for &laquo; ' + esc(q) + ' &raquo;.</p></div>';
  if (resultsOnly) return out;
  root.innerHTML = L(searchHead(q) + '<div id="sr">' + out + '</div>' + tabbar('revise'));
  focusSearch('gq', q);
};
function searchHead(q) {
  return bar('Search') +
    '<input class="search" id="gq" placeholder="Question, idiom, verb\u2026" ' +
    'value="' + esc(q) + '" oninput="globalSearch(this.value)" autocomplete="off" ' +
    'autocorrect="off" autocapitalize="none" spellcheck="false">';
}
/* Le champ n'est plus recree a chaque frappe : seuls les resultats changent,
   donc le clavier Android reste ouvert. */
function globalSearch(v) { liveSearch(VIEWS.search, v); }
function focusSearch(id, v) {
  var el = document.getElementById(id);
  if (el) { el.focus(); try { el.setSelectionRange(v.length, v.length); } catch (e) { } }
}

/* ================================= QUIZ ================================= */
function makePool(data) {
  return shuffle(data).map(function (it) {
    return { q: it.q, o: shuffle(it.o.slice()), c: it.o[it.a], e: it.e || '' };
  });
}
function startBank(key) {
  var b = BANKS[key]; if (!b) return;
  var r = getRun(key);
  if (r && r.i > 0 && r.i < r.p.length) { askResume(key, b.label, r); return; }
  launch(key, b.label, makePool(b.data), false);
}
function startAll(sec, title) {
  var key = 'all_' + sec, r = getRun(key);
  if (r && r.i > 0 && r.i < r.p.length) { askResume(key, title, r); return; }
  launch(key, title, makePool(sectionData(sec)), false);
}
/* Nombre de questions du test rapide, reglable dans les Settings. */
/* 10 par defaut : un test rapide doit rester rapide. Un choix fait dans les
   reglages (20, 30, 50) est conserve. */
function quickN() { var n = parseInt(LSget('quickn', 10), 10); return (n >= 5 && n <= 100) ? n : 10; }
function setQuickN(n) { LSset('quickn', n); toast('Quick test: ' + n + ' questions'); VIEWS.settings(); }

function quickDrill(sec) {
  launch(null, 'Quick practice', makePool(sectionData(sec)).slice(0, quickN()), false);
}
/* Quick test mixte : tire au hasard dans TOUTES les banques. */
function quickMixed() {
  var n = quickN();
  launch(null, 'Quick test - ' + n + ' questions', makePool(allQuestions()).slice(0, n), false);
}
function quickMix() { launch(null, 'Mixed practice', makePool(allQuestions()).slice(0, 20), false); }

function startSmartReview() {
  var due = boxDue();
  if (!due.length) {
    if (boxCount()) { toast('Nothing to review today. Come back tomorrow.'); return; }
    toast('No mistake recorded. Complete a set first.'); return;
  }
  S.reviewMode = true;
  launch(null, 'Smart review', makePool(due).slice(0, 30), false);
}
function startFavouritetes() {
  var f = favList();
  if (!f.length) { toast('No favourite. Tap the star during a quiz.'); return; }
  launch(null, 'My favourites', makePool(f), false);
}
function startRetry() {
  if (!S.retry || !S.retry.length) return;
  launch(null, 'Replay my mistakes', makePool(S.retry), false);
}
/* Temps accorde par question dans le test chronometre. Reference de
   l'epreuve : 30 secondes. Reglable dans les Settings.                  */
function secPerQ() { var v = parseInt(LSget('secq', 30), 10); return (v >= 15 && v <= 90) ? v : 30; }
function setSecPerQ(v) { LSset('secq', v); toast('Timing: ' + v + ' seconds per question'); VIEWS.settings(); }
function simMinutes(n) { return Math.round(n * secPerQ() / 60); }

function startSim(n, min) {
  var mn = (typeof min === 'number' && min > 0) ? min : simMinutes(n);
  launch(null, 'ECL practice test - ' + n + ' questions', makePool(allQuestions()).slice(0, n), true);
  S.timeLeft = mn * 60; tick(); S.timerId = setInterval(tick, 1000);
}
function resumeRun(key) {
  var r = getRun(key); if (!r) return;
  S.key = key; S.title = r.t; S.pool = r.p; S.idx = r.i; S.score = r.s; S.wrongs = r.w || [];
  S.sim = false; S.locked = false; S.simSel = -1; S.reviewMode = false; S.lastGood = false;
  S.runAnswered = 0; S.runCorrect = 0;
  S.answers = r.a || []; S.listenUsed = false;
  S.view = 'quiz'; adScreen('normal'); renderQ();
}
function askResume(key, title, r) {
  S.view = 'resume';
  root.innerHTML = L(bar('Resume') +
    '<div class="resumebox">' + ico('clock', 'ri') + '<h3>' + esc(title) + '</h3>' +
    '<p>You stopped at <b>question ' + (r.i + 1) + '</b> of ' + r.p.length +
    ', with ' + r.s + ' correct answer' + (r.s > 1 ? 's' : '') + '.</p>' +
    '<div class="pill"><div class="bar" style="width:' + pct(r.i, r.p.length) + '%"></div></div>' +
    '<button class="btn block" onclick="resumeRun(\'' + key + '\')">Continue at question ' + (r.i + 1) + '</button>' +
    '<button class="btn ghost block" onclick="restartBank(\'' + key + '\')">Start over</button></div>');
}
function restartBank(key) {
  clearRun(key);
  if (BANKS[key]) launch(key, BANKS[key].label, makePool(BANKS[key].data), false);
  else { var sec = key.slice(4); launch(key, 'Full set', makePool(sectionData(sec)), false); }
}
function launch(key, title, pool, sim) {
  stopSpeak(); if (key) clearRun(key);
  S.key = key; S.title = title; S.pool = pool; S.idx = 0; S.score = 0; S.wrongs = [];
  S.locked = false; S.sim = !!sim; S.simSel = -1; S.paused = false;
  S.lastGood = false; S.shareData = null; S.runAnswered = 0; S.runCorrect = 0;
  S.answers = [];        // etat par question en entrainement (pour revenir en arriere)
  S.listenUsed = false;  // l'utilisateur a-t-il demande la lecture audio ?
  if (VIEWS[S.view]) NAV.push({ v: S.view, a: S.viewArg });
  S.view = 'quiz';
  adScreen(sim ? 'sim' : 'normal');
  renderQ();
  window.scrollTo(0, 0);
}

function clearTimer() { if (S.timerId) { clearInterval(S.timerId); S.timerId = null; } }
function tick() {
  if (S.paused) return;
  S.timeLeft--; paintTimer();
  if (S.timeLeft <= 0) { clearTimer(); finish(true); }
}
function paintTimer() {
  var el = document.getElementById('tbRight');
  if (el && S.timerId) {
    var m = Math.floor(S.timeLeft / 60), s = S.timeLeft % 60;
    el.innerHTML = '<button class="timer' + (S.timeLeft < 60 ? ' low' : '') + '" onclick="togglePause()">' +
      (S.paused ? '\u25B8 ' : '') + m + ':' + (s < 10 ? '0' : '') + s + '</button>';
  }
}
function togglePause() {
  if (!S.timerId) return;
  S.paused = !S.paused; paintTimer();
  toast(S.paused ? 'Test paused' : 'Timer resumed');
}
function quitQuiz() {
  if (S.sim && S.idx < S.pool.length - 1) {
    if (!confirm('Give up the practice test? Your result will not be saved.')) return;
  }
  saveRun(); clearTimer(); stopSpeak(); adScreen('normal'); back();
}

var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
function renderQ() {
  var q = S.pool[S.idx];
  var h = bar(S.title, S.sim ? '' : '<span class="pts">' + S.score + ' pt</span>', 'quitQuiz()');
  h += '<div class="pill"><div class="bar" style="width:' + pct(S.idx, S.pool.length) + '%"></div></div>';
  h += '<div class="qmeta"><span>Question <b>' + (S.idx + 1) + '</b> / ' + S.pool.length + '</span>' +
    '<span>' + (S.sim ? 'Feedback at the end' : 'Immediate feedback') + '</span></div>';

  h += '<div class="qbox"><div class="qtext">' + fmt(q.q) + '</div><div class="qtools">' +
    (audioOK() ? '<button class="chip auto' + (autoOn() ? ' on' : ' off') + '" id="autoBtn" ' +
      'onclick="toggleAuto()" aria-pressed="' + (autoOn() ? 'true' : 'false') +
      '" aria-label="Automatic reading">' +
      ico(autoOn() ? 'sound' : 'soundoff', 'inl') + ' Auto</button>' : '') +
    (audioOK() ? '<button class="chip" id="listenBtn" onclick="listenQuestion()">' +
      ico('sound', 'inl') + ' Listen</button>' : '') +
    '<button class="chip star' + (isFav(q.q) ? ' on' : '') + '" id="favBtn" onclick="favCurrent()">' +
    ico('star', 'inl') + ' Favourite</button></div></div>';

  h += '<div class="opts">';
  q.o.forEach(function (o, i) {
    h += '<button class="opt" id="opt' + i + '" onclick="pick(' + i + ')">' +
      '<span class="ol">' + LETTERS[i] + '</span><span class="ot">' + fmt(o) + '</span></button>';
  });
  h += '</div><div id="fb"></div>';
  // Barre de navigation. En entrainement, un bouton « Previous » permet de
  // revenir revoir les questions deja traitees (jamais en simulation).
  h += '<div class="navrow' + (!S.sim ? ' three' : '') + '">';
  if (!S.sim) {
    h += '<button class="btn ghost" id="prevBtn" onclick="prevQ()"' +
      (S.idx === 0 ? ' disabled' : '') + '>&lsaquo; Previous</button>';
  }
  h += '<button class="btn ghost" onclick="quitQuiz()">' +
    (S.sim ? 'Give up' : 'Quit') + '</button>' +
    '<button class="btn" id="nextBtn" onclick="nextQ()"' + (S.sim ? '' : ' disabled') + '>' +
    (S.idx === S.pool.length - 1 ? 'Finish' : 'Next &rsaquo;') + '</button></div>';
  root.innerHTML = L(h);
  paintTimer();

  // Rejoue l'etat d'une question deja repondue quand on y revient.
  if (!S.sim && S.answers && S.answers[S.idx]) restoreAnswered();

  /* Lecture automatique : on la declenche apres l'affichage, pour que la
     voix suive ce que l'utilisateur a sous les yeux. */
  if (autoOn() && audioOK()) setTimeout(autoStartQuestion, 120);
}
/* Un utilisateur peut avoir demande la lecture : on la memorise pour que la
   validation declenche automatiquement la lecture de la reponse.            */
function listenQuestion() {
  S.listenUsed = true;
  speakQuestionAndChoices(S.pool[S.idx], true);
}
function favCurrent() {
  var q = S.pool[S.idx];
  var src = [q.c].concat(q.o.filter(function (o) { return o !== q.c; }));
  var on = toggleFav(q.q, src, 0, q.e);
  var el = document.getElementById('favBtn');
  if (el) { el.className = 'chip star' + (on ? ' on' : ''); }
}
function pick(i) {
  var q = S.pool[S.idx];
  if (S.sim) {
    S.simSel = i;
    q.o.forEach(function (o, j) { document.getElementById('opt' + j).className = 'opt' + (j === i ? ' sel' : ''); });
    buzz(8);
    return;
  }
  if (S.locked) return;               // question deja repondue : verrouillee
  S.locked = true;
  var good = (q.o[i] === q.c);
  S.lastGood = good;                  // derniere reponse donnee (demande d'avis)
  S.runAnswered = (S.runAnswered || 0) + 1;            // reponses d'affilee dans cette serie
  if (good) S.runCorrect = (S.runCorrect || 0) + 1;
  paintAnswered(i, good);
  if (good) { S.score++; buzz(10); }
  else { S.wrongs.push({ q: q.q, your: q.o[i], c: q.c, e: q.e }); buzz([18, 60, 18]); }
  adCountAnswer(1);
  boxPromote(q.q, good);
  if (!good) boxAdd(q.q, [q.c].concat(q.o.filter(function (o) { return o !== q.c; })), 0, q.e);
  addAnswered(1);
  // Memorise l'etat pour pouvoir revenir sur cette question.
  S.answers[S.idx] = { picked: i, good: good };
  showVerdict(good, q);
  document.getElementById('nextBtn').disabled = false;

  /* Mode automatique : on lit la correction, puis on passe seul a la
     question suivante apres AUTO_GAP_MS. Sinon on garde l'ancien
     comportement : la reponse n'est lue que si l'utilisateur ecoutait. */
  if (autoOn() && audioOK()) {
    autoReadAnswer(function () {
      autoTimer = setTimeout(function () {
        autoTimer = null;
        if (S.view === 'quiz' && autoOn() && !APP_PAUSED && !AD_OPEN && !document.hidden) nextQ();
      }, AUTO_GAP_MS);
    });
  } else if (S.listenUsed && audioOK()) {
    speakAnswer(q);
  }

  saveRun();
}
/* Colore les options apres reponse (reutilise a la reprise). */
function paintAnswered(picked, good) {
  var q = S.pool[S.idx];
  q.o.forEach(function (o, j) {
    var el = document.getElementById('opt' + j); if (!el) return;
    el.disabled = true;
    el.classList.remove('right', 'wrong', 'sel');
    if (o === q.c) el.classList.add('right');
    else if (j === picked) el.classList.add('wrong');
  });
}
function showVerdict(good, q) {
  var fb = document.getElementById('fb'); if (!fb) return;
  fb.innerHTML = L('<div class="verdict ' + (good ? 'ok' : 'bad') + '">' +
    (good ? '&#10004; Correct.' : '&#10008; Incorrect &mdash; correct answer: <b>' + fmt(q.c) + '</b>') +
    (q.e ? '<span class="rule2">' + fmt(q.e) + '</span>' : '') +
    (audioOK() ? '<button class="chip mini" onclick="speakAnswer(S.pool[S.idx])">' +
      ico('sound', 'inl') + ' Listen to the answer</button>' : '') +
    '</div>');
}
/* Restaure l'affichage d'une question deja repondue quand on y revient. */
function restoreAnswered() {
  var a = S.answers[S.idx]; if (!a) return;
  S.locked = true;
  paintAnswered(a.picked, a.good);
  showVerdict(a.good, S.pool[S.idx]);
  var nb = document.getElementById('nextBtn'); if (nb) nb.disabled = false;
}
/* Revenir a la question precedente (entrainement seulement). */
function prevQ() {
  if (S.sim || S.idx === 0) return;
  stopSpeak();
  S.idx--;
  S.locked = !!(S.answers && S.answers[S.idx]);
  renderQ();
  window.scrollTo(0, 0);
}
function nextQ() {
  var q = S.pool[S.idx];
  if (S.sim) {
    var sel = (S.simSel >= 0) ? q.o[S.simSel] : null;
    var ok = (sel === q.c);
    S.lastGood = ok;
    if (ok) S.score++; else S.wrongs.push({ q: q.q, your: sel || '(no answer)', c: q.c, e: q.e });
    boxPromote(q.q, ok);
    if (!ok && sel) boxAdd(q.q, [q.c].concat(q.o.filter(function (o) { return o !== q.c; })), 0, q.e);
    addAnswered(1);
    S.simSel = -1;
  }
  stopSpeak();
  if (S.idx >= S.pool.length - 1) { finish(false); return; }
  if (!reviewDuringRun()) adDuringRun();   // fenetre d'avis OU annonce, jamais les deux
  S.idx++;
  S.listenUsed = false;                                   // remise a zero par question
  S.locked = !!(!S.sim && S.answers && S.answers[S.idx]); // deja repondue ?
  renderQ(); saveRun();
  window.scrollTo(0, 0);
}
function finish(timeout) {
  clearTimer(); stopSpeak();
  if (S.sim) adCountAnswer(S.pool.length);   // epreuve chronometree : comptee d'un bloc
  if (timeout) for (var j = S.idx; j < S.pool.length; j++)
    S.wrongs.push({ q: S.pool[j].q, your: '(time up)', c: S.pool[j].c, e: S.pool[j].e });
  S.retry = S.wrongs.map(function (w) { return { q: w.q, o: [w.c].concat(distract(w)), a: 0, e: w.e }; });

  var p = pct(S.score, S.pool.length);
  if (S.key) {
    clearRun(S.key);
    var best = LSget('best', {});
    if (best[S.key] === undefined || best[S.key] < p) { best[S.key] = p; LSset('best', best); }
  }
  var hist = LSget('hist', []);
  hist.unshift({ d: nowMs(), n: S.title, p: p, q: S.pool.length, s: S.sim ? 1 : 0 });
  LSset('hist', hist.slice(0, 60));

  S.view = 'result';
  adScreen('normal');
  S.shareData = S.sim ? { score: S.score, total: S.pool.length, pct: p, at: nowMs() } : null;
  renderResult(timeout);
  /* Demande d'avis Google Play : elle prend la place de l'annonce de fin de
     serie, jamais les deux ensemble (Google demande que rien ne recouvre sa
     fenetre). L'annonce attend au moins 3 minutes ; les reponses restent
     comptees. Regles completes : module AVIS GOOGLE PLAY plus bas. */
  var why = reviewMoment(p);
  if (why) setTimeout(function () { askReview(why); }, REVIEW.delayMs);
  else setTimeout(adAfterSeries, 900);
}
function distract(w) {
  var src = allQuestions();
  for (var i = 0; i < src.length; i++) if (src[i].q === w.q)
    return src[i].o.filter(function (o) { return o !== w.c; });
  return [];
}
function renderResult(timeout) {
  var n = S.pool.length, p = pct(S.score, n), v;
  v = p >= 85 ? 'Excellent. Solid level for the ECL.'
    : p >= 70 ? 'Very good. Keep up this pace.'
      : p >= 50 ? 'Encouraging. Study the corrections below.'
        : 'Needs work. Redo this set after revision.';
  var h = bar('Results');
  h += '<div class="score-wrap">' + (timeout ? '<div class="eyebrow">Time up</div>' : '') +
    '<div class="score-ring">' + ring(p) + '<span class="score-big">' + p + '<small>%</small></span></div>' +
    '<div class="score-sub">' + S.score + ' / ' + n + ' correct answers</div>' +
    '<div class="score-verdict">' + v + '</div></div>';
  /* Partage du score : epreuve chronometree uniquement, et seulement si le
     plugin de partage est installe. */
  if (S.sim && S.shareData && shareAvailable()) {
    h += '<div class="navrow"><button class="btn" id="shareBtn" onclick="shareScore()">' +
      ico('share', 'inl') + ' Share my score</button></div>';
  }

  if (S.wrongs.length) {
    h += '<div class="note">' + S.wrongs.length + ' question' + (S.wrongs.length > 1 ? 's have' : ' has') +
      ' joined your mistake box. ' + (S.wrongs.length > 1 ? 'They are waiting' : 'It is waiting') +
      ' for you in <b>Review &rsaquo; Smart review</b>.</div>';
  }
  h += '<div class="navrow">' +
    (S.wrongs.length ? '<button class="btn" onclick="startRetry()">Retry my ' + S.wrongs.length + ' mistakes</button>' : '') +
    '<button class="btn ghost" onclick="goTab(\'home\')">Home</button></div>';
  if (S.wrongs.length) {
    h += '<div class="secttl">To review</div>';
    S.wrongs.forEach(function (w) {
      h += '<div class="rev"><div class="rq">' + fmt(w.q) + '</div>' +
        '<div class="ra"><span class="no">Your answer: ' + fmt(w.your) + '</span><br>' +
        '<span class="yes">Correct answer: ' + fmt(w.c) + '</span></div>' +
        (w.e ? '<div class="re">' + fmt(w.e) + '</div>' : '') + '</div>';
    });
  }
  root.innerHTML = L(h);
}

/* ===================== AVIS GOOGLE PLAY (in-app review) =================
   Plugin cordova-launch-review 4.2.0 : LaunchReview.rating() ouvre la
   fenetre de notation de Google Play par-dessus l'application, sans la
   quitter (API officielle « Play In-App Review »). Aucune question
   prealable (« Aimez-vous l'application ? ») : interdit par Google.

   MOMENTS (v5.9.22), toujours un moment de reussite :
     . fin d'une epreuve chronometree a 70 % ou plus ;
     . fin d'une serie, quand 5 questions sont sorties de la boite a fautes ;
     . fin d'une serie d'entrainement (Quick test, theme, revision...)
       reussie a 60 % ou plus, des que 6 series ont ete terminees sur ce
       telephone ;
     . pendant un parcours long (Full set de Grammar, Vocabulary, Idioms...),
       apres 40 reponses d'affilee dans la serie avec au moins 60 % de
       bonnes reponses, entre deux questions (au moment de « Next »).
   JAMAIS : au premier lancement ; pendant une question ou une epreuve
   chronometree ; juste apres une mauvaise reponse ; moins de 90 secondes
   apres une annonce (meme ecart minimal qu'entre deux annonces). Et
   aucune annonce dans les 3 minutes qui suivent la fenetre d'avis.
   AU PLUS UNE FOIS PAR MOIS : les 30 jours ne partent que si Google a
   REELLEMENT affiche la fenetre (l'application passe alors en pause, ce
   qui le signale). Sinon (application installee hors Google Play, quota
   Google, compte ayant deja note), nouvel essai au prochain bon moment,
   au plus une fois par lancement.
   Google decide en dernier : l'application ne peut pas savoir si
   quelqu'un a deja laisse un avis.                                         */
var REVIEW = {
  minPct: 70,          // epreuve chronometree reussie
  boxExits: 5,         // questions sorties de la boite a fautes
  sets: 6,             // series terminees sur ce telephone
  setPct: 60,          // score minimal de la serie ou du parcours (2 regles ci-dessus)
  runAnswers: 40,      // reponses d'affilee dans une meme serie (parcours long)
  everyDays: 30,       // au plus une fenetre par mois
  gapAfterAdMs: 90000,     // pas de fenetre moins de 90 s apres une annonce
  noAdAfterMs: 180000,     // pas d'annonce dans les 3 min qui suivent la fenetre
  delayMs: 2000        // ecran de resultats : 2 s apres le score
};
var reviewTried = false;   // une seule tentative par lancement
function reviewApi() {
  var r = window.LaunchReview;
  return (r && typeof r.rating === 'function') ? r : null;
}
function setsDone() { var h = LSget('hist', []); return (h && h.length) || 0; }
function reviewShownAt() { return parseInt(LSget('review_at', 0), 10) || 0; }
/* Conditions communes : renvoie la raison du refus, ou '' si tout va bien. */
function reviewBlock(ignoreAnswer) {
  if (!reviewApi()) return 'review plugin not installed';
  if (ECL_LAUNCH < 2) return 'first launch of the app';
  if (reviewTried) return 'already tried during this launch';
  var shown = reviewShownAt();
  if (shown && shown <= nowMs() && nowMs() - shown < REVIEW.everyDays * 86400000) return 'shown by Google less than 30 days ago';
  var lastAd = (window.Ads && Ads.lastAdAt) ? Ads.lastAdAt() : 0;
  if (lastAd && nowMs() - lastAd < REVIEW.gapAfterAdMs) return 'an ad was shown less than 90 seconds ago';
  if (!ignoreAnswer && !S.lastGood) return 'last answer was wrong';
  return '';
}
/* Fin de serie : 'test', 'box', 'sets' ou '' (aucune demande). */
function reviewMoment(p) {
  if (reviewBlock()) return '';
  if (S.sim && p >= REVIEW.minPct) return 'test';
  if ((parseInt(LSget('boxout', 0), 10) || 0) >= REVIEW.boxExits) return 'box';
  if (!S.sim && p >= REVIEW.setPct && setsDone() >= REVIEW.sets) return 'sets';
  return '';
}
/* Parcours long : appele au moment de « Next », AVANT l'annonce eventuelle.
   Renvoie true si la fenetre est demandee (alors pas d'annonce ici). */
function reviewDuringRun() {
  if (S.sim) return false;
  var n = S.runAnswered || 0;
  if (n < REVIEW.runAnswers || pct(S.runCorrect || 0, n) < REVIEW.setPct) return false;
  if (reviewBlock()) return false;
  requestReview('long set');
  return true;
}
/* Ecran de resultats, 2 s apres le score. L'utilisateur a pu quitter
   l'ecran, ouvrir le partage ou passer en arriere-plan entre-temps : on
   renonce alors sans rien enregistrer. */
function askReview(why) {
  if (S.view !== 'result' || APP_PAUSED || AD_OPEN || document.hidden) return;
  if (reviewBlock()) return;
  requestReview(why);
}
function requestReview(why, then) {
  var api = reviewApi();
  if (!api) { if (then) then(); return; }
  reviewTried = true;
  stopSpeak();
  if (window.Ads && Ads.holdFor) Ads.holdFor(REVIEW.noAdAfterMs);   // pas d'annonce pendant la demande
  adOpening();                                                   // voix bloquee pendant la fenetre
  var paused = false, over = false;
  var info = { when: nowMs(), why: why, result: 'waiting for Google' };
  LSset('review_last', info);
  function onPause() { paused = true; }
  function onResume() { if (paused) setTimeout(function () { wrapUp(''); }, 1500); }
  document.addEventListener('pause', onPause, false);
  document.addEventListener('resume', onResume, false);
  function wrapUp(err) {
    if (over) return; over = true;
    document.removeEventListener('pause', onPause, false);
    document.removeEventListener('resume', onResume, false);
    if (paused) {
      LSset('review_at', nowMs());          // fenetre vraiment affichee : 30 jours
      LSset('boxout', 0);
      info.result = 'shown by Google';
      if (window.Ads && Ads.holdFor) Ads.holdFor(REVIEW.noAdAfterMs);   // 3 min sans annonce apres
    } else {
      info.result = 'not shown by Google' + (err ? ' (' + err + ')' :
        ' (app not installed from Google Play, account that already rated, or Google limit)');
      if (window.Ads && Ads.holdFor) Ads.holdFor(0);
    }
    LSset('review_last', info);
    adClosed();
    if (then) then();
  }
  setTimeout(function () { if (!paused) wrapUp('no answer from Google'); }, 15000);
  try {
    api.rating(function () { wrapUp(''); },
      function (e) { wrapUp(String((e && e.message) || e || 'error').slice(0, 120)); });
  } catch (e) { wrapUp(String(e).slice(0, 120)); }
}

/* ===================== OUTILS DEVELOPPEUR (caches) ======================
   Settings > About : toucher 7 fois « version ... » affiche ou masque une
   carte reservee au developpeur, sur CE telephone seulement :
     . annonces de test Google (toujours disponibles) pour verifier les
       regles d'affichage sans dependre des vraies annonces ;
     . etat de la fenetre d'avis, demande immediate, remise a zero.
   Les utilisateurs ne la voient jamais.                                   */
var devTaps = 0, devTapTimer = null;
function devTap() {
  devTaps++;
  clearTimeout(devTapTimer);
  devTapTimer = setTimeout(function () { devTaps = 0; }, 3000);
  if (devTaps < 7) return;
  devTaps = 0;
  var on = !LSget('dev', 0);
  LSset('dev', on ? 1 : 0);
  toast(on ? 'Developer tools on' : 'Developer tools off');
  VIEWS.settings();
}
function devDate(ms) {
  var d = new Date(ms), z = function (n) { return ('0' + n).slice(-2); };
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
}
function devCard() {
  var saved = !!(window.Ads && Ads.testModeSaved && Ads.testModeSaved());
  var running = !!(window.Ads && Ads.testMode && Ads.testMode());
  var shown = reviewShownAt(), last = LSget('review_last', null), block = reviewBlock(true);
  var h = '<div class="gcard"><h3>Developer tools</h3>' +
    '<p class="fr">Only on this phone, never shown to users. Tap the version number 7 times to hide this card.</p>';
  h += '<p class="fr"><b>Test ads:</b> ' + (running ? 'ON' : 'off') +
    (saved !== running ? ' (' + (saved ? 'ON' : 'off') + ' after you close and reopen the app)' : '') +
    '<br>Google sample ads are always available: use them to check when ads appear.</p>' +
    '<button class="btn ghost block" onclick="devTestAds(' + (saved ? 0 : 1) + ')">' +
    (saved ? 'Back to real ads' : 'Use test ads') + '</button>';
  h += '<p class="fr" style="margin-top:16px"><b>Google review window</b><br>' +
    'Plugin: ' + (reviewApi() ? 'installed' : 'MISSING') + '<br>' +
    'Launch number: ' + ECL_LAUNCH + '<br>' +
    'Sets finished on this phone: ' + setsDone() + ' (needed: ' + REVIEW.sets + ')<br>' +
    'Questions out of the mistake box: ' + (parseInt(LSget('boxout', 0), 10) || 0) + ' (needed: ' + REVIEW.boxExits + ')<br>' +
    'Last shown by Google: ' + (shown ? devDate(shown) : 'never') + '<br>' +
    'Last attempt: ' + (last && last.when ? devDate(last.when) + ', ' + esc(last.why) + ': ' + esc(last.result) : 'none') + '<br>' +
    'Now: ' + (block ? 'blocked (' + esc(block) + ')' : 'nothing blocks it; it will be asked at the next good moment') + '</p>' +
    '<button class="btn ghost block" onclick="devReviewNow()">Ask Google for the review window now</button>' +
    '<button class="btn ghost block" onclick="devReviewReset()">Reset the review rules</button></div>';
  return h;
}
function devTestAds(on) {
  if (window.Ads && Ads.setTestMode) Ads.setTestMode(!!on);
  toast('Close the app completely and reopen it to apply');
  VIEWS.settings();
}
function devReviewNow() {
  if (!reviewApi()) { toast('Review plugin missing'); return; }
  toast('Asking Google…');
  requestReview('manual test', function () { if (S.view === 'settings') VIEWS.settings(); });
}
function devReviewReset() {
  LSdel('review_at'); LSdel('review_last'); LSset('boxout', 0); reviewTried = false;
  toast('Review rules reset');
  VIEWS.settings();
}

/* ================ PARTAGE DU SCORE (epreuve chronometree) ================
   Plugin cordova-plugin-x-socialsharing 6.0.4. Le bouton « Share my score »
   de l'ecran de resultats dessine une carte carree (nom de l'application,
   score, date) dans un canvas, la convertit en PNG base64 (data URI) et
   ouvre le menu de partage d'Android avec l'image et le texte ci-dessous.
   Sans le plugin (navigateur, oubli d'installation), le bouton n'apparait
   pas.                                                                    */
var SHARE_URL = 'https://play.google.com/store/apps/details?id=com.ecltrainer.english';
function shareApi() {
  var p = window.plugins;
  return (p && p.socialsharing && typeof p.socialsharing.shareWithOptions === 'function') ? p.socialsharing : null;
}
function shareAvailable() { return !!shareApi(); }
function shareText(d) {
  return 'I scored ' + d.score + '/' + d.total + ' on an ECL practice test. ' +
    '1,900+ explained questions, read aloud, works offline: ' + SHARE_URL;
}
var shareBusy = false;
function shareScore() {
  var d = S.shareData, api = shareApi();
  if (!d || !api || shareBusy) return;
  shareBusy = true; buzz(8); stopSpeak();
  var btn = document.getElementById('shareBtn');
  if (btn) btn.disabled = true;
  var over = false;
  function done() {
    if (over) return; over = true;
    shareBusy = false;
    var b = document.getElementById('shareBtn'); if (b) b.disabled = false;
  }
  setTimeout(done, 5000);        // filet : le bouton revient meme sans reponse du plugin
  scoreCard(d, function (uri) {
    var opt = {
      message: shareText(d),
      subject: 'My ECL practice test score',   // sert aussi de nom au fichier image
      chooserTitle: 'Share your score'
    };
    if (uri) opt.files = [uri];
    try {
      api.shareWithOptions(opt, done, function (e) { done(); logError(e, 'partage'); });
    } catch (e) { done(); logError(e, 'partage'); toast('Sharing is not available on this device'); }
  });
}

/* Carte de score 1080 x 1080 : format carre accepte tel quel par WhatsApp,
   Facebook, Instagram et Telegram, aux couleurs de l'application (bleu
   nuit, or). Le logo (img/logo.png) est dessine s'il se charge ; si la
   WebView refuse d'exporter un canvas contenant une image, la carte est
   refaite sans logo. Si tout echoue, le texte est partage seul.          */
var CARD_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
function cardDate(ms) {
  var d = new Date(ms);
  return CARD_MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}
function scoreCard(d, cb) {
  var logo = new Image(), sent = false;
  function out(withLogo) {
    if (sent) return; sent = true;
    var uri = null;
    try { uri = drawCard(d, withLogo ? logo : null); }
    catch (e) {
      try { uri = drawCard(d, null); } catch (e2) { logError(e2, 'carte de score'); uri = null; }
    }
    cb(uri);
  }
  logo.onload = function () { out(true); };
  logo.onerror = function () { out(false); };
  setTimeout(function () { out(false); }, 1500);
  logo.src = 'img/logo.png';
}
function cardRound(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function cardSpacing(g, v) { try { if ('letterSpacing' in g) g.letterSpacing = v; } catch (e) { } }
function drawCard(d, logo) {
  var W = 1080, H = 1080, cx = W / 2;
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var g = c.getContext('2d');
  var SANS = 'Roboto, "Segoe UI", Arial, sans-serif';
  var SERIF = 'Georgia, "Noto Serif", "Times New Roman", serif';
  var GOLD = '#C9A227', GOLDL = '#E9CA6C', INK = '#EAF0F9', MUT = '#9DB0CE', LINE = '#24426F';

  /* Fond bleu nuit et cadre dore */
  var bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0C1F3E'); bg.addColorStop(1, '#08152B');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(201,162,39,.55)'; g.lineWidth = 4;
  cardRound(g, 36, 36, W - 72, H - 72, 40); g.stroke();

  /* En-tete : logo + nom de l'application */
  var lx = 100, ly = 96, ls = 140;
  if (logo) {
    g.save(); cardRound(g, lx, ly, ls, ls, 30); g.clip();
    g.drawImage(logo, lx, ly, ls, ls);
    g.restore();
  }
  var tx = logo ? lx + ls + 36 : lx;
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = GOLDL; g.font = 'bold 66px ' + SERIF;
  g.fillText('ECL & ALCPT', tx, ly + 64);
  g.fillStyle = INK; g.font = '48px ' + SERIF;
  g.fillText('English Trainer', tx, ly + 126);

  /* Libelle */
  g.textAlign = 'center';
  g.fillStyle = MUT; g.font = '600 30px ' + SANS;
  cardSpacing(g, '8px'); g.fillText('ECL PRACTICE TEST', cx, 336); cardSpacing(g, '0px');

  /* Anneau de score */
  var cy = 575, R = 180;
  g.lineWidth = 30; g.lineCap = 'round';
  g.strokeStyle = LINE; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  var frac = Math.max(0, Math.min(1, d.pct / 100));
  if (frac > 0) {
    var arc = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    arc.addColorStop(0, GOLDL); arc.addColorStop(1, GOLD);
    g.strokeStyle = arc; g.beginPath();
    g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2 - (frac >= 1 ? 0.0001 : 0));
    g.stroke();
  }

  /* Pourcentage au centre */
  var num = String(d.pct);
  var big = num.length >= 3 ? 124 : 150, small = num.length >= 3 ? 56 : 66;   // « 100 % » tient dans l'anneau
  g.textAlign = 'left'; g.fillStyle = GOLDL;
  g.font = 'bold ' + big + 'px ' + SANS; var wN = g.measureText(num).width;
  g.font = 'bold ' + small + 'px ' + SANS; var wP = g.measureText('%').width;
  var sx = cx - (wN + 8 + wP) / 2, base = cy + Math.round(big * 0.35);
  g.font = 'bold ' + big + 'px ' + SANS; g.fillText(num, sx, base);
  g.font = 'bold ' + small + 'px ' + SANS; g.fillText('%', sx + wN + 8, base);

  /* Score detaille et date */
  g.textAlign = 'center';
  g.fillStyle = INK; g.font = 'bold 54px ' + SANS;
  g.fillText(d.score + ' / ' + d.total + ' correct answers', cx, 868);
  g.fillStyle = MUT; g.font = '38px ' + SANS;
  g.fillText(cardDate(d.at), cx, 928);

  /* Pied : ou trouver l'application */
  var foot = 'FREE ON GOOGLE PLAY';
  g.fillStyle = GOLDL; g.font = '600 26px ' + SANS;
  cardSpacing(g, '6px');
  var wF = g.measureText(foot).width;
  g.fillText(foot, cx, 997);
  cardSpacing(g, '0px');
  g.strokeStyle = 'rgba(201,162,39,.65)'; g.lineWidth = 2; g.lineCap = 'butt';
  g.beginPath();
  g.moveTo(cx - wF / 2 - 86, 988); g.lineTo(cx - wF / 2 - 26, 988);
  g.moveTo(cx + wF / 2 + 26, 988); g.lineTo(cx + wF / 2 + 86, 988);
  g.stroke();

  return c.toDataURL('image/png');
}

/* ============================== REFERENCES ============================== */
VIEWS.drills = function () {
  var h = bar('Corrected drills');
  h += '<div class="note">The gap-fill sets from the course, with the full answer key. Tap an item to reveal its answer.</div>';
  DRILLS.forEach(function (d, i) {
    h += entry('openDrill(' + i + ')', esc(d.title), d.items.length + ' items', esc(d.tag));
  });
  root.innerHTML = L(h + tabbar('revise'));
};
function openDrill(i) {
  var d = DRILLS[i];
  if (VIEWS[S.view]) NAV.push({ v: S.view, a: S.viewArg });
  S.view = 'drill';
  var h = bar(d.title);
  h += '<div class="note">' + esc(d.instruction) + '</div>';
  h += '<div class="paper-tools"><button class="btn ghost" onclick="allDrills(1)">Show all</button>' +
    '<button class="btn ghost" onclick="allDrills(0)">Hide all</button></div>';
  d.items.forEach(function (it, k) {
    h += '<div class="dr" onclick="this.classList.toggle(\'open\')">' +
      '<div class="dq"><b>' + (k + 1) + '.</b> ' + esc(it[0]) + '</div>' +
      '<div class="da">' + esc(it[1]) + '</div></div>';
  });
  h += '<div class="navrow">' +
    (i > 0 ? '<button class="btn ghost" onclick="openDrill(' + (i - 1) + ')">&lsaquo; Previous</button>' : '') +
    (i < DRILLS.length - 1 ? '<button class="btn" onclick="openDrill(' + (i + 1) + ')">Next &rsaquo;</button>' : '') +
    '</div>';
  root.innerHTML = L(h); window.scrollTo(0, 0);
}
function allDrills(on) {
  var n = document.querySelectorAll('.dr');
  for (var i = 0; i < n.length; i++) n[i].classList[on ? 'add' : 'remove']('open');
}

VIEWS.library = function (f, _a, resultsOnly) {
  f = f || '';
  var h = '';
  var q = f.toLowerCase(), n = 0;
  IDIOMS_LIB.forEach(function (it, i) {
    if (q && it.i.toLowerCase().indexOf(q) < 0 && it.m.toLowerCase().indexOf(q) < 0) return;
    n++;
    h += '<div class="icard"><div class="ih"><div class="idm">' + esc(it.i) + '</div>' +
      (audioOK() ? '<button class="spk" onclick="spkNow(IDIOMS_LIB[' + i + '].i+\'. \'+IDIOMS_LIB[' + i + '].x)">' + ico('sound') + '</button>' : '') +
      '</div><div class="im">' + esc(it.m) + '</div><div class="ix">&ldquo;' + esc(it.x) + '&rdquo;</div></div>';
  });
  if (!n) h += '<div class="empty">' + ico('none', 'ei') + '<p>No result.</p></div>';
  if (resultsOnly) return h;
  root.innerHTML = L(bar('Idioms Library') +
    '<input class="search" id="lq" placeholder="Search an idiom or a meaning\u2026" value="' + esc(f) +
    '" oninput="libSearch(this.value)" autocomplete="off" autocorrect="off" ' +
    'autocapitalize="none" spellcheck="false">' +
    '<div id="sr">' + h + '</div>' + tabbar('revise'));
  focusSearch('lq', f);
};
function libSearch(v) { liveSearch(VIEWS.library, v); }

/* ============================== PROGRESSION ============================= */
VIEWS.progress = function () {
  var best = LSget('best', {}), hist = LSget('hist', []), d = dailyLog();
  var h = '<header class="phead-lg"><h2>My progress</h2>' +
    '<p>Last seven days, best score per bank, sets in progress.</p></header>';

  /* semaine */
  var labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var maxv = goalTarget();
  var bars = '';
  for (var i = 6; i >= 0; i--) {
    var k = dayKey(i), v = d[k] || 0;
    if (v > maxv) maxv = v;
  }
  for (i = 6; i >= 0; i--) {
    var kk = dayKey(i), vv = d[kk] || 0;
    var dt = new Date(); dt.setDate(dt.getDate() - i);
    bars += '<div class="wbar"><span class="wv">' + (vv || '') + '</span>' +
      '<i style="height:' + Math.max(3, Math.round(100 * vv / maxv)) + '%"' +
      (vv >= goalTarget() ? ' class="full"' : '') + '></i>' +
      '<span class="wl">' + labels[dt.getDay()] + '</span></div>';
  }
  var total = Object.keys(d).reduce(function (a, k2) { return a + d[k2]; }, 0);
  h += '<div class="gcard"><h3>This week</h3><div class="week">' + bars + '</div>' +
    '<p class="fr">' + answeredToday() + ' today &middot; ' + total + ' total &middot; ' +
    'goal ' + goalTarget() + ' per day &middot; ' + streakDays() + ' day' + (streakDays() === 1 ? '' : 's') + ' in a row</p></div>';

  /* precision par domaine */
  var sec = { grammar: [0, 0], vocab: [0, 0], idiom: [0, 0], test: [0, 0] };
  Object.keys(best).forEach(function (k) {
    var b = BANKS[k]; if (!b) return;
    sec[b.section][0] += best[k]; sec[b.section][1]++;
  });
  var names = { grammar: 'Grammar', vocab: 'Vocabulary', idiom: 'Idioms', test: 'Tests' };
  var rows = '';
  Object.keys(sec).forEach(function (s) {
    if (!sec[s][1]) return;
    var avg = Math.round(sec[s][0] / sec[s][1]);
    rows += '<div class="prow"><span class="pn">' + names[s] + '</span>' +
      '<span class="pbar"><i style="width:' + avg + '%"></i></span><span class="pv">' + avg + '%</span></div>';
  });
  if (rows) h += '<div class="gcard"><h3>Average by area</h3>' + rows + '</div>';

  var keys = Object.keys(best).filter(function (k) { return BANKS[k] || k.indexOf('all_') === 0; })
    .sort(function (a, b) { return best[b] - best[a]; });
  if (!keys.length) {
    h += '<div class="empty">' + ico('chart', 'ei') + '<p>Complete a set to see your best scores here.</p>' +
      '<button class="btn" onclick="goTab(\'revise\')">Get started</button></div>';
  } else {
    h += '<div class="secttl">Best scores</div><div class="gcard">';
    keys.forEach(function (k) {
      var lbl = BANKS[k] ? BANKS[k].label : 'Full set';
      h += '<div class="prow"><span class="pn">' + esc(lbl) + '</span>' +
        '<span class="pbar"><i style="width:' + best[k] + '%"></i></span>' +
        '<span class="pv">' + best[k] + '%</span></div>';
    });
    h += '</div>';
  }

  var runs = [];
  Object.keys(BANKS).concat(['all_grammar', 'all_vocab', 'all_idiom']).forEach(function (k) {
    var r = getRun(k); if (r && r.i > 0) runs.push({ k: k, r: r });
  });
  if (runs.length) {
    h += '<div class="secttl">Sets in progress</div>';
    runs.forEach(function (x) {
      h += entry("resumeRun('" + x.k + "')", esc(x.r.t), 'Question ' + (x.r.i + 1) + ' of ' + x.r.p.length, '&rsaquo;');
    });
  }
  if (hist.length) {
    h += '<div class="secttl">History</div>';
    hist.slice(0, 15).forEach(function (x) {
      var dt = new Date(x.d);
      h += '<div class="rev"><div class="rq">' + esc(x.n) + '</div><div class="ra">' +
        '<span class="yes">' + x.p + '% &middot; ' + x.q + ' questions</span> &mdash; ' +
        dt.toLocaleDateString('en-US') + '</div></div>';
    });
  }
  root.innerHTML = L(h + tabbar('progress'));
};

/* =============================== REGLAGES =============================== */
VIEWS.settings = function () {
  var h = '<header class="phead-lg"><h2>Settings</h2><p>US audio, appearance, study preferences and data.</p></header>';
  var ok = audioOK();

  /* -------- Audio -------- */
  h += '<div class="gcard"><h3>Audio</h3>';
  if (ok) {
    h += '<div class="banner ok">&#10004; <span>Audio playback works</span> &mdash; ' +
      esc(Speech.engineName()) + '.</div>';
    h += '<div id="voiceBox"><p class="fr">Loading voices\u2026</p></div>';
    h += '<p class="fr" style="margin-top:14px">Speed: <b id="rv">' + Speech.getRate() + '</b></p>' +
      '<input class="rng" type="range" min="0.5" max="1.3" step="0.02" value="' + Speech.getRate() +
      '" oninput="document.getElementById(\'rv\').textContent=this.value;Speech.setRate(this.value)">';
    var bms = (Speech.getBlankMs ? Speech.getBlankMs() : 400) / 1000;
    h += '<p class="fr" style="margin-top:8px">Silence for a blank (_____): ' +
      '<b id="bv">' + bms.toFixed(1) + ' s</b></p>' +
      '<input class="rng" type="range" min="0" max="2" step="0.1" value="' + bms +
      '" oninput="document.getElementById(\'bv\').textContent=(+this.value).toFixed(1)+\' s\';Speech.setBlankMs(this.value*1000);LSset(\'blankms\',this.value*1000);LSset(\'blankms_user\',1)">';
    h += '<label class="switch" style="margin-top:14px"><input type="checkbox"' +
      (autoOn() ? ' checked' : '') + ' onchange="setAuto(this.checked)"> ' +
      'Automatic reading during tests</label>' +
      '<p class="fr">The question and its choices are read on their own, then the ' +
      'correction, and the next question comes up by itself. You can also switch ' +
      'this on or off with the <b>Auto</b> button on any question.</p>';
    h += '<div class="navrow"><button class="btn ghost" onclick="testVoice()">Test the voice</button>' +
      '<button class="btn ghost" onclick="testChoices()">Test a blank + choices</button></div>';
  } else {
    h += '<div class="banner bad">&#10008; US English audio is not available yet.</div>' +
      '<p class="fr">Open Android text-to-speech settings and install or enable an English (United States) voice. ' +
      'Then return to the app and use <b>Test the voice</b>.</p>';
  }
  h += '<button class="btn ghost block" onclick="openVoiceSettings()">Install or enable Google voices</button>' +
    '<button class="btn ghost block" onclick="showDiag()">Detailed diagnostics</button><div id="dg"></div></div>';

  /* -------- Display -------- */
  var th = LSget('theme', 'paper'), fs = LSget('fontsize', '');
  h += '<div class="gcard"><h3>Display</h3><p class="fr">Theme</p><div class="chips">' +
    [['navy', 'Navy'], ['ink', 'Night'], ['paper', 'Paper']].map(function (t) {
      return '<button class="chip' + (th === t[0] ? ' on' : '') + '" onclick="setTheme(\'' + t[0] + '\')">' + t[1] + '</button>';
    }).join('') + '</div>' +
    '<p class="fr" style="margin-top:14px">Text size</p><div class="chips">' +
    [['', 'Normal'], ['f-s', 'Small'], ['f-l', 'Large'], ['f-xl', 'Extra large']].map(function (f) {
      return '<button class="chip' + (fs === f[0] ? ' on' : '') + '" onclick="setFont(\'' + f[0] + '\')">' + f[1] + '</button>';
    }).join('') + '</div>' +
    '<label class="switch"><input type="checkbox"' + (LSget('haptic', 1) ? ' checked' : '') +
    ' onchange="LSset(\'haptic\',this.checked?1:0)"> Haptic feedback on answer</label></div>';

  /* -------- Objectif -------- */
  h += '<div class="gcard"><h3>Daily goal</h3><p class="fr">Questions per day</p><div class="chips">' +
    [10, 20, 30, 50].map(function (g) {
      return '<button class="chip' + (goalTarget() === g ? ' on' : '') + '" onclick="setGoal(' + g + ')">' + g + '</button>';
    }).join('') + '</div></div>';

  h += '<div class="gcard"><h3>Practice test timing</h3>' +
    '<p class="fr">Seconds allowed per question. The exam standard is 30 seconds, ' +
    'which gives 10 minutes for 20 questions and 50 minutes for 100.</p><div class="chips">' +
    [20, 30, 45, 60].map(function (v) {
      return '<button class="chip' + (secPerQ() === v ? ' on' : '') +
        '" onclick="setSecPerQ(' + v + ')">' + v + ' s</button>';
    }).join('') + '</div></div>';

  h += '<div class="gcard"><h3>Quick test</h3>' +
    '<p class="fr">Number of random questions from the home screen</p><div class="chips">' +
    [10, 20, 30, 50].map(function (n) {
      return '<button class="chip' + (quickN() === n ? ' on' : '') +
             '" onclick="setQuickN(' + n + ')">' + n + '</button>';
    }).join('') + '</div></div>';

  /* -------- Confidentialite -------- */
  if (window.Ads && Ads.hasPrivacyOptions()) {
    h += '<div class="gcard"><h3>Privacy</h3>' +
      '<button class="btn ghost block" onclick="Ads.showPrivacyOptions()">Privacy options</button></div>';
  }

  /* -------- Contenu et donnees -------- */
  h += '<div class="gcard"><h3>Content</h3><p class="fr">' +
    allQuestions().length + ' questions &middot; ' +
    DRILLS.reduce(function (a, d) { return a + d.items.length; }, 0) + ' corrected drill items &middot; ' +
    IDIOMS_LIB.length + ' reference idioms</p></div>';

  h += '<div class="gcard"><h3>My data</h3>' +
    '<p class="fr">Scores, favourites, the mistake box and preferences stay on this device. ' +
    'Export them before changing phones.</p>' +
    '<button class="btn ghost block" onclick="exportData()">Export my data</button>' +
    '<button class="btn ghost block" onclick="importData()">Import a backup</button>' +
    '<button class="btn ghost block danger" onclick="wipe()">Erase everything</button></div>';

  h += '<div class="gcard"><h3>About</h3><p class="fr">ECL English Trainer, <span onclick="devTap()">version ' + APP_VERSION + '</span>.<br>' +
    'Focused ECL and ALCPT preparation with US audio, adaptive review, reference material and timed tests.</p></div>';
  if (LSget('dev', 0)) h += devCard();

  root.innerHTML = L(h + tabbar('settings'));
  if (ok) setTimeout(renderVoiceBox, 0);
};

/* ------------------------- selecteur de voix ---------------------------- */
/* Every voice of the phone (or of the browser), not only the US ones.
   English voices first, grouped by accent (United States on top); the
   voices of the other languages appear when "Other languages" is ticked.
   Choosing a voice saves it and reads the test sentence.                  */
var VOICE_REGIONS = { US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  IE: 'Ireland', NZ: 'New Zealand', IN: 'India', ZA: 'South Africa', NG: 'Nigeria', GH: 'Ghana',
  KE: 'Kenya', TZ: 'Tanzania', SG: 'Singapore', PH: 'Philippines', HK: 'Hong Kong', PK: 'Pakistan' };
var VOICE_ORDER = ['US', 'GB', 'CA', 'AU', 'IE', 'NZ', 'IN', 'ZA', 'NG'];
var VOICE_ISO3 = { eng: 'en', USA: 'US', GBR: 'GB', CAN: 'CA', AUS: 'AU', IRL: 'IE', NZL: 'NZ',
  IND: 'IN', ZAF: 'ZA', NGA: 'NG' };
var V_FEMALE = /\b(iob|iog|sfg|tpc|tpf|Ava|Aria|Emma|Jenny|Michelle|Ana|Jane|Nancy|Sara|Amber|Ashley|Cora|Elizabeth|Monica|Libby|Maisie|Sonia|Natasha|Clara|Neerja|Emily|Molly|Leah|Ezinne|Luna|Rosa|Imani|Asilia|Zira|Hazel|Susan|Catherine|Heera|Linda|Samantha|Allison|Victoria|Karen|Moira|Tessa|Fiona|Serena|Kate|Veena|Zoe|Nicky|Joelle|Noelle|Martha)(Multilingual)?\b|\bfemale\b|Google US English/i;
var V_MALE = /\b(iol|iom|tpd|Andrew|Brian|Christopher|Eric|Guy|Roger|Steffan|Davis|Tony|Jason|Brandon|Kai|Ryan|Thomas|William|Liam|Prabhat|Connor|Mitchell|Luke|Abeo|Wayne|James|Elimu|Chilemba|David|Mark|George|Richard|Ravi|Sean|Alex|Fred|Daniel|Aaron|Arthur|Evan|Nathan|Tom|Rishi|Gordon|Oliver)(Multilingual)?\b|\bmale\b/i;

function voiceLoc(v) {
  var m = /^([a-z]{2,3})(?:[-_]([a-z]{2,3}|\d{3}))?/i.exec(String(v.lang || ''));
  if (!m) m = /^([a-z]{2,3})-([a-z]{2,3})-/i.exec(String(v.id || ''));    // en-us-x-iol-network
  if (!m) return { l: '', r: '' };
  var l = m[1].toLowerCase(), r = String(m[2] || '').toUpperCase();
  return { l: VOICE_ISO3[l] || l, r: VOICE_ISO3[r] || r };
}
function intlName(code, type) {
  try { if (window.Intl && Intl.DisplayNames) return new Intl.DisplayNames(['en'], { type: type }).of(code) || code; }
  catch (e) { }
  return code;
}
function voiceGender(v) {
  var t = String(v.name || '') + ' ' + String(v.id || ''), m = /#(female|male)_/i.exec(t);
  if (m) return m[1].toLowerCase();                  // older Google names: en-us-x-sfg#male_1-local
  return V_FEMALE.test(t) ? 'female' : (V_MALE.test(t) ? 'male' : '');
}
/* Short label: "iol · male · online" for an Android voice, the browser's
   name without its language for a web voice. */
function voiceLabel(v) {
  var id = String(v.id || ''), g = voiceGender(v), extra = [];
  var a = /^[a-z]{2,3}-[a-z]{2,3}-x-([a-z0-9]+)(?:#([a-z]+)_(\d+))?-(local|network)$/i.exec(id), nm;
  if (a) {
    nm = a[1] + (a[3] ? ' ' + a[3] : '');
    extra.push(a[4].toLowerCase() === 'network' ? 'online' : 'offline');
  } else if (/-language$/i.test(id)) nm = 'Standard voice';
  else nm = String(v.name || id).replace(/\s*[-–(]\s*[A-Z][a-z]+(\s[A-Za-z]+)?\s*\([^)]*\)\)?\s*$/, '').trim() || id;
  return nm + (g ? ' · ' + g : '') + (extra.length ? ' · ' + extra.join(' · ') : '');
}
function renderVoiceBox() {
  if (!window.Speech || !document.getElementById('voiceBox')) return;
  var lister = Speech.listAllVoices || Speech.listVoices;
  lister.call(Speech, function (list) {
    var box = document.getElementById('voiceBox');
    if (!box) return;
    var cur = Speech.getVoiceId();
    var def = Speech.defaultVoiceId ? Speech.defaultVoiceId() : 'en-us-x-iol-network';
    var showAll = !!LSget('voice_all', 0);
    var groups = {}, keys = [], nEn = 0, nOther = 0, exactInstalled = false;
    (list || []).forEach(function (v) {
      if (!v || !v.id) return;
      var loc = voiceLoc(v), en = loc.l === 'en';
      if ((v.id || '').toLowerCase() === String(def).toLowerCase()) exactInstalled = true;
      if (en) nEn++; else nOther++;
      if (!en && !showAll && v.id !== cur) return;
      var k = en ? 'en|' + (loc.r || 'ZZ') : 'zz|' + (loc.l || 'zz') + '|' + loc.r;
      if (!groups[k]) {
        groups[k] = { en: en, r: loc.r, l: loc.l, items: [] };
        keys.push(k);
      }
      groups[k].items.push(v);
    });
    function gName(gp) {
      if (gp.en) return 'English — ' + (gp.r && gp.r !== 'ZZ' ? (VOICE_REGIONS[gp.r] || intlName(gp.r, 'region')) : 'other');
      return intlName(gp.l, 'language') + (gp.r ? ' — ' + (VOICE_REGIONS[gp.r] || intlName(gp.r, 'region')) : '');
    }
    keys.sort(function (a, b) {
      var A = groups[a], B = groups[b];
      if (A.en !== B.en) return A.en ? -1 : 1;
      if (A.en) {
        var ia = VOICE_ORDER.indexOf(A.r), ib = VOICE_ORDER.indexOf(B.r);
        ia = ia < 0 ? 99 : ia; ib = ib < 0 ? 99 : ib;
        if (ia !== ib) return ia - ib;
      }
      return gName(A) < gName(B) ? -1 : (gName(A) > gName(B) ? 1 : 0);
    });
    var gOrder = { male: 0, female: 1, '': 2 }, flat = [], opts = '';
    keys.forEach(function (k) {
      var gp = groups[k];
      gp.items.sort(function (a, b) {
        var d = gOrder[voiceGender(a)] - gOrder[voiceGender(b)];
        if (d) return d;
        var la = voiceLabel(a).toLowerCase(), lb = voiceLabel(b).toLowerCase();
        return la < lb ? -1 : (la > lb ? 1 : 0);
      });
      opts += '<optgroup label="' + esc(gName(gp)) + ' (' + gp.items.length + ')">' + gp.items.map(function (v) {
        flat.push(v);
        return '<option value="' + (flat.length - 1) + '"' + (v.id === cur && cur !== def ? ' selected' : '') + '>' +
          esc(voiceLabel(v)) + '</option>';
      }).join('') + '</optgroup>';
    });
    var accents = keys.filter(function (k) { return groups[k].en; }).length;

    var h = '<p class="fr"><b>All the voices of this device</b>: ' + nEn + ' English voice' + (nEn > 1 ? 's' : '') +
      (accents > 1 ? ' in ' + accents + ' accents' : '') +
      (nOther ? ', ' + nOther + ' in other languages' : '') + '. Choose one: it is saved and reads a test sentence.</p>' +
      '<div class="voice-default"><span class="vd-k">Default</span><b>' + esc(def) +
      '</b><span>' + (exactInstalled ? 'Google US voice detected on this device.' :
      'Preferred Google US identifier. Android will use it when available, otherwise an installed US voice is used.') + '</span></div>';
    if (!flat.length) {
      h += '<p class="fr">No English voice is currently listed by Android. ' +
        'Install English (United States) voice data below.</p>';
    } else {
      h += '<select class="sel" onchange="pickVoice(this.value)" aria-label="Voice">' +
        '<option value="__default__"' + (cur === def ? ' selected' : '') + '>Default voice - ' + esc(def) + '</option>' +
        opts + '</select>';
    }
    h += '<p class="fr vsel-now" id="voiceNow"></p>';
    if (nOther) h += '<label class="switch"><input type="checkbox"' + (showAll ? ' checked' : '') +
      ' onchange="LSset(\'voice_all\',this.checked?1:0);renderVoiceBox()"> Other languages too (they read English with their own accent)</label>';
    box.innerHTML = h;
    box._list = flat;
    voiceNowInfo();
  });
}
/* "Voice in use": the exact name, to tell which one to keep as default. */
function voiceNowInfo() {
  var el = document.getElementById('voiceNow'), box = document.getElementById('voiceBox');
  if (!el || !window.Speech) return;
  var cur = Speech.getVoiceId(), v = null;
  ((box && box._list) || []).forEach(function (x) { if (x.id === cur) v = x; });
  var loc = v ? voiceLoc(v) : null;
  el.innerHTML = 'Voice in use: <b>' + esc(cur) + '</b>' + (v ? ' &middot; ' + esc(voiceLabel(v)) +
    (loc && loc.r ? ' &middot; ' + esc(VOICE_REGIONS[loc.r] || intlName(loc.r, 'region')) : '') : '');
}
function pickVoice(idx) {
  var box = document.getElementById('voiceBox');
  if (!box) return;
  if (idx === '__default__') {
    if (Speech.useDefaultVoice) Speech.useDefaultVoice();
    toast('Default voice selected');
    voiceNowInfo();
    testVoice();
    return;
  }
  var v = (box._list || [])[parseInt(idx, 10)];
  if (!v) return;
  Speech.setVoiceId(v.id, v.native);
  toast('Voice saved');
  voiceNowInfo();
  testVoice();
}
function openVoiceSettings() {
  if (window.Speech && Speech.openVoiceSettings()) {
    toast('Return to the app after installing a US English voice');
    return;
  }
  toast('Android Settings: System, Languages, Text-to-speech');
}
function testVoice() {
  spkNow('Good morning. This is a test of the audio engine. ' +
    'The commanding officer will brief the crew at zero eight hundred.');
}
function testChoices() {
  if (!audioOK()) { toast('Audio unavailable'); return; }
  var demo = { q: 'The convoy _____ the checkpoint when the ambush started.',
    o: ['approaches', 'was approaching', 'has approached', 'approach'], c: 'was approaching' };
  speakQuestionAndChoices(demo, true);
}
/* Etat des publicites, en clair, pour comprendre pourquoi une annonce
   plein ecran est apparue ou non (Settings > Detailed diagnostics). */
function adsDiagHtml() {
  if (!window.Ads || typeof Ads.state !== 'function') return '';
  var a = Ads.state();
  function dur(sec) { return (sec >= 60 ? Math.floor(sec / 60) + ' min ' : '') + (sec % 60) + ' s'; }
  var L = [];
  L.push('Ad plugin: ' + (!a.plugin ? 'not installed' : (a.ready ? 'ready' : 'starting')));
  L.push('Full-screen ad loaded: ' + (a.interstitialLoaded ? 'yes' : 'no'));
  if (a.lastLoadError) L.push('Last loading problem: ' + esc(a.lastLoadError) +
    (a.nextRetrySeconds ? '. Next try in about ' + dur(a.nextRetrySeconds) : ''));
  L.push('Launch number: ' + a.launch + ' (end of a set: one ad every ' + a.answersPerAd + ' answers)');
  L.push('Answers since the last ad: ' + a.answeredSinceAd);
  L.push('Full-screen ads shown since launch: ' + a.adsShown);
  L.push('Last ad: ' + (a.secondsSinceLastAd >= 0 ? dur(a.secondsSinceLastAd) + ' ago' : 'none since launch'));
  if (a.graceLeftSeconds > 0) L.push('Ad-free start: ' + dur(a.graceLeftSeconds) + ' left');
  if (a.testMode) L.push('<b>TEST ADS ON</b> (developer tools)');
  if (a.holdLeftSeconds > 0) L.push('No ad for ' + dur(a.holdLeftSeconds) + ' (review window)');
  if (a.lastDecision) L.push('Last decision: ' + esc(a.lastDecision));
  return '<div class="verdict ' + (a.ready && a.interstitialLoaded ? 'ok' : 'bad') +
    '" style="margin-top:10px"><b>Ads</b><span class="rule2">' + L.join('<br>') + '</span></div>';
}
function showDiag() {
  var el = document.getElementById('dg');
  if (!window.Speech) { el.innerHTML = '<div class="verdict bad">Engine not loaded.</div>' + adsDiagHtml(); return; }
  var d = Speech.diagnose();
  el.innerHTML = '<div class="verdict ' + (audioOK() ? 'ok' : 'bad') + '"><b>Diagnostic</b><span class="rule2">' +
    'Web Speech API: ' + (d.webSpeech ? 'present' : 'not exposed by this WebView') + '<br>' +
    'Native TTS plugin: ' + (d.nativePlugin ? 'ACTIVE' : 'not installed') + '<br>' +
    'Preferred voice: ' + esc(d.preferredVoice || '') + '<br>' +
    'Chunk size: ' + d.chunkSize + ' characters<br>' +
    'Voices loaded: ' + d.voicesLoaded + '<br>' +
    'US English voices: ' + ((d.usEnglishVoices || []).length ? esc(d.usEnglishVoices.join(', ')) : 'none listed') + '<br>' +
    'Engine unlocked: ' + (d.unlocked ? 'yes' : 'no') +
    (d.lastError ? '<br>Last error: ' + esc(d.lastError) : '') +
    '</span></div>' + adsDiagHtml();
}
function setAuto(on) {
  LSset('autoaudio', on ? 1 : 0);
  if (!on) stopSpeak();
  toast(on ? 'Auto play on' : 'Auto play off');
}
function setFont(f) { LSset('fontsize', f); applySkin(); VIEWS.settings(); }
function setTheme(t) { LSset('theme', t); applySkin(); VIEWS.settings(); }
function setGoal(g) { LSset('goal', g); toast('Daily goal: ' + g + ' questions'); VIEWS.settings(); }
function applySkin() {
  var f = LSget('fontsize', ''), t = LSget('theme', 'paper');
  document.body.className = document.body.className
    .replace(/\bf-\w+\b/g, '').replace(/\bt-\w+\b/g, '').trim();
  document.body.classList.add('t-' + t);
  if (f) document.body.classList.add(f);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'paper' ? '#F3EFE4' : (t === 'ink' ? '#000000' : '#08152B'));
}

/* ------------------------------ donnees --------------------------------- */
var KEYS = ['best', 'hist', 'fav', 'box', 'daily', 'streak', 'goal', 'theme', 'fontsize', 'haptic'];
function exportData() {
  var o = { v: APP_VERSION, d: nowMs(), data: {} };
  KEYS.forEach(function (k) { var v = LSget(k, null); if (v !== null) o.data[k] = v; });
  copyText(JSON.stringify(o));
  toast('Backup copied. Paste it into a note');
}
function importData() {
  var s = prompt('Paste the exported backup here:');
  if (!s) return;
  try {
    var o = JSON.parse(s);
    if (!o || !o.data) throw new Error('format');
    Object.keys(o.data).forEach(function (k) { if (KEYS.indexOf(k) >= 0) LSset(k, o.data[k]); });
    applySkin(); toast('Backup restored'); goTab('home');
  } catch (e) { toast('Unreadable backup. Check the pasted text'); }
}
function wipe() {
  if (!confirm('Erase all scores, favourites, review data and settings? This cannot be undone.')) return;
  KEYS.forEach(LSdel);
  Object.keys(BANKS).forEach(clearRun);
  ['all_grammar', 'all_vocab', 'all_idiom'].forEach(clearRun);
  applySkin(); toast('Data erased'); goTab('home');
}

/* =========================== RAPPORT TECHNIQUE =========================
   Un seul ecran a photographier quand quelque chose ne fonctionne pas :
   moteur audio, plugins, WebView, erreurs rencontrees.                   */

/* ============================== CHARGEMENT ============================== */
var FILES = [
  ['data/base_grammar.json', 'BASE_GRAMMAR'], ['data/grammar_plus.json', 'GRAMMAR_PLUS'],
  ['data/express_qcm.json', 'EXPRESS_QCM'], ['data/base_vocab.json', 'BASE_VOCAB'],
  ['data/vocab_american.json', 'VOCAB_AM'], ['data/phrasal_verbs.json', 'PHRASALS'],
  ['data/idioms_quiz.json', 'IDIOMS_QUIZ'], ['data/idioms_library.json', 'IDIOMS_LIB'],
  ['data/module_test.json', 'MODULE_TEST'], ['data/express_drills.json', 'DRILLS']
];
function loadJSON(u) {
  return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); })
    .catch(function (err) {
      return new Promise(function (res, rej) {
        try {
          var x = new XMLHttpRequest(); x.open('GET', u);
          x.onload = function () { try { res(JSON.parse(x.responseText)); } catch (e) { rej(e); } };
          x.onerror = function () { rej(err); };
          x.send();
        } catch (e) { rej(err); }
      });
    });
}
function loadBundle() {
  return new Promise(function (res, rej) {
    if (window.__BUNDLE) return res(window.__BUNDLE);
    var s = document.createElement('script'); s.src = 'data/_bundle.js';
    s.onload = function () { window.__BUNDLE ? res(window.__BUNDLE) : rej(new Error('bundle vide')); };
    s.onerror = function () { rej(new Error('bundle introuvable')); };
    document.head.appendChild(s);
  });
}
/* ------------------- corrections de questions (octobre 2026) -------------------
   Relecture independante des questions : cle fausse ou ambigue, explication
   erronee, anglais britannique. Appliquees au chargement, en reperant chaque
   question par son texte d'origine : aucun fichier data/ a remplacer, et
   sans effet si la question est deja corrigee (site web).                  */
var QFIX = [
  ["PHRASALS", "In the middle of his speech, he *went off the deep end*.", {"o": ["He giggled a little.", "He started acting berserk.", "He gave extra, better examples.", "He answered questions correctly."]}],
  ["PHRASALS", "Where did you *pick up* those bad words?", {"o": ["select", "raise", "learn", "spell"], "e": "*Pick up* = learn something informally, just by hearing or seeing it, without studying."}],
  ["PHRASALS", "You don't have to stand up. *Be seated*.", {"o": ["lie down", "sit down", "wake up", "turn over"]}],
  ["PHRASALS", "We are planning a big party. Would you like to *participate*?", {"o": ["be in on it", "be behind in it", "be out of it", "be up to it"]}],
  ["PHRASALS", "Before you ask for a re-assignment, *consider the matter carefully*.", {"q": "Before you ask for a reassignment, *consider* the matter *carefully*.", "o": ["get through it", "come across it", "think it over", "check out of it"]}],
  ["PHRASALS", "The student *fell asleep* during the graduation speeches.", {"e": "*Drop off* = fall asleep, often without meaning to."}],
  ["IDIOMS_QUIZ", "The entire meal, including drinks and tip, *amounted to* $512.", {"e": "*Amount to* = *come to* (add up to a total): The bill came to $512."}],
  ["IDIOMS_QUIZ", "Let's *stop working* on this exercise for a minute and do something different.", {"q": "Let's *stop working on* this exercise for a minute and do something different."}],
  ["IDIOMS_QUIZ", "I can't go to the movies with you. I have to *burn the midnight oil*.", {"o": ["sleep all night", "work late at night", "watch TV all night", "make a 12:00 phone call"], "e": "*Burn the midnight oil* = work or study late into the night."}],
  ["IDIOMS_QUIZ", "He's *plying a new trade* these days.", {"o": ["He has a different job.", "He has remarried.", "He is driving a new car.", "He is living in a different home."], "e": "A *trade* = a job. To *ply a trade* = to work at a job."}],
  ["IDIOMS_QUIZ", "The *bean counters* probably won't agree to your budget requests.", {"o": ["cooks and chefs", "gardeners and farmers", "accountants or clerks in a business", "coaches or trainers for very weak athletes"], "e": "*Bean counter* (informal, slightly negative) = an accountant or finance official who cares mainly about costs."}],
  ["IDIOMS_QUIZ", "I told you a little white lie.", {"o": ["I fibbed.", "I flinched.", "I forged.", "I framed."], "e": "A *little white lie* = a small lie that is not serious = a *fib*."}],
  ["GRAMMAR_PLUS", "I would have called you if I _______ your number.", {"o": ["had had", "have had", "have", "would have"], "e": "Third conditional: if + past perfect (had + past participle). The past participle of *have* is *had*: if I had had your number."}],
  ["GRAMMAR_PLUS", "He plays _______ guitar very well.", {"q": "_______ Pacific is the largest ocean in the world.", "o": ["The", "A", "An", "(no article)"], "a": 0, "e": "Use *the* with oceans, seas and rivers: the Pacific, the Atlantic, the Mediterranean, the Nile."}],
  ["GRAMMAR_PLUS", "I'd rather you _______ mention this to anyone.", {"o": ["didn't", "don't", "won't", "hadn't"]}],
  ["MODULE_TEST", "Surprisingly, the people of that country ______ any gum disease.", {"o": ["doesn't have", "don't have", "hasn't", "isn't having"]}],
  ["MODULE_TEST", "Just as I was walking into the classroom, the bell ______.", {"o": ["ring", "ringing", "rang", "has rung"]}],
  ["MODULE_TEST", "While you are taking the ECL tomorrow, I ______ your papers.", {"o": ["read", "was reading", "will be reading", "have read"]}],
  ["MODULE_TEST", "We ______ the flight tickets yet.", {"o": ["don't book", "hasn't booked", "have booked", "haven't booked"]}],
  ["VOCAB_AM", "Would you like a cookie with your coffee? A “cookie” is:", {"o": ["a small, flat, sweet baked treat", "a slice of bread", "a candy bar", "a cracker with cheese"], "e": "Cookie (US) = biscuit (UK). In American English, a *biscuit* is a small soft bread roll."}],
  ["VOCAB_AM", "“To relieve” a unit means:", {"e": "To relieve a unit = to replace it with another unit in its position, so that it can rest or move elsewhere."}],
  ["VOCAB_AM", "“Hardware” in a defence context means:", {"q": "“Hardware” in a defense context means:", "e": "Hardware (defense) = military equipment."}],
  ["EXPRESS_QCM", "When I got to the pier, the ship ______ already ______.", {"o": ["has / sailed", "had / sailed", "is / sailing", "did / sail"], "e": "The past perfect (*had sailed*) shows an action completed before another past action (*I got to the pier*)."}],
  ["EXPRESS_QCM", "He ______ to Washington three times this year.", {"o": ["have been", "has been", "goes", "was going"]}],
  ["EXPRESS_QCM", "My purse was found ______ one of the cleaners.", {"o": ["to", "by", "from", "of"]}],
  ["EXPRESS_QCM", "\"Come here,\" she said. -> She told me to ______ there.", {"o": ["comes", "go", "went", "coming"], "e": "*Here* becomes *there*, and *come* usually becomes *go*, because the speaker is no longer at that place."}],
  ["EXPRESS_QCM", "Information about the enemy is called ______.", {"e": "*Intelligence* = information about an enemy's forces and plans."}],
  ["EXPRESS_QCM", "To move troops away from a dangerous area is to ______ them.", {"e": "To *evacuate* = to move people out of a dangerous place."}],
  ["EXPRESS_QCM", "A ______ officer deals with staff duties at headquarters.", {"q": "A ______ officer helps the commander with planning and administration at headquarters.", "e": "A *staff officer* works at headquarters and helps the commander plan and run operations."}],
  ["EXPRESS_QCM", "The chain of ______ defines who reports to whom.", {"e": "*Chain of command* = the line of authority through which orders pass."}],
  ["EXPRESS_QCM", "An aircraft that has no pilot on board is a ______.", {"e": "A *drone* (UAV) is an aircraft with no pilot on board."}],
  ["EXPRESS_QCM", "A ______ is a formal investigation of an incident.", {"q": "The commander ordered a formal ______ into the accident.", "e": "An *inquiry* = an official investigation. *Inquire* is the verb."}],
  ["EXPRESS_QCM", "The ship's ______ is the officer second in command.", {"e": "The *executive officer* (XO) is second in command after the commanding officer."}],
  ["EXPRESS_QCM", "To ______ a ceasefire means to respect it.", {"e": "To *observe* a ceasefire = to respect it; to *breach* it = to break it."}],
  ["EXPRESS_QCM", "Casualties are people who are ______ in an operation.", {"q": "Soldiers captured by the enemy are ______.", "o": ["prisoners of war", "veterans", "reservists", "deserters"], "a": 0, "e": "*Prisoners of war* (POWs) = members of the armed forces captured by the enemy."}],
  ["EXPRESS_QCM", "I _____ right now.", {"e": "*Right now* calls for the present progressive (am/is/are + -ing). With *I*, use *am*: I am studying."}],
  ["EXPRESS_QCM", "While I was driving to work this morning, I _____ to my new Celine Dion Cassette.", {"q": "When the alarm went off, the soldiers ______.", "o": ["sleep", "were sleeping", "are sleeping", "sleeping"], "a": 1, "e": "An action in progress (*were sleeping*) interrupted by a short action in the simple past (*went off*)."}],
  ["EXPRESS_QCM", "Last week, he promised me that he _____ attend yesterday's meeting.", {"e": "Reported speech: the reporting verb *promised* is in the past, so *will* becomes *would*."}],
  ["EXPRESS_QCM", "There was a fire _____ the library yesterday.", {"e": "Use *in* for something inside a building: in the library, in the dorms, in the hotel."}],
  ["EXPRESS_QCM", "They will not qualify him because his ECL is still _____ 80.", {"e": "A number can be *under* (below) another number: his ECL score is under 80. The temperature is below zero."}],
  ["EXPRESS_QCM", "If I were a person who _____ a million dollars, I would retire immediately.", {"e": "The unreal part is having a million dollars, so the verb after *who* is in the past too: if I were a person who *had* a million dollars, I would retire."}],
  ["EXPRESS_QCM", "Blake is 17 years old. Neil is 18 years old. Craig is 16 years old.", {"o": ["Neil is younger than Blake.", "Blake is older than Neil.", "Craig is younger than Neil.", "Craig is older than Blake."], "a": 2, "e": "Craig (16) is younger than Neil (18). Neil is the oldest and Craig is the youngest."}],
  ["EXPRESS_QCM", "That car is relatively inexpensive. _____, I think you should buy it.", {"e": "*Therefore* is a linking word that introduces a result. At the start of a sentence it is followed by a comma: You are studying a lot. Therefore, you should do well on the next test."}],
  ["EXPRESS_QCM", "Before _____, he meditated for three minutes.", {"e": "*Before* is a preposition here, so it is followed by a noun or a gerund: *starting* is the -ing form of *start*."}],
  ["EXPRESS_QCM", "Amine, it is high time you _____ for the examination.", {"q": "Amine, it is high time you _____ for the exam.", "o": ["are studying", "studied", "were studied", "are studied"], "a": 1, "e": "*It is (high) time* + subject + past simple: it is time you studied. The past form refers to the present."}],
  ["EXPRESS_QCM", "I do not remember _____ that decision. When was it taken?", {"q": "I do not remember _____ that decision. When was it made?"}],
  ["EXPRESS_QCM", "The patrol ______ back before dark yesterday.", {"o": ["comes", "came", "has come", "will come"], "e": "*Yesterday* is a finished time in the past: simple past, *came*."}],
  ["EXPRESS_QCM", "The color red on the flag _____ blood.", {"e": "*The color* is singular (*it*), so the present simple takes -s: *symbolizes*."}],
  ["EXPRESS_QCM", "The children are playing _____ the street again.", {"o": ["in", "at", "up", "through"], "e": "*In the street* = in the area of the road. *At* is used for a point, not for an area."}],
  ["EXPRESS_QCM", "He makes a living _____ recycling old newspaper and magazines.", {"q": "He makes a living _____ recycling old newspapers and magazines.", "e": "*By* + -ing tells how someone does something: he makes a living by recycling. She improved her English by reading every day."}],
  ["EXPRESS_QCM", "I heard some bad news _____ the radio this morning.", {"e": "*On the radio*, *on TV*, *on the Internet*: use *on* for the media."}],
  ["EXPRESS_QCM", "The next ECL will _____ easy.", {"e": "After a modal (*will, might, should*...), use the base form of the verb: *will be*."}],
  ["EXPRESS_QCM", "The escaped prisoner _____ last night near the airport.", {"e": "*Last night* calls for the past, and the prisoner did not catch anyone: he *was caught* (passive)."}],
  ["EXPRESS_QCM", "Yesterday, the news about the earthquakes in Chile and Peru _____bad.", {"q": "Yesterday, the news about the earthquakes in Chile and Peru _____ bad.", "e": "*Yesterday* calls for the past, and *news* is singular: the news *was* bad."}],
  ["EXPRESS_QCM", "If I finish my homework early, I _____ to the gym and work out.", {"e": "First conditional with *might*: a possible result in the future (*will* would make it certain)."}],
  ["EXPRESS_QCM", "I am here _____ your teacher, not _____ your parent.", {"e": "*As* = in the role of: I am here as your teacher. He will act as company commander for three weeks."}],
  ["EXPRESS_QCM", "It is not polite to stare _____ strangers.", {"e": "*Stare at*, *look at*, *point at*: these verbs take *at* before the person or thing."}],
  ["EXPRESS_QCM", "Do you remember _____ him at the conference in Zurich?", {"o": ["to meet", "we meet", "meeting", "met"]}]
];
function fixQuestions() {
  var banks = { BASE_GRAMMAR: BASE_GRAMMAR, GRAMMAR_PLUS: GRAMMAR_PLUS, EXPRESS_QCM: EXPRESS_QCM, BASE_VOCAB: BASE_VOCAB,
    VOCAB_AM: VOCAB_AM, PHRASALS: PHRASALS, IDIOMS_QUIZ: IDIOMS_QUIZ, MODULE_TEST: MODULE_TEST };
  QFIX.forEach(function (f) {
    var b = banks[f[0]] || [];
    for (var i = 0; i < b.length; i++) {
      if (b[i] && b[i].q === f[1]) { for (var k in f[2]) if (f[2].hasOwnProperty(k)) b[i][k] = f[2][k]; break; }
    }
  });
  [VOCAB_AM, PHRASALS, BASE_VOCAB].forEach(function (b) {
    (b || []).forEach(function (x) {
      if (x && typeof x.e === 'string') x.e = x.e.replace(/\((\*?)us(\*?)([,)])/g, '($1US$2$3');
      if (x && typeof x.q === 'string') x.q = x.q.replace(/\((\*?)us(\*?)([,)])/g, '($1US$2$3');
    });
  });
}
function afterLoad() {
  fixQuestions();
  buildBanks();
  // Acces direct a la page principale, a la premiere installation comme apres
  // une mise a jour : aucun ecran d'accueil, aucune page de nouveautes.
  // On fixe un objectif quotidien par defaut au premier lancement, et on
  // memorise la version pour ne plus rien afficher ensuite.
  if (!LSget('goal', null)) LSset('goal', 20);
  LSset('seen', APP_VERSION);
  goTab('home');
}
function boot() {
  root.innerHTML = L('<div class="boot"><img class="brandmark boot-mark" src="img/logo.png" alt="">' +
    '<p>Loading\u2026</p></div>');
  applySkin();
  if (window.Speech) {
    Speech.init();
    autoBind();   // enchainement de la lecture automatique
    // Duree du silence a la place d'un blanc. Valeur par defaut : 1,7 s.
    // On n'applique la preference enregistree que si l'utilisateur l'a
    // reellement choisie lui-meme (flag blankms_user), sinon on garde le
    // defaut a jour du moteur.
    /* Migration unique : les versions anterieures posaient un silence long
       (1,7 s puis 2,5 s). Toute valeur enregistree superieure a 1 seconde est
       donc un heritage, pas un choix : on la supprime une bonne fois.      */
    if (!LSget('blankms_reset', 0)) {
      var oldBm = LSget('blankms', null);
      if (oldBm !== null && oldBm > 1000) { LSdel('blankms'); LSdel('blankms_user'); }
      LSset('blankms_reset', 1);
    }
    var bm = LSget('blankms', null);
    if (bm !== null && LSget('blankms_user', 0) && Speech.setBlankMs) Speech.setBlankMs(bm);
  }
  return Promise.all(FILES.map(function (f) { return loadJSON(f[0]); })).then(function (res) {
    res.forEach(function (d, i) { window[FILES[i][1]] = d; });
    afterLoad();
  }).catch(function () {
    return loadBundle().then(function (B) {
      FILES.forEach(function (f) { if (B[f[1]]) window[f[1]] = B[f[1]]; });
      afterLoad();
    }).catch(function (e) {
      root.innerHTML = L('<div class="gcard"><h3>Data not found</h3><p>' + esc(String(e)) +
        '</p><p>On a computer, run <b>python -m http.server</b> in the www folder, ' +
        'then open http://localhost:8000.</p></div>');
    });
  });
}

/* ------------------------- integration Cordova -------------------------- */
document.addEventListener('deviceready', function () {
  if (window.StatusBar) {
    try { StatusBar.backgroundColorByHexString('#08152B'); StatusBar.styleLightContent(); } catch (e) { }
  }
  if (navigator.splashscreen) setTimeout(navigator.splashscreen.hide, 300);
  /* Module secondaire : initialisation differee, encapsulee, et sans effet
     sur le demarrage en cas d'echec.                                     */
  if (window.Ads) {
    setTimeout(function () {
      try {
        Ads.init().then(function () {
          adScreen(S.view === 'quiz' && S.sim ? 'sim' : 'normal');
        }, function () { });
      } catch (e) { }
    }, 1200);
  }
  if (window.Speech) setTimeout(function () {
    // Default: exact preferred Google US network voice when Android exposes it.
    // Other selectable voices are restricted to English (United States).
    try { Speech.autoSelectGoogle(function () {}); } catch (e) { }
    if (S.view === 'home') VIEWS.home();
  }, 800);
}, false);

document.addEventListener('backbutton', function (e) {
  e.preventDefault();
  if (S.view === 'home' || S.view === 'welcome') { if (navigator.app) navigator.app.exitApp(); }
  else if (S.view === 'quiz') quitQuiz();
  else back();
}, false);

document.addEventListener('pause', function () { stopSpeak(); if (S.view === 'quiz') saveRun(); }, false);
window.addEventListener('beforeunload', function () { if (S.view === 'quiz') saveRun(); });

/* clavier : utile en test sur PC */
document.addEventListener('keydown', function (e) {
  if (S.view !== 'quiz') return;
  var n = '12345678'.indexOf(e.key);
  if (n >= 0 && S.pool[S.idx] && n < S.pool[S.idx].o.length) { pick(n); return; }
  if (e.key === 'Enter' || e.key === 'ArrowRight') {
    var b = document.getElementById('nextBtn');
    if (b && !b.disabled) nextQ();
  }
});

boot();
