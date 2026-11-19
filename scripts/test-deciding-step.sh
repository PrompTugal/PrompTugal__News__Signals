#!/usr/bin/env bash
# Tests the deciding step in .github/workflows/pages.yml as written there (between its begin and end markers), in a
# throwaway repository with stub checks that print the range they are given (signals.b@PrompTugal.dinis, 19 Nov 2026;
# security@'s fourth ruling, 948820a7e): a missing anchor, an anchor that is not an ancestor of AFTER and an anchor without
# the checks all fail for their stated reasons; the range starts at the anchor, so a dropped push's commits are in it; a
# pushed tag is never used; the checks run as the anchor's tree holds them, not as the pushed tree does; NODE_OPTIONS set
# by an earlier step (as a pushed build step could, through GITHUB_ENV) changes nothing; a symlinked scripts/ is refused.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
block=$(sed -n '/# deciding-step:begin/,/# deciding-step:end/p' "$here/.github/workflows/pages.yml" | sed 's/^          //')
[ -n "$block" ] || { echo "FAILED: the deciding step's markers are missing from pages.yml" >&2; exit 1; }
dir=$(mktemp -d); trap 'rm -rf "$dir"' EXIT
cd "$dir"; git init -q -b dev; git config user.name t; git config user.email t@example.invalid; git config commit.gpgsign false
mkdir scripts; for f in check-commits check-signatures leak-scan; do echo "console.log('anchor-copy ${f}', process.argv.slice(2).join(' '))" > scripts/$f.mjs; done
git add -A; git commit -qm anchor; A=$(git rev-parse HEAD)
git commit -q --allow-empty -m 'dropped push'; dropped=$(git rev-parse HEAD); git tag v0.1.99 "$dropped"
echo "console.log('pushed-copy'); process.exit(0)" > scripts/check-signatures.mjs; git commit -qam 'weaken the checker'; AFTER=$(git rev-parse HEAD)
git checkout -q --orphan other; git commit -q --allow-empty -m loose; loose=$(git rev-parse HEAD); git checkout -q dev
git rm -q scripts/leak-scan.mjs; git commit -qm 'no leak scan'; nocopy=$(git rev-parse HEAD); git commit -q --allow-empty -m after; after2=$(git rev-parse HEAD)
mkdir -p "$dir/site" && echo '<p>built</p>' > "$dir/site/index.html" && tar -cf "$dir/pages.tar" -C "$dir/site" .
echo "require('fs').writeFileSync('$dir/evil-ran', 'yes')" > "$dir/evil.cjs"
fails=0; n=0
case_() { local name="$1" a="$2" after="$3" want="$4" out st
  n=$((n+1)); git checkout -q --force "$after"
  if out=$(A="$a" AFTER="$after" PAGES_TAR="$dir/pages.tar" NODE_OPTIONS="--require=$dir/evil.cjs" bash -e -c "$block" 2>&1); then st=0; else st=1; fi
  case "$want" in ok:*) [ $st = 0 ] && grep -q -- "${want#ok:}" <<<"$out" || { echo "FAIL $name: $out" >&2; fails=$((fails+1)); };;
    *) [ $st = 1 ] && grep -q -- "$want" <<<"$out" || { echo "FAIL $name: $out" >&2; fails=$((fails+1)); };; esac; }
case_ 'a missing anchor fails' '' "$AFTER" 'no anchor'
case_ 'a zero anchor fails' 0000000000000000000000000000000000000000 "$AFTER" 'no anchor'
case_ 'an anchor that is not an ancestor of AFTER fails' "$loose" "$AFTER" 'not an ancestor of AFTER'
case_ 'an anchor without a copy of a check fails' "$nocopy" "$after2" 'has no scripts/leak-scan.mjs'
case_ "the range starts at the anchor, so the dropped push's commits are checked" "$A" "$AFTER" "ok:anchor-copy check-signatures $A $AFTER"
case_ "the anchor's copy runs, not the pushed (weakened) one" "$A" "$AFTER" 'ok:anchor-copy check-signatures'
out=$(A="$A" AFTER="$AFTER" PAGES_TAR="$dir/pages.tar" bash -e -c "$block" 2>&1 || true); n=$((n+1)); if grep -q 'pushed-copy\|v0.1.99' <<<"$out"; then echo "FAIL a pushed tag or the pushed checker was used: $out" >&2; fails=$((fails+1)); fi
n=$((n+1)); if [ -e "$dir/evil-ran" ]; then echo "FAIL NODE_OPTIONS from an earlier step ran code" >&2; fails=$((fails+1)); fi
git checkout -q --force "$AFTER"; git checkout -q -b linked; mkdir -p "$dir/elsewhere"; git rm -rq scripts; ln -s "$dir/elsewhere" scripts; git add scripts; git commit -qm 'scripts as a symlink'; linked=$(git rev-parse HEAD)
case_ 'a symlinked scripts/ is refused' "$A" "$linked" 'scripts is a symlink'
n=$((n+1)); out=$(cd "$dir" && git checkout -q --force "$AFTER" && A="$A" AFTER="$AFTER" PAGES_TAR="$dir/none.tar" bash -e -c "$block" 2>&1) && { echo "FAIL a missing built site passed" >&2; fails=$((fails+1)); } || grep -q 'did not arrive' <<<"$out" || { echo "FAIL missing site: $out" >&2; fails=$((fails+1)); }
git checkout -q --force "$AFTER"; git checkout -q -b exempt; echo '{"commits":["x"]}' > scripts/commit-exemptions.json; printf '* -diff\n' > .gitattributes; git add -A; git commit -qm 'pushed exemptions and attributes'; ex=$(git rev-parse HEAD)
n=$((n+1)); git checkout -q --force "$ex"; A="$A" AFTER="$ex" PAGES_TAR="$dir/pages.tar" bash -e -c "$block" >/dev/null 2>&1 || true; if [ -e scripts/commit-exemptions.json ] || [ -e .gitattributes ]; then echo "FAIL a pushed config file stayed beside the anchor's checks" >&2; fails=$((fails+1)); fi
mkdir -p "$dir/site2" && echo x > "$dir/site2/index.html" && ln -s /etc/passwd "$dir/site2/link" && tar -cf "$dir/pages2.tar" -C "$dir/site2" .
n=$((n+1)); out=$(git checkout -q --force "$AFTER" && A="$A" AFTER="$AFTER" PAGES_TAR="$dir/pages2.tar" bash -e -c "$block" 2>&1) && { echo "FAIL a site with a symlink passed" >&2; fails=$((fails+1)); } || grep -q 'holds a symlink' <<<"$out" || { echo "FAIL site symlink: $out" >&2; fails=$((fails+1)); }
[ "$fails" = 0 ] || { echo "FAILED: $fails of $n cases" >&2; exit 1; }
echo "OK ($n cases)"
