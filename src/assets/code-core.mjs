// signals.promptugal.news: the one set of checks for data.b@'s github-pt file (signals.b@PrompTugal.dinis, 20 Nov 2026).
// The build (scripts/pages.mjs) and the browser (assets/code.js) both import this module, so what the browser shows after a
// refresh passes exactly the checks the build applied (security pre-review, 19 Nov 2026 about 07:35 UTC, point 9: the two
// copies could drift; one module cannot). No DOM and no network here: data in, checked plain objects out.
// Names, tags, dates, languages, counts and links only; no description or release name (free text) is kept.
// Organisations only, never a user account (the person at signals.b@'s session, 18 Nov 2026: "yes, GitHub on signals").

export const FILE = 'https://data.promptugal.news/api/v1/github-pt/latest.json';   // a constant, never read from the page
export const ORG_KINDS = new Set(['company', 'startup', 'university', 'public body', 'open-source project', 'association', 'news outlet']);
export const LIC_HOSTS = new Set(['spdx.org', 'github.com', 'opensource.org']);
export const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/, REPO = /^[A-Za-z0-9._-]{1,100}$/, TAG = /^[A-Za-z0-9._+\-/]{1,100}$/;
export const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/;
export const SAFE_PATH = /^[A-Za-z0-9._~\/+-]*$/;   // no brackets or parentheses: they would break out of a Markdown link (AppSec post-review)
export const RESERVED = new Set(['constructor', 'prototype', '__proto__', 'tostring', 'valueof', 'hasownproperty']);
export const CAPS = { orgs: 200, repos: 200, releases: 5, listReleases: 60, listRecent: 40, perOrg: 100 };

export const clean = (s, max = 120) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').replace(/\u2014/g, '\u2013').replace(/\s+/g, ' ').trim().slice(0, max);
export function parse(u) { try { const x = new URL(String(u)); return x.protocol === 'https:' && !x.username && !x.password && !x.port ? x : null; } catch { return null; } }
// a date only from an ISO string, between 2020 and a day after now
export function when(iso, now = Date.now()) { if (typeof iso !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(iso)) return null; const d = new Date(iso); return isNaN(d) || d < Date.UTC(2020, 0, 1) || d > now + 86400000 ? null : d; }
const int = v => Number.isSafeInteger(v) && v >= 0 ? v : null;
const own = (o, k) => o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;

export function ghLink(u, login, repo, rest) {
  const x = parse(u); if (!x || x.hostname !== 'github.com' || x.search || x.hash || !SAFE_PATH.test(x.pathname)) return null;
  const want = `/${login}` + (repo ? `/${repo}` : ''); const path = x.pathname.replace(/\/$/, '');
  if (rest ? !path.startsWith(want + rest) : path.toLowerCase() !== want.toLowerCase()) return null; return x.href;
}
function lic(l, fallback) {
  const x = parse(own(l, 'url'));
  const name = own(l, 'name');
  return x && LIC_HOSTS.has(x.hostname) && SAFE_PATH.test(x.pathname) && !x.search && !x.hash && typeof name === 'string' && /^[A-Za-z0-9.+ -]{1,40}$/.test(name) ? { name, url: x.href } : { name: "the repository's terms", url: fallback };
}

