// signals.promptugal.news: load the lists' data in the browser (signals.b@PrompTugal.dinis; Dinis, 19 Nov 2026: "yes, option 1,
// load the data in the browser", PrompTugal__News__Website board/guidance/2026-11-19-load-the-data-in-the-browser.md).
// Each list the build writes is a <div class="live" data-src data-filter data-built-read>. When the page opens, and every
// 10 minutes while it is visible, this reads the latest file from data.promptugal.news (no cookie, no referrer, no
// redirect, 15 s, 2 MB), applies the same checks as the build, and replaces the list only with a file whose read time is
// valid and newer than the built one. Every value by textContent; links only after the same checks as the build. Each
// list says whether it shows the live file or the built copy, when that was read, and whether it is stale.
(() => {
  'use strict'
  const boxes = [...document.querySelectorAll('div.live[data-src]')]; if (!boxes.length || !window.fetch || !window.AbortController) return
  const SRC = /^https:\/\/data\.promptugal\.news\/api\/v1\/social\/(latest|by-place\/[a-z0-9-]{1,60})\.json$/
  const FILTER = /^(all|topic:[a-z0-9-]{1,40}|account:(bluesky|mastodon):[a-z0-9.@_-]{1,100})$/
  const MAX_BYTES = 2000000, STALE_MS = 7 * 3600000, EVERY_MS = 10 * 60000
  const KINDS = new Set(['news outlet', 'public body', 'company', 'venue', 'organiser', 'câmara', 'council', 'university', 'association'])
  const LICENCE_HOSTS = new Set(['bsky.social', 'mastodon.social', 'creativecommons.org', 'www.perplexity.ai'])
  const MASTODON_HOSTS = new Set(['mastodon.social'])
  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').replace(/\u2014/g, '\u2013').replace(/\s+/g, ' ').trim().slice(0, n || 120)
  const parse = u => { try { const x = new URL(String(u)); return x.protocol === 'https:' && !x.username && !x.password && !x.port ? x : null } catch (e) { return null } }
  const isoDate = v => { if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(v)) return null; const d = new Date(v); return isNaN(d) || d < Date.UTC(2020, 0, 1) || d > Date.now() + 86400000 ? null : d }
  const postLink = p => { const x = parse(p.url); if (!x || x.search || x.hash) return null
    if (p.platform === 'bluesky') return x.hostname === 'bsky.app' && /^\/profile\/[a-z0-9.:-]{1,100}\/post\/[a-z0-9]{1,20}$/i.test(x.pathname) ? x.href : null
    if (p.platform === 'mastodon') return MASTODON_HOSTS.has(x.hostname) && /^\/@[A-Za-z0-9_]{1,30}\/\d{1,25}$/.test(x.pathname) ? x.href : null
    return null }
  const fmt = d => d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
  const link = (href, text, cls) => { const a = el('a', cls, text); a.href = href; return a }
  const own = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null
  let names = null
  const getNames = () => names || (names = fetch('/assets/names.json', { credentials: 'omit' }).then(r => { if (!r.ok) throw new Error('names'); return r.json() }).catch(e => { names = null; throw e }))

  // read a file: GET, our host only, no cookie, no referrer, no redirect, capped in bytes while streaming
  async function getFile(src) {
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
  // the same checks as the build (scripts/pages.mjs)
  function posts(d, nm) {
    const blockedUrls = new Set(Array.isArray(nm.blocked_urls) ? nm.blocked_urls : []), blockedAcc = new Set(Array.isArray(nm.blocked_accounts) ? nm.blocked_accounts : [])
    const seen = new Set(), out = []
    for (const r of (Array.isArray(d.posts) ? d.posts : []).slice(0, 500)) {
      if (!r || typeof r !== 'object') continue
      const url = postLink(r), l = r.license || {}, lx = parse(l.url), at = isoDate(r.posted_at), kind = clean(r.kind, 40), account = clean(r.account, 100).toLowerCase()
      if (!url || seen.has(url) || !lx || !LICENCE_HOSTS.has(lx.hostname) || !clean(l.name) || !KINDS.has(kind) || !clean(r.organisation) || !at) continue
      if (blockedUrls.has(url) || blockedAcc.has(r.platform + ':' + account)) continue
      if (r.platform === 'bluesky' && new URL(url).pathname.split('/')[2].toLowerCase() !== account) continue
      seen.add(url); out.push({ r, url, lx, at, kind, account, accSlug: own(nm.accounts, r.platform + ':' + account), readAt: isoDate(r.read_at) })
    }
    return out.sort((a, b) => b.at - a.at)
  }
  function item(p, nm, fileUrl) {
    const li = el('li', 'post'), r = p.r, plat = r.platform === 'bluesky' ? 'Bluesky' : 'Mastodon'
    li.append(link(p.url, 'Open the post on ' + plat, 'go'))
    const who = el('p', 'who'), org = clean(r.organisation, 80)
    who.append(p.accSlug ? link('/accounts/' + r.platform + '/' + p.accSlug + '/', org) : el('span', null, org), ' ', el('span', 'kind', p.kind), ' ', el('span', 'acc', '@' + p.account + ' on ' + plat))
    const meta = el('p', 'meta'), t = el('time', null, fmt(p.at)); t.dateTime = p.at.toISOString()
    meta.append(t, r.has_media === true ? ' · has media (shown on the platform only)' : '', ' · licence ', link(p.lx.href, clean(r.license.name, 60)), r.license.holder ? ', ' + clean(r.license.holder, 80) : '')
    const ev = el('p', 'ev', 'Evidence for: '), tags = []
    for (const x of (Array.isArray(r.topics) ? r.topics : []).slice(0, 10)) { const n = typeof x === 'string' && own(nm.topics, x); if (n) tags.push(link('/topics/' + x + '/', n, 'chip')) }
    for (const x of (Array.isArray(r.places) ? r.places : []).slice(0, 10)) { const n = typeof x === 'string' && own(nm.places, x); if (n) tags.push(link('/places/' + x + '/', n, 'chip place')) }
    if (tags.length) ev.append(...tags); else ev.textContent = 'Evidence for: no topic or place of ours matched (a general signal).'
    const prov = el('p', 'prov', 'Provenance: read through ' + plat + "'s public API by data.b@PrompTugal.dinis's collector" + (p.readAt ? ' at ' + fmt(p.readAt) : '') + ', published in ')
    prov.append(link(fileUrl, fileUrl.replace('https://data.promptugal.news/api/v1/', '')), '; loaded by your browser.')
    li.append(who, meta, ev, prov); return li
  }
  function note(box, live, readAt) {
    const n = box.querySelector('.live-note'); if (!n) return
    const stale = Date.now() - readAt > STALE_MS
    n.textContent = (live ? 'Live file' : 'Built copy') + ', read ' + fmt(readAt) + (stale ? ' (stale: older than the 6-hourly collection)' : '') + '.'
    n.classList.toggle('stale', stale)
  }
  async function refresh(box) {
    if (box.__busy || document.hidden || (box.__next && Date.now() < box.__next)) return
    const src = box.getAttribute('data-src'), filter = box.getAttribute('data-filter') || 'all', built = isoDate(box.getAttribute('data-built-read')), max = Math.min(500, Number(box.getAttribute('data-max')) || 500)
    const builtCount = Math.max(0, Math.trunc(Number(box.getAttribute('data-built-count')) || 0))
    if (!SRC.test(src) || !FILTER.test(filter) || !built) return   // no built read time: never replace
    box.__busy = true
    try {
      const [d, nm] = await Promise.all([getFile(src), getNames()])
      const readAt = isoDate(typeof d.source_read_at === 'string' ? d.source_read_at : d.read_at)
      const current = box.__readAt || built
      // the same floor as the build: a file far smaller than the one built from is not shown
      if (!readAt || !Array.isArray(d.posts) || !d.posts.length || readAt <= current || (builtCount >= 20 && d.posts.length < builtCount / 4)) { note(box, !!box.__readAt, current); box.__fails = 0; box.__next = 0; return }
      let ps = posts(d, nm)
      if (filter.startsWith('topic:')) { const t = filter.slice(6); ps = ps.filter(p => Array.isArray(p.r.topics) && p.r.topics.some(x => typeof x === 'string' && /^[a-z0-9-]{1,40}$/.test(x) && x === t)) }
      else if (filter.startsWith('account:')) { const [, plat, acc] = filter.split(':'); ps = ps.filter(p => p.r.platform === plat && p.account === acc) }
      const list = box.querySelector('.list'); if (!list) return
      if (ps.length) { const ol = el('ol', 'posts'); for (const p of ps.slice(0, max)) ol.append(item(p, nm, src)); list.replaceChildren(ol) }
      else list.replaceChildren(el('p', 'empty', 'No post from a listed organisation matches this in the latest file. An empty list means none of the accounts we read posted about it, not that nothing is happening.'))
      box.__readAt = readAt; note(box, true, readAt)
      if (filter === 'all') for (const [k, v] of [['posts', ps.length], ['accounts', new Set(ps.map(p => p.r.platform + ':' + p.account)).size]]) { const c = document.querySelector('[data-live-count="' + k + '"]'); if (c) c.textContent = String(v) }
      box.__fails = 0; box.__next = 0
    } catch (e) { box.__fails = Math.min(6, (box.__fails || 0) + 1); box.__next = Date.now() + EVERY_MS * 2 ** box.__fails } finally { box.__busy = false }   // back off after each failure
  }
  for (const box of boxes) { const b = isoDate(box.getAttribute('data-built-read')); if (b) note(box, false, b); refresh(box) }
  setInterval(() => { for (const box of boxes) refresh(box) }, EVERY_MS)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) for (const box of boxes) refresh(box) })
})()
