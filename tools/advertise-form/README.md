# Dedicated advertiser inquiry form (parked, not deployed)

The Advertise With Us page currently sends advertisers to the normal contact form
(`contact.html?topic=advertising`). This folder keeps the ready-made dedicated form for later.

To switch it on:
1. Create a free access key at https://web3forms.com with the advertising inbox as the address.
2. Add `advertiseKey: '<key>'` to `window.ECL_CONFIG` in `assets/config.js`.
3. Copy `advertise.js` to `assets/advertise.js`.
4. In `advertise-with-us/index.html`, replace the `#inquiry` section with `form-section.html.txt`, add
   `<script src="../assets/advertise.js" defer></script>` before the translate script, and point the hero button to `#inquiry`.
5. Restore the "Advertiser inquiries" paragraph in `privacy.html` (it names the advertiser form and Web3Forms).
6. Send a test inquiry and check it arrives. Web3Forms' free plan has no automatic confirmation email to the sender.

The styles for the form already live in `assets/advertise.css`.