// gh: the parsed file; blocked: { urls: iterable, accounts: iterable } from the take-down list.
// Returns { orgs, leftOut } with orgs sorted by name, repos by last push (newest first).
export function checkGh(gh, blocked = {}, now = Date.now()) {
  const blockedUrl = new Set([...(blocked.urls || [])].map(u => String(u).toLowerCase())), blockedAcc = new Set([...(blocked.accounts || [])].map(s => String(s).toLowerCase()));   // github:<login> in any case (AppSec post-review, 20 Nov 2026)
  const orgs = [], seen = new Set(); let leftOut = 0;
  for (const o of (Array.isArray(own(gh, 'orgs')) ? gh.orgs : []).slice(0, CAPS.orgs)) {
    if (!o || typeof o !== 'object' || typeof o.login !== 'string' || !LOGIN.test(o.login) || !ORG_KINDS.has(o.kind) || !clean(o.name)) continue;
    const slug = o.login.toLowerCase(); if (seen.has(slug) || RESERVED.has(slug)) continue;
    const orgUrl = ghLink(o.url, o.login); if (!orgUrl) continue;
    if (blockedAcc.has(`github:${slug}`)) continue;
    seen.add(slug);
    const repos = [];
    for (const r of (Array.isArray(o.repos) ? o.repos : []).slice(0, CAPS.repos)) {
      if (!r || typeof r !== 'object' || typeof r.name !== 'string' || !REPO.test(r.name) || r.name === '.' || r.name === '..') continue;
      const url = ghLink(r.url, o.login, r.name); if (!url || blockedUrl.has(url.toLowerCase())) continue;
      // a long mixed-case name looks like a secret to the leak scan: leave the repository out (as data.b@ does), never alter the scan
      if (/[A-Za-z0-9+\/_-]{32,}/.test(`${o.login}/${r.name}`) || /[A-Za-z0-9_-]{32,}/.test(r.name)) { leftOut++; continue; }
      const pushed = when(r.pushed_at, now); if (!pushed) continue;
      const releases = (Array.isArray(r.releases) ? r.releases : []).slice(0, CAPS.releases).map(x => {
        if (!x || typeof x !== 'object') return null;
        const at = when(x.published_at, now); const tag = typeof x.tag === 'string' && TAG.test(x.tag) ? x.tag : null;
        const href = ghLink(x.url, o.login, r.name, '/releases/tag/'); if (!at || !href) return null;
        return { tag, at, url: href, prerelease: x.prerelease === true, readAt: when(x.read_at, now) };
      }).filter(Boolean);
      repos.push({ name: r.name, url, language: typeof r.language === 'string' && /^[A-Za-z0-9+#. -]{1,30}$/.test(r.language) ? r.language : null, pushed, stars: int(r.stars), forks: int(r.forks),
        archived: r.archived === true, licence: lic(r.license, url), releases, readAt: when(r.read_at, now) });
    }
    repos.sort((a, b) => b.pushed - a.pushed);
    orgs.push({ login: o.login, slug, name: clean(o.name, 80), kind: o.kind, url: orgUrl, verifiedAt: typeof o.verified_at === 'string' && /^\d{4}-\d\d-\d\d$/.test(o.verified_at) ? o.verified_at : null, repos, readAt: when(o.read_at, now) });
  }
  orgs.sort((a, b) => a.name.localeCompare(b.name));
  return { orgs, leftOut };
}
// the lists the pages show, from checked orgs
export const releasesOf = (orgs, now = Date.now()) => orgs.flatMap(o => o.repos.flatMap(r => r.releases.map(x => [o, r, x]))).filter(([, , x]) => x.at > now - 30 * 86400000).sort((a, b) => b[2].at - a[2].at).slice(0, CAPS.listReleases);
export const recentOf = orgs => orgs.flatMap(o => o.repos.map(r => [o, r])).sort((a, b) => b[1].pushed - a[1].pushed).slice(0, CAPS.listRecent);
// the file's own read time: data_read_at (stable, data.b@) first, then read_at
export const fileReadAt = (gh, now = Date.now()) => when(own(gh, 'data_read_at'), now) || when(own(gh, 'read_at'), now);

// Whether the browser replaces a list (AppSec post-review, 20 Nov 2026): only with a file read after what is shown (the built
// copy, or the last file shown), no more than 10 minutes ahead of the browser's clock, with at least a quarter of the
// organisations built from when that was 5 or more, and with something to show. Pure, so it is tested.
export function decide({ built, shownAt, readAt, orgs, builtCount, items, now = Date.now() }) {
  if (!(built instanceof Date) || isNaN(built)) return false;
  const current = shownAt || built;
  if (!(readAt instanceof Date) || isNaN(readAt) || readAt <= current || readAt > now + 10 * 60000) return false;
  const n = Array.isArray(orgs) ? orgs.length : 0, b = Math.max(0, Math.min(1000, Math.trunc(Number(builtCount) || 0)));
  if (!n || (b >= 5 && n < b / 4)) return false;
  return Number.isInteger(items) && items > 0;
}
