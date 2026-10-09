/* ==========================================================================
   translate.js - translation box and word translation
   ECL & ALCPT English Trainer website (lessons, reference pages, trainer)

   . Box: English -> the reader's language (Arabic by default, any language
     can be chosen and is remembered in this browser).
     Google Chrome and Microsoft Edge on computers translate on the device
     with the browser's built-in Translator API. In other browsers, or for a
     language the browser cannot translate, the box opens Google Translate.
   . Hover: in those same browsers, once a question has been ANSWERED (a
     lesson's Quick check, or the trainer in practice mode), hold the mouse
     over a word of that question to see it in the chosen language (a switch
     turns it off). Never before the answer, never in the timed test, the
     module test or the smart review.
   . Select some text: a small Translate button appears (same rules inside
     the questions).
   Nothing is sent to this website.
   ========================================================================== */
(function (g) {
  'use strict';
  var doc = document, html = doc.documentElement;
  var K_LANG = 'ecl_tr_lang', K_HOVER = 'ecl_tr_hover';

  /* [code, Google Translate code, English name, own name, on-device, right-to-left] */
  var LANGS = [
    ['ar', 'ar', 'Arabic', 'العربية', 1, 1], ['fr', 'fr', 'French', 'Français', 1, 0],
    ['es', 'es', 'Spanish', 'Español', 1, 0], ['pt', 'pt', 'Portuguese', 'Português', 1, 0],
    ['tr', 'tr', 'Turkish', 'Türkçe', 1, 0], ['ru', 'ru', 'Russian', 'Русский', 1, 0],
    ['fa', 'fa', 'Persian', 'فارسی', 0, 1], ['ur', 'ur', 'Urdu', 'اردو', 0, 1],
    ['sq', 'sq', 'Albanian', 'Shqip', 0, 0], ['am', 'am', 'Amharic', 'አማርኛ', 0, 0],
    ['hy', 'hy', 'Armenian', 'Հայերեն', 0, 0], ['az', 'az', 'Azerbaijani', 'Azərbaycanca', 0, 0],
    ['bn', 'bn', 'Bengali', 'বাংলা', 1, 0], ['bs', 'bs', 'Bosnian', 'Bosanski', 0, 0],
    ['bg', 'bg', 'Bulgarian', 'Български', 1, 0], ['my', 'my', 'Burmese', 'မြန်မာ', 0, 0],
    ['zh', 'zh-CN', 'Chinese (Simplified)', '简体中文', 1, 0], ['zh-Hant', 'zh-TW', 'Chinese (Traditional)', '繁體中文', 1, 0],
    ['hr', 'hr', 'Croatian', 'Hrvatski', 1, 0], ['cs', 'cs', 'Czech', 'Čeština', 1, 0],
    ['da', 'da', 'Danish', 'Dansk', 1, 0], ['nl', 'nl', 'Dutch', 'Nederlands', 1, 0],
    ['et', 'et', 'Estonian', 'Eesti', 0, 0], ['tl', 'tl', 'Filipino', 'Filipino', 0, 0],
    ['fi', 'fi', 'Finnish', 'Suomi', 1, 0], ['ka', 'ka', 'Georgian', 'ქართული', 0, 0],
    ['de', 'de', 'German', 'Deutsch', 1, 0], ['el', 'el', 'Greek', 'Ελληνικά', 1, 0],
    ['ha', 'ha', 'Hausa', 'Hausa', 0, 0], ['he', 'iw', 'Hebrew', 'עברית', 1, 1],
    ['hi', 'hi', 'Hindi', 'हिन्दी', 1, 0], ['hu', 'hu', 'Hungarian', 'Magyar', 1, 0],
    ['id', 'id', 'Indonesian', 'Bahasa Indonesia', 1, 0], ['it', 'it', 'Italian', 'Italiano', 1, 0],
    ['ja', 'ja', 'Japanese', '日本語', 1, 0], ['kn', 'kn', 'Kannada', 'ಕನ್ನಡ', 1, 0],
    ['kk', 'kk', 'Kazakh', 'Қазақ тілі', 0, 0], ['km', 'km', 'Khmer', 'ខ្មែរ', 0, 0],
    ['ko', 'ko', 'Korean', '한국어', 1, 0], ['ckb', 'ckb', 'Kurdish (Sorani)', 'کوردی', 0, 1],
    ['ku', 'ku', 'Kurdish (Kurmanji)', 'Kurdî', 0, 0], ['ky', 'ky', 'Kyrgyz', 'Кыргызча', 0, 0],
    ['lo', 'lo', 'Lao', 'ລາວ', 0, 0], ['lv', 'lv', 'Latvian', 'Latviešu', 0, 0],
    ['lt', 'lt', 'Lithuanian', 'Lietuvių', 1, 0], ['mk', 'mk', 'Macedonian', 'Македонски', 0, 0],
    ['ms', 'ms', 'Malay', 'Bahasa Melayu', 0, 0], ['mr', 'mr', 'Marathi', 'मराठी', 1, 0],
    ['mn', 'mn', 'Mongolian', 'Монгол', 0, 0], ['ne', 'ne', 'Nepali', 'नेपाली', 0, 0],
    ['no', 'no', 'Norwegian', 'Norsk', 1, 0], ['ps', 'ps', 'Pashto', 'پښتو', 0, 1],
    ['pl', 'pl', 'Polish', 'Polski', 1, 0], ['pa', 'pa', 'Punjabi', 'ਪੰਜਾਬੀ', 0, 0],
    ['ro', 'ro', 'Romanian', 'Română', 1, 0], ['sr', 'sr', 'Serbian', 'Српски', 0, 0],
    ['si', 'si', 'Sinhala', 'සිංහල', 0, 0], ['sk', 'sk', 'Slovak', 'Slovenčina', 1, 0],
    ['sl', 'sl', 'Slovenian', 'Slovenščina', 1, 0], ['so', 'so', 'Somali', 'Soomaali', 0, 0],
    ['sw', 'sw', 'Swahili', 'Kiswahili', 0, 0], ['sv', 'sv', 'Swedish', 'Svenska', 1, 0],
    ['tg', 'tg', 'Tajik', 'Тоҷикӣ', 0, 0], ['ta', 'ta', 'Tamil', 'தமிழ்', 1, 0],
    ['te', 'te', 'Telugu', 'తెలుగు', 1, 0], ['th', 'th', 'Thai', 'ไทย', 1, 0],
    ['tk', 'tk', 'Turkmen', 'Türkmençe', 0, 0], ['uk', 'uk', 'Ukrainian', 'Українська', 1, 0],
    ['uz', 'uz', 'Uzbek', 'Oʻzbekcha', 0, 0], ['vi', 'vi', 'Vietnamese', 'Tiếng Việt', 1, 0]
  ];
  var COMMON = 8;   // the first 8 are shown on top of the list

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 5.5h10M8.5 3.5v2M6 5.5c.9 3.2 3 5.8 6 7.3M11 5.5c-.9 3.4-3.3 6.4-6.6 7.9"/><path d="M12.5 20.5l4-9 4 9M13.9 17.5h5.2"/></svg>';
  var ICON_SAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.5 6.5 8.5H3v7h3.5L11 19.5z"/><path d="M15.6 8.9a4.4 4.4 0 0 1 0 6.2"/></svg>';

  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function find(code) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === code) return LANGS[i]; return null; }

  /* First visit: suggest the language of the browser or phone (French phone
     -> French), Arabic when the device is set to English.                  */
  function suggest() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var t = String(list[i] || '').toLowerCase(), p = t.split('-')[0];
      if (!p || p === 'en') continue;
      if (p === 'zh') return /hant|tw|hk|mo/.test(t) ? 'zh-Hant' : 'zh';
      if (p === 'iw') p = 'he';
      if (p === 'nb' || p === 'nn') p = 'no';
      if (p === 'fil') p = 'tl';
      if (find(p)) return p;
    }
    return 'ar';
  }
  var saved = get(K_LANG, ''), lang = find(saved) ? saved : suggest();
  var hasAPI = 'Translator' in g && !!g.Translator && typeof g.Translator.create === 'function';
  var finePointer = !!(g.matchMedia && g.matchMedia('(hover: hover) and (pointer: fine)').matches);
  var hoverOn = get(K_HOVER, '1') !== '0';
  var SCOPE = '[data-tr-scope], article.prose, #root, .fq-body';
  var SKIP = 'input, textarea, select, kbd, code, svg, .say, .btn, .tool, .study-bar, .chips, .letters, .pager, .vchip, ' +
             '.tabbar, .navrow, .qtools, .tr-card, .tr-bubble, .tr-chip, [data-tr-skip]';

  /* Translation helps to CHECK an answer, never to find it:
     . trainer: only once the question is answered, in practice with immediate
       feedback; never in the timed test, the module test or the smart review;
     . lessons: only in a Quick check question, or a "Quiz me" question, that
       has been answered.                                                      */
  function trainerOK() {
    var S = g.S;
    return !!(S && S.view === 'quiz' && !S.sim && S.locked && S.key !== 't_mod' && S.title !== 'Smart review');
  }
  function zoneOK(el) {            // word under the mouse
    if (!el || !el.closest) return false;
    if (el.closest('#root')) return trainerOK() && !!el.closest('.qbox, .opts, #fb');
    var q = el.closest('.qc-item, .fq-body');
    return !!(q && q.classList.contains('answered'));
  }
  function selectOK(el) {          // selected text (the Translate chip)
    if (el.closest('#root')) return trainerOK();
    var q = el.closest('.qc-item, .fq-body');
    return q ? q.classList.contains('answered') : true;
  }
  /* a quiz opens in a modal dialog, drawn above the page: the bubble and
     the chip must then be placed inside that dialog to be seen           */
  function hostFor(el) { var d = el && el.closest && el.closest('dialog[open]'); return d || doc.body; }
  function mount(node, host) { if (node && host && node.parentNode !== host) host.appendChild(node); }

  /* broken: the browser shows the API but it does not answer (some Chromium
     browsers); bad[code]: this language could not be prepared            */
  var broken = false, bad = {};
  function onDevice(code) { var L = find(code); return !!(hasAPI && !broken && !bad[code] && L && L[4]); }
  function name(code) { var L = find(code); return L ? L[2] : code; }
  function rtl(code) { var L = find(code); return !!(L && L[5]); }
  function gtUrl(text, code) {
    var L = find(code);
    return 'https://translate.google.com/?sl=en&tl=' + encodeURIComponent(L ? L[1] : code) +
      '&text=' + encodeURIComponent(String(text || '').slice(0, 4000)) + '&op=translate';
  }
  function setDir(el, code) { el.setAttribute('lang', code); el.setAttribute('dir', rtl(code) ? 'rtl' : 'ltr'); }

  /* ------------------------ the browser's translator ------------------------ */
  var E = { code: null, tr: null, busy: null, busyCode: null, busyUser: false, gen: 0, state: 'idle', pct: 0, cache: {} };
  var watchers = [];
  function state(s, pct) { E.state = s; E.pct = pct || 0; watchers.forEach(function (f) { try { f(); } catch (e) { } }); }

  function fail(name) { var e = new Error(name); e.name = name; return e; }
  /* create() with a watchdog: a download that shows progress may take a
     while, a browser that never answers is given up after 20 seconds     */
  function create(code) {
    return new Promise(function (resolve, reject) {
      var done = false, timer = 0, p;
      function arm(ms) {
        clearTimeout(timer);
        timer = setTimeout(function () { if (!done) { done = true; reject(fail('Timeout')); } }, ms);
      }
      arm(20000);
      try {
        p = g.Translator.create({
          sourceLanguage: 'en', targetLanguage: code,
          monitor: function (m) {
            m.addEventListener('downloadprogress', function (e) {
              var pc = Math.round((e.loaded || 0) * 100);
              if (pc < 100) state('downloading', pc);
              arm(90000);
            });
          }
        });
      } catch (x) { done = true; clearTimeout(timer); reject(x); return; }
      p.then(function (t) {
        if (done) { try { t.destroy(); } catch (e) { } return; }
        done = true; clearTimeout(timer); resolve(t);
      }, function (x) { if (!done) { done = true; clearTimeout(timer); reject(x); } });
    });
  }
  function availability(code) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(fail('Timeout')); }, 5000);
      Promise.resolve().then(function () {
        return g.Translator.availability({ sourceLanguage: 'en', targetLanguage: code });
      }).then(function (a) { clearTimeout(t); resolve(a); }, function (x) { clearTimeout(t); reject(x); });
    });
  }
  /* user = true when called from a click or a key press (the browser needs
     one before it downloads a language pack the first time)               */
  function prepare(code, user) {
    if (!onDevice(code)) return Promise.resolve(null);
    if (E.tr && E.code === code) return Promise.resolve(E.tr);
    if (E.busy && E.busyCode === code && (!user || E.busyUser)) return E.busy;
    if (E.tr) { try { if (E.tr.destroy) E.tr.destroy(); } catch (e) { } E.tr = null; E.code = null; }
    var gen = ++E.gen;
    E.busyCode = code; E.busyUser = !!user;
    state('checking');
    var p;
    try {
      if (user) p = create(code);
      else {
        p = availability(code).then(function (a) {
          if (a === 'unavailable') throw fail('Unavailable');
          if (a !== 'available') throw fail('NeedClick');
          return create(code);
        });
      }
    } catch (x) { p = Promise.reject(x); }
    /* a newer request (another language, or a click) replaces this one */
    E.busy = p.then(function (t) {
      if (gen !== E.gen) { try { t.destroy(); } catch (e) { } return E.busy || null; }
      E.tr = t; E.code = code; E.busy = null; state('ready'); return t;
    }, function (err) {
      if (gen !== E.gen) return E.busy || null;
      var n = err && err.name;
      E.busy = null;
      if (n === 'Timeout') broken = true;                       // the API does not answer here
      else if (n === 'Unavailable' || n === 'NotSupportedError') bad[code] = true;
      state(n === 'NeedClick' || n === 'NotAllowedError' ? 'need-click' : (n === 'Timeout' || n === 'Unavailable' || n === 'NotSupportedError') ? 'unavailable' : 'error');
      return null;
    });
    return E.busy;
  }
  function translate(text, code, user) {
    text = String(text || '').trim();
    if (!text) return Promise.resolve('');
    var key = code + '\u0001' + text;
    if (E.cache[key] != null) return Promise.resolve(E.cache[key]);
    return prepare(code, user).then(function (t) {
      if (!t) return null;
      return t.translate(text).then(function (r) { E.cache[key] = r; return r; });
    });
  }

  /* -------------------------------- speech -------------------------------- */
  function speak(text) {
    if (typeof g.ECL_SAY === 'function') { g.ECL_SAY(text); return; }
    if (g.Speech && typeof g.Speech.speak === 'function') { try { g.Speech.speak(text); return; } catch (e) { } }
    if (!g.speechSynthesis) return;
    var u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.92;
    g.speechSynthesis.cancel(); g.speechSynthesis.speak(u);
  }

  /* ------------------------------- the box -------------------------------- */
  var cards = [], uid = 0;
  function options(sel) {
    function opt(L) {
      var o = doc.createElement('option');
      o.value = L[0];
      o.textContent = L[2] + ' — ' + L[3] + (hasAPI && !L[4] ? '  ↗' : '');
      if (L[0] === lang) o.selected = true;
      return o;
    }
    var g1 = doc.createElement('optgroup'); g1.label = 'Common';
    var g2 = doc.createElement('optgroup'); g2.label = 'All languages';
    LANGS.slice(0, COMMON).forEach(function (L) { g1.appendChild(opt(L)); });
    LANGS.slice(COMMON).forEach(function (L) { g2.appendChild(opt(L)); });
    sel.appendChild(g1); sel.appendChild(g2);
  }

  function build(card) {
    var id = 'tr' + (++uid);
    card.innerHTML =
      '<div class="tr-top"><h2 class="tr-h">' + ICON + 'Translate</h2>' +
      '<button type="button" class="tr-x" data-tr-close aria-label="Close">&times;</button></div>' +
      '<div class="tr-pair"><span>English</span><span aria-hidden="true">&rarr;</span>' +
      '<label class="tr-vh" for="' + id + 'l">Translate into</label><select class="tr-lang" id="' + id + 'l"></select></div>' +
      '<label class="tr-vh" for="' + id + 't">English text to translate</label>' +
      '<textarea class="tr-in" id="' + id + 't" rows="3" maxlength="2000" lang="en" dir="ltr" placeholder="Type or paste English text"></textarea>' +
      '<div class="tr-btns"><button type="button" class="tr-go">Translate</button>' +
      '<a class="tr-gt" target="_blank" rel="noopener" href="https://translate.google.com/">Google Translate &#8599;</a></div>' +
      '<div class="tr-out" aria-live="polite" hidden></div>' +
      '<p class="tr-status"></p>' +
      '<label class="tr-switch" hidden><input type="checkbox" class="tr-hover"><span class="tr-sw" aria-hidden="true"></span>' +
      '<span>After I answer, translate the word under the mouse</span></label>' +
      '<p class="tr-hint"></p>';
    var sel = card.querySelector('.tr-lang'), ta = card.querySelector('.tr-in'), go = card.querySelector('.tr-go'),
        gt = card.querySelector('.tr-gt'), out = card.querySelector('.tr-out'), st = card.querySelector('.tr-status'),
        sw = card.querySelector('.tr-switch'), cb = card.querySelector('.tr-hover'), hint = card.querySelector('.tr-hint');
    options(sel);
    var c = { card: card, sel: sel, ta: ta, go: go, gt: gt, out: out, st: st, sw: sw, cb: cb, hint: hint };
    cards.push(c);

    /* keys typed here must not reach the trainer's keyboard shortcuts */
    card.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target === ta) { e.preventDefault(); run(c); }
      if (e.key === 'Escape') closeSheet();
    });
    sel.addEventListener('change', function () {
      lang = sel.value; put(K_LANG, lang);
      cards.forEach(function (o) { if (o.sel.value !== lang) o.sel.value = lang; o.out.hidden = true; });
      hideBubble();
      if (onDevice(lang)) prepare(lang, true);
      refresh();
    });
    ta.addEventListener('input', function () { gt.href = gtUrl(ta.value, lang); });
    go.addEventListener('click', function () { run(c); });
    cb.checked = hoverOn;
    cb.addEventListener('change', function () {
      hoverOn = cb.checked; put(K_HOVER, hoverOn ? '1' : '0');
      cards.forEach(function (o) { o.cb.checked = hoverOn; });
      if (hoverOn && onDevice(lang)) prepare(lang, true);
      hideBubble();
    });
    refreshCard(c);
    card.hidden = false;
  }

  function run(c) {
    var text = c.ta.value.trim();
    if (!text) {
      var s = selectedText();
      if (s) { c.ta.value = s; text = s; }
    }
    c.gt.href = gtUrl(text, lang);
    if (!text) { c.ta.focus(); c.st.textContent = 'Type or paste some English text first.'; return; }
    if (!onDevice(lang)) { g.open(gtUrl(text, lang), '_blank', 'noopener'); return; }
    c.out.hidden = false; c.out.classList.add('wait'); c.out.textContent = 'Translating…'; setDir(c.out, 'en');
    var code = lang;
    translate(text, code, true).then(function (r) {
      c.out.classList.remove('wait');
      if (r == null) {
        c.out.innerHTML = '';
        var a = doc.createElement('a'); a.href = gtUrl(text, code); a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Open this text in Google Translate ↗';
        c.out.appendChild(doc.createTextNode('Your browser could not translate this text. ')); c.out.appendChild(a);
        setDir(c.out, 'en');
        return;
      }
      c.out.textContent = r; setDir(c.out, code);
    }, function () {
      c.out.classList.remove('wait'); c.out.textContent = 'The translation failed. Try Google Translate.'; setDir(c.out, 'en');
    });
  }

  function refreshCard(c) {
    var nm = name(lang);
    for (var i = 0; i < c.sel.options.length; i++) {
      var o = c.sel.options[i], L = find(o.value);
      if (L) o.textContent = L[2] + ' — ' + L[3] + (hasAPI && !broken && !onDevice(L[0]) ? '  ↗' : '');
    }
    c.gt.href = gtUrl(c.ta.value, lang);
    var dev = onDevice(lang);
    c.go.textContent = dev ? 'Translate' : 'Translate with Google ↗';
    c.gt.hidden = !dev;
    var msg = '';
    if (!dev) msg = hasAPI ? 'Your browser cannot translate into ' + nm + ' by itself: the button opens Google Translate in a new tab.'
                           : 'The button opens Google Translate in a new tab with your text.';
    else if (E.state === 'downloading') msg = 'Preparing English → ' + nm + '… ' + E.pct + '%';
    else if (E.state === 'ready' && E.code === lang) msg = 'English → ' + nm + ': translated by your browser, on this device.';
    else if (E.state === 'need-click' || E.state === 'idle') msg = 'Press Translate once: your browser prepares English → ' + nm + ' the first time.';
    else if (E.state === 'checking') msg = 'Preparing English → ' + nm + '…';
    else if (E.state === 'unavailable') msg = 'Your browser cannot translate into ' + nm + ' here: use Google Translate.';
    else if (E.state === 'error') msg = 'Your browser could not prepare the translator. Use Google Translate.';
    c.st.textContent = msg;
    /* the switch only where there are questions to answer */
    var trainer = !!doc.getElementById('root'), quiz = !!doc.querySelector('.qc-item, [data-fq]');
    var canHover = dev && finePointer && (trainer || quiz);
    c.sw.hidden = !canHover;
    var how = finePointer ? 'select words, then press the Translate button that appears' : 'select a word, then tap Translate';
    c.hint.textContent = trainer
        ? (canHover ? 'Answer the question first: then hold the mouse over a word of the question or of the explanation.'
                    : 'Answer the question first: then ' + how + '. Not available in the timed test.')
      : quiz
        ? (canHover ? 'In a quiz, answer first: then hold the mouse over a word of that question. Elsewhere, ' + how + '.'
                    : 'In a quiz, answer first, then ' + how + '. Elsewhere on the page, it works at any time.')
      : 'Tip: ' + how + '.';
  }
  function refresh() { cards.forEach(refreshCard); }
  watchers.push(refresh);

  /* -------------------- open / close (phones, trainer) --------------------- */
  var backdrop = null;
  function mainCard() { return cards.length ? cards[0] : null; }
  function openSheet() {
    var c = mainCard();
    if (!c) return;
    var docked = !c.card.closest('[data-tr-pop]') && !(g.matchMedia && g.matchMedia('(max-width: 900px)').matches);
    var s = selectedText();
    if (s) c.ta.value = s;
    else if (c.card.closest('[data-tr-pop]') && trainerOK()) { c.ta.value = trainerSentence(); c.gt.href = gtUrl(c.ta.value, lang); }
    if (docked) {
      c.card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      c.card.classList.remove('tr-flash'); void c.card.offsetWidth; c.card.classList.add('tr-flash');
      setTimeout(function () { try { c.ta.focus({ preventScroll: true }); } catch (e) { c.ta.focus(); } }, 250);
      return;
    }
    if (!backdrop) {
      backdrop = doc.createElement('div'); backdrop.className = 'tr-backdrop'; backdrop.hidden = true;
      backdrop.addEventListener('click', closeSheet);
      doc.body.appendChild(backdrop);
    }
    var open = !html.classList.contains('tr-open');
    html.classList.toggle('tr-open', open);
    /* the trainer's panel stays usable next to the question on wide screens */
    var side = !!c.card.closest('[data-tr-pop]') && !!(g.matchMedia && g.matchMedia('(min-width: 641px)').matches);
    backdrop.hidden = !open || side;
    if (open) setTimeout(function () { try { c.ta.focus({ preventScroll: true }); } catch (e) { } }, 60);
  }
  /* the question of the trainer with the correct answer in the blank */
  function trainerSentence() {
    var S = g.S, q = S && S.pool && S.pool[S.idx];
    if (!q) return '';
    var t = String(q.q || '').replace(/\*/g, ''), ans = String(q.c || '').replace(/\*/g, '');
    var gap = /_{2,}|\u2026+|\.{3,}/;
    return (ans && gap.test(t) ? t.replace(gap, ans) : t).replace(/\s+/g, ' ').trim();
  }
  function closeSheet() {
    html.classList.remove('tr-open');
    if (backdrop) backdrop.hidden = true;
  }
  doc.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-tr-open]')) { e.preventDefault(); openSheet(); return; }
    if (t.closest('[data-tr-close]')) { e.preventDefault(); closeSheet(); }
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hideBubble(); hideChip(); closeSheet(); } });

  /* ------------------------- hover over a word ------------------------- */
  /* pinned: the bubble was opened by a click (selection, sentence, turn on)
     and stays until a click elsewhere, Escape or scrolling              */
  var bubble = null, hov = { key: '', timer: 0, hide: 0, frame: false, last: null, pinned: false };
  function makeBubble() {
    bubble = doc.createElement('div');
    bubble.className = 'tr-bubble'; bubble.hidden = true; bubble.setAttribute('role', 'status');
    bubble.addEventListener('mouseenter', function () { clearTimeout(hov.hide); clearTimeout(hov.timer); });
    bubble.addEventListener('mouseleave', function () { scheduleHide(); });
    doc.body.appendChild(bubble);
  }
  function hoverReady() { return hoverOn && finePointer && onDevice(lang) && cards.length; }
  function scheduleHide() { clearTimeout(hov.timer); clearTimeout(hov.hide); hov.hide = setTimeout(hideBubble, 260); }
  function hideBubble() { clearTimeout(hov.timer); hov.key = ''; hov.pinned = false; if (bubble) bubble.hidden = true; }
  function place(el, rect) {
    el.style.left = '0px'; el.style.top = '0px'; el.hidden = false;
    var w = el.offsetWidth, h = el.offsetHeight, vw = html.clientWidth, vh = g.innerHeight;
    var x = Math.min(Math.max(8, rect.left + rect.width / 2 - w / 2), vw - w - 8);
    var y = rect.bottom + 8;
    if (y + h > vh - 8 && rect.top - h - 8 > 8) y = rect.top - h - 8;
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
  }
  function wordAt(x, y) {
    var node, off, r;
    if (doc.caretPositionFromPoint) { r = doc.caretPositionFromPoint(x, y); if (!r) return null; node = r.offsetNode; off = r.offset; }
    else if (doc.caretRangeFromPoint) { r = doc.caretRangeFromPoint(x, y); if (!r) return null; node = r.startContainer; off = r.startOffset; }
    else return null;
    if (!node || node.nodeType !== 3) return null;
    var s = node.data, a = off, b = off, W = /[A-Za-z'’-]/;
    while (a > 0 && W.test(s.charAt(a - 1))) a--;
    while (b < s.length && W.test(s.charAt(b))) b++;
    while (a < b && /['’-]/.test(s.charAt(a))) a++;
    while (b > a && /['’-]/.test(s.charAt(b - 1))) b--;
    var word = s.slice(a, b);
    if (word.length < 2 || !/[A-Za-z]/.test(word)) return null;
    var rg = doc.createRange(); rg.setStart(node, a); rg.setEnd(node, b);
    var rc = rg.getBoundingClientRect();
    if (x < rc.left - 1 || x > rc.right + 1 || y < rc.top - 1 || y > rc.bottom + 1) return null;
    return { label: word, text: word, rect: rc, node: node, a: a };
  }
  function sentenceOf(hit) {
    if (!hit.node) return '';
    var blk = hit.node.parentElement && hit.node.parentElement.closest('p, li, td, th, dd, dt, h1, h2, h3, h4, button, label, div');
    if (!blk) return '';
    var r = doc.createRange();
    try { r.setStart(blk, 0); r.setEnd(hit.node, hit.a); } catch (e) { return ''; }
    var before = r.toString().length, all = blk.textContent;
    var start = 0, m, re = /[.!?]["”')\]]*\s+/g;
    while ((m = re.exec(all)) && m.index + m[0].length <= before) start = m.index + m[0].length;
    re.lastIndex = before;
    m = re.exec(all);
    var end = m ? m.index + 1 : all.length;
    var s = all.slice(start, end).replace(/\s+/g, ' ').trim();
    return s.length > hit.text.length + 3 && s.length < 600 ? s : '';
  }
  function fill(hit, code, user) {
    if (!bubble) makeBubble();
    clearTimeout(hov.hide); clearTimeout(hov.timer);
    var sentence = hit.unit ? '' : sentenceOf(hit);
    bubble.innerHTML = '<div class="trb-head"><b class="trb-w"></b><button type="button" class="trb-say" aria-label="Listen">' + ICON_SAY +
      '</button><span class="trb-lang"></span></div><div class="trb-out"></div>' +
      (sentence ? '<button type="button" class="trb-more">Translate the sentence</button><div class="trb-sent" hidden></div>' : '');
    bubble.querySelector('.trb-w').textContent = hit.label;
    bubble.querySelector('.trb-lang').textContent = '→ ' + name(code);
    var out = bubble.querySelector('.trb-out');
    out.textContent = '…'; setDir(out, code);
    bubble.querySelector('.trb-say').addEventListener('click', function () { speak(hit.label); });
    var more = bubble.querySelector('.trb-more');
    if (more) more.addEventListener('click', function () {
      hov.pinned = true;
      var so = bubble.querySelector('.trb-sent');
      so.hidden = false; so.textContent = '…'; setDir(so, code); more.hidden = true;
      translate(sentence, code, true).then(function (r) { so.textContent = r == null ? 'Not available.' : r; place(bubble, hit.rect); });
    });
    mount(bubble, hit.host || doc.body);
    place(bubble, hit.rect);
    var key = hov.key;
    function show(r) {
      if (hov.key !== key || bubble.hidden) return;
      if (r == null) {
        if (E.state === 'need-click' || E.state === 'idle' || E.state === 'error') {
          out.innerHTML = '';
          var b = doc.createElement('button'); b.type = 'button'; b.className = 'trb-start';
          b.textContent = 'Turn on translation into ' + name(code);
          b.addEventListener('click', function () {
            hov.pinned = true;
            out.textContent = 'Preparing…';
            translate(hit.text, code, true).then(function (r2) { out.textContent = r2 == null ? 'Not available in this browser.' : r2; setDir(out, r2 == null ? 'en' : code); place(bubble, hit.rect); });
          });
          out.appendChild(b); setDir(out, 'en');
        } else { out.textContent = 'Not available in this browser.'; setDir(out, 'en'); }
      } else { out.textContent = r; }
      place(bubble, hit.rect);
    }
    translate(hit.text, code, !!user).then(show, function () { show(null); });
  }
  function check(x, y, target) {
    if (!hoverReady() || hov.pinned) return;
    if (bubble && !bubble.hidden && bubble.contains(target)) { clearTimeout(hov.hide); clearTimeout(hov.timer); return; }
    var el = target && (target.nodeType === 1 ? target : target.parentElement);
    if (!el || !el.closest || !zoneOK(el) || el.closest(SKIP)) { if (hov.key) scheduleHide(); return; }
    var hit = null, unit = el.closest('[data-tr-unit]');
    if (unit) {
      var label = unit.textContent.replace(/\s+/g, ' ').trim();
      hit = { unit: true, label: label, text: unit.getAttribute('data-tr-text') || label, rect: unit.getBoundingClientRect() };
    } else hit = wordAt(x, y);
    if (!hit) { if (hov.key) scheduleHide(); return; }
    hit.host = hostFor(el);
    var key = hit.label + '|' + Math.round(hit.rect.left) + '|' + Math.round(hit.rect.top);
    clearTimeout(hov.hide);
    if (key === hov.key) return;
    clearTimeout(hov.timer);
    var visible = bubble && !bubble.hidden;
    hov.timer = setTimeout(function () { hov.key = key; fill(hit, lang); }, visible ? 320 : 420);
  }
  doc.addEventListener('mousemove', function (e) {
    if (!hoverReady() || e.buttons) return;
    hov.last = e;
    if (hov.frame) return;
    hov.frame = true;
    (g.requestAnimationFrame || setTimeout)(function () { hov.frame = false; var ev = hov.last; check(ev.clientX, ev.clientY, ev.target); });
  }, { passive: true });
  doc.addEventListener('mousedown', function (e) { if (bubble && !bubble.hidden && !bubble.contains(e.target)) hideBubble(); }, true);
  var scrollTimer = 0;
  g.addEventListener('scroll', function () {
    if (bubble && !bubble.hidden) hideBubble();
    if (chip && !chip.hidden) {
      hideChip(); clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () { if (selectedText()) showChip(); }, 300);
    }
  }, { passive: true });
  g.addEventListener('blur', hideBubble);

  /* ---------------------- select text -> Translate button ---------------------- */
  var chip = null, chipText = '', chipHost = null, selTimer = 0;
  function selectedText() {
    var s = g.getSelection && g.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return '';
    var t = s.toString().replace(/\s+/g, ' ').trim();
    if (!t || t.length > 600 || !/[A-Za-z]/.test(t)) return '';
    var n = s.getRangeAt(0).commonAncestorContainer, el = n.nodeType === 1 ? n : n.parentElement;
    if (!el || !el.closest || !el.closest(SCOPE) || el.closest('input, textarea, .tr-card, .tr-bubble') || !selectOK(el)) return '';
    return t;
  }
  function hideChip() { if (chip) chip.hidden = true; }
  function showChip() {
    var t = selectedText();
    if (!t || !cards.length) { hideChip(); return; }
    var s = g.getSelection(), rs = s.getRangeAt(0).getClientRects(), rc = rs.length ? rs[rs.length - 1] : s.getRangeAt(0).getBoundingClientRect();
    if (!chip) {
      chip = doc.createElement('button'); chip.type = 'button'; chip.className = 'tr-chip'; chip.hidden = true;
      chip.innerHTML = ICON + '<span>Translate</span>';
      chip.addEventListener('mousedown', function (e) { e.preventDefault(); });
      chip.addEventListener('click', function () {
        var text = chipText, code = lang, rect = chip.getBoundingClientRect();
        hideChip();
        if (!onDevice(code)) { g.open(gtUrl(text, code), '_blank', 'noopener'); return; }
        hov.key = 'sel|' + text;
        fill({ unit: true, label: text.length > 60 ? text.slice(0, 57) + '…' : text, text: text, rect: rect, host: chipHost }, code, true);
        hov.pinned = true;
      });
      doc.body.appendChild(chip);
    }
    chipText = t;
    var an = s.getRangeAt(0).commonAncestorContainer;
    chipHost = hostFor(an.nodeType === 1 ? an : an.parentElement);
    mount(chip, chipHost);
    chip.style.left = '0px'; chip.style.top = '0px'; chip.hidden = false;
    var w = chip.offsetWidth, vw = html.clientWidth, vh = g.innerHeight;
    var x = Math.min(Math.max(8, rc.right - w / 2), vw - w - 8);
    var y = rc.bottom + 10;
    if (y + 44 > vh) y = Math.max(8, rc.top - 52);
    chip.style.left = Math.round(x) + 'px'; chip.style.top = Math.round(y) + 'px';
  }
  doc.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    selTimer = setTimeout(function () { if (selectedText()) showChip(); else hideChip(); }, 350);
  });

  /* --------------------------------- start --------------------------------- */
  function start() {
    var found = doc.querySelectorAll('[data-tr-card]');
    if (!found.length) return;
    found.forEach(build);
    html.classList.add('has-tr');
    doc.querySelectorAll('[data-tr-open][hidden]').forEach(function (b) { b.hidden = false; });
    var root = doc.getElementById('root');
    if (root) {
      var sync = function () {
        var ok = trainerOK();
        if (root.classList.contains('tr-ok') !== ok) root.classList.toggle('tr-ok', ok);
        doc.querySelectorAll('.w-tr').forEach(function (b) { b.hidden = !ok; });
        if (!ok) {
          var c = mainCard();
          if (c && c.card.closest('[data-tr-pop]') && html.classList.contains('tr-open')) closeSheet();
          hideBubble(); hideChip();
        }
      };
      sync();
      if (g.MutationObserver) new MutationObserver(sync).observe(root, { childList: true, subtree: true });
    }
    if (onDevice(lang)) prepare(lang, false);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window);
