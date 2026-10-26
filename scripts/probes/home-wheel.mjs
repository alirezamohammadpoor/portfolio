// Regression probe: one trackpad gesture on the home gallery advances exactly
// one project, on a fresh load, after coming back via the header name, and
// after browser back. Each gesture is a realistic flick: a short ramp up,
// then a decaying inertia tail (the ramp is what re-armed the trigger when
// this last broke). Needs Playwright with Chromium available.
//
//   BASE=http://localhost:3100 node scripts/probes/home-wheel.mjs
//   CHROMIUM=/opt/pw-browsers/chromium node scripts/probes/home-wheel.mjs   # cloud container
import { chromium } from "playwright";

const base = process.env.BASE ?? "https://alirezamp.com";
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const active = () =>
  page.evaluate(() => [...document.querySelectorAll("a[aria-label^='View ']")].findIndex((a) => a.getAttribute("aria-hidden") === "false"));
const flick = async () => {
  for (const dy of [4, 8, 14, 24, 40, 60, 80, 100]) { await page.mouse.wheel(0, dy); await page.waitForTimeout(16); }
  let dy = 100;
  while (dy > 4) { await page.mouse.wheel(0, dy); dy *= 0.9; await page.waitForTimeout(16); }
};
const openActive = async () => {
  const href = await page.evaluate(() => document.querySelector("a[aria-label^='View '][aria-hidden='false']").getAttribute("href"));
  await page.evaluate(() => document.querySelector("a[aria-label^='View '][aria-hidden='false']").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  await page.waitForURL("**" + href);
  await page.waitForTimeout(2500);
};
let failed = false;
const trial = async (label) => {
  await page.mouse.move(1100, 450);
  const n = await page.evaluate(() => document.querySelectorAll("a[aria-label^='View ']").length);
  const steps = [];
  for (let i = 0; i < 3; i++) {
    const before = await active();
    await flick();
    await page.waitForTimeout(1300);
    const after = await active();
    const ok = after === (before + 1) % n;
    if (!ok) failed = true;
    steps.push(`${before}->${after}${ok ? "" : " FAIL"}`);
  }
  console.log(`${label}: ${steps.join("  ")}`);
};

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await trial("fresh home");
await openActive();
await page.click("header a[href='/']");
await page.waitForURL(base + "/");
await page.waitForTimeout(2000);
await trial("after header name");
await openActive();
await page.goBack();
await page.waitForURL(base + "/");
await page.waitForTimeout(2000);
await trial("after browser back");
await browser.close();
console.log(failed ? "FAIL: a gesture advanced more or less than one project" : "OK: one gesture, one project");
process.exit(failed ? 1 : 0);
