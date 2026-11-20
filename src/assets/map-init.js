// signals.promptugal.news: draws the shared map (ptmap, designer@PrompTugal.dinis) on /places/ from the build's data block
// (signals.b@PrompTugal.dinis, 20 Nov 2026). The block is JSON the build wrote from checked slugs and coordinates; it is read
// as text and parsed, never run. Nothing is drawn if the block or ptmap is missing or the JSON fails; the list stays.
(() => {
  'use strict'
  const host = document.getElementById('ptmap'), data = document.getElementById('ptmap-data')
  if (!host || !data || data.type !== 'application/json' || !window.PTMap || typeof window.PTMap.render !== 'function') return
  let o; try { o = JSON.parse(data.textContent) } catch (e) { return }
  if (!o || !Array.isArray(o.places)) return
  window.PTMap.render(host, { places: o.places, label: typeof o.label === 'string' ? o.label : '', london: null, eu: null })
})()
