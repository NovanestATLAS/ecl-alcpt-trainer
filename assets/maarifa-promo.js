/* ==========================================================================
   maarifa-promo.js - Arabic cross-promotion for "Lammat Al-Ma'rifa"
   (لمة المعرفة, com.novanest.maani), our free Arabic quiz game on Android.
   --------------------------------------------------------------------------
   Loaded by site.js on the content pages and by practice/index.html.
   Shown only where it is useful and never in the way:
     . to Arabic speakers: Arabic pages, an Arabic browser language, or a time
       zone of the Arab world; never on iPhone/iPad (the game is Android only);
     . lesson, topic and guide pages: one card between two sections near the
       middle of the article, and on desktop also one in the side column
       under "Practice now"; never next to an ad, a question or an answer
       button, and the side card steps aside while questions are on screen;
     . the mobile menu: one compact line at the bottom;
     . the trainer: one card at the bottom of the home menu, never during
       a quiz.
   The x button hides the cards for 30 days (the menu line stays).
   Test: ?mf=1 shows it to anyone, ?mf=0 hides it.
   No cookie, no personal data: GA4 only counts views and clicks by placement
   (maarifa_promo_view / maarifa_promo_click) when analytics is on.
   ========================================================================== */
(function (g) {
  'use strict';
  if (g.MF_PROMO) return;
  var doc = document, html = doc.documentElement;
  var me = doc.currentScript || doc.querySelector('script[src*="maarifa-promo.js"]');
  var BASE = me && me.src ? me.src.replace(/maarifa-promo\.js[^/]*$/, '') : '/assets/';
  var PKG = 'com.novanest.maani', KEY = 'mf_promo_hide', DAYS = 30;
  var TZ = ['Africa/Casablanca', 'Africa/El_Aaiun', 'Africa/Algiers', 'Africa/Tunis', 'Africa/Tripoli', 'Africa/Cairo',
    'Africa/Khartoum', 'Africa/Nouakchott', 'Africa/Djibouti', 'Africa/Mogadishu', 'Indian/Comoro', 'Asia/Riyadh',
    'Asia/Dubai', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat', 'Asia/Aden', 'Asia/Baghdad',
    'Asia/Amman', 'Asia/Damascus', 'Asia/Beirut', 'Asia/Gaza', 'Asia/Hebron'];

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function track(name, place) { try { if (g.ECL_TRACK) g.ECL_TRACK(name, { placement: place }); } catch (e) { } }

  function allowed() {
    var m = /[?&]mf=([01])\b/.exec(location.search);
    if (m) return m[1] === '1';
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return false;
    if (/^ar\b/i.test(html.lang || '') || /\/ar\//.test(location.pathname)) return true;
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) if (/^ar\b/i.test(langs[i] || '')) return true;
    try { if (TZ.indexOf(Intl.DateTimeFormat().resolvedOptions().timeZone || '') >= 0) return true; } catch (e) { }
    return false;
  }
  function dismissed() {
    if (/[?&]mf=1\b/.test(location.search)) return false;
    var t = +get(KEY) || 0;
    return t > 0 && Date.now() - t < DAYS * 864e5;
  }
  function playUrl(place) {
    return 'https://play.google.com/store/apps/details?id=' + PKG + '&hl=ar&referrer=' +
      encodeURIComponent('utm_source=ecl-alcpt-trainer&utm_medium=' + place + '&utm_campaign=cross_promo');
  }

  /* ------------------------------- styles -------------------------------- */
  var CSS = [
    '@font-face{font-family:"MF Kufi";src:url("' + BASE + 'fonts/reemkufi-maarifa.woff2") format("woff2");font-weight:400 700;font-display:swap}',
    '.mf{--mf-bg:linear-gradient(135deg,#FFF9EC 0%,#F6EBD2 100%);--mf-line:#E6D3A6;--mf-ink:#1F2350;--mf-ink2:#4A4E73;',
    '--mf-title:#1F2350;--mf-chip:#FFFFFF;--mf-chip-ink:#5B430E;--mf-kick:#8A5F14;',
    '--mf-shadow:0 1px 2px rgba(31,35,80,.06),0 12px 30px rgba(31,35,80,.10)}',
    '.mf.mf-dark{--mf-bg:linear-gradient(135deg,#2A2570 0%,#17134A 100%);--mf-line:rgba(255,255,255,.10);--mf-ink:#F1EFFF;',
    '--mf-ink2:#C9C5F0;--mf-title:#F6B73C;--mf-chip:rgba(255,255,255,.09);--mf-chip-ink:#F1EFFF;',
    '--mf-kick:#F6B73C;--mf-shadow:0 14px 34px rgba(0,0,0,.35)}',
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .mf:not(.mf-light){--mf-bg:linear-gradient(135deg,#2A2570 0%,#17134A 100%);',
    '--mf-line:rgba(255,255,255,.10);--mf-ink:#F1EFFF;--mf-ink2:#C9C5F0;--mf-title:#F6B73C;--mf-chip:rgba(255,255,255,.09);',
    '--mf-chip-ink:#F1EFFF;--mf-kick:#F6B73C;--mf-shadow:0 14px 34px rgba(0,0,0,.35)}}',
    ':root[data-theme="dark"] .mf:not(.mf-light){--mf-bg:linear-gradient(135deg,#2A2570 0%,#17134A 100%);--mf-line:rgba(255,255,255,.10);',
    '--mf-ink:#F1EFFF;--mf-ink2:#C9C5F0;--mf-title:#F6B73C;--mf-chip:rgba(255,255,255,.09);--mf-chip-ink:#F1EFFF;',
    '--mf-kick:#F6B73C;--mf-shadow:0 14px 34px rgba(0,0,0,.35)}',

    '.mf{position:relative;box-sizing:border-box;direction:rtl;text-align:right;color:var(--mf-ink);background:var(--mf-bg);',
    'border:1px solid var(--mf-line);border-radius:18px;box-shadow:var(--mf-shadow);overflow:hidden;isolation:isolate;',
    'font-family:"Segoe UI",Tahoma,"Noto Sans Arabic","Noto Naskh Arabic",system-ui,sans-serif;line-height:1.5}',
    '.mf *{box-sizing:border-box}',
    '.mf::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:',
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2756%27 height=%2756%27%3E%3Cg fill=%27none%27 stroke=%27%23000%27 stroke-width=%271%27%3E%3Cpath d=%27M28 4 34 22 52 28 34 34 28 52 22 34 4 28 22 22Z%27/%3E%3Crect x=%2718%27 y=%2718%27 width=%2720%27 height=%2720%27 transform=%27rotate(45 28 28)%27/%3E%3C/g%3E%3C/svg%3E");',
    'opacity:.07}',
    '.mf.mf-dark::before{filter:invert(1)}',
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .mf:not(.mf-light)::before{filter:invert(1)}}',
    ':root[data-theme="dark"] .mf:not(.mf-light)::before{filter:invert(1)}',
    '.mf p,.mf ul,.mf li{margin:0;padding:0}.mf ul{list-style:none}.mf li::before,.mf li::marker{content:none}',
    '.mf-x{position:absolute;top:8px;left:8px;z-index:2;width:30px;height:30px;border:0;border-radius:50%;cursor:pointer;',
    'background:transparent;color:var(--mf-ink2);font:400 22px/30px system-ui,sans-serif;padding:0;text-align:center}',
    '.mf-x:hover{background:var(--mf-chip)}.mf-x:focus-visible,.mf-cta:focus-visible,.mf-nav:focus-visible{outline:3px solid #F6B73C;outline-offset:2px}',
    '.mf-kick{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:.8rem;font-weight:700;color:var(--mf-kick);padding-left:30px}',
    '.mf-kick span{display:inline-block;padding:2px 10px;border-radius:99px;background:var(--mf-chip);border:1px solid var(--mf-line)}',
    '.mf-title{display:flex;align-items:center;gap:10px;margin:8px 0 2px!important;font-family:"MF Kufi","Segoe UI",Tahoma,sans-serif;',
    'font-weight:700;font-size:2.15rem;line-height:1.15;color:var(--mf-title);letter-spacing:0}',
    '.mf-title svg{width:30px;height:30px;flex:none}',
    '.mf-tag{font-size:1rem;color:var(--mf-ink);font-weight:600}',
    '.mf-pts{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 14px!important}',
    '.mf-pts li{font-size:.82rem;font-weight:700;padding:4px 10px;border-radius:10px;background:var(--mf-chip);color:var(--mf-chip-ink);border:1px solid var(--mf-line)}',
    'a.mf-cta{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:10px 20px;border-radius:14px;',
    'background:linear-gradient(180deg,#F8C453,#EFA92A);color:#1D1846!important;text-decoration:none!important;font-weight:800;font-size:1rem;',
    'box-shadow:0 3px 0 #B9801A,0 8px 18px rgba(239,169,42,.28);transition:transform .1s}',
    'a.mf-cta:hover{transform:translateY(-1px)}a.mf-cta:active{transform:translateY(1px);box-shadow:0 1px 0 #B9801A}',
    'a.mf-cta svg{width:20px;height:20px;flex:none}',
    '.mf-fine{margin-top:8px!important;font-size:.74rem;color:var(--mf-ink2)}',
    /* decorative question card */
    '.mf-art{display:flex;align-items:center;justify-content:center}',
    '.mf-q{width:100%;max-width:230px;background:#fff;color:#1D1846;border-radius:16px;padding:12px;transform:rotate(-3deg);',
    'box-shadow:0 10px 26px rgba(20,16,70,.25);border:4px solid rgba(255,255,255,.65)}',
    '.mf-cat{display:inline-block;font-size:.7rem;font-weight:800;color:#8A5410;background:#FBE7C6;border-radius:99px;padding:2px 9px}',
    '.mf-q b{display:block;margin:7px 0 9px;font-size:.98rem;font-weight:800;line-height:1.35}',
    '.mf-opts{display:grid;grid-template-columns:1fr 1fr;gap:6px}',
    '.mf-opts i{font-style:normal;font-size:.82rem;font-weight:700;text-align:center;padding:6px 4px;border-radius:9px;border:1.5px solid #E3E1F0;color:#2B2760}',
    '.mf-opts i.ok{background:#1E8A4C;border-color:#1E8A4C;color:#fff}',
    /* placements */
    '.mf--inline{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:18px;align-items:center;padding:20px 22px;margin:2.2em 0}',
    '.mf--aside{display:grid;gap:12px;padding:18px;transition:opacity .25s,visibility .25s}',
    '.mf--aside .mf-art{order:-1;padding:6px 0 4px}.mf--aside .mf-title{font-size:1.9rem}',
    '.mf--aside a.mf-cta{width:100%;padding:10px 12px;gap:8px;font-size:.92rem;white-space:nowrap}.mf--aside .mf-pts li{font-size:.78rem}',
    '.mf--aside.mf-away{opacity:0;visibility:hidden}',
    '.mf--trainer{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:16px;align-items:center;padding:18px;margin:18px 0 6px}',
    '@media (max-width:980px){.mf--aside{display:none}}',
    '@media (max-width:600px){.mf--inline,.mf--trainer{grid-template-columns:1fr;gap:10px;padding:14px 14px 16px}',
    '.mf--inline .mf-art,.mf--trainer .mf-art{order:-1}.mf-q{max-width:230px;padding:9px 10px;transform:rotate(-2deg)}',
    '.mf-q b{font-size:.88rem;margin:5px 0 7px}.mf-opts{gap:5px}.mf-opts i{font-size:.76rem;padding:4px 3px}',
    '.mf-title{font-size:1.75rem;margin-top:4px!important}.mf-tag{font-size:.95rem}.mf-pts{margin:9px 0 12px!important}',
    '.mf-pts li{font-size:.76rem;padding:3px 8px}a.mf-cta{width:100%}}',
    /* mobile menu line */
    'a.mf-nav{display:none}',
    '@media (max-width:1139px){a.mf-nav{display:flex;align-items:center;gap:12px;margin:10px 0 0;padding:10px 12px!important;border-radius:14px;',
    'text-decoration:none;direction:rtl;text-align:right;background:linear-gradient(135deg,#2A2570,#17134A);color:#F1EFFF!important;',
    'font-family:"Segoe UI",Tahoma,"Noto Sans Arabic",system-ui,sans-serif}',
    'a.mf-nav svg{width:34px;height:34px;flex:none}a.mf-nav span{display:grid;line-height:1.3;min-width:0;flex:1}',
    'a.mf-nav b{font-family:"MF Kufi","Segoe UI",Tahoma,sans-serif;font-size:1.25rem;color:#F6B73C;font-weight:700}',
    'a.mf-nav small{font-size:.8rem;color:#C9C5F0}a.mf-nav em{font-style:normal;font-weight:800;font-size:.8rem;color:#1D1846;',
    'background:#F6B73C;border-radius:10px;padding:6px 10px;white-space:nowrap}}',
    '@media (prefers-reduced-motion:reduce){.mf,.mf *{transition:none!important}}',
    '@media print{.mf,.mf-nav{display:none!important}}'
  ].join('');

  function injectCSS() {
    if (doc.getElementById('mf-css')) return;
    var s = doc.createElement('style'); s.id = 'mf-css'; s.textContent = CSS;
    (doc.head || html).appendChild(s);
  }

  /* -------------------------------- markup -------------------------------- */
  var STAR = '<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="#F6B73C"><rect x="8" y="8" width="24" height="24" rx="2.5"/>' +
    '<rect x="8" y="8" width="24" height="24" rx="2.5" transform="rotate(45 20 20)"/></g>' +
    '<circle cx="20" cy="20" r="6" fill="none" stroke="#FFF6DD" stroke-width="2.4"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1D1846" d="M5 3.6v16.8c0 .7.8 1.2 1.4.8l14-8.4c.6-.4.6-1.2 0-1.6l-14-8.4C5.8 2.4 5 2.9 5 3.6z"/></svg>';

  function card(place, extra) {
    var el = doc.createElement('aside');
    el.className = 'mf mf--' + (extra || 'inline');
    el.setAttribute('dir', 'rtl'); el.setAttribute('lang', 'ar'); el.setAttribute('translate', 'no');
    el.setAttribute('data-tr-skip', ''); el.setAttribute('aria-label', 'لمة المعرفة: لعبة أسئلة عربية مجانية');
    el.innerHTML =
      '<button type="button" class="mf-x" aria-label="إخفاء هذا الإعلان لمدة 30 يومًا" title="إخفاء">&times;</button>' +
      '<div class="mf-body">' +
        '<p class="mf-kick"><span>من تطبيقاتنا</span>مجانية على أندرويد</p>' +
        '<p class="mf-title">' + STAR + 'لمة المعرفة</p>' +
        '<p class="mf-tag">لعبة أسئلة ومعلومات عربية للعائلة والأصدقاء</p>' +
        '<ul class="mf-pts"><li>أكثر من 1400 سؤال</li><li>اللعب الفردي بدون إنترنت</li><li>تحدٍّ حتى 5 لاعبين</li></ul>' +
        '<a class="mf-cta" href="' + playUrl(place) + '" target="_blank" rel="noopener">' + PLAY + 'حمّلها مجانًا من Google Play</a>' +
      '</div>' +
      '<div class="mf-art" aria-hidden="true"><div class="mf-q"><span class="mf-cat">العالم العربي</span>' +
        '<b>ما عاصمة سلطنة عُمان؟</b><span class="mf-opts"><i>الدوحة</i><i class="ok">مسقط ✓</i><i>المنامة</i><i>صلالة</i></span></div></div>';
    el.querySelector('.mf-x').addEventListener('click', function () {
      set(KEY, String(Date.now()));
      doc.querySelectorAll('aside.mf').forEach(function (c) { c.remove(); });
      track('maarifa_promo_hide', place);
    });
    el.querySelector('.mf-cta').addEventListener('click', function () { track('maarifa_promo_click', place); });
    watchView(el, place);
    return el;
  }

  function navItem() {
    var a = doc.createElement('a');
    a.className = 'mf-nav'; a.href = playUrl('menu'); a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('dir', 'rtl'); a.setAttribute('lang', 'ar'); a.setAttribute('translate', 'no');
    a.innerHTML = STAR + '<span><b>لمة المعرفة</b><small>لعبة أسئلة عربية مجانية للعائلة والأصدقاء</small></span><em>حمّلها</em>';
    a.addEventListener('click', function () { track('maarifa_promo_click', 'menu'); });
    return a;
  }

  var io = null, seen = {};
  function watchView(el, place) {
    if (!('IntersectionObserver' in g)) return;
    if (!io) io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var p = e.target.getAttribute('data-mf-place');
        if (p && !seen[p]) { seen[p] = 1; track('maarifa_promo_view', p); }
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    el.setAttribute('data-mf-place', place);
    setTimeout(function () { if (el.isConnected) io.observe(el); }, 0);
  }

  /* ----------------------- where it goes in an article -------------------- */
  var BAD = '.ad-slot, .qc, .qlist, .faq, .cta-box, .related, .pager, .howto, .bands';
  function isBad(el) { return !!el && (el.matches(BAD) || !!el.querySelector('.qc, .qlist, .bub, .ad-slot')); }
  function pickSpot(art) {
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

  /* the side card steps aside while questions are on screen */
  function awayFromQuestions(sideCard) {
    var qs = doc.querySelectorAll('main .qc, main .qlist');
    if (!qs.length || !('IntersectionObserver' in g)) return;
    var on = new Set();
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) on.add(e.target); else on.delete(e.target); });
      sideCard.classList.toggle('mf-away', on.size > 0);
    }, { rootMargin: '0px 0px -10% 0px' });
    qs.forEach(function (q) { o.observe(q); });
  }

  /* ------------------------------ site pages ------------------------------ */
  function sitePages() {
    var nav = doc.getElementById('nav');
    if (nav && !nav.querySelector('.mf-nav')) nav.appendChild(navItem());
    if (dismissed()) return;
    var art = doc.querySelector('main article.prose'), side = doc.querySelector('main .aside');
    if (!art) return;
    var testPage = !!art.querySelector('.qc[data-mode="test"]');
    if (side && !testPage && !side.querySelector('.mf')) {
      var sc = card('sidebar', 'aside'), first = side.querySelector('.aside-card');
      if (first && first.nextSibling) side.insertBefore(sc, first.nextSibling); else side.appendChild(sc);
      awayFromQuestions(sc);
    }
    var spot = !testPage && pickSpot(art);
    if (spot && !art.querySelector('.mf')) {
      var ic = card('article', 'inline');
      if (!side) ic.classList.add('mf-solo');
      spot.parentNode.insertBefore(ic, spot);
    }
  }

  /* -------------------------- trainer home menu --------------------------- */
  function trainerHome(root) {
    if (!root || !allowed() || dismissed()) return;
    if (root.querySelector('.mf')) return;
    var c = card('trainer_home', 'trainer');
    c.classList.add(doc.body.classList.contains('t-paper') ? 'mf-light' : 'mf-dark');
    root.appendChild(c);
  }

  function run() {
    if (!allowed()) return;
    injectCSS();
    sitePages();
  }

  g.MF_PROMO = { allowed: allowed, trainerHome: function (root) { if (allowed()) { injectCSS(); trainerHome(root); } } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', run); else run();
})(window);
