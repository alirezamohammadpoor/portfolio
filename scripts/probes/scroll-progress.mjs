// Regression probe: the project page's scroll bar behaves like a scrollbar.
// Each page is loaded, scrolled to the bottom with small wheel steps starting
// while it is still hydrating, and traced every frame. Fails when the page
// jumps back without input (the arrival lock snapping it to the top), when
// the bar stays more than 1 % off the native scroll ratio for longer than a
// re-measure, or when it is full before the bottom. SLOW=1 throttles the
// network with the cache off, like a cold dev server.
//
//   BASE=http://localhost:3100 node scripts/probes/scroll-progress.mjs
//   CHROMIUM=/opt/pw-browsers/chromium SLOW=1 node scripts/probes/scroll-progress.mjs   # cloud container
import { chromium } from "playwright";

const base = process.env.BASE ?? "https://alirezamp.com";
const slugs = ["zone-2", "stronger", "nelson-garden", "paul-and-friends", "deploybar", "sania-d-mina"];
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let failed = false;

for (const slug of slugs) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  if (process.env.SLOW) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.5e6, uploadThroughput: 1e6 });
  }
  await page.goto(`${base}/project/${slug}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__trace = [];
    const tick = () => {
      const fill = [...document.querySelectorAll("div")].find((d) => d.style.getPropertyValue("--p") !== "");
      window.__trace.push({ path: location.pathname, y: scrollY, max: document.documentElement.scrollHeight - innerHeight, p: fill ? +fill.style.getPropertyValue("--p") : null });
      requestAnimationFrame(tick);
    };
    tick();
  });
  await page.mouse.move(700, 450);
  // Stop at the bottom edge: further wheel would pull through to the next project.
  let still = 0;
  let lastY = -1;
  for (let i = 0; i < 1500 && still < 40; i++) {
    await page.mouse.wheel(0, 30);
    await page.waitForTimeout(16);
    const y = await page.evaluate(() => scrollY);
    still = y === lastY ? still + 1 : 0;
    lastY = y;
  }
  await page.waitForTimeout(500);
  const trace = (await page.evaluate(() => window.__trace)).filter((f) => f.path === `/project/${slug}`);

  let jumps = 0;
  let offRun = 0;
  let longestOff = 0;
  let earlyFull = 0;
  for (let i = 1; i < trace.length; i++) {
    const f = trace[i];
    if (f.y < trace[i - 1].y - 2) jumps++;
    if (f.p == null || f.max <= 0) continue;
    const native = Math.min(1, f.y / f.max);
    offRun = Math.abs(f.p - native) > 0.01 ? offRun + 1 : 0;
    longestOff = Math.max(longestOff, offRun);
    if (f.p >= 1 && f.y < f.max - 2) earlyFull++;
  }
  const end = trace.at(-1);
  // A media box settling its ratio moves the page's end; the bar may lag it
  // by the few frames the re-measure takes.
  const ok = jumps === 0 && longestOff <= 6 && earlyFull === 0 && end?.p === 1;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${slug}: jumps back ${jumps}, longest off-native run ${longestOff} frames, full early ${earlyFull}, end ${end?.p}`);
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
