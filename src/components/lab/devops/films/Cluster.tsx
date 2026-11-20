"use client";

import Stage, { Captions, Label, SIZE, T, Text, captionBeats, enter, outro, type Build, type Cut, type Theme } from "../Stage";

// Script film 2. Measured in the cluster review: most production nodes sat
// at 2–15% CPU; CI build machines idle 85% of hours; dev cluster used about
// a quarter of its memory. The day curve is a shape, not data.
const N = 12;
const LOAD = [0.15, 0.08, 0.1, 0.35, 0.6, 0.72, 0.85, 0.55, 0.18];
const HOURS = ["00:00", "06:00", "12:00", "18:00", "24:00"];
const active = (l: number) => Math.min(9, Math.max(3, Math.round(l * 10.6)));

function geo(cut: Cut) {
  const { w } = SIZE[cut];
  const t = T[cut];
  if (cut === "laptop") {
    return { cols: 6, tw: 128, th: 92, gx: 16, gy: 16, tx: t.m, ty: 300, countX: 968, countY: 300, curve: { x: t.m, y: 600, w: w - 2 * t.m, h: 150 }, dayY: 566 };
  }
  return { cols: 4, tw: 210, th: 84, gx: 32, gy: 16, tx: t.m, ty: 480, countX: t.m, countY: 792, curve: { x: t.m, y: 956, w: w - 2 * t.m, h: 110 }, dayY: 906 };
}

