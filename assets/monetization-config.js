/* ==========================================================================
   MONETIZATION SETTINGS - affiliate cards and the italki offer
   --------------------------------------------------------------------------
   Adsterra banners are NOT set here: their switches are at the top of
   assets/ads.js.

     italki          : the tutor offer you already have. Its tracking link
                       stays where it always was (assets/config.js >
                       partners.italki) and is never copied or rewritten here.
                       "enabled": false hides EVERY italki banner and card on
                       the site (website and web trainer).
     studyResources  : the "Recommended English Study Resources" cards, shown
                       on the home page, at the end of articles, under the
                       results of a graded practice test and on the trainer's
                       results screen. One entry per partner in "items", in
                       the order shown. An entry with enabled: false renders
                       nothing (no empty card, no link).

   HOW TO ADD A PARTNER (Impact.com or another approved program):
     copy the Preply entry, paste it after it, and change id, name, url,
     description and cta. Use the tracking link exactly as the program gives
     it (https://...). Text cards only: leave image '' until you have an
     approved creative. Links open in a new tab with rel="sponsored noopener".

   CHECKING YOUR SETUP:
     . Open any page with ?mon=check on the end, then look at the browser
       console (F12): one table lists every item.
     . Or run:  node tools/check-monetization.js   (checks this file offline)
   ========================================================================== */
window.ECL_MONETIZATION = {

  /* ----------------------------- italki ----------------------------------- */
  italki: {
    enabled: true,
    /* the card shown inside "Recommended English Study Resources"; the link
       itself is the existing one in assets/config.js (partners.italki) */
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

  /* ----------- "Recommended English Study Resources" (affiliate cards) ----- */
  studyResources: {
    enabled: true,
    heading: { en: 'Recommended English Study Resources', fr: 'Ressources recommandées pour apprendre l’anglais', ar: 'موارد موصى بها لتعلّم الإنجليزية' },
    /* the short line under the heading; false hides it */
    showDisclosure: true,
    disclosure: {
      en: 'Affiliate links: we may earn a commission at no extra cost to you.',
      fr: 'Liens d’affiliation : nous pouvons toucher une commission, sans frais supplémentaires pour vous.',
      ar: 'روابط إحالة: قد نحصل على عمولة دون أي تكلفة إضافية عليك.'
    },
    tag: { en: 'Affiliate', fr: 'Affilié', ar: 'رابط إحالة' },
    items: [
      /* 1. italki: texts and switch in the italki section above, link in assets/config.js */
      { id: 'italki', enabled: true },

      /* 2. Preply (Impact.com, approved). Set enabled: false to switch it off.
            Copy this entry to add another partner later. */
      { id: 'preply', enabled: true, name: 'Preply',
        url: 'https://preply.sjv.io/qWdQEb',
        image: '', description: 'Online one-on-one English lessons with a tutor.',
        cta: 'Visit Preply',
        /* official Preply banners from Impact.com (Ads > Get code), shown exactly as Preply made them;
           each has its own tracking link. The site picks the size that fits: 728x90 on wide spots,
           300x250 elsewhere. Remove a line to stop using that banner. */
        banners: [
          { width: 728, height: 90,  url: 'https://preply.sjv.io/c/8265862/4125140/24422', image: 'https://a.impactradius-go.com/display-ad/24422-4125140' },
          { width: 300, height: 250, url: 'https://preply.sjv.io/c/8265862/4125135/24422', image: 'https://a.impactradius-go.com/display-ad/24422-4125135' }
        ] }
    ]
  },

  adLabel: { en: 'Advertisement', fr: 'Publicité', ar: 'إعلان' }
};
