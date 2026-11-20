// signals.promptugal.news: reload the Code lists in the browser (signals.b@PrompTugal.dinis, 20 Nov 2026; Dinis, 19 Nov 2026,
// 01:13: "load the data in the browser"). Each list the build writes is a <div class="live-code" data-kind data-built-read>.
// When the page opens, and every 10 minutes while it is visible, this reads data.b@'s github-pt file (a constant address; no
// cookie, no referrer, no redirect, 15 s, 2 MB) once for the page, checks it with the build's own module (code-core.mjs), and
// replaces a list only with a file whose read time is valid and newer than the built one and that is not far smaller.
// Every value by textContent; links only from the checked data. If nothing passes, the built list stays.
import { FILE, SLUG, CAPS, checkGh, releasesOf, recentOf, fileReadAt, decide, clean, parse } from './code-core.mjs'

const boxes = [...document.querySelectorAll('div.live-code[data-kind]')]
const KINDS = new Set(['releases', 'recent', 'org'])
const MAX_BYTES = 2000000, STALE_MS = 13 * 3600000, EVERY_MS = 10 * 60000
const fmt = d => d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
const ext = (href, text, cls) => { const a = el('a', cls, text); a.href = href; a.rel = 'noopener noreferrer nofollow'; return a }
const own = (o, k) => o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined
const isoAttr = v => { if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT[0-9:.]+Z$/.test(v)) return null; const d = new Date(v); return isNaN(d) ? null : d }

