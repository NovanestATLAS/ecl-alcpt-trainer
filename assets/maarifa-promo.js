/* ==========================================================================
   maarifa-promo.js - Arabic cross-promotion for "Lammat Al-Ma'rifa"
   (لمة المعرفة, com.novanest.maani), our free Arabic quiz game on Android.
   --------------------------------------------------------------------------
   Loaded by site.js on the content pages and by practice/index.html.
   Shown only to Arabic speakers (Arabic pages, an Arabic browser language, or a time zone of the Arab
   world), never on iPhone/iPad (the game is Android only). On the website, assets/promos.js decides where
   a card goes and takes turns with the ECL app and italki; this file adds the line in the mobile menu and
   the card at the bottom of the trainer's home menu (never during a quiz).
   The x button hides the cards for 30 days (the menu line stays).
   Test: ?mf=1 shows it to anyone, ?mf=0 hides it.
   No cookie, no personal data: GA4 only counts views and clicks by placement
   (maarifa_promo_view / maarifa_promo_click) when analytics is on.
   ========================================================================== */
(function (g) {
  'use strict';
  if (g.MF_PROMO) return;
  var doc = document, html = doc.documentElement;
  var REDUCED = !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
    /* the card is the picture (img/promo/lammat-almaarifa-*.webp): the whole picture is the Google Play link,
       the button over the drawn x (top left) hides the cards for 30 days */
    '.mf{position:relative;display:block;box-sizing:border-box;width:100%;max-width:300px;margin:2em auto;line-height:0;',
    'border-radius:5.2%/4.15%;overflow:hidden;isolation:isolate;background:#1D1846;box-shadow:0 14px 34px rgba(23,19,74,.35);transition:transform .15s}',
    '.mf:hover{transform:translateY(-2px)}',
    '.mf-pic{display:block;border-radius:inherit}.mf-pic img{display:block;width:100%;height:auto}',
    '.mf-pic::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:35%;pointer-events:none;',
    'background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-20deg)}',
    '.mf-x{position:absolute;top:0;left:0;z-index:2;width:15%;aspect-ratio:1;min-width:36px;min-height:36px;padding:0;border:0;',
    'border-radius:50%;background:transparent;cursor:pointer}',
    '.mf-x:focus-visible{outline:3px solid #F6B73C;outline-offset:-6px}.mf-pic:focus-visible{outline:3px solid #F6B73C;outline-offset:-4px}',
    /* placements */
    '.mf-slot:empty{display:none}.mf-slot .mf{margin:1.6em auto}',
    '.mf--aside{max-width:none;margin:16px 0;transition:opacity .25s,visibility .25s}.mf--aside.mf-away{opacity:0;visibility:hidden}',
    '@media (max-width:980px){.mf--aside{display:none}}',
    '.mf--trainer{margin:18px auto 6px}',
    /* motion: the first time it is on screen it bobs and shines 3 times, then keeps still */
    '.mf-anim.mf-live{animation:mfBob 2.6s ease-in-out .3s 3}.mf-anim.mf-live .mf-pic::after{animation:mfShine 2.6s ease-in-out .3s 3}',
    '@keyframes mfBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
    '@keyframes mfShine{0%{left:-60%}55%,100%{left:130%}}',
    /* mobile menu line */
    'a.mf-nav{display:none}',
    '@media (max-width:1139px){a.mf-nav{display:flex;align-items:center;gap:12px;margin:10px 0 0;padding:10px 12px!important;border-radius:14px;',
    'text-decoration:none;direction:rtl;text-align:right;background:linear-gradient(135deg,#2A2570,#17134A);color:#F1EFFF!important;',
    'font-family:"Segoe UI",Tahoma,"Noto Sans Arabic",system-ui,sans-serif}',
    'a.mf-nav svg{width:34px;height:34px;flex:none}a.mf-nav span{display:grid;line-height:1.3;min-width:0;flex:1}',
    'a.mf-nav b{font-family:"MF Kufi","Segoe UI",Tahoma,sans-serif;font-size:1.25rem;color:#F6B73C;font-weight:700}',
    'a.mf-nav small{font-size:.8rem;color:#C9C5F0}a.mf-nav em{font-style:normal;font-weight:800;font-size:.8rem;color:#1D1846;',
    'background:#F6B73C;border-radius:10px;padding:6px 10px;white-space:nowrap}}',
    'a.mf-nav:focus-visible{outline:3px solid #F6B73C;outline-offset:2px}',
    '@media (prefers-reduced-motion:reduce){.mf,.mf *,.mf *::after{transition:none!important;animation:none!important}}',
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

  var IMG = BASE + 'img/promo/lammat-almaarifa-';
  var ALT = 'لمة المعرفة: لعبة أسئلة ومعلومات عربية للعائلة والأصدقاء، مجانية على أندرويد. أكثر من 1400 سؤال، ' +
    'اللعب الفردي بدون إنترنت، تحدٍّ حتى 5 لاعبين. حمّلها مجانًا من Google Play';
  function card(place, extra) {
    var el = doc.createElement('aside');
    el.className = 'mf mf--' + (extra || 'inline');
    if (!REDUCED) el.classList.add('mf-anim');
    el.setAttribute('dir', 'rtl'); el.setAttribute('lang', 'ar'); el.setAttribute('translate', 'no');
    el.setAttribute('data-tr-skip', ''); el.setAttribute('aria-label', 'لمة المعرفة: لعبة أسئلة عربية مجانية');
    el.innerHTML =
      '<a class="mf-pic" href="' + playUrl(place) + '" target="_blank" rel="noopener">' +
        '<img src="' + IMG + '480.webp" srcset="' + IMG + '480.webp 480w, ' + IMG + '840.webp 840w" ' +
        'sizes="300px" width="840" height="1049" loading="lazy" decoding="async" alt="' + ALT + '"></a>' +
      '<button type="button" class="mf-x" aria-label="إخفاء هذا الإعلان لمدة 30 يومًا" title="إخفاء"></button>';
    el.querySelector('.mf-x').addEventListener('click', function () {
      set(KEY, String(Date.now()));
      doc.querySelectorAll('aside.mf').forEach(function (c) { c.remove(); });
      track('maarifa_promo_hide', place);
    });
    el.querySelector('.mf-pic').addEventListener('click', function () { track('maarifa_promo_click', place); });
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
    if (!('IntersectionObserver' in g)) { el.classList.add('mf-live'); return; }
    if (!io) io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('mf-live');
        var p = e.target.getAttribute('data-mf-place');
        if (p && !seen[p]) { seen[p] = 1; track('maarifa_promo_view', p); }
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    el.setAttribute('data-mf-place', place);
    setTimeout(function () { if (el.isConnected) io.observe(el); }, 0);
  }

  /* ------------------------------ site pages ------------------------------ */
  function sitePages() {
    var nav = doc.getElementById('nav');
    if (nav && !nav.querySelector('.mf-nav')) nav.appendChild(navItem());
  }

  /* -------------------------- trainer home menu --------------------------- */
  function trainerHome(root) {
    if (!root || !allowed() || dismissed()) return;
    if (root.querySelector('.mf')) return;
    root.appendChild(card('trainer_home', 'trainer'));
  }

  function run() {
    if (!allowed()) return;
    injectCSS();
    sitePages();
  }

  g.MF_PROMO = {
    allowed: allowed,
    ok: function () { return allowed() && !dismissed(); },               // a card may be shown now
    card: function (place, extra) { injectCSS(); return card(place, extra); },
    trainerHome: function (root) { if (allowed()) { injectCSS(); trainerHome(root); } }
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', run); else run();
})(window);
