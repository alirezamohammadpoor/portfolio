"use client";

import type gsap from "gsap";
import Stage, { SIZE, T, Text, count, enter, outro, type Build, type Cut, type Theme } from "../Stage";

// Film 4, v4 (Ali 11-20 picked the 100 dots). About a third fewer API
// requests. The split is the inventory's estimate from usage:
// of about 149M requests a month, junk paths -33M, preflight -10 to -14M,
// review widget -3 to -4.5M.
const FIXES = [
  { size: 22, line: "Asset and junk paths skip the lookup." },
  { size: 8, line: "Browsers keep the preflight answer." },
  { size: 3, line: "Review widgets read from cache." },
];
const KEEP = 100 - FIXES.reduce((s, f) => s + f.size, 0);
const BEAT = 3.2;
const FIRST = 2.4;
const HEAD = "A third fewer\nAPI requests";

type Q = (s: string) => Element[];

/** The fix lines: one shows at a time, at the action. */
function fixLines(tl: gsap.core.Timeline, q: Q) {
  const lines = q("[data-fix]");
  tl.set(lines, { opacity: 0 }, 0);
  lines.forEach((el, k) => {
    const at = FIRST + k * BEAT;
    tl.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "site-out" }, at);
    tl.to(el, { opacity: 0, duration: 0.3, ease: "site-out" }, at + BEAT - 0.5);
  });
}

/** Counter that steps down as each fix lands, then the closing line. */
function total(tl: gsap.core.Timeline, q: Q) {
  const n = q("[data-total]")[0];
  tl.set(n, { textContent: "100" }, 0);
  tl.set(q("[data-end]"), { opacity: 0 }, 0);
  enter(tl, q("[data-count]"), 1.2);
  let left = 100;
  FIXES.forEach((f, k) => {
    count(tl, n, left, left - f.size, FIRST + k * BEAT + 1.4, 0.7, "site-out");
    left -= f.size;
  });
  enter(tl, q("[data-end]"), FIRST + FIXES.length * BEAT + 0.2);
  outro(tl, q, FIRST + FIXES.length * BEAT + 2.8);
}

function Count({ x, y, w, unit, align = "left" }: { x: number; y: number; w: number; unit: string; align?: "left" | "center" }) {
  return (
    <>
      <Text data-count x={x} y={y} w={w} style={{ textAlign: align, fontVariantNumeric: "tabular-nums" }}>
        <span data-total>100</span>
        {unit} {unit ? "of requests reach the API" : "requests reach the API"}
      </Text>
    </>
  );
}

function Lines({ x, y, w, align = "left" }: { x: number; y: number; w: number; align?: "left" | "center" }) {
  return (
    <>
      {FIXES.map((f) => (
        <Text key={f.line} data-fix x={x} y={y} w={w} size="small" style={{ textAlign: align }}>
          {f.line}
        </Text>
      ))}
      <Text data-end x={x} y={y} w={w} size="small" style={{ textAlign: align, color: "var(--muted)" }}>
        About a third fewer.
      </Text>
    </>
  );
}

/* 100 dots, the groups leave one at a time. */

// Which fix each dot belongs to: the first fix takes the bottom rows, the
// next the dots above them, so the grid empties from the bottom up.
const GROUP = Array.from({ length: 100 }, (_, i) => {
  let edge = 100;
  for (let k = 0; k < FIXES.length; k++) {
    edge -= FIXES[k].size;
    if (i >= edge) return k;
  }
  return -1;
});

function geoA(cut: Cut) {
  const { w } = SIZE[cut];
  if (cut === "laptop") {
    const dot = 22, gap = 14, side = 10 * (dot + gap) - gap;
    return { dot, gap, x: 200, y: 300, side, textX: 200 + side + 64, textW: w - (200 + side + 64) - 80, textY: 300 + side - 120, countY: 300 + side - 60, align: "left" as const };
  }
  const dot = 40, gap = 22, side = 10 * (dot + gap) - gap;
  return { dot, gap, x: (w - side) / 2, y: 460, side, textX: 72, textW: w - 144, textY: 460 + side + 50, countY: 460 + side + 110, align: "center" as const };
}

const buildA: Build = (tl, q, cut) => {
  const g = geoA(cut);
  const dots = q("[data-dot]");
  const fills = q("[data-dfill]");
  tl.set(dots, { opacity: 0, y: 0 }, 0);
  tl.set(fills, { opacity: 1 }, 0);
  // A diagonal wave from the top left, gaps shrinking as it goes.
  tl.fromTo(dots, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5, ease: "site-out", stagger: { grid: [10, 10], from: "start", amount: 0.6, ease: "power2.out" } }, 0.3);
  FIXES.forEach((_, k) => {
    const at = FIRST + k * BEAT;
    const mine = dots.filter((_, i) => GROUP[i] === k);
    const mineFills = fills.filter((_, i) => GROUP[i] === k);
    // Mark the group (it empties to rings), hold, then it leaves.
    tl.to(mineFills, { opacity: 0, duration: 0.35, ease: "site-out", stagger: 0.015 }, at);
    tl.to(mine, { opacity: 0, y: g.dot, duration: 0.5, ease: "site-out", stagger: 0.02 }, at + 1.4);
  });
  fixLines(tl, q);
  total(tl, q);
};

function LoadA({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geoA(cut);
  return (
    <Stage cut={cut} theme={theme} build={buildA} name="Load" headline={HEAD} label="Load film: 100 requests as dots; three groups leave one at a time and 67 stay.">
      {GROUP.map((_, i) => (
        <div
          key={i}
          data-dot
          style={{ position: "absolute", left: g.x + (i % 10) * (g.dot + g.gap), top: g.y + Math.floor(i / 10) * (g.dot + g.gap), width: g.dot, height: g.dot, borderRadius: 999, boxShadow: "inset 0 0 0 2px var(--ink)" }}
        >
          <div data-dfill style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--ink)" }} />
        </div>
      ))}
      <Lines x={g.textX} y={g.textY} w={g.textW} align={g.align} />
      <Count x={g.textX} y={g.countY} w={g.textW} unit="" align={g.align} />
    </Stage>
  );
}

export default LoadA;
