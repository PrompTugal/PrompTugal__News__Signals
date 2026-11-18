// signals.promptugal.news: refresh the front page's latest list from data.promptugal.news in the browser
// (signals.b@PrompTugal.dinis, 18 Nov 2026; Dinis: "load data dynamically ... with the built page as the fallback").
// Every value from the API is untrusted: the DOM is built with createElement and textContent only, every link is parsed
// and checked against the same allowlist as scripts/pages.mjs; on any failure the built list stays as it is.
(() => {
  'use strict'
  const box = document.getElementById('latest'); if (!box || !window.fetch || !window.AbortController) return
  const API = 'https://data.promptugal.news/api/v1/social/latest.json', MAX_BYTES = 2000000, MAX_SHOW = 60
  const KINDS = new Set(['news outlet', 'public body', 'company', 'venue', 'organiser', 'câmara', 'council', 'university', 'association'])
  const LICENCE_HOSTS = new Set(['bsky.social', 'mastodon.social', 'creativecommons.org', 'www.perplexity.ai'])
  const MASTODON_HOSTS = new Set(['mastodon.social'])
  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').replace(/\u2014/g, '\u2013').replace(/\s+/g, ' ').trim().slice(0, n || 120)
  const parse = u => { try { const x = new URL(String(u)); return x.protocol === 'https:' && !x.username && !x.password && !x.port ? x : null } catch (e) { return null } }
  const postLink = p => { const x = parse(p.url); if (!x || x.search || x.hash) return null
    if (p.platform === 'bluesky') return x.hostname === 'bsky.app' && /^\/profile\/[a-z0-9.:-]{1,100}\/post\/[a-z0-9]{1,20}$/i.test(x.pathname) ? x.href : null
    if (p.platform === 'mastodon') return MASTODON_HOSTS.has(x.hostname) && /^\/@[A-Za-z0-9_]{1,30}\/\d{1,25}$/.test(x.pathname) ? x.href : null
    return null }
  const isoDate = v => { if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(v)) return null; const d = new Date(v); return isNaN(d) || d < Date.UTC(2020, 0, 1) || d > Date.now() + 86400000 ? null : d }
  const fmt = d => d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
  const link = (href, text, cls) => { const a = el('a', cls, text); a.href = href; return a }
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 15000)
  Promise.all([
    fetch(API, { signal: ac.signal, credentials: 'omit', redirect: 'error', cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('http'); return r.text() }),
    fetch('/assets/names.json', { signal: ac.signal }).then(r => r.json())
  ]).then(([text, names]) => {
    clearTimeout(timer)
    if (text.length > MAX_BYTES) return
    const d = JSON.parse(text), pName = { bluesky: 'Bluesky', mastodon: 'Mastodon' }
    const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null
    const blockedUrls = new Set(Array.isArray(names.blocked_urls) ? names.blocked_urls : []), blockedAcc = new Set(Array.isArray(names.blocked_accounts) ? names.blocked_accounts : [])
    const seen = new Set(), posts = []
    for (const r of (Array.isArray(d.posts) ? d.posts : []).slice(0, 500)) {
      if (!r || typeof r !== 'object') continue
      const url = postLink(r), l = r.license || {}, lx = parse(l.url), at = new Date(r.posted_at), kind = clean(r.kind, 40), account = clean(r.account, 100).toLowerCase()
      if (!url || seen.has(url) || !lx || !LICENCE_HOSTS.has(lx.hostname) || !clean(l.name) || !KINDS.has(kind) || !clean(r.organisation) || isNaN(at)) continue
      if (blockedUrls.has(url) || blockedAcc.has(r.platform + ':' + account) || at > Date.now() + 86400000) continue   // take-downs and future dates, as the build
      if (r.platform === 'bluesky' && new URL(url).pathname.split('/')[2].toLowerCase() !== account) continue
      const accSlug = own(names.accounts, r.platform + ':' + account)   // only accounts this build knows have a page
      seen.add(url); posts.push({ r, url, lx, at, kind, account, accSlug })
    }
    if (!posts.length) return
    posts.sort((a, b) => b.at - a.at)
    const ol = el('ol', 'posts')
    for (const p of posts.slice(0, MAX_SHOW)) {
      const li = el('li', 'post'), r = p.r, plat = pName[r.platform]
      li.append(link(p.url, 'Open the post on ' + plat, 'go'))
      const who = el('p', 'who'), org = clean(r.organisation, 80)
      who.append(p.accSlug ? link('/accounts/' + r.platform + '/' + p.accSlug + '/', org) : el('span', null, org), ' ', el('span', 'kind', p.kind), ' ', el('span', 'acc', '@' + p.account + ' on ' + plat))
      const meta = el('p', 'meta'), t = el('time', null, fmt(p.at)); t.dateTime = p.at.toISOString()
      meta.append(t, r.has_media === true ? ' · has media (shown on the platform only)' : '', ' · licence ', link(p.lx.href, clean(r.license.name, 60)), r.license.holder ? ', ' + clean(r.license.holder, 80) : '')
      const ev = el('p', 'ev', 'Evidence for: ')
      const tags = []
      for (const x of (Array.isArray(r.topics) ? r.topics : []).slice(0, 10)) { const n = typeof x === 'string' && own(names.topics, x); if (n) tags.push(link('/topics/' + x + '/', n, 'chip')) }
      for (const x of (Array.isArray(r.places) ? r.places : []).slice(0, 10)) { const n = typeof x === 'string' && own(names.places, x); if (n) tags.push(link('/places/' + x + '/', n, 'chip place')) }
      if (tags.length) ev.append(...tags); else ev.textContent = 'Evidence for: no topic or place of ours matched (a general signal).'
      const rx = isoDate(r.read_at), prov = el('p', 'prov', 'Provenance: read through ' + plat + "'s public API by data.b@PrompTugal.dinis's collector" + (rx ? ' at ' + fmt(rx) : '') + ', published in ')
      prov.append(link(API, 'social/latest.json'), '; fetched by your browser from data.promptugal.news at ' + fmt(new Date()) + '.')
      li.append(who, meta, ev, prov); ol.append(li)
    }
    box.replaceChildren(ol)
    const note = document.getElementById('live-note'); const ra = new Date(d.read_at)
    if (note) note.textContent = 'The ' + Math.min(MAX_SHOW, posts.length) + ' most recent, newest first, refreshed in your browser from data.promptugal.news' + (isNaN(ra) ? '.' : ' (read ' + fmt(ra) + ').')
  }).catch(() => { clearTimeout(timer) })
})()
