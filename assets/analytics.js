/* ==========================================================================
   analytics.js - Google Analytics 4 (gtag.js), every page of the website
   --------------------------------------------------------------------------
   Turned on by the Measurement ID in assets/config.js (ga4: 'G-...'); with
   no ID, nothing is loaded and nothing is sent.
   Consent mode v2: in the European Economic Area, the United Kingdom and
   Switzerland, no analytics or advertising cookie is used until the visitor
   accepts Google's consent message (AdSense > Privacy & messaging); Google
   Analytics then only receives cookieless, aggregated signals. Elsewhere,
   measurement is on.
   A few events say which features are used: exam_start, exam_complete,
   test_complete, listening_start, translate. No answer, no text typed and
   no personal information is ever sent.
   ========================================================================== */
(function (g) {
  'use strict';
  if (g.__eclGA) return;                          // already loaded on this page
  var C = g.ECL_CONFIG || {}, id = String(C.ga4 || '').trim();
  g.ECL_TRACK = function () { };                 // nothing until GA4 is set up
  if (!/^G-[A-Z0-9]{4,}$/i.test(id)) return;
  g.__eclGA = true;
  g.dataLayer = g.dataLayer || [];
  function gtag() { g.dataLayer.push(arguments); }
  if (typeof g.gtag !== 'function') g.gtag = gtag;

  var EEA = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
             'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', region: EEA, wait_for_update: 500 });
  gtag('consent', 'default', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted',
    analytics_storage: 'granted' });
  gtag('js', new Date());
  gtag('config', id);

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  (document.head || document.documentElement).appendChild(s);

  var once = {};
  g.ECL_TRACK = function (name, params, onlyOnce) {
    if (!name) return;
    if (onlyOnce) { if (once[name]) return; once[name] = 1; }
    try { gtag('event', String(name), params || {}); } catch (e) { }
  };
})(window);
