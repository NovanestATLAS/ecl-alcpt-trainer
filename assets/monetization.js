/* ==========================================================================
   monetization.js - draws what assets/monetization-config.js switches on.
   --------------------------------------------------------------------------
   Nothing here is edited to add a partner or a zone: change the config file.
   . "Recommended Study Resources": the italki offer plus every enabled
     Impact.com partner. It goes on the home page, below articles, and under a
     graded practice test or a trainer results screen. Never inside a quiz.
   . Adcash banners: assets/ads.js (zone switches at its top). Here only the
     results screen of a graded practice test asks it for Slot B.
   . A provider that is off, or a zone / partner with nothing pasted in, adds
     no element, no style, no request and no console line.
   Dev check: add ?mon=check to any page URL, or run ECL_MON.verify() in the
   console. Loaded by assets/site.js (website) and practice/index.html (trainer).
   ========================================================================== */
(function (g) {
  'use strict';
  var CFG = g.ECL_MONETIZATION;
  if (g.ECL_MON || !CFG || typeof CFG !== 'object') return;
  var doc = document, html = doc.documentElement;
  var LANG = /^ar/i.test(html.lang) ? 'ar' : /^fr/i.test(html.lang) ? 'fr' : 'en';
  var PRACTICE = /\/practice(\/|$)/.test(location.pathname);
  var DAYS = 30, uid = 0;
  var UI = {
    heading: { en: 'Recommended English Study Resources', fr: 'Ressources recommandées pour apprendre l’anglais', ar: 'موارد موصى بها لتعلّم الإنجليزية' },
    disclosure: { en: 'Affiliate links: we may earn a commission at no extra cost to you.' },
    tag: { en: 'Affiliate', fr: 'Affilié', ar: 'رابط إحالة' },
    more: { en: 'Learn more', fr: 'En savoir plus', ar: 'اعرف المزيد' },
    ad: { en: 'Advertisement', fr: 'Publicité', ar: 'إعلان' }
  };

  /* ------------------------------ helpers -------------------------------- */
  function on(k) { return !!(CFG[k] && CFG[k].enabled === true); }
  function t(v, dflt) {
    var s = v && typeof v === 'object' ? (v[LANG] || v.en || '') : (v == null ? '' : v);
    s = String(s).trim();
    return s || (dflt ? t(dflt) : '');
  }
  function https(u) { return typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u.trim()); }
  function track(name, p) { try { if (g.ECL_TRACK) g.ECL_TRACK(name, p); } catch (e) { } }
  function el(tag, cls, txt) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function italkiHidden() {                       // same 30-day "x" as the italki banners
    var v = 0; try { v = +localStorage.getItem('promo_hide_italki') || 0; } catch (e) { }
    return v > 0 && Date.now() - v < DAYS * 864e5;
  }
  function afterLoad(fn) {
    function go() { if ('requestIdleCallback' in g) g.requestIdleCallback(fn, { timeout: 3000 }); else setTimeout(fn, 1200); }
    if (doc.readyState === 'complete') go(); else g.addEventListener('load', go);
  }
  function pageType() {
    if (PRACTICE) return 'trainer';
    var m = doc.querySelector('main');
    if ((m && m.querySelector('.hero')) || /^\/(?:(?:ar|fr)\/)?(?:index\.html)?$/.test(location.pathname)) return 'home';
    return doc.querySelector('main article.prose') ? 'article' : 'other';
  }

  /* ------------------------------- styles -------------------------------- */
  var CSS = [
    '.mon-res{--m-card:var(--sheet,var(--card,#fff));--m-ink:var(--ink,#14243D);--m-mut:var(--ink-2,var(--mut,#4F5F77));',
    '--m-line:var(--rule-2,var(--line,#D3DCE8));--m-link:var(--link,var(--accentText,#0B6E99));font-family:var(--text,inherit)}',
    '.mon-res{clear:both;margin:2.4em 0 1.2em;color:var(--m-ink)}',
    '.mon-band{padding:8px 0 40px}.mon-band .mon-res{margin:0}',
    '.mon-res--trainer{max-width:680px;margin:22px auto 8px}',
    '.mon-res .mon-res-h{max-width:none;margin:0 0 6px;font:700 1.45rem/1.2 var(--display,inherit);color:var(--m-ink)}',
    '.mon-res .mon-res-note{margin:0 0 14px;font-size:.85rem;line-height:1.45;color:var(--m-mut)}',
    '.mon-res .mon-res-grid{list-style:none;margin:0;padding:0;display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))}',
    '.mon-res .mon-card{display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin:0;padding:16px 18px;background:var(--m-card);',
    'border:1px solid var(--m-line);border-radius:14px;box-shadow:var(--shadow,var(--sheetShadow,none))}',
    '.mon-res .mon-tag{margin:0;padding:3px 8px;border:1px solid var(--m-line);border-radius:999px;font:600 .7rem/1.1 var(--text,inherit);',
    'letter-spacing:.05em;text-transform:uppercase;color:var(--m-mut)}',
    '[dir="rtl"] .mon-res .mon-tag{letter-spacing:0}',
    '.mon-res .mon-card-t{margin:0;font:700 1.15rem/1.2 var(--display,inherit);color:var(--m-ink)}',
    '.mon-res .mon-card-d{margin:0;font-size:.95rem;line-height:1.5;color:var(--m-mut)}',
    '.mon-res a.mon-cta{margin-top:auto;display:inline-flex;align-items:center;gap:.4em;min-height:44px;font-weight:600;color:var(--m-link);',
    'text-decoration:underline;text-underline-offset:.18em}',
    '.mon-res a.mon-cta::after{content:"\\2192"}[dir="rtl"] .mon-res a.mon-cta::after{content:"\\2190"}',
    '.mon-res a.mon-cta:focus-visible{outline:3px solid var(--m-link);outline-offset:3px;border-radius:4px}',
    '.mon-results-app{margin:24px 0}',
    '@media print{.mon-res{display:none}}'
  ].join('');
  function injectCSS() {
    if (doc.getElementById('mon-css')) return;
    var s = doc.createElement('style'); s.id = 'mon-css'; s.textContent = CSS;
    (doc.head || html).appendChild(s);
  }

  /* ------------------------ Recommended Study Resources ------------------- */
  /* the cards, in the order of studyResources.items (assets/monetization-config.js) */
  function items(skipItalki) {
    var out = [], seen = {}, SR = CFG.studyResources || {};
    (SR.items || []).forEach(function (p) {
      if (!p || p.enabled !== true || !p.id || seen[p.id]) return;
      var r;
      if (p.id === 'italki') {                                         // its link stays in assets/config.js
        var I = CFG.italki, url = ((g.ECL_CONFIG || {}).partners || {}).italki;
        if (skipItalki || !I || I.enabled === false || italkiHidden() || !https(url)) return;
        r = { id: 'italki', title: t(p.title || (I.card || {}).title || p.name), description: t(p.description || (I.card || {}).description),
          ctaText: t(p.cta || (I.card || {}).ctaText, UI.more), url: String(url).trim() };
      } else {
        if (!https(p.url) || !t(p.title || p.name)) return;            // no link or no name: nothing renders
        r = { id: String(p.id), title: t(p.title || p.name), description: t(p.description), ctaText: t(p.cta, UI.more), url: p.url };
      }
      seen[p.id] = 1; out.push(r);
    });
    return out;
  }
  function buildSection(place, variant, skipItalki) {
    var SR = CFG.studyResources || {};
    if (SR.enabled === false) return null;
    var list = items(skipItalki);
    if (!list.length) return null;
    injectCSS();
    var hid = 'mon-h-' + (++uid);
    var s = el('section', 'mon-res' + (variant ? ' mon-res--' + variant : ''));
    s.setAttribute('data-mon', 'study-resources'); s.setAttribute('data-place', place);
    s.setAttribute('data-tr-skip', ''); s.setAttribute('aria-labelledby', hid);
    var h = el('h2', 'mon-res-h', t(SR.heading, UI.heading)); h.id = hid;
    s.appendChild(h);
    if (SR.showDisclosure !== false) s.appendChild(el('p', 'mon-res-note', t(SR.disclosure, UI.disclosure)));   // the sentence under the heading; the "Affiliate" tag on each link stays
    var ul = el('ul', 'mon-res-grid');
    list.forEach(function (p) {
      var li = el('li', 'mon-card');
      li.appendChild(el('span', 'mon-tag', t(SR.tag, UI.tag)));
      li.appendChild(el('h3', 'mon-card-t', p.title));
      if (p.description) li.appendChild(el('p', 'mon-card-d', p.description));
      var a = el('a', 'mon-cta', p.ctaText);
      a.setAttribute('href', p.url); a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'sponsored noopener');
      a.setAttribute('data-google-vignette', 'false');
      a.addEventListener('click', function () { track('promo_click', { kind: 'study_resources', partner: p.id, placement: 'study_resources_' + place }); });
      li.appendChild(a); ul.appendChild(li);
    });
    s.appendChild(ul);
    if ('IntersectionObserver' in g) {
      var o = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { o.disconnect(); track('promo_view', { kind: 'study_resources', placement: place }); } });
      }, { threshold: 0.5 });
      setTimeout(function () { if (s.isConnected) o.observe(s); }, 0);
    }
    return s;
  }
  function mountHome() {
    var main = doc.querySelector('main');
    if (!main || !main.querySelector('.hero') || main.querySelector('[data-mon="study-resources"]')) return;
    var s = buildSection('home'); if (!s) return;
    var band = el('section', 'band mon-band'), wrap = el('div', 'wrap');
    wrap.appendChild(s); band.appendChild(wrap);
    var anchor = main.querySelector('section.study-band') || main.querySelector('section:last-of-type');
    if (anchor) anchor.insertAdjacentElement('afterend', band); else main.appendChild(band);
  }
  function mountArticle() {
    var art = doc.querySelector('main article.prose');
    if (!art || art.querySelector('[data-mon="study-resources"]')) return;
    if (art.querySelector('.qc[data-mode="test"]')) return;       // test pages: the section waits for the results
    var s = buildSection('article'); if (s) art.appendChild(s);
  }
  /* Results of a graded practice test, right under the quiz block (the score
     stays first): the Android app card, the study resources, then Adcash
     Slot B. Slot A (below the quiz) goes away for good. The app card and the
     study resources leave again if the test is restarted; Slot B runs once
     per page view and stays. */
  function watchResults() {
    doc.querySelectorAll('main .qc[data-mode="test"]').forEach(function (qc) {
      var box = null, slotB = null;
      function sync() {
        var graded = qc.classList.contains('graded');
        if (graded && !box) {
          box = el('div', 'mon-results'); box.setAttribute('data-mon', 'results');
          var app = g.ECL_APP_CARD && g.ECL_APP_CARD('results');
          if (app) { var w = el('div', 'mon-results-app'); w.appendChild(app); box.appendChild(w); }
          var s = buildSection('results'); if (s) box.appendChild(s);
          qc.insertAdjacentElement('afterend', box);
          if (g.ECL_ADS) {
            g.ECL_ADS.remove('A');
            if (!slotB) { var hold = el('div', 'mon-results-ad'); box.insertAdjacentElement('afterend', hold); slotB = g.ECL_ADS.mount(hold, 'B') || true; if (slotB === true) hold.remove(); }
          }
        } else if (!graded && box) { box.remove(); box = null; }
      }
      if ('MutationObserver' in g) new MutationObserver(sync).observe(qc, { attributes: true, attributeFilter: ['class'] });
      sync();
    });
  }
  /* web trainer: under the results screen buttons (after the promo card or ad that may already be there) */
  function trainerResult(root) {
    if (!root || root.querySelector('.mon-res')) return;
    var nav = null;
    root.querySelectorAll('.navrow').forEach(function (n) { if (n.querySelector('button[onclick*="goTab(\'home\')"]')) nav = n; });
    if (!nav) return;
    /* the results screen may already carry its own italki banner: do not show italki twice */
    var dup = !!root.querySelector('.w-promo a[href*="italki.com"]');
    var s = buildSection('trainer_result', 'trainer', dup); if (!s) return;
    var a = nav;
    while (a.nextElementSibling && a.nextElementSibling.matches('.w-promo,.w-adres')) a = a.nextElementSibling;
    a.insertAdjacentElement('afterend', s);
  }

  /* ----------------------------- verification ----------------------------- */
  function verify() {
    var rows = [], pt = pageType();
    function row(provider, item, status, detail) { rows.push({ provider: provider, item: item, status: status, detail: detail || '' }); }
    var I = CFG.italki, iurl = ((g.ECL_CONFIG || {}).partners || {}).italki;
    if (!I || I.enabled === false) row('italki', '(provider)', 'OFF', 'disabled: every italki banner and card is hidden');
    else row('italki', 'tracking link', https(iurl) ? 'OK' : 'ERROR', https(iurl) ? 'uses assets/config.js > partners.italki' : 'assets/config.js > partners.italki is empty or not https');
    ((CFG.studyResources || {}).items || []).forEach(function (p, i) {
      var n = p && p.id ? p.id : '#' + (i + 1);
      if (!p || p.enabled !== true) return row('resources', n, 'OFF', 'item disabled: renders nothing');
      if (p.id === 'italki') return row('resources', n, 'OK', 'link from assets/config.js > partners.italki');
      if (!https(p.url) || !t(p.title || p.name)) return row('resources', n, 'ERROR', 'needs a name and an https url (skipped, nothing renders)');
      row('resources', n, 'OK', p.url + ' (text card, new tab, rel="sponsored noopener")');
    });
    if (g.ECL_ADS) row('adcash', 'plan', 'INFO', JSON.stringify(g.ECL_ADS.plan()) + ' (zone switches: assets/ads.js)');
    var sec = doc.querySelectorAll('[data-mon="study-resources"]').length;
    row('section', 'Recommended Study Resources', sec ? 'OK' : 'SKIP', sec ? sec + ' on this page' : 'not on this page (none expected on tests until graded)');
    try { console.log('ECL monetization check, page type: ' + pt); console.table(rows); } catch (e) { }
    return rows;
  }

  g.ECL_MON = { verify: verify, items: items, trainerResult: trainerResult };
  function run() {
    if (PRACTICE) return;
    mountHome(); mountArticle(); watchResults();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', run); else run();
  if (/[?&]mon=check\b/.test(location.search)) afterLoad(function () { setTimeout(verify, 1500); });
})(window);
