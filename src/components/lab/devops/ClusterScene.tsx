"use client";

import Stage, { swapText } from "./Stage";

// Cluster review. Measured: most nodes sat at 2–15% CPU and the CI pool was
// idle most hours. The day curve is a shape, not data: it only shows the
// pool following load once it can scale.
const COLS = 6;
const ROWS = 2;
const N = COLS * ROWS;
const TW = 152;
const TH = 112;
const GAP = 16;
const LOAD = [0.15, 0.08, 0.1, 0.35, 0.6, 0.72, 0.85, 0.55, 0.18];
const CURVE = { x: 96, y: 600, w: 1088, h: 180 };
const STEP = 0.5;

const pt = (i: number) => {
  const x = CURVE.x + (i / (LOAD.length - 1)) * CURVE.w;
  const y = CURVE.y + CURVE.h * (1 - LOAD[i]);
  return [x, y] as const;
};
const path = LOAD.map((_, i) => {
  const [x, y] = pt(i);
  if (i === 0) return `M${x} ${y}`;
  const [px, py] = pt(i - 1);
  const cx = (px + x) / 2;
  return `C${cx} ${py} ${cx} ${y} ${x} ${y}`;
}).join(" ");

const active = (load: number) => Math.min(N, Math.max(2, Math.round(load * 14)));

function sweep(tl: gsap.core.Timeline, q: (s: string) => Element[], at: number, after: boolean) {
  const head = q("[data-head]");
  const tiles = q("[data-tile]");
  const fills = q("[data-fill]");
  const count = q("[data-on]")[0];
  tl.fromTo(head, { x: 0, opacity: 1 }, { x: CURVE.w, duration: STEP * (LOAD.length - 1), ease: "none" }, at);
  LOAD.forEach((load, s) => {
    const t = at + s * STEP;
    const on = after ? active(load) : N;
    tiles.forEach((el, i) => {
      const lit = i < on;
      tl.to(el, { opacity: lit ? 1 : 0.28, scale: lit ? 1 : 0.96, duration: 0.3, ease: "site-out" }, t);
    });
    fills.forEach((el, i) => {
      // Before: everything on, CPU stays low. After: fewer machines, each busy.
      const level = after ? (i < on ? Math.min(0.85, (load * N) / on / 1.6 + 0.2) : 0) : 0.02 + load * 0.13 + (i % 3) * 0.01;
      tl.to(el, { scaleY: level, duration: 0.4, ease: "site-out" }, t);
    });
    tl.set(count, { textContent: `${on} of ${N} machines on` }, t);
  });
}

function build(tl: gsap.core.Timeline, q: (s: string) => Element[]) {
  const fade = q("[data-fade]");
  tl.set(q("[data-cap='after']"), { opacity: 0 }, 0);
  tl.set(q("[data-fill]"), { scaleY: 0 }, 0);
  tl.set(q("[data-head]"), { x: 0 }, 0);
  tl.fromTo([...fade, ...q("[data-cap='before']")], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "site-out", stagger: 0.07 }, 0);
  tl.fromTo(q("[data-tile]"), { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, ease: "site-out", stagger: 0.03 }, 0.2);
  tl.fromTo(q("[data-curve]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "site-out" }, 0.3);

  sweep(tl, q, 1.0, false);
  const a = 1.0 + STEP * (LOAD.length - 1) + 0.8;
  swapText(tl, q("[data-cap='before']"), q("[data-cap='after']"), a);
  sweep(tl, q, a + 0.6, true);

  tl.to([...fade, ...q("[data-tile]"), ...q("[data-cap]"), ...q("[data-head]")], { opacity: 0, duration: 0.4, ease: "site-out" }, "+=2.4");
}

export default function ClusterScene() {
  return (
    <Stage build={build} label="Cluster review: machines that sat nearly idle all day, then a pool that scales with the load.">
      <div data-fade style={{ position: "absolute", left: 96, top: 88, fontSize: 44, lineHeight: "52px" }}>
        Machines that follow the load
      </div>
      <div style={{ position: "absolute", left: 96, top: 152, fontSize: 24, lineHeight: "32px", color: "var(--color-secondary)" }}>
        <span data-cap="before" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          Every machine on all day, most of them nearly idle.
        </span>
        <span data-cap="after" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          The pool grows with traffic and shrinks at night.
        </span>
      </div>

      {Array.from({ length: N }, (_, i) => {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        return (
          <div
            key={i}
            data-tile
            style={{
              position: "absolute",
              left: 96 + c * (TW + GAP),
              top: 252 + r * (TH + GAP),
              width: TW,
              height: TH,
              borderRadius: 8,
              background: "#f7f7f7",
              boxShadow: "inset 0 0 0 1px #d6d6d3",
              overflow: "hidden",
            }}
          >
            <div
              data-fill
              style={{ position: "absolute", inset: 0, background: "var(--color-pistachio)", transformOrigin: "50% 100%" }}
            />
          </div>
        );
      })}
      <div data-fade data-on style={{ position: "absolute", left: 96, top: 516, fontSize: 24, lineHeight: "28px" }}>
        12 of 12 machines on
      </div>

      <svg data-fade width={1280} height={960} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={CURVE.x} x2={CURVE.x + CURVE.w} y1={CURVE.y + CURVE.h} y2={CURVE.y + CURVE.h} stroke="#cfcfcb" strokeWidth={2} />
        <path data-curve d={path} fill="none" stroke="#1a1a1a" strokeWidth={3} pathLength={1} strokeDasharray="1 1" />
        {["00", "06", "12", "18", "24"].map((h, i) => (
          <text key={h} x={CURVE.x + (i / 4) * CURVE.w} y={CURVE.y + CURVE.h + 36} fontSize={18} fill="#8f8f8f" textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}>
            {h}
          </text>
        ))}
      </svg>
      <div data-head style={{ position: "absolute", left: CURVE.x - 1, top: CURVE.y - 12, width: 2, height: CURVE.h + 12, background: "#1a1a1a" }} />
    </Stage>
  );
}
