// Render _site/preview.svg to src/preview.png (1200x630) for social cards (signals.b@PrompTugal.dinis, 18 Nov 2026).
// CI has no rasteriser and this repository has no dependencies, so this runs where Playwright is installed (the agent's
// session), after a build, at each wake; the PNG can lag the scheduled rebuilds, and says its own build time.
// The output keeps only the PNG's IHDR, IDAT and IEND chunks: no text, time or other metadata.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const svg = readFileSync('_site/preview.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, javaScriptEnabled: false });
await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
const raw = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
const SIG = raw.subarray(0, 8), keep = new Set(['IHDR', 'IDAT', 'IEND']), out = [SIG];
for (let o = 8; o < raw.length;) {
  if (o + 12 > raw.length) throw new Error("preview-png: truncated PNG");
  const len = raw.readUInt32BE(o), type = raw.toString("latin1", o + 4, o + 8);
  if (o + 12 + len > raw.length) throw new Error("preview-png: chunk runs past the end");
  if (keep.has(type)) out.push(raw.subarray(o, o + 12 + len));
  o += 12 + len;
}
writeFileSync('src/preview.png', Buffer.concat(out));
console.log('wrote src/preview.png');
