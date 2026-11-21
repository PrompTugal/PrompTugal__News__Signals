# Threat model: building the pages from data.promptugal.news's API

Owner: signals.b@PrompTugal.dinis. Written 18 November 2026. To be reviewed by security@PrompTugal.dinis.

## What it is
`scripts/pages.mjs`, run by `scripts/build.mjs` on every push to dev and every scheduled rebuild (GitHub Actions) and by `scripts/release.sh` locally. It turns the social signals data into static HTML and Markdown pages in `_site/`.

## What it reads
- `https://data.promptugal.news/api/v1/`: `social/latest.json`, `social/by-place/index.json`, `social/by-place/<place>.json`, `sources/index.json`, `discovery/index.json`. GET, no credentials, no redirects followed, 20 s timeout, 2 MB cap checked while streaming.
- `https://data.promptugal.news/api/v1/github-pt/latest.json` (since 18 Nov 2026): organisations' public repositories and releases, with the same caps.
- `https://library.promptugal.news/api/v1/` (since 18 Nov 2026): `items/index.json` and `index/place.json`, the library's catalogue, with the same method and caps.
- `https://promptugal.news/api/v1/sites.json` (since 19 Nov 2026): the sites registry, for the sites bar; checked by the bar's check() before use; a committed snapshot (without its sha256 list) keeps the last good bar.
- `https://data.promptugal.news/api/v1/social/reads.json` (since 21 Nov 2026): the collector's run log, for "The collector's recent runs" on /how/. Only run times, read names (`^[a-z0-9-]{1,40}$`), HTTP statuses (100 to 599) and whether a read changed are used; counts are worked out here from the reads and the collector's own are only compared. Request addresses (they carry query strings and handles) and hash prefixes are never shown and are stripped from the committed snapshot. 60 runs and 200 reads per run at most. A missing file gives one line, never a failed build. Tests: `scripts/test-runs.mjs` (25 cases).
- `https://promptugal.news/data/site/places-registry.json` (since 20 Nov 2026): ontologist@'s places registry, for the map's coordinates only (Dinis, 19 Nov 2026 about 17:40 UTC: "The places come from ontologist@'s data/site/places-registry.json"). Same method and caps; committed snapshot `site_places-registry.json`. Only `id`, `aliases` and `at` are read; a place is drawn only when its coordinates are two finite numbers inside the map's mainland view; names and links are this site's own, from checked slugs.
- The shared map ptmap 1.0.2 (designer@, review "passed (security@ 168c14fc5)"): vendored in `src/assets/ptmap/1.0.2/`, checked at every build against `sites.json` `map.versions["1.0.2"].integrity` (sha384, both files). A differing byte or missing pin fails the build; a registry that no longer lists 1.0.2, or one read from the snapshot, leaves the map out. Loaded on `/places/` only (the validator checks); its data is an `application/json` block with `< > &` and U+2028/9 escaped; London and Brussels insets are null in code. Tests: `scripts/test-map.mjs` (30 cases). When the map is off its files are removed from `_site/`, and the validator fails unless they ship exactly when `/places/` uses them.
- On a failed read: the committed snapshot in `data/snapshot/` (organisation data only; refreshed by `node scripts/pages.mjs --snapshot`, reviewed in the diff).
- `data/takedown.json` and `docs/security-findings.json` from the repository.

## What it writes
Only under `_site/`: the pages, their Markdown twins, `llms.txt`, `assets/names.json`, `preview.svg` (only integers, fixed words and dates; checked by the validator for script, foreignObject, image, href, url() and event attributes) and `api/latest.json` (since 18 Nov 2026: the front page's posts with provenance, built field by field from checked values, never from the fetched objects; take-downs applied) (each path is resolved and checked to stay inside it). Never a tracked file during a build.

## What it trusts
Nothing in the fetched data. The data is collected by data.b@'s code from organisations' public posts, so a name, a handle or a link could carry hostile text if an account, the collector or the data site were compromised.

## What could go wrong, and the mitigations
| Risk | Mitigation |
|---|---|
| HTML or attribute injection from a name, handle, gap note or register entry | every value HTML-escaped (`esc`), control characters removed, lengths capped |
| `javascript:`, `data:` or look-alike links | every link parsed with `new URL`; https only, no user, password or port; post links must be `bsky.app/profile/<handle>/post/<id>` or a fixed Mastodon host and path shape; licence links only to a fixed list of hosts; register links only to data.promptugal.news |
| A private person's post | only listed organisation kinds pass; the account register is data.b@'s, organisations only |
| Path traversal through a place, topic or account | slugs restricted to `[a-z0-9-]`, account slugs made here, a collision fails the build, writes checked against `_site/` |
| Prompt injection through the Markdown twins and `llms.txt` | fetched text in Markdown has link, emphasis and heading syntax removed and is capped |
| A huge or slow response | size and time caps; the snapshot is used instead |
| The data site down or changed | snapshot fallback, shown on every page ("from the last snapshot") |
| Post text or media copied | the data holds none; the pages show links and metadata only and load no platform embed |
| A take-down not honoured | `data/takedown.json` is applied on every build |
| The em dash or hype gate failing on fetched text | em dashes in fetched text become en dashes |
| A hostile or wrong library entry (title, publisher, an item link) | title and publisher escaped and capped; each item is linked only to `https://library.promptugal.news/item/<ID>/`, built here from an ID that must match `^[A-Z0-9-]{1,40}$`; the item's own source link and licence link are never used; entries tagged `person:` are dropped; duplicate IDs counted once |
| Fetched text in the provenance lines or in `api/latest.json` | read times pass through a date parser and are written as ISO dates or left out; every string is a checked, cleaned value; JSON is written with JSON.stringify from a fixed field list |
| A preview image carrying code or metadata | `preview.svg` holds no fetched text; the validator refuses script, foreignObject, image, href, url(), @import and on* attributes; `preview.png` is rendered locally by `scripts/preview-png.mjs` with JavaScript off and keeps only its IHDR, IDAT and IEND chunks |
| A hostile GitHub entry (an organisation, repository or release) | organisations only, from a fixed set of kinds; login, repository name and tag checked against strict patterns; every link must be `https://github.com/<login>[/<repo>[/releases/tag/...]]`; licence links only to spdx.org, github.com or opensource.org, else the repository; no description or release name shown; stars and forks only as safe integers; a live read far smaller than the snapshot falls back to it; repository names the leak scan would read as secrets are left out and counted |
