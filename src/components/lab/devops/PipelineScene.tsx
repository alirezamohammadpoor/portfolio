"use client";

import Stage, { swapText } from "./Stage";

// Push to review app. Measured: the test job 8.1 → 5.2 min on a proof run,
// push to review 26 → 18 min (estimate). The other segment lengths only
// fill the bar to those totals; they carry no claim of their own.
const PX_PER_MIN = 34;
const X0 = 240;
type Seg = { key: string; name: string; min: number; tone: "wait" | "plain" | "test" };
const BEFORE: Seg[] = [
  { key: "w", name: "Waiting", min: 5, tone: "wait" },
  { key: "b", name: "Build", min: 7, tone: "plain" },
  { key: "t", name: "Tests 8 min", min: 8.1, tone: "test" },
  { key: "d", name: "Deploy", min: 5.9, tone: "plain" },
];
const AFTER: Seg[] = [
  { key: "w", name: "", min: 1, tone: "wait" },
  { key: "b", name: "Build", min: 6, tone: "plain" },
  { key: "t", name: "Tests 5 min", min: 5.2, tone: "test" },
  { key: "d", name: "Deploy", min: 5.8, tone: "plain" },
];
const PACKAGES = 16;
const CHANGED = new Set([2, 9, 13]);

const tone = {
  wait: { background: "repeating-linear-gradient(135deg,#d9d9d6 0 6px,#e8e8e5 6px 12px)", color: "#6f6f6c" },
  plain: { background: "#cfcfcb", color: "#1a1a1a" },
  test: { background: "var(--color-pistachio)", color: "#1a1a1a" },
};

function Lane({ id, y, segs }: { id: string; y: number; segs: Seg[] }) {
  const total = segs.reduce((s, g) => s + g.min, 0);
  const lefts = segs.map((_, i) => X0 + segs.slice(0, i).reduce((s, g) => s + g.min * PX_PER_MIN, 0));
  const end = X0 + total * PX_PER_MIN;
  return (
    <>
      <div data-lane-label={id} style={{ position: "absolute", left: 96, top: y + 14, fontSize: 24, lineHeight: "28px" }}>
        {id === "before" ? "Before" : "After"}
      </div>
      {segs.map((g, i) => {
        const w = g.min * PX_PER_MIN;
        const x = lefts[i];
        return (
          <div
            key={g.key}
            data-seg={id}
            data-min={g.min}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: w - 4,
              height: 56,
              borderRadius: 6,
              transformOrigin: "0 50%",
              display: "flex",
              alignItems: "center",
              paddingLeft: 14,
              fontSize: 18,
              whiteSpace: "nowrap",
              overflow: "hidden",
              ...tone[g.tone],
            }}
          >
            {g.name}
          </div>
        );
      })}
      <div data-total={id} style={{ position: "absolute", left: end + 12, top: y + 14, fontSize: 24, lineHeight: "28px" }}>
        {Math.round(total)} min
      </div>
    </>
  );
}

