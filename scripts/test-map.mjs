// Tests for scripts/map.mjs (signals.b@PrompTugal.dinis, 20 Nov 2026; security pre-review controls 2 to 7).
// Usage: node scripts/test-map.mjs   (prints OK or the failing cases and exits 1)
import { createHash } from 'node:crypto';
import { checkMap, mapPlaces, jsonBlock, MAP_FILES, MAP_VERSION } from './map.mjs';
const results = [], t = (name, pass) => results.push({ name, pass: !!pass });
const pin = f => 'sha384-' + createHash('sha384').update(f).digest('base64');
const bytes = { [MAP_FILES['ptmap.js']]: Buffer.from('js'), [MAP_FILES['ptmap.css']]: Buffer.from('css') };
const read = f => bytes[f];
const reg = (over = {}) => ({ map: { version: MAP_VERSION, versions: { [MAP_VERSION]: { review: 'passed (security@ 168c14fc5)', integrity: { 'ptmap.js': pin('js'), 'ptmap.css': pin('css') }, ...over } } } });
const throws = f => { try { f(); return false; } catch { return true; } };

t('matching files: map on', checkMap(reg(), true, read).on);
t('a changed byte fails the build', throws(() => checkMap(reg(), true, f => Buffer.concat([read(f), Buffer.from(' ')]))));
t('a missing pin for one file fails the build', throws(() => checkMap(reg({ integrity: { 'ptmap.js': pin('js') } }), true, read)));
t('a sha256 pin is not accepted', throws(() => checkMap(reg({ integrity: { 'ptmap.js': 'sha256-' + createHash('sha256').update('js').digest('base64'), 'ptmap.css': pin('css') } }), true, read)));
t('no integrity at all fails the build', throws(() => checkMap(reg({ integrity: undefined }), true, read)));
t('registry no longer lists 1.0.2: off with a note', (r => !r.on && /off/.test(r.note))(checkMap({ map: { version: '9.9.9', versions: { '9.9.9': {} } } }, true, read)));
t('snapshot registry: left out, never unchecked', (r => !r.on && r.note)(checkMap(reg(), false, read)));
t('no map in the registry: left out', !checkMap({}, true, read).on);
t('a review that is not passed: off', !checkMap(reg({ review: 'pending' }), true, read).on);
t('integrity as a string fails the build', throws(() => checkMap(reg({ integrity: pin('js') }), true, read)));
t('versions as an array: off', !checkMap({ map: { version: MAP_VERSION, versions: [reg().map.versions[MAP_VERSION]] } }, true, read).on);
t('an inherited map is not read', !checkMap(Object.create(reg()), true, read).on);
t('inherited integrity fails the build', throws(() => checkMap(reg({ integrity: Object.create({ 'ptmap.js': pin('js'), 'ptmap.css': pin('css') }) }), true, read)));
t('a review "passedX" is not passed', !checkMap(reg({ review: 'passed-not' }), true, read).on);
t('an inherited version is not read', !checkMap({ map: { versions: Object.create({ [MAP_VERSION]: reg().map.versions[MAP_VERSION] }) } }, true, read).on);

const places = [{ id: 'faro', at: [-7.935, 37.019] }, { id: 'lisbon', aliases: ['lisboa'], at: [-9.139, 38.722] }, { id: 'far', at: [2, 48] }, { id: 'west', at: [-10.5, 38] }, { id: 'south', at: [-8, 36] }, { id: 'north', at: [-8, 43] }, { id: 'str', at: ['-8', '37'] },
  { id: 'inf', at: [Infinity, 37] }, { id: 'nul', at: null }, { id: 'faro', at: [-8, 40] }, { id: 'x', aliases: ['faro'], at: [-8.5, 41] }];
const m = mapPlaces(['faro', 'lisboa', 'far', 'west', 'south', 'north', 'str', 'inf', 'nul', 'none', '__proto__', 'faro'], { places }, s => s === 'faro' ? 'Faro</script><b>' : s, () => 5000);
const by = Object.fromEntries(m.places.map(p => [p.id, p]));
t('a place in view is drawn', by.faro && by.faro.at[0] === -7.935);
t('the first entry for an id wins, an alias never overrides an id', by.faro && by.faro.at[1] === 37.019);
t('an alias matches (lisboa to lisbon)', by.lisboa && by.lisboa.at[0] === -9.139);
t('outside the view is dropped', !by.far && m.dropped.includes('far'));
t('west, south and north of the view are dropped', !by.west && !by.south && !by.north);
t('a string coordinate is dropped', !by.str);
t('an infinite coordinate is dropped', !by.inf);
t('no coordinates is dropped', !by.nul && m.dropped.includes('nul') && m.dropped.includes('none'));
t('__proto__ draws nothing', !Object.hasOwn(by, '__proto__') && m.places.length === 2);
t('a duplicate slug is drawn once', m.places.filter(p => p.id === 'faro').length === 1);
t('href is ours, same origin', by.faro.href === '/places/faro/');
t('n is clamped to 999', by.faro.n === 999);
const blk = jsonBlock('d', { places: m.places, s: '\u2028&>' });
t('the block cannot close the script element', !/<\/script>.*<\/script>/s.test(blk) && blk.endsWith('</script>') && blk.indexOf('</script') === blk.length - 9);
t('the block has no raw < > & or line separator inside', !/[<>&\u2028\u2029]/.test(blk.slice(blk.indexOf('>') + 1, -9)));
t('the block parses back to the same data', JSON.parse(blk.slice(blk.indexOf('>') + 1, -9)).places[0].name === 'Faro</script><b>');

const bad = results.filter(r => !r.pass);
for (const r of bad) console.error(`FAIL ${r.name}`);
if (bad.length || results.length < 30) { console.error(`FAILED: ${bad.length} of ${results.length} cases`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
