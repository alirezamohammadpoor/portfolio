"use client";

import type gsap from "gsap";
import Stage, { SIZE, T, Text, count, enter, outro, type Build, type Cut, type Theme } from "../Stage";

// Three mocks for the load film (Ali 11-20). Only the total is a fact:
// about a third fewer API requests (in review). How the third splits
// between the three fixes is drawn, not measured.
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
        About a third fewer. In review.
      </Text>
    </>
  );
}

/* A: 100 dots, the groups leave one at a time. */

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
  tl.fromTo(dots, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "site-out", stagger: 0.006 }, 0.3);
  FIXES.forEach((_, k) => {
    const at = FIRST + k * BEAT;
    const mine = dots.filter((_, i) => GROUP[i] === k);
    const mineFills = fills.filter((_, i) => GROUP[i] === k);
    // Mark the group, hold, then it leaves.
    tl.to(mineFills, { opacity: 0, duration: 0.35, ease: "site-out", stagger: 0.015 }, at);
    tl.to(mine, { opacity: 0, y: g.dot, duration: 0.5, ease: "site-out", stagger: 0.02 }, at + 1.4);
  });
  fixLines(tl, q);
  total(tl, q);
};

function LoadA({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geoA(cut);
  return (
    <Stage cut={cut} theme={theme} build={buildA} name="Load A" headline={HEAD} label="Load mock A: 100 requests as dots; three groups leave one at a time and 67 stay.">
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

/* B: one stream into the API, each fix thins it. */

// 37 is coprime with 100, so this spreads every kind through the stream.
const KIND_CYCLE = Array.from({ length: 100 }, (_, i) => GROUP[(i * 37) % 100]);
const STREAM = Array.from({ length: 140 }, (_, i) => ({ t: 0.3 + i * 0.085, band: ((i * 37) % 11) / 10, kind: KIND_CYCLE[i % 100] }));
const TRAVEL = 1.8;

function geoB(cut: Cut) {
  if (cut === "laptop") return { x0: 80, x1: 960, y: 420, band: 160, dot: 12, box: { x: 960, y: 380, w: 240, h: 240 }, textX: 80, textY: 640, textW: 820, countY: 700 };
  return { x0: 72, x1: 760, y: 640, band: 260, dot: 20, box: { x: 760, y: 600, w: 248, h: 340 }, textX: 72, textY: 1000, textW: 936, countY: 1070 };
}

const buildB: Build = (tl, q, cut) => {
  const g = geoB(cut);
  const dots = q("[data-sdot]");
  const fills = q("[data-sfill]");
  tl.set(dots, { opacity: 0, x: 0 }, 0);
  tl.set(fills, { opacity: 1 }, 0);
  enter(tl, q("[data-api]"), 0.2);
  const full = g.x1 - g.x0 - g.dot;
  dots.forEach((el, i) => {
    const s = STREAM[i];
    const fixAt = s.kind >= 0 ? FIRST + s.kind * BEAT : Infinity;
    if (s.t >= fixAt) return; // never sent once its fix is in
    tl.to(el, { opacity: 1, duration: 0.1 }, s.t);
    const end = s.t + TRAVEL;
    if (end > fixAt) {
      // In flight when the fix lands: shown hollow, then gone.
      tl.to(el, { x: ((fixAt + 1.4 - s.t) / TRAVEL) * full, duration: fixAt + 1.4 - s.t, ease: "none" }, s.t);
      tl.to(fills[i], { opacity: 0, duration: 0.3, ease: "site-out" }, fixAt);
      tl.to(el, { opacity: 0, duration: 0.4, ease: "site-out" }, fixAt + 1.4);
      return;
    }
    tl.to(el, { x: full, duration: TRAVEL, ease: "none" }, s.t);
    tl.to(el, { opacity: 0, duration: 0.1 }, end - 0.1);
  });
  fixLines(tl, q);
  total(tl, q);
};

function LoadB({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geoB(cut);
  const t = T[cut];
  return (
    <Stage cut={cut} theme={theme} build={buildB} name="Load B" headline={HEAD} label="Load mock B: one stream of requests into the API thins as each fix lands, to about two thirds.">
      {STREAM.map((s, i) => (
        <div
          key={i}
          data-sdot
          style={{ position: "absolute", left: g.x0, top: g.y + s.band * g.band - g.dot / 2, width: g.dot, height: g.dot, borderRadius: 999, boxShadow: "inset 0 0 0 2px var(--ink)" }}
        >
          <div data-sfill style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--ink)" }} />
        </div>
      ))}
      <div data-api style={{ position: "absolute", left: g.box.x, top: g.box.y, width: g.box.w, height: g.box.h, background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: t.fact, fontWeight: 650 }}>
        API
      </div>
      <Lines x={g.textX} y={g.textY} w={g.textW} />
      <Count x={g.textX} y={g.countY} w={g.textW} unit="%" />
    </Stage>
  );
}

/* C: one bar of all requests, the kinds slide off its end. */

function geoC(cut: Cut) {
  const t = T[cut];
  const { w } = SIZE[cut];
  if (cut === "laptop") return { vertical: false, x: t.m, y: 420, len: w - 2 * t.m, thick: 120, textX: t.m, textY: 580, textW: w - 2 * t.m, countY: 640 };
  return { vertical: true, x: 380, y: 480, len: 620, thick: 320, textX: t.m, textY: 1130, textW: w - 2 * t.m, countY: 1190 };
}

const buildC: Build = (tl, q, cut) => {
  const g = geoC(cut);
  const segs = q("[data-seg]");
  tl.set(segs, { opacity: 0, x: 0, y: 0 }, 0);
  tl.fromTo(segs, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "site-out", stagger: 0.08 }, 0.3);
  enter(tl, q("[data-frame]"), 0.3);
  FIXES.forEach((_, k) => {
    const at = FIRST + k * BEAT;
    const el = segs[1 + k];
    tl.to(el, { opacity: 0.35, duration: 0.35, ease: "site-out" }, at);
    tl.to(el, { ...(g.vertical ? { x: 120 } : { y: 90 }), opacity: 0, duration: 0.7, ease: "site-in-out" }, at + 1.4);
  });
  fixLines(tl, q);
  total(tl, q);
};

function LoadC({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geoC(cut);
  const unit = g.len / 100;
  // Page data first, then the fixes from the far end inwards, so each
  // removal shortens the bar from its end.
  const order = [KEEP, FIXES[2].size, FIXES[1].size, FIXES[0].size];
  const shades = [100, 70, 50, 30];
  let at = 0;
  const boxes = order.map((u) => {
    const o = at;
    at += u;
    return g.vertical ? { left: g.x, top: g.y + o * unit, width: g.thick, height: u * unit } : { left: g.x + o * unit, top: g.y, width: u * unit, height: g.thick };
  });
  // data-seg order: keep, then fix 0, 1, 2.
  const byFix = [0, 3, 2, 1];
  return (
    <Stage cut={cut} theme={theme} build={buildC} name="Load C" headline={HEAD} label="Load mock C: one bar of all API requests; three kinds slide off it, leaving about two thirds.">
      <div data-frame style={{ position: "absolute", ...(g.vertical ? { left: g.x, top: g.y, width: g.thick, height: g.len } : { left: g.x, top: g.y, width: g.len, height: g.thick }), boxShadow: "inset 0 0 0 1.5px var(--line)" }} />
      {byFix.map((b, i) => (
        <div key={i} data-seg style={{ position: "absolute", ...boxes[b], background: `color-mix(in srgb, var(--ink) ${shades[b]}%, var(--bg))`, boxShadow: g.vertical ? "inset 0 -3px 0 var(--bg)" : "inset -3px 0 0 var(--bg)" }} />
      ))}
      <Lines x={g.textX} y={g.textY} w={g.textW} />
      <Count x={g.textX} y={g.countY} w={g.textW} unit="%" />
    </Stage>
  );
}

export { LoadA, LoadB, LoadC };