function build(tl: gsap.core.Timeline, q: (s: string) => Element[]) {
  const all = q("[data-fade]");
  tl.fromTo(all, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "site-out", stagger: 0.07 }, 0);
  tl.set(q("[data-cap='after']"), { opacity: 0 }, 0);
  tl.set([...q("[data-seg]"), ...q("[data-total]"), ...q("[data-lane-label='after']"), ...q("[data-pill]"), ...q("[data-cursor]")], { opacity: 0 }, 0);
  tl.set(q("[data-pkg]"), { backgroundColor: "#dcdcd8" }, 0);
  tl.set([...q("[data-count='after']"), ...q("[data-pill-done]")], { opacity: 0 }, 0);
  tl.fromTo([...q("[data-cap='before']"), ...q("[data-count='before']")], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "site-out", stagger: 0.07 }, 0.14);

  // Before: time passes left to right (linear: it is a clock, not UI).
  const grow = (lane: string, at: number, secPerMin: number) => {
    let t = at;
    q(`[data-seg='${lane}']`).forEach((el) => {
      const d = Number((el as HTMLElement).dataset.min) * secPerMin;
      tl.fromTo(el, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: d, ease: "none" }, t);
      t += d;
    });
    tl.fromTo(q(`[data-total='${lane}']`), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.4, ease: "site-out" }, t);
    return t;
  };
  const beforeEnd = grow("before", 0.6, 0.1);
  // Every package is tested while the test segment runs.
  tl.to(q("[data-pkg]"), { backgroundColor: "#1a1a1a", duration: 0.2, ease: "site-out", stagger: 0.045 }, 0.6 + 1.2);

  // After.
  const a = beforeEnd + 0.8;
  swapText(tl, q("[data-cap='before']"), q("[data-cap='after']"), a);
  swapText(tl, q("[data-count='before']"), q("[data-count='after']"), a);
  q("[data-pkg]").forEach((el, i) => {
    tl.to(el, { backgroundColor: CHANGED.has(i) ? "#bedcaa" : "#dcdcd8", duration: 0.4, ease: "site-out" }, a + 0.1);
  });
  tl.fromTo(q("[data-lane-label='after']"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "site-out" }, a + 0.3);
  const afterEnd = grow("after", a + 0.6, 0.07);

  // The review app is one click away once the deploy lands.
  const pill = q("[data-pill]");
  const cursor = q("[data-cursor]");
  tl.fromTo(pill, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.3, ease: "site-out" }, afterEnd + 0.2);
  tl.fromTo(cursor, { opacity: 0, x: 120, y: 80 }, { opacity: 1, x: 0, y: 0, duration: 0.8, ease: "site-in-out" }, afterEnd + 0.4);
  tl.to(pill, { scale: 0.97, duration: 0.1, ease: "site-out" }, ">");
  tl.to(pill, { scale: 1, backgroundColor: "#1a1a1a", color: "#f7f7f7", duration: 0.24, ease: "site-out" }, ">");
  tl.to(q("[data-pill-label]"), { opacity: 0, duration: 0.12 }, "<");
  tl.fromTo(q("[data-pill-done]"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, ">-0.05");

  // Hold, then clear the stage so the loop starts clean.
  tl.to([...all, ...q("[data-seg]"), ...q("[data-total]"), ...q("[data-lane-label]"), ...pill, ...cursor, ...q("[data-cap]"), ...q("[data-count]")], { opacity: 0, duration: 0.4, ease: "site-out" }, "+=2.6");
}

export default function PipelineScene() {
  return (
    <Stage build={build} label="CI pipeline: push to review app went from 26 to 18 minutes; tests run only on the packages that changed.">
      <div data-fade style={{ position: "absolute", left: 96, top: 88, fontSize: 44, lineHeight: "52px" }}>
        Push to review app
      </div>
      <div style={{ position: "absolute", left: 96, top: 152, fontSize: 24, lineHeight: "32px", color: "var(--color-secondary)", width: 1000 }}>
        <span data-cap="before" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          Every package tested, and jobs wait for a free machine.
        </span>
        <span data-cap="after" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          Only what changed is tested, and the review app deploys itself.
        </span>
      </div>

      <Lane id="before" y={280} segs={BEFORE} />
      <Lane id="after" y={372} segs={AFTER} />

      <div data-fade style={{ position: "absolute", left: 96, top: 548, fontSize: 24, lineHeight: "28px" }}>
        Tests
      </div>
      <div style={{ position: "absolute", left: X0, top: 528, display: "grid", gridTemplateColumns: "repeat(8, 48px)", gap: 12 }}>
        {Array.from({ length: PACKAGES }, (_, i) => (
          <div key={i} data-pkg style={{ width: 48, height: 48, borderRadius: 6 }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 740, top: 548, fontSize: 24, lineHeight: "28px" }}>
        <span data-count="before" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          16 of 16 packages
        </span>
        <span data-count="after" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          3 of 16, the ones that changed
        </span>
      </div>

      <div
        data-pill
        style={{
          position: "absolute",
          left: X0,
          top: 740,
          height: 64,
          padding: "0 28px",
          borderRadius: 999,
          background: "#f7f7f7",
          boxShadow: "inset 0 0 0 1px #cfcfcb",
          display: "flex",
          alignItems: "center",
          fontSize: 24,
          transformOrigin: "50% 50%",
        }}
      >
        <span data-pill-label>Open review app</span>
        <span data-pill-done style={{ position: "absolute", left: 28 }}>
          Review app is live
        </span>
      </div>
      <svg data-cursor width="28" height="28" viewBox="0 0 24 24" style={{ position: "absolute", left: X0 + 210, top: 780 }}>
        <path d="M4 2l16 9-7 2-3 7z" fill="#1a1a1a" stroke="#f7f7f7" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </Stage>
  );
}
