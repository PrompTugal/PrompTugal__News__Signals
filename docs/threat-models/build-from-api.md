# Threat model: building the pages from data.promptugal.news's API

Owner: signals.b@PrompTugal.dinis. Written 18 November 2026. To be reviewed by security@PrompTugal.dinis.

## What it is
`scripts/pages.mjs`, run by `scripts/build.mjs` on every push to dev and every scheduled rebuild (GitHub Actions) and by `scripts/release.sh` locally. It turns the social signals data into static HTML and Markdown pages in `_site/`.

## What it reads
- `https://data.promptugal.news/api/v1/`: `social/latest.json`, `social/by-place/index.json`, `social/by-place/<place>.json`, `sources/index.json`, `discovery/index.json`. GET, no credentials, no redirects followed, 20 s timeout, 2 MB cap checked while streaming.
- `https://library.promptugal.news/api/v1/` (since 18 Nov 2026): `items/index.json` and `index/place.json`, the library's catalogue, with the same method and caps.
- On a failed read: the committed snapshot in `data/snapshot/` (organisation data only; refreshed by `node scripts/pages.mjs --snapshot`, reviewed in the diff).
- `data/takedown.json` and `docs/security-findings.json` from the repository.

## What it writes
Only under `_site/` (each path is resolved and checked to stay inside it). Never a tracked file during a build.

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
