// The shared map on /places/ (signals.b@PrompTugal.dinis, 20 Nov 2026). Dinis, 19 Nov 2026 about 17:40 UTC
// (PrompTugal__News__Website board/guidance/2026-11-19-cameras-as-links-and-the-map.md): "Portugal big, London and the EU
// small"; "The places come from ontologist@'s data/site/places-registry.json"; designer@'s one shared map, ptmap.
// ptmap 1.0.2 (designer@, ISC outline notice in its header) is vendored in src/assets/ptmap/1.0.2/ and checked here against
// the registry's sha384 pins at every build. Controls from security pre-review (Sonnet pass, 20 Nov 2026 08:3x UTC):
// a byte that differs fails the build; a registry that no longer lists 1.0.2, or one read only from the snapshot, leaves the
// map out (never shipped unchecked); coordinates are numbers inside the map's mainland view; hrefs and names are ours, built
// from checked slugs; London and the EU insets are null in code until this site has their data.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const MAP_VERSION = '1.0.2';
export const MAP_FILES = { 'ptmap.js': 'src/assets/ptmap/1.0.2/ptmap.js', 'ptmap.css': 'src/assets/ptmap/1.0.2/ptmap.css' };
export const VIEW = { lon0: -9.6, lon1: -6.1, lat0: 36.9, lat1: 42.2 };   // ptmap's mainland view
const own = (o, k) => o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;
const sri384 = buf => 'sha384-' + createHash('sha384').update(buf).digest('base64');

// reg: the parsed sites registry; live: true only when it was read live (not the snapshot); read: file reader (for tests).
// Returns { on, note }; throws when a vendored file does not match the pin the registry publishes for this version.
export function checkMap(reg, live, read = f => readFileSync(f)) {
  if (!live) return { on: false, note: `the shared map ${MAP_VERSION} is left out: the sites registry was not read live, so its files could not be checked` };
  const m = own(reg, 'map');
  if (!m || typeof m !== 'object') return { on: false, note: 'the sites registry lists no shared map: the map is left out' };
  const v = own(own(m, 'versions'), MAP_VERSION);
  if (!v || typeof v !== 'object') return { on: false, note: `the shared map ${MAP_VERSION} off: the registry names ${String(own(m, 'version') ?? 'none').slice(0, 20)} (no map until this site upgrades)` };
  const review = own(v, 'review');
  if (typeof review !== 'string' || !/^passed \(security@ [0-9a-f]{6,}\)/.test(review)) return { on: false, note: `the shared map ${MAP_VERSION} off: its review in the registry is not "passed (security@ <commit>)"` };
  const pins = own(v, 'integrity');
  if (!pins || typeof pins !== 'object') throw new Error(`shared map: the registry lists ${MAP_VERSION} with no integrity per file`);
  for (const [k, f] of Object.entries(MAP_FILES)) {
    const p = own(pins, k);
    if (typeof p !== 'string' || !p.startsWith('sha384-')) throw new Error(`shared map: no sha384 pin for ${k} in the registry's ${MAP_VERSION}`);
    if (sri384(read(f)) !== p) throw new Error(`shared map: ${f} does not match the full pin the registry publishes for ${MAP_VERSION}`);
  }
  return { on: true, note: '' };
}

// slugs: the places this site lists (already okSlug-checked); registry: parsed places-registry.json; name(slug): our name;
// count(slug): posts naming it. Returns { places, dropped } for PTMap.render, coordinates only from the registry's own ids.
export function mapPlaces(slugs, registry, name, count) {
  const list = registry && Array.isArray(registry.places) ? registry.places : [];
  const at = new Map();
  for (const p of list) {
    const id = own(p, 'id'), a = own(p, 'at');
    if (typeof id !== 'string' || at.has(id)) continue;
    at.set(id, a);
  }
  // an alias (the registry's "lisbon" lists "lisboa") matches only where no place has that id, first alias wins
  for (const p of list) { const al = own(p, 'aliases'), a = own(p, 'at');
    if (Array.isArray(al)) for (const x of al.slice(0, 20)) if (typeof x === 'string' && !at.has(x)) at.set(x, a); }
  const places = [], dropped = [];
  for (const s of new Set(slugs)) {
    const a = at.get(s);
    if (a == null) { dropped.push(s); continue; }   // no coordinates (a region such as the Algarve, or not in the registry)
    const ok = Array.isArray(a) && a.length === 2 && a.every(x => typeof x === 'number' && Number.isFinite(x))
      && a[0] >= VIEW.lon0 && a[0] <= VIEW.lon1 && a[1] >= VIEW.lat0 && a[1] <= VIEW.lat1;
    if (!ok) { dropped.push(s); continue; }
    places.push({ id: s, name: String(name(s)).slice(0, 60), at: [Math.round(a[0] * 1000) / 1000, Math.round(a[1] * 1000) / 1000], href: `/places/${s}/`, n: Math.max(0, Math.min(999, Math.trunc(Number(count(s)) || 0))) });
  }
  return { places, dropped };
}

// the data block: JSON that cannot close the script element or break a line in a script
export const jsonBlock = (id, data) => `<script type="application/json" id="${id}">${JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))}</script>`;
