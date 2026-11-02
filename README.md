# Front Studio

https://www.frontstudio.co.nz/

Fixed-price websites for New Zealand founders and small businesses.

Plain HTML, CSS and JavaScript. No build step, no framework.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publishing

The site is static: deploy `index.html`, `styles.css`, `app.js` and
`share-card-v2.png` together. The social card is 1200 x 630 with the main
message centred to tolerate narrower previews.

Pushing source to GitHub does not deploy the site. Publish the files through
the existing Cloudflare Pages deployment process.

## Enquiries

The short brief opens a prefilled draft in the visitor's email app. It does
not submit to a backend or send an email. Copy-brief and copy-address buttons
provide an alternative, including a manual-copy fallback if clipboard access
is unavailable. Delivery to `hello@frontstudio.co.nz` must be verified
separately.

## Checks

There is no package manager, build step or automated test suite.
Run `node --check app.js` and preview at desktop, 390px and 320px widths.
Check keyboard navigation, the Lab demos, package selection, brief validation,
email draft contents and clipboard fallback. Also check with JavaScript
disabled and reduced motion enabled. Pricing, FAQ and draft timing must remain
consistent; the three-business-day target is for a one-page first draft,
conditional on the brief and deposit, not a guaranteed launch date.
