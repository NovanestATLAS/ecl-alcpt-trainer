/* ==========================================================================
   monetization.js - draws what assets/monetization-config.js switches on.
   --------------------------------------------------------------------------
   Nothing here is edited to add a partner or a zone: change the config file.
   . "Recommended Study Resources": the italki offer plus every enabled
     Impact.com partner. It goes on the home page, below articles, and under a
     graded practice test or a trainer results screen. Never inside a quiz.
   . Adcash: manual Banner / Native zones only, in a labeled box that reserves
     its exact size. The library loads once, asynchronously, after the page has
     loaded and is idle, so it never delays rendering or the quizzes.
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
  var CATS = ['english-learning', 'language-learning', 'test-prep', 'education', 'study-tools'];
  var UI = {
    heading: { en: 'Recommended Study Resources', fr: 'Ressources d’étude recommandées', ar: 'موارد دراسة موصى بها' },
    disclosure: { en: 'Some links are affiliate links that help keep this site free at no extra cost to you.' },
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
    '.mon-res,.mon-ad{--m-card:var(--sheet,var(--card,#fff));--m-ink:var(--ink,#14243D);--m-mut:var(--ink-2,var(--mut,#4F5F77));',
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
    /* Adcash */
    '.mon-ad-wrap{padding-top:8px;padding-bottom:8px}',
    '.mon-ad{margin:28px auto;text-align:center;contain:layout style}',
    '.mon-ad .mon-ad-label{margin:0 0 6px;font:600 .72rem/1 var(--text,inherit);letter-spacing:.06em;text-transform:uppercase;color:var(--m-mut)}',
    '[dir="rtl"] .mon-ad .mon-ad-label{letter-spacing:0}',
    '.mon-ad .mon-ad-slot{margin:0 auto;max-width:100%;overflow:hidden}',
    '.mon-ad--sidebar{margin:16px 0;transition:opacity .25s,visibility .25s}.mon-ad--sidebar.mon-ad--away{opacity:0;visibility:hidden}',
    '.mon-ad[hidden],.mon-ad-wrap[hidden]{display:none}',
    '@media print{.mon-res,.mon-ad,.mon-ad-wrap{display:none}}'
  ].join('');
  function injectCSS() {
    if (doc.getElementById('mon-css')) return;
    var s = doc.createElement('style'); s.id = 'mon-css'; s.textContent = CSS;
    (doc.head || html).appendChild(s);
  }

  /* ------------------------ Recommended Study Resources ------------------- */
  function items(skipItalki) {
    var out = [], seen = {};
    var I = CFG.italki, url = ((g.ECL_CONFIG || {}).partners || {}).italki;
    if (!skipItalki && I && I.enabled !== false && !italkiHidden() && https(url) && t((I.card || {}).title)) {
      out.push({ id: 'italki', provider: 'italki', title: t(I.card.title), description: t(I.card.description),
        ctaText: t(I.card.ctaText, UI.more), url: String(url).trim() });
    }
    if (on('impact') && CFG.impact.partners && CFG.impact.partners.length) {
      CFG.impact.partners.forEach(function (p) {
        if (!p || p.enabled !== true || !https(p.trackingUrl) || !t(p.title)) return;
        var id = String(p.id || 'impact');
        if (seen[id]) return; seen[id] = 1;
        out.push({ id: id, provider: 'impact', title: t(p.title), description: t(p.description),
          ctaText: t(p.ctaText, UI.more), url: p.trackingUrl.trim() });
      });
    }
    return out;
  }
  function buildSection(place, variant, skipItalki) {
    var SR = CFG.studyResources || {};
    if (SR.enabled === false) return null;
    var list = items(skipItalki);
    if (!list.length) return null;
    if (SR.requireImpactPartner && !list.some(function (p) { return p.provider === 'impact'; })) return null;
    injectCSS();
    var hid = 'mon-h-' + (++uid);
    var s = el('section', 'mon-res' + (variant ? ' mon-res--' + variant : ''));
    s.setAttribute('data-mon', 'study-resources'); s.setAttribute('data-place', place);
    s.setAttribute('data-tr-skip', ''); s.setAttribute('aria-labelledby', hid);
    var h = el('h2', 'mon-res-h', t(SR.heading, UI.heading)); h.id = hid;
    s.appendChild(h);
    s.appendChild(el('p', 'mon-res-note', t(SR.disclosure, UI.disclosure)));
    var ul = el('ul', 'mon-res-grid');
    list.forEach(function (p) {
      var li = el('li', 'mon-card');
      li.appendChild(el('span', 'mon-tag', t(SR.tag, UI.tag)));
      li.appendChild(el('h3', 'mon-card-t', p.title));
      if (p.description) li.appendChild(el('p', 'mon-card-d', p.description));
      var a = el('a', 'mon-cta', p.ctaText);
      a.setAttribute('href', p.url); a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'sponsored noopener noreferrer');
      a.setAttribute('data-google-vignette', 'false');
      a.addEventListener('click', function () { track('promo_click', { kind: p.provider, partner: p.id, placement: 'study_resources_' + place }); });
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
  /* under a graded practice test, outside the quiz block; gone again when the test is restarted */
  function watchResults() {
    doc.querySelectorAll('main .qc[data-mode="test"]').forEach(function (qc) {
      function sync() {
        var graded = qc.classList.contains('graded'), nx = qc.nextElementSibling;
        var mine = nx && nx.getAttribute('data-mon') === 'study-resources' ? nx : null;
        if (graded && !mine) { var s = buildSection('results'); if (s) qc.insertAdjacentElement('afterend', s); }
        else if (!graded && mine) mine.remove();
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

  /* --------------------------------- Adcash ------------------------------- */
  var AD_FORMATS = ['banner', 'native'], AD_PLACES = ['footer', 'sidebar'];
  var AD_BAD = /autotag|pop-?under|interstitial|in-?page-?push|video-?slider|\.\s*runPop|\.\s*runPush/i;
  function parseHtml(str) { var tp = doc.createElement('template'); tp.innerHTML = String(str || ''); return tp.content; }
  function parseLibrary(sn) {
    if (!/\S/.test(sn || '')) return null;
    var s = parseHtml(sn).querySelector('script[src]');
    var src = s && s.getAttribute('src');
    if (!src || !/^(https:)?\/\/[^\s"'<>]+$/i.test(src)) return null;
    return { id: s.id && /^[\w-]+$/.test(s.id) ? s.id : 'aclib', src: src };
  }
  function zoneProblems(z, ids) {
    var p = [];
    if (!z || typeof z !== 'object') return ['not an object'];
    if (!z.id || !/^[\w-]+$/.test(String(z.id))) p.push('needs an id (letters, numbers, - and _)');
    else if (ids && ids[z.id]) p.push('duplicate id'); else if (ids) ids[z.id] = 1;
    if (AD_FORMATS.indexOf(z.format) < 0) p.push('format must be banner or native');
    if (AD_PLACES.indexOf(z.placement) < 0) p.push('placement must be footer or sidebar');
    if (!/\S/.test(z.snippet || '')) p.push('snippet is empty');
    else if (AD_BAD.test(z.snippet) || /aclib\s*\.\s*run(?!Banner\b|Native\b)\w+/i.test(z.snippet)) p.push('only Banner and Native zone code is allowed');
    var okW = z.width === 'fluid' || (typeof z.width === 'number' && z.width > 0);
    if (!okW || !(typeof z.height === 'number' && z.height > 0)) p.push('width and height must be set (pixels) to reserve the space');
    return p;
  }
  function adBox(z) {
    var box = el('aside', 'mon-ad mon-ad--' + z.placement);
    box.setAttribute('data-mon-zone', z.id); box.setAttribute('aria-label', t(CFG.adLabel, UI.ad));
    box.setAttribute('data-tr-skip', ''); box.setAttribute('translate', 'no');
    box.appendChild(el('p', 'mon-ad-label', t(CFG.adLabel, UI.ad)));
    var slot = el('div', 'mon-ad-slot');
    slot.style.width = z.width === 'fluid' ? '100%' : z.width + 'px';
    slot.style.height = z.height + 'px';                               // the reserved space: no layout shift
    box.appendChild(slot);
    return box;
  }
  function awayFromQuestions(box) {
    var qs = doc.querySelectorAll('main .qc');
    if (!qs.length || !('IntersectionObserver' in g)) return;
    var shown = new Set();
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) shown.add(e.target); else shown.delete(e.target); });
      box.classList.toggle('mon-ad--away', shown.size > 0);
    }, { rootMargin: '0px 0px -10% 0px' });
    qs.forEach(function (q) { o.observe(q); });
  }
  function loadLibrary(lib) {
    if (g.__eclAdcashLib) return g.__eclAdcashLib;                     // one library, one initialisation
    g.__eclAdcashLib = new Promise(function (resolve, reject) {
      var done = false;
      function ok() { if (!done) { done = true; resolve(); } }
      function bad() { if (!done) { done = true; reject(); } }
      setTimeout(bad, 10000);
      var ex = doc.getElementById(lib.id);
      if (ex) { if (g.aclib) return ok(); ex.addEventListener('load', ok); ex.addEventListener('error', bad); return; }
      var s = doc.createElement('script');
      s.id = lib.id; s.async = true; s.src = lib.src; s.onload = ok; s.onerror = bad;
      (doc.head || html).appendChild(s);
    });
    return g.__eclAdcashLib;
  }
  function runZone(m, lib) {
    if (m.slot.getAttribute('data-ran')) return;                       // one initialisation per zone
    m.slot.setAttribute('data-ran', '1');
    try {
      [].slice.call(parseHtml(m.z.snippet).childNodes).forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.nodeName !== 'SCRIPT') { m.slot.appendChild(n); return; }
        var src = n.getAttribute('src');
        if (src && (n.id === lib.id || src === lib.src)) return;      // the library is already loaded
        var s = doc.createElement('script');
        [].slice.call(n.attributes).forEach(function (a) { s.setAttribute(a.name, a.value); });
        if (src) s.async = true; else s.text = n.textContent;
        m.slot.appendChild(s);                                         // runs inside its own box
      });
    } catch (e) { m.root.hidden = true; return; }
    setTimeout(function () {                                           // nothing drawn: no empty box left behind
      var drawn = [].slice.call(m.slot.children).some(function (c) { return c.nodeName !== 'SCRIPT'; });
      if (!drawn) m.root.hidden = true;
    }, 6000);
  }
  var mounted = [];
  function mountAdcash() {
    if (!on('adcash') || PRACTICE || typeof Promise === 'undefined') return;
    var A = CFG.adcash, lib = parseLibrary(A.librarySnippet), pt = pageType(), ids = {};
    if (!lib || !A.zones || !A.zones.length) return;
    A.zones.forEach(function (z) {
      if (!z || z.enabled !== true) { if (z && z.id) ids[z.id] = 1; return; }
      if (zoneProblems(z, ids).length) return;
      if ((z.pages || []).indexOf(pt) < 0) return;
      var box = adBox(z), root = box;
      if (z.placement === 'footer') {
        var f = doc.querySelector('footer.site-footer'); if (!f) return;
        root = el('div', 'wrap mon-ad-wrap'); root.appendChild(box); f.parentNode.insertBefore(root, f);
      } else {
        var side = doc.querySelector('main .aside'); if (!side) return;
        side.appendChild(box); awayFromQuestions(box);
      }
      mounted.push({ z: z, root: root, slot: box.querySelector('.mon-ad-slot') });
    });
    if (!mounted.length) return;
    injectCSS();
    afterLoad(function () {                                            // after the page is loaded and idle
      loadLibrary(lib).then(function () { mounted.forEach(function (m) { runZone(m, lib); }); },
        function () { mounted.forEach(function (m) { m.root.remove(); }); });
    });
  }

  /* ----------------------------- verification ----------------------------- */
  function verify() {
    var rows = [], pt = pageType();
    function row(provider, item, status, detail) { rows.push({ provider: provider, item: item, status: status, detail: detail || '' }); }
    var I = CFG.italki, iurl = ((g.ECL_CONFIG || {}).partners || {}).italki;
    if (!I || I.enabled === false) row('italki', '(provider)', 'OFF', 'disabled: every italki banner and card is hidden');
    else row('italki', 'tracking link', https(iurl) ? 'OK' : 'ERROR', https(iurl) ? 'uses assets/config.js > partners.italki' : 'assets/config.js > partners.italki is empty or not https');
    if (!on('impact')) row('impact', '(provider)', 'OFF', 'disabled');
    else {
      var seen = {}, any = false;
      (CFG.impact.partners || []).forEach(function (p, i) {
        var n = p && p.id ? p.id : '#' + (i + 1);
        if (!p || p.enabled !== true) return row('impact', n, 'OFF', 'item disabled');
        any = true;
        var bad = [], warn = [];
        if (!t(p.title)) bad.push('title is empty');
        if (!https(p.trackingUrl)) bad.push('trackingUrl is empty or not https');
        if (p.id && seen[p.id]) bad.push('duplicate id');
        seen[p.id] = 1;
        if (p.provider && p.provider !== 'impact') warn.push('provider should be "impact"');
        if (CATS.indexOf(p.category) < 0) warn.push('Impact partners here must be learning or English related; set category to one of: ' + CATS.join(', '));
        if (bad.length) row('impact', n, 'ERROR', bad.join('; ') + ' (skipped, nothing renders)');
        else if (warn.length) row('impact', n, 'WARN', warn.join('; '));
        else row('impact', n, 'OK', 'renders with target=_blank rel="sponsored noopener noreferrer"');
      });
      if (!any) row('impact', '(partners)', 'SKIP', 'no partner is enabled yet: nothing renders');
    }
    if (!on('adcash')) row('adcash', '(provider)', 'OFF', 'disabled');
    else {
      var A = CFG.adcash, lib = parseLibrary(A.librarySnippet), ids = {};
      row('adcash', 'library', lib ? 'OK' : 'ERROR', lib ? lib.src : 'librarySnippet is empty or has no script src: no zone can load');
      (A.zones || []).forEach(function (z) {
        var n = z && z.id ? z.id : '(zone)';
        if (!z || z.enabled !== true) return row('adcash', n, 'OFF', 'zone disabled');
        var pr = zoneProblems(z, ids);
        if (pr.length) return row('adcash', n, 'SKIP', pr.join('; ') + ' (renders nothing)');
        if ((z.pages || []).indexOf(pt) < 0) return row('adcash', n, 'SKIP', 'not set for this page type (' + pt + ')');
        var live = !!doc.querySelector('[data-mon-zone="' + z.id + '"]');
        row('adcash', n, live ? 'OK' : 'SKIP', live ? z.format + ' ' + z.width + 'x' + z.height + ' reserved in the ' + z.placement : 'no place for it on this page');
      });
    }
    var sec = doc.querySelectorAll('[data-mon="study-resources"]').length;
    row('section', 'Recommended Study Resources', sec ? 'OK' : 'SKIP', sec ? sec + ' on this page' : 'not on this page (none expected on tests until graded)');
    try { console.log('ECL monetization check, page type: ' + pt); console.table(rows); } catch (e) { }
    return rows;
  }

  g.ECL_MON = { verify: verify, items: items, trainerResult: trainerResult };
  function run() {
    if (PRACTICE) return;
    mountHome(); mountArticle(); watchResults(); mountAdcash();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', run); else run();
  if (/[?&]mon=check\b/.test(location.search)) afterLoad(function () { setTimeout(verify, 1500); });
})(window);
