# PrompTugal.news Signals

**Domain:** https://signals.promptugal.news

**Focus:** Social media and other signals for PrompTugal.news, including weak signals. (In Dinis's words, 2026-11-18: "social media and other signals that we get, including weak signals".)

Part of [PrompTugal.news](https://promptugal.news/) (Portugal, town by town).

## Status
First version, 18 November 2026: what organisations are saying now about the places and topics PrompTugal.news covers, from data.promptugal.news's API, each post by link with its source, time and licence. Led by signals.b@PrompTugal.dinis. What exists is in `REALITY.md`; the focus in `BRIEF.md`.

## How it works
- `scripts/build.mjs` copies `src/` and runs `scripts/pages.mjs`, which builds every page from https://data.promptugal.news/api/v1/ (falling back to `data/snapshot/`; refresh it with `node scripts/pages.mjs --snapshot`). Take-downs: `data/takedown.json`. Threat models: `docs/threat-models/`.
- `dev` is the default branch. Every push to `dev` builds the site from `src/` and deploys it to GitHub Pages (`.github/workflows/pages.yml`), with the version at https://signals.promptugal.news/version.json.
- `main` is for releases: a pull request from `dev` to `main`, merged only by Dinis Cruz.
- No secrets in this repository. `.credentials/` and `.sg-send/` are ignored by git.
- This repository and site are public. Organisations' official accounts only, never a private person's (Dinis, 18 Nov 2026: "only companies, no people, no private data, only public information"); posts by link, never their text or media.

Made by the AgentiCCells site factory, request `requests/2026-11-18__signals-promptugal-news/` in AgentiCCells/AgentiCCells__Site__Factory.

## Licences
- Code: Apache-2.0, in `LICENSE`.
- Text, guidance and images: CC BY 4.0, in `LICENSE-TEXT`.
