#!/usr/bin/env bash
# Tests the deciding step in .github/workflows/pages.yml as written there (between its begin and end markers), in a
# throwaway repository (signals.b@PrompTugal.dinis, 19 Nov 2026; security@'s third ruling, 3724c9ca2): a missing BEFORE,
# a BEFORE that is not an ancestor of AFTER, and a BEFORE without the checks all fail, each for its stated reason.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
block=$(sed -n '/# deciding-step:begin/,/# deciding-step:end/p' "$here/.github/workflows/pages.yml" | sed 's/^          //')
[ -n "$block" ] || { echo "FAILED: the deciding step's markers are missing from pages.yml" >&2; exit 1; }
dir=$(mktemp -d); trap 'rm -rf "$dir"' EXIT
cd "$dir"; git init -q -b dev; git config user.name t; git config user.email t@example.invalid; git config commit.gpgsign false
mkdir scripts; echo 'console.log("stub")' > scripts/check-commits.mjs; cp scripts/check-commits.mjs scripts/check-signatures.mjs; cp scripts/check-commits.mjs scripts/leak-scan.mjs
git add -A; git commit -qm base; base=$(git rev-parse HEAD)
git commit -q --allow-empty -m next; head=$(git rev-parse HEAD)
git checkout -q --orphan other; git commit -q --allow-empty -m loose; loose=$(git rev-parse HEAD); git checkout -q dev
git rm -q scripts/leak-scan.mjs; git commit -qm 'no leak scan'; nocopy=$(git rev-parse HEAD); git commit -q --allow-empty -m after; after2=$(git rev-parse HEAD)
fails=0; n=0
case_() { local name="$1" before="$2" after="$3" want="$4" out
  n=$((n+1)); git checkout -q --force "$after"; git checkout -q -- scripts 2>/dev/null || true
  if out=$(BEFORE="$before" AFTER="$after" VERSION_BASE=0.1 bash -e -c "$block" 2>&1); then st=0; else st=1; fi
  if [ "$want" = ok ]; then [ $st = 0 ] || { echo "FAIL $name: $out" >&2; fails=$((fails+1)); }
  else [ $st = 1 ] && grep -q -- "$want" <<<"$out" || { echo "FAIL $name: $out" >&2; fails=$((fails+1)); }; fi; }
case_ 'a zero BEFORE fails' 0000000000000000000000000000000000000000 "$head" 'no BEFORE'
case_ 'an empty BEFORE fails' '' "$head" 'no BEFORE'
case_ 'BEFORE not an ancestor of AFTER fails' "$loose" "$head" 'not an ancestor of AFTER'
case_ 'BEFORE without a copy of a check fails' "$nocopy" "$after2" 'has no scripts/leak-scan.mjs'
case_ 'BEFORE with every check runs them' "$base" "$head" ok
[ "$fails" = 0 ] || { echo "FAILED: $fails of $n cases" >&2; exit 1; }
echo "OK ($n cases)"
