// Regression probe: replays a real MacBook trackpad session (recorded with
// the journal's ?trace=1 recorder) through Chrome's input pipeline and checks
// how the link previews behave while Lenis is still gliding.
//
//   BASE=http://localhost:3777 CHROMIUM=/opt/pw-browsers/chromium node scripts/probes/hover-replay.mjs [trace.json]
//
// Checks (from the 11-05 hover spec):
//  1. A real pointer move onto a link opens its card within OPEN_BUDGET ms of
//     the pointer arriving, even mid-glide.
//  2. No card opens and closes again within 300 ms (the flash).
//  3. A link that slides under a pointer that is not moving does not open.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = process.env.BASE ?? "http://localhost:3777";
const file = process.argv[2] ?? fileURLToPath(new URL("./fixtures/hover-trace-glide.json", import.meta.url));
const OPEN_BUDGET = 300; // 120 ms intent + a frame or two, generous for CI
const rows = JSON.parse(readFileSync(file, "utf8")).rows;
const meta = rows.find((r) => r[1] === "meta");
const [, , , vw, vh, , , path] = meta;

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: vw, height: vh } });
await page.goto(base + path, { waitUntil: "load" });
await page.waitForTimeout(2000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

// Fonts differ between machines (a Mac renders the text a little wider
// and taller than Linux), so links sit elsewhere here than in the trace. Map
// the pointer: over a link, to the same relative spot on that link here;
// elsewhere, by the vertical shift of the links.
const links = rows.filter((r) => r[1] === "link");
const here = await page.$$eval("[role=button][data-preview-label]", (els) =>
  els.map((el) => { const r = el.getBoundingClientRect(); return [(el.getAttribute("data-preview-label") ?? "").slice(0, 31), r.left, r.top + window.scrollY, r.width, r.height]; }));
const map = new Map();
for (const [, , label, x, y, w, h] of links) {
  const m = here.find((e) => e[0] === label);
  if (!m) { console.log(`link "${label}" missing on this page`); continue; }
  map.set(label, { tx: x, ty: y, tw: w, th: h, hx: m[1], hy: m[2], hw: m[3], hh: m[4] });
}
const dys = [...map.values()].map((m) => m.hy - m.ty);
const DY = dys.length ? Math.round(dys.reduce((a, b) => a + b, 0) / dys.length) : 0;
console.log(`layout shift applied: ${DY}px vertical, links mapped proportionally`);
const place = (r) => {
  const on = String(r[7] ?? "").startsWith("link:") ? map.get(String(r[7]).slice(5)) : null;
  if (!on) return [r[2], r[3] + DY];
  const fx = Math.min(0.95, Math.max(0.05, (r[2] - on.tx) / on.tw));
  return [on.hx + fx * on.hw, r[3] + DY];
};

// Log every open/close in page time.
await page.evaluate(() => {
  window.__log = [];
  window.__t0 = performance.now();
  new MutationObserver((ms) => ms.forEach((m) => {
    const el = m.target;
    window.__log.push([performance.now() - window.__t0, el.getAttribute("aria-expanded") === "true" ? "open" : "close", (el.getAttribute("data-preview-label") ?? "").slice(0, 31)]);
  })).observe(document.body, { subtree: true, attributeFilter: ["aria-expanded"] });
});

const cdp = await page.context().newCDPSession(page);
const input = rows.filter((r) => r[1] === "move" || r[1] === "wheel");
const traceStart = input[0][0];
// Page clock zero = first replayed input, so log times line up with the trace.
await page.evaluate(() => { window.__t0 = performance.now(); window.__log = []; });
const start = Date.now();
for (const r of input) {
  const wait = r[0] - traceStart - (Date.now() - start);
  if (wait > 1) await new Promise((res) => setTimeout(res, wait));
  const [x, y] = place(r);
  if (r[1] === "move") await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  else await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: r[4], deltaY: r[5] });
}
await page.waitForTimeout(1500);
const log = (await page.evaluate(() => window.__log)).map(([t, k, l]) => [Math.round(t), k, l]);
await browser.close();

// Real arrivals: the first move over a link that actually moved the pointer
// (>= 2 px; Chrome also reports zero-movement moves while the page scrolls),
// and that then rests on it long enough to mean it (>= 200 ms).
const arrivals = [];
const moveRows = rows.filter((x) => x[1] === "move" || x[1] === "out");
let current = null;
for (let i = 0; i < moveRows.length; i++) {
  const r = moveRows[i];
  const on = r[1] === "move" && String(r[7]).startsWith("link:") ? String(r[7]).slice(5) : null;
  if (on && on !== current && Math.abs(r[4]) + Math.abs(r[5]) >= 2) {
    const leave = moveRows.slice(i + 1).find((x) => (x[1] === "out" && x[4] === "link:" + on) || (x[1] === "move" && x[7] !== "link:" + on));
    const dwell = (leave ? leave[0] : r[0] + 10000) - r[0];
    if (dwell >= 200) arrivals.push([Math.round(r[0] - traceStart), on, Math.round(dwell)]);
  }
  if (r[1] === "move") current = on;
}

const failures = [];
// 1. every real arrival opens in time
for (const [t, label, dwell] of arrivals) {
  const hit = log.find(([lt, k, l]) => k === "open" && l === label && lt >= t - 50);
  const late = hit ? hit[0] - t : null;
  console.log(`arrival "${label}" +${t} ms (rests ${dwell} ms) → ${hit ? `opened after ${late} ms` : "never opened"}`);
  if (!hit || late > OPEN_BUDGET) failures.push(`slow open: "${label}" ${hit ? late + " ms" : "never"} after the pointer arrived (budget ${OPEN_BUDGET})`);
}
// 2. flashes, 3. opens nobody asked for
const opened = {};
for (const [t, k, label] of log) {
  if (k === "open") {
    opened[label] = t;
    if (!arrivals.some(([at, l]) => l === label && t >= at - 50 && t - at <= 2000)) failures.push(`unasked open: "${label}" at +${t} ms with no real pointer move onto it`);
  } else if (opened[label] !== undefined) {
    if (t - opened[label] < 300) failures.push(`flash: "${label}" open for ${t - opened[label]} ms`);
    delete opened[label];
  }
}
console.log("events:", JSON.stringify(log));
if (failures.length) { console.log("FAIL\n" + failures.join("\n")); process.exitCode = 1; } else console.log("PASS");
