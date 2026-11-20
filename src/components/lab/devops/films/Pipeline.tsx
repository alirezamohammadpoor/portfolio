"use client";

import Stage, { Captions, Label, SIZE, T, Text, captionBeats, count, enter, outro, type Build, type Cut, type Theme } from "../Stage";

// Script: "Devops films script", film 1. Measured: push to review 26 → 18
// min (estimate from 604 pipelines), test job 8.1 → 5.2 min (proof run),
// jobs lost waiting 59 → 17 (90 days replayed). The other segment lengths
// only fill the bars to those totals and carry no numbers.
type Seg = { key: string; name: string; min: number; tone: "wait" | "plain" | "test" };
const BEFORE: Seg[] = [
  { key: "w", name: "Waiting", min: 5, tone: "wait" },
  { key: "b", name: "Build", min: 7, tone: "plain" },
  { key: "t", name: "Tests", min: 8.1, tone: "test" },
  { key: "d", name: "Deploy", min: 5.9, tone: "plain" },
];
const AFTER: Seg[] = [
  { key: "w", name: "", min: 0.6, tone: "wait" },
  { key: "b", name: "Build", min: 6.4, tone: "plain" },
  { key: "t", name: "Tests", min: 5.2, tone: "test" },
  { key: "d", name: "Deploy", min: 5.8, tone: "plain" },
];
const CHANGED = new Set([2, 9, 13]);
const SCALE_MIN = 30;

function geo(cut: Cut) {
  const { w } = SIZE[cut];
  const t = T[cut];
  if (cut === "laptop") {
    return { x0: 200, x1: w - t.m - 100, axisY: 286, beforeY: 318, afterY: 398, barH: 56, labelX: t.m, labelInline: true, gridX: 200, gridY: 520, sq: 52, gap: 12, sideX: 520, sideY: 520 };
  }
  return { x0: t.m, x1: w - t.m, axisY: 480, beforeY: 610, afterY: 740, barH: 80, labelX: t.m, labelInline: false, gridX: t.m, gridY: 860, sq: 64, gap: 14, sideX: 420, sideY: 860 };
}

const tone = {
  wait: { background: "repeating-linear-gradient(135deg,var(--line) 0 6px,var(--bg) 6px 12px)", boxShadow: "inset 0 0 0 1px var(--line)" },
  plain: { background: "var(--line)" },
  test: { background: "var(--muted)", color: "var(--bg)" },
};

function Lane({ id, segs, cut }: { id: "before" | "after"; segs: Seg[]; cut: Cut }) {
  const g = geo(cut);
  const t = T[cut];
  const per = (g.x1 - g.x0) / SCALE_MIN;
  const y = id === "before" ? g.beforeY : g.afterY;
  const total = segs.reduce((s, x) => s + x.min, 0);
  const lefts = segs.map((_, i) => g.x0 + segs.slice(0, i).reduce((s, x) => s + x.min * per, 0));
  return (
    <>
      <Label data-lane={id} x={g.labelX} y={g.labelInline ? y + g.barH / 2 - t.label / 2 : y - t.label - 14}>
        {id === "before" ? "Before" : "After"}
      </Label>
      {segs.map((s, i) => (
        <div
          key={s.key}
          data-seg={id}
          data-min={s.min}
          data-tone={s.tone}
          style={{
            position: "absolute",
            left: lefts[i],
            top: y,
            width: s.min * per - 3,
            height: g.barH,
            transformOrigin: "0 50%",
            display: "flex",
            alignItems: "center",
            paddingLeft: cut === "laptop" ? 12 : 16,
            fontSize: t.label,
            fontWeight: 650,
            textTransform: "uppercase",
            letterSpacing: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            ...tone[s.tone],
          }}
        >
          {s.name}
        </div>
      ))}
      <Text
        data-clock={id}
        x={g.labelInline ? g.x0 + total * per + 16 : g.x1 - 300}
        y={g.labelInline ? y + g.barH / 2 - t.fact * 0.6 : y - t.fact - 10}
        w={g.labelInline ? undefined : 300}
        style={{ textAlign: g.labelInline ? "left" : "right", fontVariantNumeric: "tabular-nums" }}
      >
        <span data-clock-n={id}>0</span> min
      </Text>
    </>
  );
}

