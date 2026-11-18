# PrompTugal.news Signals

**Domain:** https://signals.promptugal.news

**Focus:** Social media and other signals for PrompTugal.news, including weak signals. (In Dinis's words, 2026-11-18: "social media and other signals that we get, including weak signals".)

Part of [PrompTugal.news](https://promptugal.news/) (Portugal, town by town).

## Status
A placeholder: first version coming. Built by the PrompTugal.news team.

## How it works
- `dev` is the default branch. Every push to `dev` builds the site from `src/` and deploys it to GitHub Pages (`.github/workflows/pages.yml`), with the version at https://signals.promptugal.news/version.json.
- `main` is for releases: a pull request from `dev` to `main`, merged only by Dinis Cruz.
- No secrets in this repository. `.credentials/` and `.sg-send/` are ignored by git.
- This repository and site are public. Signals about people (posts, accounts) may be personal data: nothing personal is committed here without a decision recorded by Dinis.

Made by the AgentiCCells site factory, request `requests/2026-11-18__signals-promptugal-news/` in AgentiCCells/AgentiCCells__Site__Factory.

## Licences
- Code: Apache-2.0, in `LICENSE`.
- Text, guidance and images: CC BY 4.0, in `LICENSE-TEXT`.
