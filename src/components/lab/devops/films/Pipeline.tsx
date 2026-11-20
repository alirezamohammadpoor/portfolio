"use client";

import Stage, { Label, SIZE, T, Text, count, enter, outro, useCut, type Build, type Cut, type Theme } from "../Stage";

// Film 1, v3 (Ali 11-20: one thing at a time, words at the action).
// Measured: push to review 26 → 18 min (estimate, 604 pipelines), test job
// 8.1 → 5.2 min (proof run), jobs lost waiting 59 → 17 (90 days replayed).
// The other segment lengths are drawn to fit those totals.
const BEFORE = [
  { name: "Waiting", min: 5, striped: true },
  { name: "Build", min: 7 },
  { name: "Tests", min: 8.1 },
  { name: "Deploy", min: 5.9 },
];
const AFTER = [
  { name: "", min: 0.6, striped: true },
  { name: "Build", min: 6.4 },
  { name: "Tests", min: 5.2 },
  { name: "Deploy", min: 5.8 },
];
const AXIS = 30;
const TICKS = [0, 10, 20, 30];
const CHANGED = new Set([2, 9, 13]);

const SAY = [
  "Before: jobs wait for a free machine, then every package is tested.",
  "Every change tested all 16 packages.",
  "Now only the 3 it touches. Test job 8 → 5 min.",
  "After: no queue, fewer tests, the review app deploys itself.",
  "Jobs lost waiting for a machine: 59 → 17 over 90 days.",
];

function geo(cut: Cut) {
  const t = T[cut];
  const { w } = SIZE[cut];
  const x = t.m;
  const len = w - 2 * t.m;
  if (cut === "laptop") {
    return { x, len, axisY: 330, beforeY: 400, afterY: 520, barH: 64, labelGap: 26, sayY: 640, tile: 92, tileGap: 14, gridY: 330 };
  }
  return { x, len, axisY: 520, beforeY: 640, afterY: 840, barH: 96, labelGap: 40, sayY: 1000, tile: 140, tileGap: 20, gridY: 470 };
}

const build: Build = (tl, q, cut, c) => {
  const g = geo(cut);
  const scene = q("[data-scene]");
  const beforeRow = q("[data-before]");
  const afterRow = q("[data-after]");
  const bFill = q("[data-bfill]")[0];
  const aFill = q("[data-afill]")[0];
  const bSegs = q("[data-bseg]");
  const tiles = q("[data-pkg]");
  const says = q("[data-say]");
  const bClock = q("[data-bclock]")[0];
  const aClock = q("[data-aclock]")[0];

  tl.set([...scene, ...beforeRow, ...afterRow, ...tiles, ...says], { opacity: 0 }, 0);
  tl.set([bFill, aFill], { clipPath: "inset(0% 100% 0% 0%)" }, 0);
  tl.set(bSegs, { opacity: 1 }, 0);
  tl.set([bClock, aClock], { textContent: "0" }, 0);

  const say = (i: number, at: number, until: number) => {
    tl.fromTo(says[i], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "site-out" }, at);
    tl.to(says[i], { opacity: 0, duration: 0.3, ease: "site-out" }, until);
  };

  // Before: the bar fills like a clock.
  enter(tl, scene, 0.3);
  enter(tl, beforeRow, 0.6);
  tl.to(bFill, { clipPath: "inset(0% 0% 0% 0%)", duration: 4.4, ease: "none" }, 1.0);
  count(tl, bClock, 0, 26, 1.0, 4.4);
  // The clock rides the fill's edge.
  const unit = g.len / AXIS;
  tl.fromTo(bClock.parentElement, { x: -26 * unit }, { x: 0, duration: 4.4, ease: "none" }, 1.0);
  say(0, 1.0, 5.6);

  // Tests is the part that changed: light it, then open it up.
  tl.to(bSegs.filter((_, i) => BEFORE[i].name !== "Tests"), { opacity: 0.2, duration: 0.4, ease: "site-out" }, 5.6);
  tl.to([...scene, ...beforeRow], { opacity: 0, duration: 0.4, ease: "site-out" }, 6.6);
  tl.fromTo(tiles, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: "site-out", stagger: 0.03 }, 7.0);
  say(1, 7.2, 9.4);
  // Untouched packages empty to hairlines; the 3 it touches stay solid.
  const tileFills = q("[data-pkgfill]");
  tl.set(tileFills, { opacity: 1 }, 0);
  tl.to(tileFills.filter((_, i) => !CHANGED.has(i)), { opacity: 0, duration: 0.4, ease: "site-out", stagger: 0.05 }, 9.6);
  say(2, 10.0, 12.4);
  tl.to(tiles, { opacity: 0, duration: 0.4, ease: "site-out" }, 12.6);

  // After: the before bar comes back as hairlines, the after bar fills
  // solid under it.
  tl.set(bSegs, { opacity: 1 }, 12.9);
  bSegs.forEach((el, i) => {
    if (BEFORE[i].striped) return;
    tl.set(el, { backgroundColor: "transparent", color: c.ink, boxShadow: `inset 0 0 0 1px ${c.line}, inset -3px 0 0 ${c.bg}` }, 12.9);
  });
  tl.to(scene, { opacity: 1, duration: 0.45, ease: "site-out" }, 13.0);
  tl.to(beforeRow, { opacity: 1, duration: 0.45, ease: "site-out" }, 13.0);
  enter(tl, afterRow, 13.3);
  tl.to(aFill, { clipPath: "inset(0% 0% 0% 0%)", duration: 3.0, ease: "none" }, 13.8);
  count(tl, aClock, 0, 18, 13.8, 3.0);
  tl.fromTo(aClock.parentElement, { x: -18 * unit }, { x: 0, duration: 3.0, ease: "none" }, 13.8);
  say(3, 13.8, 17.6);
  say(4, 17.9, 21.0);
  outro(tl, q, 21.0);
};