const build: Build = (tl, q, cut, c) => {
  captionBeats(tl, q, [0.2, 1.5, 4.5, 6.6, 8.6, 11.6]);
  enter(tl, q("[data-axis]"), 0.3, 0.03);

  // Hidden until their beat.
  tl.set([...q("[data-lane]"), ...q("[data-clock]"), ...q("[data-pkg]"), ...q("[data-side]"), ...q("[data-pill]"), ...q("[data-tap]"), ...q("[data-fact]")], { opacity: 0 }, 0);
  tl.set(q("[data-seg]"), { clipPath: "inset(0% 100% 0% 0%)" }, 0);
  tl.set(q("[data-pill-done]"), { opacity: 0 }, 0);

  // A lane fills like a clock: linear, its counter running with it.
  const run = (lane: "before" | "after", at: number, secPerMin: number) => {
    tl.fromTo(q(`[data-lane='${lane}']`), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "site-out" }, at - 0.2);
    tl.set(q(`[data-clock='${lane}']`), { opacity: 1 }, at);
    let t0 = at;
    let mins = 0;
    q(`[data-seg='${lane}']`).forEach((el) => {
      const m = Number((el as HTMLElement).dataset.min);
      // Clip, not scale, so the segment's label is revealed, never squashed.
      tl.fromTo(el, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: m * secPerMin, ease: "none" }, t0);
      t0 += m * secPerMin;
      mins += m;
    });
    count(tl, q(`[data-clock-n='${lane}']`)[0], 0, Math.round(mins), at, t0 - at);
    return t0;
  };

  // Beat 2: before, 26 min in 2.9 s.
  run("before", 1.6, 0.11);

  // Beat 3: the tests segment opens into the 16 packages, all tested.
  const pk = q("[data-pkg]");
  tl.fromTo(pk, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.35, ease: "site-out", stagger: { each: 0.03, from: "start" } }, 4.7);
  tl.fromTo(pk, { backgroundColor: c.line }, { backgroundColor: c.ink, duration: 0.2, ease: "site-out", stagger: 0.04 }, 5.1);
  enter(tl, q("[data-side='all']"), 5.2);

  // Beat 4: only what changed is tested.
  pk.forEach((el, i) => {
    if (!CHANGED.has(i)) tl.to(el, { backgroundColor: c.line, duration: 0.3, ease: "site-out" }, 6.8 + (i % 4) * 0.04);
  });
  tl.to(q("[data-side='all']"), { opacity: 0, y: -10, duration: 0.25, ease: "site-out" }, 6.7);
  enter(tl, q("[data-side='changed']"), 6.9);

  // Beat 5: the before bar steps back, the after bar runs (18 min in 2.2 s).
  tl.to([...q("[data-seg='before']"), ...q("[data-clock='before']"), ...q("[data-lane='before']")], { opacity: 0.35, duration: 0.4, ease: "site-out" }, 8.6);
  const afterEnd = run("after", 8.9, 0.12);

  // Beat 6: one click to the review app, plus the queue fact.
  const pill = q("[data-pill]");
  tl.fromTo(pill, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.35, ease: "site-out" }, afterEnd + 0.3);
  tl.fromTo(q("[data-tap]"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.25, ease: "site-out" }, afterEnd + 0.9);
  tl.to(pill, { scale: 0.97, duration: 0.12, ease: "site-out" }, afterEnd + 1.05);
  tl.to(pill, { scale: 1, backgroundColor: c.accent, color: c.accentInk, duration: 0.24, ease: "site-out" }, afterEnd + 1.17);
  tl.to(q("[data-tap]"), { opacity: 0, scale: 1.4, duration: 0.3, ease: "site-out" }, afterEnd + 1.17);
  tl.to(q("[data-pill-open]"), { opacity: 0, duration: 0.12 }, afterEnd + 1.17);
  tl.to(q("[data-pill-done]"), { opacity: 1, duration: 0.2 }, afterEnd + 1.25);
  enter(tl, q("[data-fact]"), afterEnd + 1.5);

  outro(tl, q, 15.2);
};

