/* ==========================================================================
   MONETIZATION SETTINGS - the one file that switches every provider on or off
   --------------------------------------------------------------------------
   Three providers, each with its own top-level "enabled" switch. Turning one
   off never touches the others, and a provider that is off renders nothing,
   loads nothing and writes nothing to the console.

     italki  : the tutor offer you already have. Its tracking link stays where
               it always was (assets/config.js > partners.italki) and is never
               copied or rewritten here. "enabled": false hides EVERY italki
               banner and card on the site (website and web trainer).
     impact  : Impact.com affiliate partners shown in "Recommended Study
               Resources". Add learning / English partners ONLY (language
               learning, English courses, test prep, study tools).
     adcash  : Adcash display ads: manual Banner and Native zones only. No
               Autotag, Pop-under, Interstitial, Video slider or In-Page Push.

   HOW TO ADD AN IMPACT.COM PARTNER (no code to edit):
     1. In Impact.com, open the approved program and copy YOUR tracking link
        (it must start with https://).
     2. Copy one { ... } block inside impact.partners, paste it after the last
        one, then fill in id, title, description, ctaText and trackingUrl and
        set "enabled": true.
     3. Order in the list = order on the page. Set "enabled": false to hide one.
     A partner with an empty trackingUrl or an empty title is skipped silently.
     title / description / ctaText can be plain text, or { en: '', fr: '', ar: '' }
     to show a different text on the French and Arabic pages.

   HOW TO PASTE ADCASH CODE (official code only, never guessed):
     1. In Adcash, copy the LIBRARY code once into adcash.librarySnippet.
     2. For each approved Banner or Native zone, copy the zone's official
        code into a zone's "snippet" and type the zone's size in width/height
        (this reserves the exact space, so the page never jumps).
     3. "placement": 'footer' (above the site footer, all screen sizes) or
        'sidebar' (right column on desktop, below the content on mobile).
        "pages": where it may appear: 'home', 'article' (lessons, guides,
        topics, tests) and 'other' (hubs and other pages). The trainer
        (/practice/) never shows Adcash.
     A zone with an empty snippet, no size, enabled:false, or while
     adcash.enabled is false, is skipped completely: no box, no space, no error.

   CHECKING YOUR SETUP:
     . Open any page with ?mon=check on the end, then look at the browser
       console (F12): one table lists every provider, partner and zone.
     . Or run:  node tools/check-monetization.js   (checks this file offline)
   ========================================================================== */
window.ECL_MONETIZATION = {

  /* ----------------------------- italki ----------------------------------- */
  italki: {
    enabled: true,
    /* the card shown inside "Recommended Study Resources"; the link itself is
       the existing one in assets/config.js (partners.italki) */
    card: {
      title: { en: 'Speak English with a real tutor', fr: 'Parlez anglais avec un vrai tuteur', ar: 'تحدّث الإنجليزية مع مدرّس حقيقي' },
      description: {
        en: 'One-to-one video lessons on italki, at the times you choose. Pay per lesson.',
        fr: 'Cours particuliers en vidéo sur italki, aux horaires que vous choisissez. Payez à la leçon.',
        ar: 'دروس فردية بالفيديو على italki في الأوقات التي تختارها، وتدفع ثمن كل درس على حدة.'
      },
      ctaText: { en: 'Find a tutor on italki', fr: 'Trouver un tuteur sur italki', ar: 'ابحث عن مدرّس على italki' }
    }
  },

  /* ------------------------------ Impact.com ------------------------------ */
  impact: {
    enabled: true,
    /* learning and English related partners only. Unlimited items. */
    partners: [
      {
        id: 'impact-partner-1',
        provider: 'impact',
        category: 'english-learning',     // english-learning | language-learning | test-prep | education | study-tools
        enabled: false,                   // set to true after pasting the real values below
        title: '',
        description: '',
        ctaText: 'Learn more',
        trackingUrl: ''                   // your approved Impact.com tracking link, https://...
      }
      /* , copy the block above, paste it here and fill it in for the next partner */
    ]
  },

  /* -------------------------------- Adcash -------------------------------- */
  adcash: {
    enabled: true,
    /* the official Adcash library code, pasted exactly as Adcash gives it (loaded once, async) */
    librarySnippet: '<script id="aclib" type="text/javascript" src="//acscdn.com/script/aclib.js"></script>',
    zones: [
      {
        id: 'footer-banner',
        enabled: true,
        format: 'banner',                 // 'banner' or 'native' only
        placement: 'footer',              // 'footer' or 'sidebar'
        pages: ['home', 'article', 'other'],   // where it may appear (the trainer never shows Adcash)
        width: 300,                       // the zone's size in pixels, as set in Adcash
        height: 100,
        /* official zone code, exactly as Adcash gives it */
        snippet: '<script type="text/javascript">aclib.runBanner({ zoneId: \'12471518\' });</script>'
      },
      {
        id: 'sidebar-slot',               // empty placeholder: renders nothing until you fill it in
        enabled: false,
        format: 'banner',
        placement: 'sidebar',
        pages: ['article'],
        width: 0,
        height: 0,
        snippet: ''
      }
    ]
  },

  /* ----------------------- "Recommended Study Resources" ------------------ */
  studyResources: {
    enabled: true,
    /* false: the section also shows while only italki is set up;
       true: it waits until at least one Impact.com partner is live */
    requireImpactPartner: false,
    heading: { en: 'Recommended Study Resources', fr: 'Ressources d’étude recommandées', ar: 'موارد دراسة موصى بها' },
    disclosure: {
      en: 'Some links are affiliate links that help keep this site free at no extra cost to you.',
      fr: 'Certains liens sont des liens d’affiliation : ils aident à garder ce site gratuit, sans frais supplémentaires pour vous.',
      ar: 'بعض الروابط روابط إحالة تساعد على إبقاء هذا الموقع مجانيًا دون أي تكلفة إضافية عليك.'
    },
    tag: { en: 'Affiliate', fr: 'Affilié', ar: 'رابط إحالة' }
  },

  adLabel: { en: 'Advertisement', fr: 'Publicité', ar: 'إعلان' }
};