function curvePath(c: { x: number; y: number; w: number; h: number }) {
  const pt = (i: number) => [c.x + (i / (LOAD.length - 1)) * c.w, c.y + c.h * (1 - LOAD[i])] as const;
  return LOAD.map((_, i) => {
    const [x, y] = pt(i);
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = pt(i - 1);
    const cx = (px + x) / 2;
    return `C${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }).join(" ");
}

const build: Build = (tl, q, cut) => {
  const g = geo(cut);
  const tiles = q("[data-tile]");
  const fills = q("[data-fill]");
  const head = q("[data-head]");
  const on = q("[data-on]")[0];
  const busy = q("[data-busy]")[0];

  captionBeats(tl, q, [0.2, 1.5, 6.7, 8.2, 14.9]);
  tl.set([...q("[data-ring]"), ...q("[data-fact]"), ...head, ...q("[data-count]")], { opacity: 0 }, 0);
  tl.set(fills, { scaleY: 0 }, 0);
  tl.set(on, { textContent: String(N) }, 0);
  tl.set(busy, { textContent: "2–15% busy" }, 0);

  tl.fromTo(tiles, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, ease: "site-out", stagger: 0.03 }, 0.3);
  enter(tl, q("[data-day]"), 0.5, 0.04);
  tl.fromTo(q("[data-curve]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "site-out" }, 0.6);

  const sweep = (at: number, dur: number, after: boolean) => {
    tl.fromTo(head, { x: 0, opacity: 1 }, { x: g.curve.w, duration: dur, ease: "none" }, at);
    const step = dur / (LOAD.length - 1);
    LOAD.forEach((load, s) => {
      const t = at + s * step;
      const n = after ? active(load) : N;
      tiles.forEach((el, i) => {
        tl.to(el, { opacity: i < n ? 1 : 0.22, scale: i < n ? 1 : 0.96, duration: 0.35, ease: "site-out" }, t);
      });
      fills.forEach((el, i) => {
        // Before: all on, each 2–15% busy. After: fewer on, each 50–70%.
        const level = after ? (i < n ? 0.5 + ((i * 7 + s) % 5) * 0.05 : 0) : 0.02 + load * 0.1 + (i % 3) * 0.01;
        tl.to(el, { scaleY: level, duration: 0.45, ease: "site-out" }, t);
      });
      tl.set(on, { textContent: String(n) }, t);
    });
  };

  // Before: one day, everything on.
  enter(tl, q("[data-count]"), 1.6);
  sweep(1.7, 5, false);

  // The thin fills, ringed.
  tl.fromTo(q("[data-ring]"), { opacity: 0, scale: 1.02 }, { opacity: 1, scale: 1, duration: 0.4, ease: "site-out" }, 6.8);
  tl.to(q("[data-ring]"), { opacity: 0, duration: 0.3, ease: "site-out" }, 8.0);

  // After (proposed): the same day, slower, the pool following the curve.
  tl.to(head, { opacity: 0, duration: 0.2 }, 8.0);
  tl.to(busy, { opacity: 0, duration: 0.2 }, 8.2);
  tl.set(busy, { textContent: "50–70% busy" }, 8.4);
  tl.to(busy, { opacity: 1, duration: 0.3 }, 8.45);
  sweep(8.4, 6.5, true);

  // The two facts take the counter's place, one at a time, where the eye is.
  const facts = q("[data-fact]");
  tl.to(q("[data-count]"), { opacity: 0, duration: 0.3, ease: "site-out" }, 15.0);
  tl.fromTo(facts[0], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "site-out" }, 15.3);
  tl.to(facts[0], { opacity: 0, duration: 0.3, ease: "site-out" }, 17.6);
  tl.fromTo(facts[1], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "site-out" }, 17.9);
  outro(tl, q, 20.2);
};

export default function Cluster({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  const rows = Math.ceil(N / g.cols);
  return (
    <Stage
      cut={cut}
      theme={theme}
      build={build}
      name="Cloud cluster"
      headline={"Machines that\nfollow the load"}
      label="Cluster film: production machines sat 2–15% busy all day; a pool that scales would follow traffic, from 3 machines at night to 9 at the peak. Proposed."
    >
      <Captions
        lines={[
          "One day of traffic on the production cluster.",
          "Before: every machine on, all day, mostly idle.",
          "Paid for all day, used for a fraction of it.",
          "Proposed: the pool grows with traffic and shrinks at night.",
          "The same idea fits CI and dev machines. Proposed.",
        ]}
      />
      {Array.from({ length: N }, (_, i) => (
        <div
          key={i}
          data-tile
          style={{
            position: "absolute",
            left: g.tx + (i % g.cols) * (g.tw + g.gx),
            top: g.ty + Math.floor(i / g.cols) * (g.th + g.gy),
            width: g.tw,
            height: g.th,
            boxShadow: "inset 0 0 0 1.5px var(--line)",
            overflow: "hidden",
          }}
        >
          <div data-fill style={{ position: "absolute", inset: 0, background: "var(--accent)", transformOrigin: "50% 100%" }} />
        </div>
      ))}
      <div
        data-ring
        style={{
          position: "absolute",
          left: g.tx - 12,
          top: g.ty - 12,
          width: g.cols * (g.tw + g.gx) - g.gx + 24,
          height: rows * (g.th + g.gy) - g.gy + 24,
          boxShadow: "inset 0 0 0 2px var(--ink)",
        }}
      />
      <div data-count style={{ position: "absolute", left: g.countX, top: g.countY, width: cut === "laptop" ? w - g.countX - t.m : w - 2 * t.m, display: "flex", flexDirection: cut === "laptop" ? "column" : "row", gap: cut === "laptop" ? 6 : 24, alignItems: cut === "laptop" ? "flex-start" : "baseline" }}>
        <span style={{ fontSize: t.head, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          <span data-on>12</span>
        </span>
        <span style={{ fontSize: t.fact }}>machines on</span>
        <span data-busy style={{ fontSize: t.fact, color: "var(--muted)", marginTop: cut === "laptop" ? 34 : 0 }}>
          2–15% busy
        </span>
      </div>

      <Label data-day x={g.curve.x} y={g.dayY}>
        Time of day
      </Label>
      <svg data-day width={w} height={SIZE[cut].h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={g.curve.x} x2={g.curve.x + g.curve.w} y1={g.curve.y + g.curve.h} y2={g.curve.y + g.curve.h} stroke="var(--line)" strokeWidth={2} />
        <path data-curve d={curvePath(g.curve)} fill="none" stroke="var(--ink)" strokeWidth={cut === "laptop" ? 2.5 : 4} pathLength={1} strokeDasharray="1 1" />
        {HOURS.map((h, i) => (
          <text
            key={h}
            x={g.curve.x + (i / (HOURS.length - 1)) * g.curve.w}
            y={g.curve.y + g.curve.h + t.small + 12}
            fontSize={t.small}
            fill="var(--muted)"
            textAnchor={i === 0 ? "start" : i === HOURS.length - 1 ? "end" : "middle"}
          >
            {h}
          </text>
        ))}
      </svg>
      <div data-head style={{ position: "absolute", left: g.curve.x - 1, top: g.curve.y - 16, width: 2, height: g.curve.h + 16, background: "var(--ink)" }} />

      <Text data-fact x={g.countX} y={g.countY} w={cut === "laptop" ? w - g.countX - t.m : w - 2 * t.m}>
        CI build machines sit idle 85% of hours. They could start from zero. Proposed.
      </Text>
      <Text data-fact x={g.countX} y={g.countY} w={cut === "laptop" ? w - g.countX - t.m : w - 2 * t.m}>
        The dev cluster uses about a quarter of its memory. Proposed.
      </Text>
    </Stage>
  );
}