export default function Pipeline({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  const per = (g.x1 - g.x0) / SCALE_MIN;
  const step = g.sq + g.gap;
  return (
    <Stage
      cut={cut}
      theme={theme}
      build={build}
      name="CI/CD pipeline"
      headline={"Push to review app"}
      label="CI pipeline film: push to review app went from 26 to 18 minutes; tests run only on the 3 of 16 packages a change touches."
    >
      <Captions
        lines={[
          "From a push to a link someone can click.",
          "Before: jobs wait for a free machine, then the whole repo is tested.",
          "Every change tested all 16 packages.",
          "Now only what the change touches: 3 of 16.",
          "After: no queue, fewer tests, and the review app deploys itself.",
          "One click to review.",
        ]}
      />
      {[0, 10, 20, 30].map((m) => (
        <Text key={m} data-axis x={g.x0 + m * per - (m === 0 ? 0 : 40)} y={g.axisY - (cut === "laptop" ? 4 : 0)} w={m === 0 ? 120 : 80} size="small" style={{ color: "var(--muted)", textAlign: m === 0 ? "left" : "right" }}>
          {m === 0 ? "0 min" : m}
        </Text>
      ))}
      <div data-axis style={{ position: "absolute", left: g.x0, top: g.axisY + t.small * 1.4, width: g.x1 - g.x0, height: 1, background: "var(--line)" }} />

      <Lane id="before" segs={BEFORE} cut={cut} />
      <Lane id="after" segs={AFTER} cut={cut} />

      <div style={{ position: "absolute", left: g.gridX, top: g.gridY, display: "grid", gridTemplateColumns: `repeat(4, ${g.sq}px)`, gap: g.gap }}>
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} data-pkg style={{ width: g.sq, height: g.sq, background: "var(--line)" }} />
        ))}
      </div>
      <Text data-side="all" x={g.sideX} y={g.sideY} w={SIZE[cut].w - g.sideX - t.m}>
        16 of 16 packages tested
      </Text>
      <Text data-side="changed" x={g.sideX} y={g.sideY} w={SIZE[cut].w - g.sideX - t.m}>
        3 of 16, only what changed
      </Text>
      <Text data-side="changed" x={g.sideX} y={g.sideY + t.fact * 1.5} w={SIZE[cut].w - g.sideX - t.m} style={{ color: "var(--muted)" }}>
        Test job 8 → 5 min
      </Text>

      <div
        data-pill
        style={{
          position: "absolute",
          left: g.sideX,
          top: g.gridY + 4 * step - g.gap - (cut === "laptop" ? 56 : 84),
          height: cut === "laptop" ? 56 : 84,
          padding: cut === "laptop" ? "0 24px" : "0 36px",
          borderRadius: 999,
          background: "var(--bg)",
          boxShadow: "inset 0 0 0 1.5px var(--ink)",
          display: "flex",
          alignItems: "center",
          fontSize: t.fact,
          transformOrigin: "50% 50%",
          whiteSpace: "nowrap",
        }}
      >
        <span data-pill-open>Open review app</span>
        <span data-pill-done style={{ position: "absolute", left: cut === "laptop" ? 24 : 36 }}>
          Review app is live
        </span>
        <span data-tap style={{ position: "absolute", right: cut === "laptop" ? 26 : 40, top: "50%", width: cut === "laptop" ? 22 : 34, height: cut === "laptop" ? 22 : 34, marginTop: cut === "laptop" ? -11 : -17, borderRadius: 999, background: "var(--muted)", opacity: 0.5 }} />
      </div>

      <Text data-fact x={cut === "laptop" ? g.sideX : t.m} y={g.gridY + 4 * step + (cut === "laptop" ? 24 : 8)} w={SIZE[cut].w - (cut === "laptop" ? g.sideX : t.m) - t.m} size="small" style={{ color: "var(--muted)" }}>
        Jobs lost waiting for a machine: 59 → 17 over 90 days, replayed.
      </Text>
    </Stage>
  );
}
