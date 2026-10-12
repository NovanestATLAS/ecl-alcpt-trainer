/* ==========================================================================
   contact.js - the contact form (contact.html).
   Messages are sent by Web3Forms (https://web3forms.com, free plan) to the
   address registered with the access key in assets/config.js (contactKey).
   The address itself never appears in the site: the access key is public by
   design and can only deliver messages to that one inbox.
   ========================================================================== */
(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;
  var C = window.ECL_CONFIG || {};
  var status = form.querySelector('.cf-status'), btn = form.querySelector('button[type="submit"]');
  var KEY = C.contactKey || '';
  function say(t, kind) { status.textContent = t; status.className = 'cf-status' + (kind ? ' ' + kind : ''); }
  if (!KEY) {
    btn.disabled = true;
    say('The contact form is being set up. Please come back a little later.', 'bad');
    return;
  }
  /* "Report a mistake" links can open the form with the topic chosen */
  var m = /[?&]topic=([a-z]+)/.exec(location.search), sel = form.elements.topic;
  if (m && sel) for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === m[1]) sel.selectedIndex = i;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.elements.botcheck && form.elements.botcheck.checked) return;      // a robot filled the hidden box
    var msg = form.elements.message.value.trim();
    if (msg.length < 10) { say('Please write a little more (at least 10 characters).', 'bad'); form.elements.message.focus(); return; }
    var topic = sel ? sel.options[sel.selectedIndex].text : 'Message';
    var data = {
      access_key: KEY,
      subject: '[ECL & ALCPT English Trainer] ' + topic,
      from_name: 'ECL & ALCPT English Trainer',
      topic: topic,
      name: form.elements.name.value.trim() || '(not given)',
      email: form.elements.email.value.trim(),
      message: msg,
      page: document.referrer || location.href
    };
    if (!data.email) delete data.email;
    btn.disabled = true;
    say('Sending…');
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
      .then(function (j) {
        if (j && j.success) {
          form.reset();
          say('Thank you! Your message has been sent.', 'ok');
          if (typeof window.gtag === 'function') { try { window.gtag('event', 'contact_sent', { topic: topic }); } catch (x) { } }
        } else {
          say('Sorry, the message could not be sent. Please try again in a few minutes.', 'bad');
        }
      }, function () {
        say('Sorry, the message could not be sent. Check your internet connection and try again.', 'bad');
      })
      .then(function () { btn.disabled = false; });
  });
})();
