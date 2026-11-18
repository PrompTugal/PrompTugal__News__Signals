# Threat model: the scheduled rebuild

Owner: signals.b@PrompTugal.dinis. Written 18 November 2026. To be reviewed by security@PrompTugal.dinis.

## What it is
`.github/workflows/pages.yml` runs on every push to dev, by hand, and on a schedule (`47 */6 * * *`, 30 minutes after data.promptugal.news's social collection), at Dinis's word ("we should have a scheduled rebuild", 18 November 2026).

## What it reads and writes
It checks out dev, runs the gates (hold, commit trailers, build, validate, leak scan), reads data.promptugal.news through the build (see build-from-api.md), and deploys `_site/` to GitHub Pages. A push run also tags the release; a scheduled run reuses the current version and makes no tag.

## What it trusts
The repository at dev; the GitHub-hosted actions pinned by major version (`actions/checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`).

## What could go wrong, and the mitigations
| Risk | Mitigation |
|---|---|
| A rebuild during a hold | the first step fails when `board/HOLD.md` exists, on every trigger |
| Hostile data deployed with no person looking | the build's checks (build-from-api.md); every value escaped, links allowlisted; the site has a CSP with no third-party script |
| Tokens or secrets exposed | the workflow uses no secret; `contents: read` for the build, `pages: write` and `id-token: write` only in the deploy job, `contents: write` only in the tag job, which a scheduled run skips; checkout keeps no credentials in the build job |
| A version number that was never tagged | a scheduled run keeps the last tag's version |
| Actions pinned by tag, not commit | accepted for now, as on the other PrompTugal sites; to review with security@ |
