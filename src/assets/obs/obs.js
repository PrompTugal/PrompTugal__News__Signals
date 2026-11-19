// signals.promptugal.news: weather.promptugal.news's copy (weather.b@PrompTugal.dinis, 18 Nov 2026) of promptugal.news's sender
// (PrompTugal/PrompTugal__News__Website assets/obs/obs.js, Apache-2.0, same estate), brought here unchanged except for the
// default lane by signals.b@PrompTugal.dinis on 18 Nov 2026, at Dinis's word ("add observability to all the other sites";
// and in signals.b@'s session: "set up your tracking lane"). It writes only to the lane "signals" (obs.json lanes.signals);
// while that lane has no append tokens nothing is sent, no place is looked up, and the footer says page views are not
// counted yet. Its vault, tokens and drain key were made by tools/obs-setup-signals.py on 18 Nov 2026 (obs.json).
// PrompTugal.news's page views and reads (observability@PrompTugal.dinis, 6 November 2026, at Dinis Cruz's word:
// "replicate what we have on web-summit.sgit.ai"). The team site's sender (its assets/obs-dinis.js, by
// observability@web-summit.dinis, after Jose's assets/telemetry.js and the observability pack), into this site's own
// vault (assets/obs/obs.json). Two events per page load:
//   view  when the page loads;
//   read  the first time the tab is hidden or closed: seconds the page was visible and the deepest scroll (percent).
// Each says: the page, the referring site (host only), the time to the minute, the site version, a random id that
// ends with the tab, the screen size class, the browser's language and time zone, an automation class if a bot
// declares itself, and the country, from the browser's own time zone through a fixed table in this file, with no
// network call (Dinis, 19 Nov 2026, about 03:15 UTC: "remove the IP base. So we're going to keep the country still.";
// PrompTugal__News__Website board/guidance/2026-11-19-no-ip-lookup-predictions-and-small-decisions.md). No third party is
// asked where a reader is; no region, city or map position. No IP address, no cookie, no user-agent
// string, no browser fingerprint. Sealed here to the drain key (sgit hybrid
// envelope v2: RSA-OAEP-SHA256 + AES-256-GCM) and written to a write-only append lane; on 507 (a lane full) the next.
// Do Not Track, Global Privacy Control and the footer's Pause switch stop it. Never blocks, never shows an error.
// The drain (newsroom/tools/obs/obs_drain.py) publishes counts only; the report is /newsroom/observability/.
(() => {
    'use strict'
    try {
        const nav = navigator
        const dnt = nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.globalPrivacyControl === true
        const LS = { get: k => { try { return localStorage.getItem('pt.obs.' + k) } catch { return null } }, set: (k, v) => { try { v === null ? localStorage.removeItem('pt.obs.' + k) : localStorage.setItem('pt.obs.' + k, v) } catch { } } }
        const SS = { get: k => { try { return sessionStorage.getItem('pt.obs.' + k) } catch { return null } }, set: (k, v) => { try { sessionStorage.setItem('pt.obs.' + k, v) } catch { } }, del: k => { try { sessionStorage.removeItem('pt.obs.' + k) } catch { } } }
        const paused = () => LS.get('off') === '1'
        const script = document.currentScript, base = script ? script.src.replace(/obs\.js(\?.*)?$/, '') : '/assets/obs/'
        const LANE = (script && script.getAttribute('data-lane')) || 'signals'
        let laneOpen = null   // null: not known yet; true: the lane has tokens; false: none yet

        // the disclosure and the pause switch, in the footer of every page
        const footer = () => {
            const row = document.querySelector('footer p.small') || document.querySelector('footer'); if (!row || row.querySelector('.obs-note')) return
            const s = document.createElement('span'); s.className = 'obs-note'
            const a = document.createElement('a'); a.href = 'https://promptugal.news/newsroom/observability/index.html'; a.textContent = 'what is counted'
            if (dnt) { s.append(' · Page views: off (Do Not Track or Global Privacy Control is on). ', a); row.appendChild(s); return }
            const b = document.createElement('button'); b.type = 'button'; b.style.cssText = 'font:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer;color:inherit'
            const t = document.createTextNode('')
            const draw = () => { if (laneOpen === false) { t.textContent = ' · Page views: not counted yet (this site\'s lane is not open). '; b.hidden = true; return } t.textContent = paused() ? ' · Page views: paused on this device. ' : ' · Page views, reading time and your country (from your browser\'s time zone, with no lookup) are counted, publicly. No one is asked where you are; we keep no IP address and set no cookie. '; b.textContent = paused() ? 'Resume' : 'Pause' }
            b.onclick = () => { LS.set('off', paused() ? null : '1'); draw() }
            s.append(t, b, ' · ', a); draw(); row.appendChild(s); window.__obsRedraw = draw
        }
        const safeFooter = () => { try { footer() } catch { } }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeFooter); else safeFooter()
        if (dnt || paused()) return

        let sid = SS.get('sid'); if (!sid) { sid = [...crypto.getRandomValues(new Uint8Array(4))].map(x => x.toString(16).padStart(2, '0')).join(''); SS.set('sid', sid) }
        const path = location.pathname, done = new Set()

        const b64 = bytes => { let s = ''; for (const x of new Uint8Array(bytes)) s += String.fromCharCode(x); return btoa(s) }
        const unpem = pem => Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), c => c.charCodeAt(0))
        async function seal(pem, text) {
            const S = crypto.subtle
            const pub = await S.importKey('spki', unpem(pem), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'])
            const aes = await S.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
            const iv = crypto.getRandomValues(new Uint8Array(12))
            const c = await S.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aes, new TextEncoder().encode(text))
            const w = await S.encrypt({ name: 'RSA-OAEP' }, pub, await S.exportKey('raw', aes))
            return btoa(btoa(JSON.stringify({ v: 2, w: b64(w), i: b64(iv), c: b64(c) })))   // the lane takes base64 of the .enc text
        }
        // automation by class only, never the user-agent string itself
        const ua = nav.userAgent || ''
        const agent = nav.webdriver ? 'webdriver' : /HeadlessChrome|PhantomJS/.test(ua) ? 'headless'
            : /Googlebot/i.test(ua) ? 'googlebot' : /bingbot/i.test(ua) ? 'bingbot' : /bot|crawl|spider|slurp/i.test(ua) ? 'bot' : ''
        const w = window.innerWidth || 1024
        let ref = ''; try { ref = document.referrer ? new URL(document.referrer).host : '' } catch { }
        // the country, from the browser's own time zone through this fixed table: no network call, no region, city or
        // position (Dinis, 19 Nov 2026). A zone not in the table gives an empty country.
        const ZONES = 'PT:Europe/Lisbon Atlantic/Madeira Atlantic/Azores;ES:Europe/Madrid Atlantic/Canary Africa/Ceuta;GB:Europe/London;IE:Europe/Dublin;FR:Europe/Paris;DE:Europe/Berlin Europe/Busingen;NL:Europe/Amsterdam;BE:Europe/Brussels;LU:Europe/Luxembourg;CH:Europe/Zurich;AT:Europe/Vienna;IT:Europe/Rome;MT:Europe/Malta;DK:Europe/Copenhagen;NO:Europe/Oslo;SE:Europe/Stockholm;FI:Europe/Helsinki;IS:Atlantic/Reykjavik;PL:Europe/Warsaw;CZ:Europe/Prague;SK:Europe/Bratislava;HU:Europe/Budapest;RO:Europe/Bucharest;BG:Europe/Sofia;GR:Europe/Athens;CY:Asia/Nicosia Asia/Famagusta;SI:Europe/Ljubljana;HR:Europe/Zagreb;RS:Europe/Belgrade;BA:Europe/Sarajevo;ME:Europe/Podgorica;MK:Europe/Skopje;AL:Europe/Tirane;EE:Europe/Tallinn;LV:Europe/Riga;LT:Europe/Vilnius;UA:Europe/Kyiv Europe/Kiev;MD:Europe/Chisinau;BY:Europe/Minsk;RU:Europe/Moscow Asia/Yekaterinburg Asia/Novosibirsk Asia/Vladivostok;TR:Europe/Istanbul;GE:Asia/Tbilisi;AM:Asia/Yerevan;AZ:Asia/Baku;AD:Europe/Andorra;MC:Europe/Monaco;GI:Europe/Gibraltar;US:America/New_York America/Chicago America/Denver America/Phoenix America/Los_Angeles America/Anchorage Pacific/Honolulu America/Detroit;CA:America/Toronto America/Vancouver America/Edmonton America/Winnipeg America/Halifax America/St_Johns;MX:America/Mexico_City America/Tijuana America/Cancun;BR:America/Sao_Paulo America/Manaus America/Fortaleza America/Recife America/Bahia America/Belem America/Noronha;AR:America/Argentina/Buenos_Aires America/Buenos_Aires;CL:America/Santiago;CO:America/Bogota;PE:America/Lima;VE:America/Caracas;UY:America/Montevideo;PY:America/Asuncion;BO:America/La_Paz;EC:America/Guayaquil;CU:America/Havana;DO:America/Santo_Domingo;PR:America/Puerto_Rico;JM:America/Jamaica;PA:America/Panama;CR:America/Costa_Rica;GT:America/Guatemala;AO:Africa/Luanda;MZ:Africa/Maputo;CV:Atlantic/Cape_Verde;GW:Africa/Bissau;ST:Africa/Sao_Tome;ZA:Africa/Johannesburg;MA:Africa/Casablanca;DZ:Africa/Algiers;TN:Africa/Tunis;EG:Africa/Cairo;NG:Africa/Lagos;GH:Africa/Accra;SN:Africa/Dakar;KE:Africa/Nairobi;ET:Africa/Addis_Ababa;TZ:Africa/Dar_es_Salaam;UG:Africa/Kampala;RW:Africa/Kigali;CI:Africa/Abidjan;CM:Africa/Douala;ZW:Africa/Harare;ZM:Africa/Lusaka;NA:Africa/Windhoek;IL:Asia/Jerusalem Asia/Tel_Aviv;AE:Asia/Dubai;SA:Asia/Riyadh;QA:Asia/Qatar;KW:Asia/Kuwait;BH:Asia/Bahrain;OM:Asia/Muscat;JO:Asia/Amman;LB:Asia/Beirut;IR:Asia/Tehran;IQ:Asia/Baghdad;IN:Asia/Kolkata Asia/Calcutta;PK:Asia/Karachi;BD:Asia/Dhaka;LK:Asia/Colombo;NP:Asia/Kathmandu Asia/Katmandu;CN:Asia/Shanghai;HK:Asia/Hong_Kong;MO:Asia/Macau;TW:Asia/Taipei;JP:Asia/Tokyo;KR:Asia/Seoul;SG:Asia/Singapore;MY:Asia/Kuala_Lumpur;TH:Asia/Bangkok;VN:Asia/Ho_Chi_Minh Asia/Saigon;PH:Asia/Manila;ID:Asia/Jakarta Asia/Makassar Asia/Jayapura;TL:Asia/Dili;KZ:Asia/Almaty;UZ:Asia/Tashkent;AU:Australia/Sydney Australia/Melbourne Australia/Brisbane Australia/Perth Australia/Adelaide Australia/Hobart Australia/Darwin;NZ:Pacific/Auckland'
        const zoneCountry = new Map(); for (const part of ZONES.split(';')) { const [cc, zs] = part.split(':'); for (const z of zs.split(' ')) zoneCountry.set(z, cc) }
        const place = () => {
            if (/\/contribute\//.test(location.pathname)) return { country: '', country_code: '' }   // security@'s S34: none on pages that take a person's details
            let cc = ''; try { cc = zoneCountry.get(Intl.DateTimeFormat().resolvedOptions().timeZone || '') || '' } catch { }
            let name = ''; try { name = cc ? String(new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || '').slice(0, 60) : '' } catch { }
            return { country: name, country_code: cc }
        }
        SS.del('geo')   // an earlier version kept a looked-up place for the tab; it is no longer used
        // a link's tag (Dinis, 6 November: "I just sent a link to somebody ... I would like to see if they open it ... and
        // forward it"): ?via=<tag> (or utm_source / utm_campaign) on the link you send. Kept for the tab, so the pages read
        // after arriving count too; a tag names the link, never the person. Letters, digits, '.', '_' and '-', 40 at most.
        const tagOf = () => { try { const q = new URLSearchParams(location.search); const t = q.get('via') || q.get('utm_campaign') || q.get('utm_source') || ''; return /^[A-Za-z0-9._-]{1,40}$/.test(t) ? t.toLowerCase() : '' } catch { return '' } }
        let via = tagOf(); if (via) SS.set('via', via); else via = SS.get('via') || ''
        const common = () => {
            const e = { v: 1, src: 'promptugal', lane: LANE, site: location.host, ver: (((document.querySelector('.ver') || {}).textContent || '').replace(/^Version\s*/, '')).trim(),
                ts: new Date().toISOString().slice(0, 16) + 'Z', sid, path, ref, lang: nav.language || '',
                screen: w < 600 ? 'phone' : w < 1000 ? 'tablet' : 'desktop', tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '') }
            if (agent) e.agent = agent
            if (via) e.via = via
            // an A/B test (Dinis, 6 November 2026, 13:20: "A/B testing when needed ... on the website"): the variant this page
            // was shown, from <html data-variant> or <meta name="variant">, set by whoever runs the test; no new identifier
            const H = document.documentElement.dataset, vr = H.variant || (document.querySelector('meta[name="variant"]') || {}).content || (H.top ? 'top-' + H.top : '')   // dev@'s A/B of the top: <html data-top="c|a">
            if (/^[A-Za-z0-9._-]{1,40}$/.test(vr)) e.variant = vr
            return e
        }

        let visibleMs = 0, since = document.visibilityState === 'visible' ? performance.now() : null, maxScroll = 0
        const scrolled = () => { const h = document.documentElement, top = window.scrollY || h.scrollTop, all = Math.max(1, h.scrollHeight - window.innerHeight); maxScroll = Math.max(maxScroll, Math.min(100, Math.round(100 * top / all))) }
        window.addEventListener('scroll', scrolled, { passive: true })

        let cfgP = null
        const cfg = () => cfgP || (cfgP = fetch(base + 'obs.json', { cache: 'no-cache' }).then(r => r.json()))
        let sharedP = null
        const shared = c => sharedP || (sharedP = fetch(c.shared_from, { cache: 'no-cache', credentials: 'omit' }).then(r => r.json()).then(j => ({ endpoint: j.endpoint, vault_id: j.vault_id, recipient: j.recipient })))
        const send = async ev => {
            if (paused()) return false
            const c0 = await cfg(); const L = (c0.enabled && c0.lanes && c0.lanes[LANE]) || []; if (!L.length) return false
            // the drain key, the endpoint and the vault: this file's own, else promptugal.news's published obs.json (shared)
            const c = c0.recipient && c0.endpoint && c0.vault_id ? c0 : Object.assign({}, await shared(c0), c0)
            if (!('country' in ev)) Object.assign(ev, place())
            const payload = await seal(c.recipient.encrypt, JSON.stringify(ev))
            const start = Math.floor(Math.random() * L.length)   // a random first lane spreads the load
            for (const token of L.map((_, i) => L[(start + i) % L.length])) {
                const r = await fetch(`${c.endpoint}/api/vault/append/write/${c.vault_id}`, { method: 'POST', keepalive: true,
                    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ append_token: token, payload }) })
                if (r.status !== 507) return r.ok
            }
            return false
        }
        const resend = () => {                                            // reads an earlier page in this tab could not finish sending
            try {
                for (const k of Object.keys(sessionStorage).filter(k => k.startsWith('pt.obs.pending.'))) {
                    const ev = JSON.parse(sessionStorage.getItem(k)); sessionStorage.removeItem(k)
                    send(ev).catch(() => { })
                }
            } catch { }
        }
        // a yes or no on a page (assets/talk/talk.js, dev.places@PrompTugal.dinis, 15 Nov 2026): one more event on this
        // lane, with no identity: the same fields as a view, plus the vote; absent under Do Not Track or the pause
        window.PTObs = { vote: (v, path) => send(Object.assign(common(), { type: 'vote', vote: v > 0 ? 1 : -1 }, path ? { voted_on: String(path).slice(0, 200) } : {})).catch(() => false) }
        const view = () => { resend(); if (done.has('view')) return; done.add('view'); send(Object.assign(common(), { type: 'view' })).catch(() => { }) }
        const finish = () => {
            if (since !== null) { visibleMs += performance.now() - since; since = null }
            if (done.has('read')) return
            scrolled(); done.add('read')
            const ev = Object.assign(common(), { type: 'read', visible_s: Math.min(3600, Math.round(visibleMs / 1000)), scroll: maxScroll })
            const key = 'pending.' + ev.path + '.' + Date.now()
            SS.set(key, JSON.stringify(ev))                                   // kept until written: leaving can cut the send short
            send(ev).then(ok => { if (ok) SS.del(key) }).catch(() => { })
        }
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') since = performance.now(); else finish() })
        window.addEventListener('pagehide', finish)
        cfg().then(c => { laneOpen = !!(c.enabled && c.lanes && c.lanes[LANE] && c.lanes[LANE].length); if (window.__obsRedraw) window.__obsRedraw() }).catch(() => { })
        if (document.readyState === 'complete') setTimeout(view, 0); else window.addEventListener('load', view)
    } catch { }
})()
