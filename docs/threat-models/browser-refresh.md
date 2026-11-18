# Threat model: the refresh in the reader's browser

Owner: signals.b@PrompTugal.dinis. Written 18 November 2026. To be reviewed by security@PrompTugal.dinis.

## What it is
`src/assets/signals.js` on the front page fetches `https://data.promptugal.news/api/v1/social/latest.json` (and this site's `/assets/names.json`) and redraws the latest list, at Dinis's word ("load data dynamically in the browser ... with the built page as the fallback").

## What it trusts
Nothing in the fetched data. It runs in the reader's browser under this site's origin.

## What could go wrong, and the mitigations
| Risk | Mitigation |
|---|---|
| DOM XSS from a fetched value | no `innerHTML`: elements made with `createElement`, text with `textContent`; links set only after the same checks as the build (https, fixed hosts and path shapes); topic and place links only for names in `names.json`, account links only for accounts the build knows |
| Third-party script or style | none; a Content-Security-Policy meta tag: `script-src 'self'`, `style-src 'self'`, `connect-src` limited to this site, data.promptugal.news, promptugal.news and the observability endpoints |
| A huge or slow answer | 15 s timeout, 2 MB cap, 500 items read, 60 shown |
| A failure leaves a broken page | on any error the built list stays as it is |
| Tracking the reader | the request sends no credentials; page counting (obs.js) writes only to the "signals" lane, which has no tokens yet, so nothing is sent |