function Bar({ segs, y, h, fill, seg, tone = "ink" }: { segs: typeof BEFORE; y: number; h: number; fill: string; seg?: string; tone?: "ink" | "accent" }) {
  const cut = useCut();
  const g = geo(cut);
  const t = T[cut];
  const unit = g.len / AXIS;
  const lefts = segs.map((_, i) => segs.slice(0, i).reduce((a, s) => a + s.min, 0) * unit);
  return (
    <div {...{ [fill]: true }} style={{ position: "absolute", left: g.x, top: y, width: segs.reduce((a, s) => a + s.min, 0) * unit, height: h }}>
      {segs.map((s, i) => {
        const left = lefts[i];
        return (
          <div
            key={i}
            {...(seg ? { [seg]: true } : {})}
            style={{
              position: "absolute",
              left,
              top: 0,
              width: s.min * unit,
              height: h,
              // Waiting is an outline; work is solid (pistachio on the after bar).
              background: s.striped ? "transparent" : tone === "accent" ? "var(--accent)" : "var(--ink)",
              boxShadow: s.striped ? "inset 0 0 0 1px var(--line), inset -3px 0 0 var(--bg)" : "inset -3px 0 0 var(--bg)",
              color: tone === "accent" ? "var(--accent-ink)" : "var(--bg)",
              display: "flex",
              alignItems: "center",
              paddingLeft: cut === "laptop" ? 12 : 16,
              fontSize: t.label,
              fontWeight: 650,
              textTransform: "uppercase",
              letterSpacing: 0,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {s.min >= 2 && !s.striped ? s.name : null}
          </div>
        );
      })}
    </div>
  );
}

export default function Pipeline({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  const unit = g.len / AXIS;
  const grid = 4 * g.tile + 3 * g.tileGap;
  const clock = (y: number, min: number, attr: string) => (
    <Text {...{ [attr === "data-bclock" ? "data-before" : "data-after"]: true }} x={g.x + min * unit + 16} y={y + g.barH / 2 - t.fact * 0.6} w={200} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span {...{ [attr]: true }}>0</span> min
    </Text>
  );
  return (
    <Stage cut={cut} theme={theme} build={build} name="Pipeline" headline={"Push to\nreview app"} label="Pipeline film: before, 26 minutes from push to a review app, every package tested; after, 18 minutes, only the 3 changed packages tested.">
      {/* Axis, minutes. */}
      <div data-scene style={{ position: "absolute", left: g.x, top: g.axisY, width: g.len, height: 2, background: "var(--line)" }} />
      {TICKS.map((m, i) => (
        <Text key={m} data-scene x={g.x + m * unit - (i === TICKS.length - 1 ? 200 : i === 0 ? 0 : 100)} y={g.axisY + 10} w={200} size="small" style={{ color: "var(--muted)", textAlign: i === TICKS.length - 1 ? "right" : i === 0 ? "left" : "center" }}>
          {m} min
        </Text>
      ))}

      <Label data-before x={g.x} y={g.beforeY - g.labelGap}>
        Before
      </Label>
      <div data-before>
        <Bar segs={BEFORE} y={g.beforeY} h={g.barH} fill="data-bfill" seg="data-bseg" />
      </div>
      {clock(g.beforeY, 26, "data-bclock")}

      <Label data-after x={g.x} y={g.afterY - g.labelGap}>
        After
      </Label>
      <div data-after>
        <Bar segs={AFTER} y={g.afterY} h={g.barH} fill="data-afill" tone="accent" />
      </div>
      {clock(g.afterY, 18, "data-aclock")}

      {/* The Tests scene: 16 packages, 3 changed. */}
      {Array.from({ length: 16 }, (_, i) => (
        <div
          key={i}
          data-pkg
          style={{ position: "absolute", left: (w - grid) / 2 + (i % 4) * (g.tile + g.tileGap), top: g.gridY + Math.floor(i / 4) * (g.tile + g.tileGap), width: g.tile, height: g.tile, background: CHANGED.has(i) ? "var(--accent)" : "transparent", boxShadow: "inset 0 0 0 1px var(--line)" }}
        >
          <div data-pkgfill style={{ position: "absolute", inset: 0, background: "var(--ink)" }} />
        </div>
      ))}

      {SAY.map((s, i) => (
        <Text key={i} data-say x={g.x} y={i === 1 || i === 2 ? g.gridY + grid + (cut === "laptop" ? 36 : 48) : g.sayY} w={g.len} style={{ textAlign: i === 1 || i === 2 ? "center" : "left" }}>
          {s}
        </Text>
      ))}
    </Stage>
  );
}
