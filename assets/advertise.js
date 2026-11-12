/* ==========================================================================
   advertise.js - the advertiser inquiry form (advertise-with-us/).
   Inquiries are delivered by Web3Forms (https://web3forms.com) to the inbox
   registered with the access key in assets/config.js (advertiseKey). The
   address itself never appears in the site, and no password or secret is
   stored here: the access key is public by design and can only deliver
   messages to that one inbox. Web3Forms validates the request, filters spam
   and rate-limits on its side; this script adds field checks, a hidden
   honeypot box and a small per-browser cooldown.
   ========================================================================== */
(function () {
  'use strict';
  var form = document.getElementById('adv-form');
  if (!form) return;
  var C = window.ECL_CONFIG || {}, KEY = C.advertiseKey || '';
  var status = form.querySelector('.cf-status'), btn = form.querySelector('button[type="submit"]');
  var COOLDOWN_MS = 60 * 1000, MAX_PER_DAY = 3;

  function say(t, kind) { status.textContent = t; status.className = 'cf-status' + (kind ? ' ' + kind : ''); }
  function store(get, set) { try { return get ? localStorage.getItem(get) : localStorage.setItem(set[0], set[1]); } catch (x) { return null; } }

  if (!KEY) {
    btn.disabled = true;
    say('The inquiry form is being set up. Please check back soon.', 'bad');
    return;
  }

  function field(name) { return form.elements[name]; }
  function clearErrors() {
    form.querySelectorAll('.cf-err').forEach(function (e) { e.remove(); });
    form.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); });
  }
  function fail(el, text) {
    var holder = el.closest('.cf-f, fieldset, .adv-agree') || el.parentNode;
    var e = document.createElement('span'); e.className = 'cf-err'; e.id = (el.id || el.name) + '-err'; e.textContent = text;
    holder.appendChild(e);
    el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', e.id);
    return el;
  }
  function flag(first, el, text) { var r = fail(el, text); return first || r; }
  function selected(name) {
    return Array.prototype.filter.call(form.querySelectorAll('input[name="' + name + '"]:checked'), Boolean)
      .map(function (i) { return i.value; });
  }
  function cleanUrl(v) {
    v = v.trim();
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { var u = new URL(v); return /\./.test(u.hostname) ? u.href : null; } catch (x) { return null; }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (field('botcheck') && field('botcheck').checked) return;           // a robot filled the hidden box
    clearErrors(); say('');
    var first = null, name = field('name').value.trim(), company = field('company').value.trim(),
        email = field('email').value.trim(), msg = field('message').value.trim(),
        url = cleanUrl(field('website').value), formats = selected('formats');
    if (name.length < 2) first = flag(first, field('name'), 'Please enter your full name.');
    if (company.length < 2) first = flag(first, field('company'), 'Please enter your company or organization.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) first = flag(first, field('email'), 'Please enter a valid business email address.');
    if (url === null) first = flag(first, field('website'), 'Please enter a valid web address, for example https://example.com.');
    if (!field('btype').value) first = flag(first, field('btype'), 'Please choose the type of business.');
    if (!formats.length) first = flag(first, form.querySelector('input[name="formats"]'), 'Please choose at least one advertising format.');
    if (msg.length < 20) first = flag(first, field('message'), 'Please describe your proposal in at least 20 characters.');
    if (!field('privacy').checked) first = flag(first, field('privacy'), 'Please confirm that you have read the privacy notice.');
    if (first) { say('Please correct the highlighted fields.', 'bad'); first.focus(); return; }

    /* small per-browser limit: one inquiry a minute, three a day (the real limit is on the Web3Forms side) */
    var now = Date.now(), last = +store('adv_last') || 0, day = [];
    try { day = JSON.parse(store('adv_day') || '[]').filter(function (t) { return now - t < 864e5; }); } catch (x) { day = []; }
    if (now - last < COOLDOWN_MS || day.length >= MAX_PER_DAY) { say('You have already sent an inquiry. Please wait a little before sending another.', 'bad'); return; }

    var data = {
      access_key: KEY,
      subject: 'New Advertising Partnership Inquiry – ECL & ALCPT',
      from_name: 'ECL & ALCPT English Trainer (advertising form)',
      'Full name': name,
      'Company or organization': company,
      email: email,
      'Company website or product URL': url || '(not given)',
      'Type of business': field('btype').value,
      'Advertising formats of interest': formats.join(', '),
      'Preferred campaign duration': field('duration').value,
      'Estimated budget': field('budget').value,
      'Message / proposal': msg,
      'Privacy notice read': 'Yes',
      'Sent from page': location.href
    };
    btn.disabled = true; say('Sending…');
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
      .then(function (j) {
        if (j && j.success) {
          day.push(now); store(null, ['adv_last', String(now)]); store(null, ['adv_day', JSON.stringify(day)]);
          form.reset();
          say('Thank you. Your advertising inquiry has been sent. We will review it and reply to the email address you gave.', 'ok');
          if (typeof window.gtag === 'function') { try { window.gtag('event', 'advertise_inquiry_sent'); } catch (x) { } }
        } else {
          say('Sorry, the inquiry could not be sent. Please try again in a few minutes.', 'bad');
        }
      }, function () {
        say('Sorry, the inquiry could not be sent. Check your internet connection and try again.', 'bad');
      })
      .then(function () { btn.disabled = false; });
  });
})();