async function getFile (src) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000)
  try {
    const r = await fetch(src, { signal: ac.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-cache' })
    if (!r.ok || !r.body) throw new Error('http')
    const reader = r.body.getReader(), parts = []; let n = 0
    for (;;) { const { done, value } = await reader.read(); if (done) break; n += value.length; if (n > MAX_BYTES) { ac.abort(); throw new Error('too large') } parts.push(value) }
    const all = new Uint8Array(n); let o = 0; for (const p of parts) { all.set(p, o); o += p.length }
    return JSON.parse(new TextDecoder().decode(all))
  } finally { clearTimeout(t) }
}
let names = null
const getNames = () => names || (names = fetch('/assets/names.json', { credentials: 'omit' }).then(r => { if (!r.ok) throw new Error('names'); return r.json() }).catch(e => { names = null; throw e }))

// the same markup as the build's relLi and repoLi; an organisation is linked only when the build made its page
function orgLine (o, codeOrgs, extra) {
  const who = el('p', 'who')
  who.append(SLUG.test(o.slug) && own(codeOrgs, o.slug) === true ? (() => { const a = el('a', null, o.name); a.href = '/code/' + o.slug + '/'; return a })() : el('span', null, o.name), ' ', el('span', 'kind', o.kind))
  if (extra) who.append(' ', el('span', 'acc', extra))
  return who
}
function prov (at) {
  const p = el('p', 'prov', "Provenance: read through GitHub's public REST API by data.b@PrompTugal.dinis's collector (sources/github-pt/collect.mjs, code, no model)" + (at ? ' at ' + fmt(at) : '') + ', published in ')
  const a = el('a', null, 'github-pt/latest.json'); a.href = FILE; p.append(a, '; loaded by your browser. Not reviewed by a person.'); return p
}
function licence (meta, r) { meta.append(' · licence ', ext(r.licence.url, r.licence.name)) }
function relLi (o, r, x, codeOrgs) {
  const li = el('li', 'post')
  li.append(ext(x.url, (x.tag || 'release') + (x.prerelease ? ' (pre-release)' : ''), 'go'), ' of ', ext(r.url, o.login + '/' + r.name))
  const meta = el('p', 'meta', 'published '), t = el('time', null, fmt(x.at)); t.dateTime = x.at.toISOString(); meta.append(t); licence(meta, r)
  li.append(orgLine(o, codeOrgs), meta, prov(x.readAt || r.readAt)); return li
}
function repoLi (o, r, codeOrgs) {
  const li = el('li', 'post'); li.append(ext(r.url, o.login + '/' + r.name, 'go')); if (r.archived) li.append(' ', el('span', 'kind', 'archived'))
  const meta = el('p', 'meta', 'last push '), t = el('time', null, fmt(r.pushed)); t.dateTime = r.pushed.toISOString(); meta.append(t)
  if (r.stars !== null) meta.append(' · ' + r.stars + ' stars'); if (r.forks !== null) meta.append(' · ' + r.forks + ' forks'); licence(meta, r)
  if (r.releases.length) meta.append(' · ' + r.releases.length + ' recent releases')
  li.append(orgLine(o, codeOrgs, r.language), meta, prov(r.readAt)); return li
}
function note (box, live, readAt) {
  const n = box.querySelector('.live-note'); if (!n) return
  const stale = Date.now() - readAt > STALE_MS
  n.textContent = (live ? 'Live file' : 'Built copy') + ', read ' + fmt(readAt) + (stale ? ' (stale: older than the twice-daily collection)' : '') + '.'
  n.classList.toggle('stale', stale)
}

let busy = false, fails = 0, next = 0, shownAt = null
async function refresh () {
  if (busy || document.hidden || (next && Date.now() < next)) return
  busy = true
  try {
    const [d, nm] = await Promise.all([getFile(FILE), getNames()])
    const codeOrgs = own(nm, 'code_orgs'); if (!codeOrgs || typeof codeOrgs !== 'object') throw new Error('no code_orgs')   // fail closed, and back off
    const readAt = fileReadAt(d)
    const { orgs } = checkGh(d, { urls: Array.isArray(nm.blocked_urls) ? nm.blocked_urls : [], accounts: Array.isArray(nm.blocked_accounts) ? nm.blocked_accounts : [] })
    let replaced = false
    for (const box of boxes) {
      const kind = box.getAttribute('data-kind'), built = isoAttr(box.getAttribute('data-built-read')), builtCount = box.getAttribute('data-built-count')
      if (!KINDS.has(kind) || !built) continue   // no built read time: never replace
      const list = box.querySelector('.list'); if (!list) continue
      let items = []
      if (kind === 'releases') items = releasesOf(orgs).map(([o, r, x]) => relLi(o, r, x, codeOrgs))
      else if (kind === 'recent') items = recentOf(orgs).map(([o, r]) => repoLi(o, r, codeOrgs))
      else { const slug = box.getAttribute('data-org'), o = SLUG.test(slug || '') ? orgs.find(x => x.slug === slug) : null; if (o) items = o.repos.slice(0, CAPS.perOrg).map(r => repoLi(o, r, codeOrgs)) }
      // nothing to show (releases read in part at GitHub's quota, say) keeps the built list: never blanked
      if (!decide({ built, shownAt, readAt, orgs, builtCount, items: items.length })) { note(box, !!shownAt, shownAt || built); continue }
      const ol = el('ol', 'posts'); ol.append(...items); list.replaceChildren(ol); replaced = true
      note(box, true, readAt)
      const fl = own(d, 'license') || {}, flx = parse(fl.url), ln = box.querySelector('.live-note')
      if (ln && flx && flx.hostname === 'creativecommons.org' && /^[A-Za-z0-9 .]{1,20}$/.test(fl.name || '')) { ln.append(' Licence of the file: ', ext(flx.href, fl.name), (fl.holder ? ', ' + clean(fl.holder, 60) : '') + "; each repository keeps its own licence, linked on each.") }
    }
    if (replaced) shownAt = readAt   // only a file that was shown moves the mark
    fails = 0; next = Date.now() + EVERY_MS   // a tab switch does not fetch again before the next round
  } catch (e) { fails = Math.min(6, fails + 1); next = Date.now() + EVERY_MS * 2 ** fails } finally { busy = false }   // back off after each failure
}
if (boxes.length && window.fetch && window.AbortController) {
  for (const box of boxes) { const b = isoAttr(box.getAttribute('data-built-read')); if (b) note(box, false, b) }
  refresh()
  setInterval(refresh, EVERY_MS + Math.floor(Math.random() * 60000))   // with jitter
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh() })
}
