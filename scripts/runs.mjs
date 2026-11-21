// The collector's recent runs, on /how/ (signals.b@PrompTugal.dinis, 21 Nov 2026), from data.b@'s social/reads.json: when
// each run read the platforms, how many reads worked, failed and changed, and which reads failed in the newest run and since
// when. It shows the past of the collection itself, with gaps as gaps (Dinis, 19 Nov 2026: "show the past"). Shown: times,
// counts, read names and HTTP statuses. Never shown: request addresses (they carry query strings) or hash prefixes.
const own = (o, k) => o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;
const NAME = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;   // source ids such as bsky-search-lisboa, never a handle (pre-review 2)
const count = v => Number.isSafeInteger(v) && v >= 0 && v <= 1000 ? v : null;
const status = v => Number.isSafeInteger(v) && v >= 100 && v <= 599 ? v : null;
export const CAPS = { runs: 60, reads: 200, shown: 14, failing: 20 };

// file: parsed reads.json; when(iso): the build's date check. Returns { runs, failing } or null when nothing passes.
export function summariseRuns(file, when) {
  const raw = own(file, 'runs'); if (!Array.isArray(raw)) return null;
  const runs = [];
  for (const r of raw.slice(0, CAPS.runs)) {
    const at = when(own(r, 'at')); if (!at) continue;
    const reads = (Array.isArray(own(r, 'reads')) ? r.reads : []).slice(0, CAPS.reads).map(x => ({ name: typeof own(x, 'name') === 'string' && NAME.test(x.name) ? x.name : null, status: status(own(x, 'status')), changed: own(x, 'changed') === true }));
    // counted here from the reads; the collector's own ok and failed are only compared (pre-review 4)
    const ok = reads.filter(x => x.status !== null && x.status >= 200 && x.status < 300).length, failed = reads.length - ok;
    const consistent = count(own(r, 'ok')) === ok && count(own(r, 'failed')) === failed;
    runs.push({ at, ok, failed, changed: reads.filter(x => x.changed).length, consistent, reads });
  }
  if (!runs.length) return null;
  runs.sort((a, b) => b.at - a.at);
  // failing now: named reads not 2xx in the newest run, with the oldest run of the unbroken streak in which each failed
  const failedIn = r => new Map(r.reads.filter(x => x.name && !(x.status >= 200 && x.status < 300)).map(x => [x.name, x.status]));
  const newest = failedIn(runs[0]), failing = [];
  for (const [name, st] of [...newest].slice(0, CAPS.failing)) {
    let since = runs[0].at;
    for (const r of runs.slice(1)) { if (!r.reads.some(x => x.name === name)) break; if (failedIn(r).has(name)) since = r.at; else break; }
    failing.push({ name, status: st, since, sinceOldest: since.getTime() === runs[runs.length - 1].at.getTime() && runs.length > 1 });
  }
  failing.sort((a, b) => a.name.localeCompare(b.name));
  // failed reads in the newest run that are not listed (no valid name, or past the cap): counted, never hidden (post-review 1)
  return { runs, failing, unlisted: Math.max(0, runs[0].failed - failing.length) };
}

// the snapshot keeps only what the page uses, checked: no request addresses, no hash prefixes, no free objects (pre-review 7,
// post-review 4)
const ISO = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT[0-9:.]{8,15}Z$/.test(v) ? v : null;
const str = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').slice(0, n) : null;
export const snapshotOf = file => {
  const l = own(file, 'license');
  return { license: l && typeof l === 'object' ? { name: str(own(l, 'name'), 40), url: str(own(l, 'url'), 120) } : null, about: str(own(file, 'about'), 400),
    runs: (Array.isArray(own(file, 'runs')) ? file.runs : []).slice(0, CAPS.runs).map(r => ({ at: ISO(own(r, 'at')), ok: count(own(r, 'ok')), failed: count(own(r, 'failed')),
      reads: (Array.isArray(own(r, 'reads')) ? r.reads : []).slice(0, CAPS.reads).map(x => ({ name: typeof own(x, 'name') === 'string' && NAME.test(x.name) ? x.name : null, status: status(own(x, 'status')), changed: own(x, 'changed') === true })) })).filter(r => r.at) };
};
