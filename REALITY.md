# REALITY.md: what exists now

- Seeded by the AgentiCCells site factory on 2026-11-18 from AgentiCCells/AgentiCCells__Site__Template@dev.
- Its live state is recorded in requests/2026-11-18__signals-promptugal-news/status.json in AgentiCCells__Site__Factory.
- 2026-11-18: cells@AgentiCCells.dinis, at Dinis's word (~14:40 UTC), replaced the seed page with a placeholder, wrote the README, added `LICENSE-TEXT` (CC BY 4.0) beside `LICENSE` (Apache-2.0), added `src/CNAME`, ignored `.credentials/` and `.sg-send/`, and created `main` from this commit. The factory's collaborators step found `riskmandate-agent` already had write access.

## 2026-11-18, first version (signals.b@PrompTugal.dinis)
- **The site** is built by `scripts/pages.mjs` (run by `scripts/build.mjs`) from data.promptugal.news's API: `social/latest.json`, `social/by-place/`, `sources/index.json`, `discovery/index.json`. 39 pages at the first build: home (latest signals), 19 places, 8 topics (AI, Startups, Security, Web Summit, Events, Tourism, Mobility, Weather), 5 organisation accounts (all Bluesky: The Portugal Resident, Público, Agência Lusa, SAPO, Visit Portugal), and indexes, /how/, /security/, /takedown/. Each page has a Markdown twin (`index.md`); `llms.txt` lists them.
- **Posts by link only.** No post text or media, no platform embed (it would need a third-party script, which the gate forbids). Each post shows organisation, kind, account, platform, time, licence ("the platform's terms", linked, holder the organisation) and the topics and places it is evidence for.
- **Not yet:** Mastodon accounts (none verified by data.b@ yet); Bluesky keyword searches (refused or failed at the source, listed as gaps); `/api/v1/events/` (503 when read on 18 Nov 15:13 UTC) is not used; Perplexity's social pass has no data yet, so "found through Perplexity" appears only for events, per place, linked to events.promptugal.news.
- **Fallback:** `data/snapshot/` (23 files, read 18 Nov 2026 about 15:16 UTC) is used when a live read fails, and every page then says so.
- **Rebuilds:** every push to dev, and every 6 hours at :47 (a scheduled run keeps the version and makes no tag). The front page also refreshes its list in the browser (`src/assets/signals.js`).
- **Take-down:** `data/takedown.json` (empty), applied on every build; disclaimer on every page and at /takedown/.
- **Security:** CSP on every page, no third-party script; threat models in `docs/threat-models/`; findings in `docs/security-findings.json` (none), shown on /security/.
- **Commit check:** `scripts/check-commits.mjs` also accepts `role@PrompTugal.dinis` (that exact domain), at Dinis's word in board/guidance/2026-11-18-five-sites-on-account-b.md (Website repo).
- **Key:** signals.b@'s session key, made with `sgit pki keygen` (fingerprint sha256:618f6465dbb2ae65, signing sha256:e10f171e56b8faf6); its public bundle is in `team/keys.json` (the leak scan allows public keys only there). The private half stays in the session. Not yet listed in the Website repo's board/keys.json.
- **Page counting:** `src/assets/obs/obs.js` (weather's copy of promptugal.news's sender) writes only to the lane "signals". The lane has **no tokens**: making its vault and tokens was refused by this session's permission check on 18 Nov 2026, so nothing is counted.
- **Copied in:** the wordmark and favicon SVGs and `favicon.ico` from PrompTugal__News__Website `assets/brand/` (CC BY 4.0, same estate); `obs.js` from weather.promptugal.news (Apache-2.0, same estate); colours from the brand tokens (brand v2.0).
- **Not checked by a person.** Commits are not yet signed with the session key (the Agent: trailer is present).
