// Regression probe: on the gallery page (the stage) one trackpad gesture moves
// exactly one card, past the next project's card it hands off once, and the
// rest of that swipe does not step the page that takes over. Gestures go out
// through CDP with OS-style timestamps 16 ms apart, so a busy page sees a
// queued burst, as with a real trackpad, not a gap that reads as a pause.
//
//   BASE=http://localhost:3777 SLUG=deploybar node scripts/probes/stage-wheel.mjs
//   CHROMIUM=/opt/pw-browsers/chromium ...   # cloud container
import { chromium } from "playwright";

const base = process.env.BASE ?? "https://alirezamp.com";
const slug = process.env.SLUG ?? "deploybar";
const gestures = Number(process.env.G ?? 6);
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
let clock = 0;
const gesture = async (deltas) => {
  clock = Math.max(clock, Date.now() / 1000);
  for (const deltaY of deltas) {
    clock += 0.016;
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 450, deltaX: 0, deltaY, timestamp: clock });
    const ahead = clock * 1000 - Date.now();
    if (ahead > 0) await new Promise((r) => setTimeout(r, ahead));
  }
};
// [project slug, centred card] of the visible strip.
const pos = () =>
  page.evaluate(() => {
    const slides = [...document.querySelectorAll('[aria-roledescription="slide"]')].filter((e) => e.offsetParent);
    const strip = slides[0].parentElement;
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    let best = 0;
    let d = Infinity;
    slides.forEach((el, i) => {
      const di = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (di < d) [d, best] = [di, i];
    });
    return [location.pathname.split("/").pop(), best, slides.length];
  });
const decay = (k) => Array.from({ length: 120 }, (_, i) => Math.round(100 * k ** i)).filter((x) => x > 2);
const shapes = {
  flick: [4, 8, 14, 24, 40, 60, 80, 100, ...decay(0.9)],
  "long inertia tail": [4, 8, 14, 24, 40, 60, 80, 100, ...decay(0.96)],
  "jittery tail": [4, 10, 30, 70, 100, 90, 75, 60, 70, 45, 38, 50, 28, 22, 30, 16, 12, 18, 8, 6, 9, 4, 3],
  "finger drag": Array.from({ length: 70 }, (_, i) => Math.round(30 + 15 * Math.sin(i / 3))),
};
let failed = false;
for (const [label, deltas] of Object.entries(shapes)) {
  await page.goto(`${base}/project/${slug}`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const steps = [];
  for (let k = 0; k < gestures; k++) {
    const [p0, i0, n0] = await pos();
    await gesture(deltas);
    await page.waitForTimeout(700);
    const [p1, i1] = await pos();
    // One card on, or from the last card (the next project's) to card 1 of the next page.
    const ok = p0 === p1 ? i1 === i0 + 1 : i0 === n0 - 1 && i1 === 0;
    if (!ok) failed = true;
    steps.push(`${p1}:${i1}${ok ? "" : " FAIL"}`);
  }
  console.log(`${label}: ${steps.join(" → ")}`);
}
// Two flicks, the second one 600 ms into the first one's inertia tail (a
// quick double swipe): two cards, or the last card and then the hand-off.
{
  await page.goto(`${base}/project/${slug}`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const steps = [];
  for (let k = 0; k < 3; k++) {
    const [p0, i0, n0] = await pos();
    const tail = decay(0.95);
    await gesture([4, 8, 14, 24, 40, 60, 80, 100, ...tail.slice(0, 32), 30, 60, 90, 110, ...decay(0.9)]);
    await page.waitForTimeout(700);
    const [p1, i1] = await pos();
    const ok = p0 === p1 ? i1 === i0 + 2 : i0 >= n0 - 2 && i1 === 0;
    if (!ok) failed = true;
    steps.push(`${p1}:${i1}${ok ? "" : " FAIL"}`);
  }
  console.log(`double swipe: ${steps.join(" → ")}`);
}
// Sideways: the strip scrolls natively, and on its end a NEW sideways swipe
// hands off; the swipe that arrives there and a leftwards one do not.
{
  const send = async (deltaX) => {
    clock = Math.max(clock, Date.now() / 1000) + 0.016;
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 450, deltaX, deltaY: 0, timestamp: clock });
    const ahead = clock * 1000 - Date.now();
    if (ahead > 0) await new Promise((r) => setTimeout(r, ahead));
  };
  const toEnd = () =>
    page.evaluate(() => {
      const strip = document.querySelector('[aria-roledescription="slide"]').parentElement;
      strip.scrollTo({ left: strip.scrollWidth });
    });
  const swipe = shapes.flick;
  const cases = [
    ["fresh sideways swipe at the end", true, async () => { await toEnd(); await page.waitForTimeout(800); for (const v of swipe) await send(v); }],
    ["sideways swipe that arrives at the end", false, async () => { for (const [i, v] of swipe.entries()) { if (i === 6) await toEnd(); await send(v); } }],
    ["leftwards swipe at the end", false, async () => { await toEnd(); await page.waitForTimeout(800); for (const v of swipe) await send(-v); }],
  ];
  for (const [label, leaves, run] of cases) {
    await page.goto(`${base}/project/${slug}`, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    await run();
    await page.waitForTimeout(2500);
    const left = !page.url().endsWith(`/project/${slug}`);
    const ok = left === leaves;
    if (!ok) failed = true;
    console.log(`${label}: ${left ? "handed off" : "stayed"}${ok ? "" : " FAIL"}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
