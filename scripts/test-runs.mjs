// Tests for scripts/runs.mjs, the collector's recent runs on /how/ (signals.b@PrompTugal.dinis, 21 Nov 2026; security
// pre-review controls 2 to 9). Usage: node scripts/test-runs.mjs   (prints OK or the failing cases and exits 1)
import { summariseRuns, snapshotOf } from './runs.mjs';
const results = [], t = (name, pass) => results.push({ name, pass: !!pass });
const now = Date.parse('2026-11-21T09:00:00Z');
const when = iso => { if (typeof iso !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(iso)) return null; const d = new Date(iso); return isNaN(d) || d < Date.UTC(2020, 0, 1) || d > now + 86400000 ? null : d; };
const at = h => new Date(now - h * 3600000).toISOString();
const rd = (name, status, changed = false) => ({ name, url: 'https://public.api.bsky.app/x?q=' + name, status, bytes: 10, sha256_prefix: '0123456789abcdef', changed });
const run = (h, reads, ok, failed) => ({ at: at(h), ok: ok ?? reads.filter(r => r.status >= 200 && r.status < 300).length, failed: failed ?? reads.filter(r => !(r.status >= 200 && r.status < 300)).length, reads });
const S = runs => summariseRuns({ runs }, when);

const good = S([run(1, [rd('bsky-feed-a', 200, true), rd('bsky-search-x', 403)]), run(13, [rd('bsky-feed-a', 200), rd('bsky-search-x', 403)]), run(25, [rd('bsky-feed-a', 200), rd('bsky-search-x', 200)])]);
t('runs are read newest first', good.runs.length === 3 && good.runs[0].at > good.runs[1].at);
t('counts are worked out from the reads', good.runs[0].ok === 1 && good.runs[0].failed === 1 && good.runs[0].changed === 1 && good.runs[0].consistent);
t('a failing read and the start of its streak', good.failing.length === 1 && good.failing[0].name === 'bsky-search-x' && good.failing[0].status === 403 && good.failing[0].since.toISOString() === at(13));
t('a streak stops at the first run where the read worked', S([run(1, [rd('s', 500)]), run(13, [rd('s', 200)]), run(25, [rd('s', 500)])]).failing[0].since.toISOString() === at(1));
t('a streak that reaches the oldest run says so', S([run(1, [rd('s', 500)]), run(2, [rd('s', 500)])]).failing[0].sinceOldest);
t('a streak that ended before the oldest run does not', !good.failing[0].sinceOldest);
t('collector counts that differ are flagged, not shown', (r => !r.consistent && r.ok === 1)(S([run(1, [rd('a', 200)], 7, 0)]).runs[0]));
t('HTML in a name is not kept', S([run(1, [rd('<img src=x onerror=1>', 500)])]).failing.length === 0);
t('a name in upper case or over 40 characters is not kept', !S([run(1, [rd('Bsky-Feed', 500), rd('a'.repeat(41), 500)])]).failing.length);
t('status "200<script>" is no status', S([run(1, [rd('a', '200<script>')])]).runs[0].reads[0].status === null);
t('a status out of range is no status, and counts as failed', (r => r.reads[0].status === null && r.failed === 1)(S([run(1, [rd('a', 999)])]).runs[0]));
t('runs as an object reads as nothing', summariseRuns({ runs: { a: run(1, []) } }, when) === null);
t('a missing file reads as nothing', summariseRuns(null, when) === null && summariseRuns({}, when) === null);
t('a run with a bad time is skipped', S([{ ...run(1, []), at: 'yesterday' }, run(2, [rd('a', 200)])]).runs.length === 1);
t('a run in the future is skipped', S([{ ...run(1, []), at: new Date(now + 3 * 86400000).toISOString() }]) === null);
t('at most 60 runs are read', S(Array.from({ length: 500 }, (_, i) => run(i + 1, [rd('a', 200)]))).runs.length === 60);
t('at most 200 reads per run', S([run(1, Array.from({ length: 5000 }, () => rd('a', 200)))]).runs[0].reads.length === 200);
t('at most 20 failing reads are listed', S([run(1, Array.from({ length: 50 }, (_, i) => rd('s' + i, 500)))]).failing.length === 20);
t('__proto__ as runs is not read', summariseRuns(JSON.parse('{"__proto__":{"runs":[]}}'), when) === null);
t('null, number and string entries in runs and reads do not throw', (() => { try { S([null, 5, 'x', [], { at: at(1), reads: [null, 3, 'y', []] }]); summariseRuns({ runs: [null] }, when); return true; } catch { return false; } })());
t('failed reads with no valid name are counted as unlisted', (r => r.failing.length === 0 && r.unlisted === 2)(S([run(1, [rd('BAD', 500), rd(null, 500), rd('a', 200)])])));
t('a 3xx counts as failed', S([run(1, [rd('a', 301)])]).runs[0].failed === 1);
t('snapshotOf never throws on null, an array or hostile entries', (() => { try { snapshotOf(null); snapshotOf([]); snapshotOf({ runs: [null, { at: 5, reads: [null] }], license: 'x' }); return true; } catch { return false; } })());
t('snapshotOf keeps only checked values', (s => s.runs.length === 1 && s.runs[0].reads[0].name === null && s.runs[0].reads[0].status === null && s.license === null && !('source' in s))(snapshotOf({ source: { x: 1 }, license: 7, runs: [{ at: 'bad' }, { at: at(1), reads: [{ name: '<b>', status: '200', changed: 'yes' }] }] })));
const snap = JSON.stringify(snapshotOf({ license: {}, runs: [run(1, [rd('a', 200)])] }));
t('the snapshot keeps no request address and no hash prefix', !/public\.api|sha256_prefix|0123456789abcdef|"bytes"/.test(snap) && /"name":"a"/.test(snap));

const bad = results.filter(r => !r.pass);
for (const r of bad) console.error(`FAIL ${r.name}`);
if (bad.length || results.length < 25) { console.error(`FAILED: ${bad.length} of ${results.length} cases`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
