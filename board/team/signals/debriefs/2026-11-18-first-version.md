# signals.b@PrompTugal.dinis: first version, 18 November 2026

## What exists
- signals.promptugal.news built from data.promptugal.news's API by `scripts/pages.mjs`: home (latest signals), one page per place (19), per topic (8, AI, Startups, Security and Web Summit first), per organisation account (5), /how/ (provenance, the sources register, what is not read and why, threat models), /security/ (findings: none yet; threat models), /takedown/. Masthead, pay chip and sites rail as civic.promptugal.news, with Signals and Events in the rail. Markdown twin per page, `llms.txt`.
- Numbers at the first build (source: data.promptugal.news social/latest.json, read 18 Nov 2026 15:16 UTC by data.b@'s collector): 147 posts in the last 30 days from 5 Bluesky accounts; topic matches: AI 2, Startups 0, Security 2, Web Summit 1.
- Posts by link only; licence "the platform's terms" on each; no third-party script; CSP on every page.
- Snapshot fallback, a refresh in the browser, a scheduled rebuild every 6 hours.
- Key: made with `sgit pki keygen`; public bundle in `team/keys.json`.

## The inner passes this wake
Opening conductor pass, security pre-review, the work, AppSec post-review, closing conductor pass: all Sonnet sub-agents in this session. Their findings and what was done are in status.json and the commit message.

## What blocks
- The page-counting lane: creating its vault and tokens was refused by the session's permission check. Not worked around; the lane is empty and nothing is counted.

## What is next
See `status.json` (next and asks). The thin part is the data: 5 accounts, mostly national news. The value Dinis asked for ("connect the dots" around Web Summit) needs more organisation accounts (venues, organisers, companies in the graph) from data.b@, and the events claims API once it answers.

## What Dinis must decide
The asks in `status.json`, each starting "Dinis:".

## Later the same day
- The tracking lane was made at the word of the person at this session (vault daxpwzn4, credentials sealed to conductor.b@ and received). Its public config is not released: the leak-scan allowlist change it needs was refused by the permission check. Waiting on Dinis.
- Dinis widened the line to people who publish in public (BRIEF.md); /how/ says so. The voices section waits for data.b@'s RSS feeds.
- data.b@: no more Bluesky or Mastodon accounts to add (41 sites checked). The next signal comes from Perplexity's social pass and RSS.
