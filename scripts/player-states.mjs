// State sheet: drive /lab/player through every state and screenshot each.
// Usage: node scripts/player-states.mjs [baseUrl] → scripts/out/player-states/*.png
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const out = "scripts/out/player-states";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(`${base}/lab/player`, { waitUntil: "networkidle" });

const alts = await page.locator("header button[aria-pressed]").count();
for (let i = 0; i < Math.min(alts, 6); i++) {
  await page.locator("header button[aria-pressed]").nth(i).click();
  const player = page.locator("[data-player]").first();
  await player.scrollIntoViewIfNeeded();
  const video = player.locator("video");
  await page.waitForFunction((el) => el.readyState >= 2, await video.elementHandle());
  const shot = (name) => player.screenshot({ path: `${out}/${String.fromCharCode(65 + i)}-${name}.png` });

  await page.waitForTimeout(400);
  await shot("playing-muted");
  await player.locator("button").first().click(); // pause
  await page.waitForTimeout(200);
  await shot("paused");
  await player.locator("button").first().hover();
  await shot("hover-play");
  await player.locator("button").first().click(); // play
  const sound = player.locator("button[aria-pressed]").first();
  if (await sound.count()) { await sound.click(); await shot("unmuted"); await sound.click(); }
  await page.evaluate((el) => { el.currentTime = el.duration * 0.6; }, await video.elementHandle());
  await page.waitForTimeout(100);
  await shot("seeked-60");
  const slider = player.locator("[role=slider]");
  if (await slider.count()) { await slider.focus(); await shot("focus-slider"); }
  await page.evaluate((el) => { el.loop = false; el.currentTime = el.duration - 0.05; }, await video.elementHandle());
  await page.waitForTimeout(400);
  await shot("ended");
  await page.evaluate((el) => { el.loop = true; el.currentTime = 0; el.play(); }, await video.elementHandle());
}

// Tap-target audit: every control ≥ 24px, report < 44px.
// The hit box includes a ::before extension (pills grow theirs to 44px).
const small = await page.evaluate(() =>
  [...document.querySelectorAll("[data-player] button, [data-player] [role=slider]")]
    .map((b) => {
      const r = b.getBoundingClientRect();
      let { top, right, bottom, left } = r;
      const cs = getComputedStyle(b, "::before");
      if (cs.content !== "none" && cs.position === "absolute") {
        // offsets are from the padding box, so account for the border
        const s = getComputedStyle(b);
        const bt = parseFloat(s.borderTopWidth), bb = parseFloat(s.borderBottomWidth);
        const bl = parseFloat(s.borderLeftWidth), br = parseFloat(s.borderRightWidth);
        const o = (v) => (v === "auto" ? 0 : parseFloat(v));
        top = Math.min(top, r.top + bt + o(cs.top));
        bottom = Math.max(bottom, r.bottom - bb - o(cs.bottom));
        left = Math.min(left, r.left + bl + o(cs.left));
        right = Math.max(right, r.right - br - o(cs.right));
      }
      return { label: b.getAttribute("aria-label") ?? b.textContent?.trim(), width: right - left, height: bottom - top };
    })
    .filter((r) => r.width < 44 || r.height < 44)
    .map((r) => `${r.label}: ${Math.round(r.width)}×${Math.round(r.height)}`),
);
console.log("controls under 44px:", small.length ? small : "none");

await browser.close();
