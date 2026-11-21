/* ==========================================================================
   promos.js - where the promo cards go on the website (not in /practice/,
   which has its own rotating card in practice/js/web.js).
   --------------------------------------------------------------------------
   Two cards take turns, one more page view at a time:
     . the ECL & ALCPT English Trainer Android app (our app; not on iPhone/iPad);
     . the italki banner (partner link);
     . the Preply banner (Impact.com partner link), switched with its entry in
       assets/monetization-config.js (studyResources.items, id 'preply').
   The italki and Preply banners take turns at the end of articles.
   Article pages (lessons, topics, guides, tests):
     . middle of the article: the ECL app;
     . end of the article: the italki banner, unless the page already has one;
     . desktop side column: the ECL app, when the middle card is not the app.
   Pages with <div class="mf-slot"> (home, hubs, two test pages): one card in
   the slot, taking turns between italki and the app.
   Never next to an ad, a question or an answer button; the side card steps
   aside while questions are on screen. Each card's x hides it for 30 days.
   GA4 (when analytics is on): promo_view / promo_click with kind and placement.
   Test: ?promo=app or ?promo=italki forces the middle/slot card.
   ========================================================================== */
(function (g) {
  'use strict';
  if (g.ECL_PROMOS) return;
  g.ECL_PROMOS = true;
  var doc = document, html = doc.documentElement;
  var me = doc.currentScript || doc.querySelector('script[src*="promos.js"]');
  var BASE = me && me.src ? me.src.replace(/promos\.js[^/]*$/, '') : '/assets/';
  var ua = navigator.userAgent || '';
  var IOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var LANG = /^ar/i.test(html.lang) ? 'ar' : /^fr/i.test(html.lang) ? 'fr' : 'en';
  var DAYS = 30, APP_KEY = 'promo_hide_app';
  var ITALKI = 'https://www.italki.com/affshare?ref=af34425454';
  var FORCE = (/[?&]promo=(app|italki|preply)\b/.exec(location.search) || [])[1] || '';

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function track(name, p) { try { if (g.ECL_TRACK) g.ECL_TRACK(name, p); } catch (e) { } }
  function recent(k) { var t = +get(k) || 0; return t > 0 && Date.now() - t < DAYS * 864e5; }

  /* --------------------------- ECL app card ------------------------------ */
  var T = {
    en: { kick: 'Free Android app', tag: 'Practice anywhere, even offline.',
      pts: ['Same questions as the site', 'Works without internet', 'Reads each question aloud'],
      cta: 'Get it free on Google Play', x: 'Hide for 30 days', label: 'Our free Android app' },
    fr: { kick: 'Application Android gratuite', tag: 'Entraînez-vous partout, même hors ligne.',
      pts: ['Les mêmes questions que le site', 'Fonctionne sans internet', 'Lit chaque question à voix haute'],
      cta: 'Téléchargez-la gratuitement sur Google Play', x: 'Masquer pendant 30 jours', label: 'Notre application Android gratuite' },
    ar: { kick: 'تطبيق أندرويد مجاني', tag: 'تدرّب في أي مكان، حتى دون إنترنت.',
      pts: ['نفس أسئلة الموقع', 'يعمل دون إنترنت', 'يقرأ كل سؤال بصوت مسموع'],
      cta: 'حمّله مجانًا من Google Play', x: 'إخفاء لمدة 30 يومًا', label: 'تطبيقنا المجاني على أندرويد' }
  }[LANG];
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 3.6v16.8c0 .7.8 1.2 1.4.8l13.4-8.4c.6-.4.6-1.2 0-1.6L7.4 2.8C6.8 2.4 6 2.9 6 3.6z"/></svg>';
  function playUrl(place) {
    return 'https://play.google.com/store/apps/details?id=com.ecltrainer.english' + (LANG === 'en' ? '' : '&hl=' + LANG) +
      '&referrer=' + encodeURIComponent('utm_source=ecl-alcpt-trainer.com&utm_medium=website&utm_campaign=' + place);
  }
  function appCard(place, side) {
    var c = doc.createElement('aside');
    c.className = 'app-card' + (side ? ' app-card--side' : '');
    c.setAttribute('aria-label', T.label); c.setAttribute('data-tr-skip', '');
    c.innerHTML =
      '<button type="button" class="ac-x" aria-label="' + T.x + '" title="' + T.x + '">&times;</button>' +
      '<img class="ac-icon" src="' + BASE + 'img/logo-128.webp" width="128" height="128" alt="" loading="lazy" decoding="async">' +
      '<div class="ac-body"><p class="ac-kick">' + T.kick + '</p>' +
      '<p class="ac-title" lang="en" dir="ltr">ECL &amp; ALCPT English Trainer</p><p class="ac-tag">' + T.tag + '</p>' +
      '<ul class="ac-pts"><li>' + T.pts.join('</li><li>') + '</li></ul>' +
      '<a class="ac-cta" data-google-vignette="false" href="' + playUrl(place) + '" target="_blank" rel="noopener">' + PLAY + T.cta + '</a></div>';
    c.querySelector('.ac-x').addEventListener('click', function () {
      set(APP_KEY, String(Date.now()));
      doc.querySelectorAll('.app-card').forEach(function (a) { a.remove(); });
      track('promo_hide', { kind: 'app', placement: place });
    });
    c.querySelector('.ac-cta').addEventListener('click', function () { track('promo_click', { kind: 'app', placement: place }); });
    seen(c, function () { track('promo_view', { kind: 'app', placement: place }); });
    return c;
  }

  /* ---------------------------- italki banner ---------------------------- */
  function italkiBanner(place) {
    var i = BASE + 'img/promo/italki-tutor-', d = doc.createElement('div');
    d.className = 'promo-banner'; d.setAttribute('data-tutor', ''); d.setAttribute('lang', 'en'); d.setAttribute('dir', 'ltr');
    d.setAttribute('data-tr-skip', '');
    d.innerHTML = '<a class="pb-link" data-google-vignette="false" href="' + ITALKI + '" target="_blank" rel="sponsored nofollow noopener">' +
      '<img src="' + i + '800.webp" srcset="' + i + '800.webp 800w, ' + i + '1400.webp 1400w" sizes="(max-width: 760px) calc(100vw - 32px), 720px" ' +
      'width="1400" height="606" loading="lazy" decoding="async" alt="italki: Speak English with a real tutor. One-to-one video lessons on italki, ' +
      'at the times you choose. Pay per lesson. Find a tutor on italki"></a>' +
      '<button type="button" class="pb-close" data-promo-close aria-label="Close" title="Close"></button>';
    d.querySelector('.pb-link').addEventListener('click', function () { track('promo_click', { kind: 'italki', placement: place }); });
    if (g.ECL_ITALKI) g.ECL_ITALKI.watch(d); else d.classList.add('is-live');
    return d;
  }

  /* ---------------------------- Preply banner ---------------------------- */
  var PREPLY_KEY = 'promo_hide_preply';
  function preplyUrl() {
    var M = g.ECL_MONETIZATION || {}, items = (M.studyResources || {}).items || [], u = '';
    items.forEach(function (p) { if (p && p.id === 'preply' && p.enabled === true) u = p.url; });
    return typeof u === 'string' && /^https:\/\//.test(u) ? u : '';
  }
  function preplyBanner(place) {
    var i = BASE + 'img/promo/preply-tutor-', d = doc.createElement('div');
    d.className = 'promo-banner'; d.setAttribute('data-preply', ''); d.setAttribute('lang', 'en'); d.setAttribute('dir', 'ltr');
    d.setAttribute('data-tr-skip', '');
    d.innerHTML = '<a class="pb-link" data-google-vignette="false" href="' + preplyUrl() + '" target="_blank" rel="sponsored nofollow noopener">' +
      '<img src="' + i + '800.webp" srcset="' + i + '800.webp 800w, ' + i + '1400.webp 1400w" sizes="(max-width: 760px) calc(100vw - 32px), 720px" ' +
      'width="1400" height="606" loading="lazy" decoding="async" alt="Preply: Practice speaking with a tutor. ' +
      'Online one-on-one English lessons with a tutor. Visit Preply"></a>' +
      '<button type="button" class="pb-close" aria-label="Close" title="Close"></button>';
    d.querySelector('.pb-link').addEventListener('click', function () { track('promo_click', { kind: 'preply', placement: place }); });
    d.querySelector('.pb-close').addEventListener('click', function () {
      set(PREPLY_KEY, String(Date.now()));
      doc.querySelectorAll('[data-preply]').forEach(function (b) { b.hidden = true; });
      track('promo_hide', { kind: 'preply', placement: place });
    });
    seen(d, function () { track('promo_view', { kind: 'preply', placement: place }); });
    return d;
  }

  /* first time half of a card is on screen: .is-live (motion) and one view event */
  var io = null;
  function seen(el, cb) {
    if (!('IntersectionObserver' in g)) { el.classList.add('is-live'); cb(); return; }
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { o.disconnect(); el.classList.add('is-live'); cb(); } });
    }, { threshold: 0.5 });
    setTimeout(function () { if (el.isConnected) o.observe(el); }, 0);
  }

  /* ------------------------------ who gets what -------------------------- */
  function canApp() { return FORCE === 'app' || (!IOS && !recent(APP_KEY)); }
  function canItalki() { return FORCE === 'italki' || !(g.ECL_ITALKI && g.ECL_ITALKI.hidden()); }
  function hasItalki() { return !!doc.querySelector('[data-tutor]:not([hidden])'); }
  function canPreply() { return !!preplyUrl() && (FORCE === 'preply' || !recent(PREPLY_KEY)); }
  function make(kind, place) {
    if (kind === 'app') return appCard(place);
    if (kind === 'italki') return italkiBanner(place);
    if (kind === 'preply') return preplyBanner(place);
    return null;
  }
  /* end of an article: italki and Preply take turns */
  function endBanner() {
    var list = [];
    if (canItalki() && !hasItalki()) list.push('italki');
    if (canPreply()) list.push('preply');
    var k = pick(list);
    return k ? make(k, 'article_end') : null;
  }

  /* the same app card under the results of a graded test (assets/monetization.js) */
  g.ECL_APP_CARD = function (place) { return canApp() ? appCard(place) : null; };

  /* one more page view: the turn moves on, so the cards take turns */
  var turn = (+get('promo_turn_site') || 0); set('promo_turn_site', String(turn + 1));
  function pick(list) {
    if (FORCE && list.indexOf(FORCE) >= 0) return FORCE;
    return list.length ? list[turn % list.length] : null;
  }

  /* ------------------------ where it goes in an article ------------------ */
  var BAD = '.adz, .ad-slot, .qc, .qlist, .faq, .cta-box, .related, .pager, .howto, .bands, .promo-banner, .app-card, .mon-res';
  function isBad(el) { return !!el && (el.matches(BAD) || !!el.querySelector('.qc, .qlist, .bub, .adz, .ad-slot')); }
  function middleSpot(art) {
    var kids = [].slice.call(art.children), cands = [];
    kids.forEach(function (el, i) {
      if (i < 2) return;
      var head = el.tagName === 'H2' || (el.tagName === 'SECTION' && el.classList.contains('lsec'));
      if (!head || isBad(el)) return;
      if (isBad(kids[i - 1]) || isBad(kids[i - 2])) return;      // keep away from ads and questions above
      if (el.tagName === 'H2' && isBad(kids[i + 1])) return;      // ... and from questions right below
      cands.push(i);
    });
    if (cands.length < 2) return null;
    var mid = kids.length * 0.5, best = cands[0];
    cands.forEach(function (i) { if (Math.abs(i - mid) < Math.abs(best - mid)) best = i; });
    return kids[best];
  }
  /* end of the article: before the closing FAQ, sources, related links or pager; never right under questions */
  var TAIL = '.faq, .sources, .related, .pager, .mf-slot, .note-box, .mon-res, .adz';
  function endSpot(art) {
    var kids = [].slice.call(art.children), i = kids.length;
    while (i > 0 && kids[i - 1].matches(TAIL)) i--;
    while (i > 0 && i < kids.length && kids[i - 1].matches('.qc, .qlist, .adz, .ad-slot')) i++;   // step past a question block
    if (!kids.length || (i > 0 && kids[i - 1].matches('.qc, .qlist, .ad-slot'))) return null;
    return i < kids.length ? { before: kids[i] } : { after: kids[kids.length - 1] };
  }
  function put(el, spot) {
    if (!el || !spot) return;
    if (spot.before) spot.before.parentNode.insertBefore(el, spot.before);
    else spot.after.parentNode.insertBefore(el, spot.after.nextSibling);
  }
  /* the side card steps aside while questions are on screen */
  function awayFromQuestions(card) {
    var qs = doc.querySelectorAll('main .qc, main .qlist');
    if (!qs.length || !('IntersectionObserver' in g)) return;
    var on = new Set();
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) on.add(e.target); else on.delete(e.target); });
      card.classList.toggle('ac-away', on.size > 0);
    }, { rootMargin: '0px 0px -10% 0px' });
    qs.forEach(function (q) { o.observe(q); });
  }

  function run() {
    if (!doc.querySelector('main')) return;
    var slot = doc.querySelector('.mf-slot');
    var art = doc.querySelector('main article.prose'), side = doc.querySelector('main .aside');
    var testPage = !!(art && art.querySelector('.qc[data-mode="test"]'));
    var appBar = !!doc.querySelector('.app-bar');                    // the home page already shows the app at the top

    if (slot) {                                                      // the page chose its place: one card there
      var kinds = [];
      if (canItalki() && !hasItalki()) kinds.push('italki');
      if (canApp() && !appBar) kinds.push('app');
      if (canPreply()) kinds.push('preply');
      var k = pick(kinds), c = k && make(k, slot.getAttribute('data-mf-place') || 'slot');
      if (c) slot.appendChild(c);
      if (art && k !== 'italki' && k !== 'preply') put(endBanner(), endSpot(art));
      return;
    }
    if (!art) return;
    var mid = null;
    if (!testPage) {
      var spot = middleSpot(art), list = [];
      if (canApp()) list.push('app');
      mid = spot && pick(list);
      if (mid) put(make(mid, 'article'), { before: spot });
    }
    put(endBanner(), endSpot(art));
    if (side && mid !== 'app' && canApp() && !side.querySelector('.app-card')) {
      var sc = appCard('sidebar', true), first = side.querySelector('.aside-card');
      if (first && first.nextSibling) side.insertBefore(sc, first.nextSibling); else side.appendChild(sc);
      awayFromQuestions(sc);
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', run); else run();
})(window);
