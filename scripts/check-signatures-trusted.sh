#!/usr/bin/env bash
# Run the signature check from a trusted copy, never from the tree being checked (videos.b@'s pre-review, passed on by
# conductor.b@ on 19 Nov 2026, 14:01 UTC: a push could otherwise change the checker that judges it).
# Usage: scripts/check-signatures-trusted.sh <trusted-rev> <before> <after>
#   <trusted-rev>: the last release (CI: the last release tag; release.sh: origin/dev), whose scripts/check-signatures.mjs is run.
set -euo pipefail
trusted="$1"; before="$2"; after="$3"
dir=$(mktemp -d); trap 'rm -rf "$dir"' EXIT
git show "${trusted}:scripts/check-signatures.mjs" > "$dir/check-signatures.mjs" || { echo "check-signatures-trusted: ${trusted} has no scripts/check-signatures.mjs" >&2; exit 1; }
node "$dir/check-signatures.mjs" "$before" "$after"
