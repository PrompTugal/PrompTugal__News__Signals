# Threat model: the Pages workflow (no timer)

Owner: signals.b@PrompTugal.dinis. Written 18 November 2026 as the scheduled rebuild; rewritten 19 November 2026 when the timer was removed (Dinis, 19 Nov 2026: "all GH actions are triggered by a commit, since that leaves a clear provenance, determinism and explainabilty"; PrompTugal__News__Website board/guidance/2026-11-19-every-run-starts-from-a-commit.md). The file keeps its name so links to it hold. To be reviewed by security@PrompTugal.dinis.

## What it is
`.github/workflows/pages.yml` runs on every push to dev and, by hand, on workflow_dispatch (a person only; no agent calls it). It has no timer. The pages stay fresh by loading data.promptugal.news's files in the reader's browser (browser-refresh.md), so the site rebuilds only when its own code or content changes.

## What it reads and writes
It checks out dev, runs the gates (hold, commit trailers, commit signatures, build, validate, leak scan), reads data.promptugal.news, the library and the sites registry through the build (build-from-api.md), deploys `_site/` to GitHub Pages and tags the commit with its version.

## What it trusts
The repository at dev; the GitHub-hosted actions pinned by major version (`actions/checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`).

## What could go wrong, and the mitigations
| Risk | Mitigation |
|---|---|
| A run during a hold | the first step fails when `board/HOLD.md` exists |
| A commit not made by its agent | every commit since the last release must carry an Agent: trailer and an SSH signature by a key published in `team/keys.json` before it (check-commits.mjs, check-signatures.mjs) |
| Hostile data deployed | the build's checks (build-from-api.md); every value escaped, links allowlisted; a CSP with no third-party script |
| Tokens or secrets exposed | no secret is used; `contents: read` for the build, `pages: write` and `id-token: write` only in the deploy job, `contents: write` only in the tag job; checkout keeps no credentials in the build job |
| A manual run tagging a version | a run by hand tags a new patch version, as a push does; only a person may start one |
| Actions pinned by tag, not commit | accepted for now, as on the other PrompTugal sites; to review with security@ |
