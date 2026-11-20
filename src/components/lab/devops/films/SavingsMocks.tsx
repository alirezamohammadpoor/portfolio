"use client";

import type gsap from "gsap";
import Stage, { SIZE, T, Text, count, enter, outro, type Build, type Cut, type Theme } from "../Stage";

// Three mocks for the savings film (Ali 11-20). Cost review at list prices,
// found, not applied. Area shares from the review; each saving sized from
// the inventory's per-fix estimates and scaled to about a quarter for the
// quick wins and over half with the bigger moves.
const AREAS = [
  { name: "Production", share: 28, shade: 100 },
  { name: "Older sites", share: 28, shade: 62 },
  { name: "Older cluster", share: 13, shade: 84 },
  { name: "Test and stage", share: 8, shade: 44 },
  { name: "Dev cluster", share: 9, shade: 72 },
  { name: "CI machines", share: 7, shade: 34 },
  { name: "Logs and images", share: 7, shade: 54 },
];
// One saving per beat, in the order they leave. `area` indexes AREAS.
const STEPS = [
  { area: 2, units: 10, quick: true, line: "Older cluster sized to its load" },
  { area: 4, units: 5, quick: true, line: "Dev cluster: stale review apps removed" },
  { area: 3, units: 5, quick: true, line: "Duplicate stage stack turned off" },
  { area: 5, units: 3, quick: true, line: "CI machines start from zero" },
  { area: 6, units: 2, quick: true, line: "Fewer logs kept" },
  { area: 1, units: 24, quick: false, line: "Older sites move to the shared platform" },
  { area: 2, units: 3, quick: false, line: "Older cluster retired" },
];
const QUICK = STEPS.filter((s) => s.quick).reduce((a, s) => a + s.units, 0);
const BIG = STEPS.filter((s) => !s.quick).reduce((a, s) => a + s.units, 0);
const HEAD = "Where the cloud\nbill can shrink";
const END = "Found in a cost review, not applied yet. List-price estimates.";

// Each area splits into what stays, then its savings in step order.
const PIECES = AREAS.flatMap((a, area) => {
  const mine = STEPS.map((s, i) => ({ ...s, i })).filter((s) => s.area === area);
  const keep = a.share - mine.reduce((t, s) => t + s.units, 0);
  return [...(keep ? [{ area, units: keep, step: -1 }] : []), ...mine.map((s) => ({ area, units: s.units, step: s.i }))];
});
/** Where each piece starts once `gone(step)` pieces have left. */
const offsets = (gone: (step: number) => boolean) => {
  let at = 0;
  return PIECES.map((p) => {
    const o = at;
    if (p.step < 0 || !gone(p.step)) at += p.units;
    return o;
  });
};
const START = offsets(() => false);

function geo(cut: Cut) {
  const t = T[cut];
  const { w } = SIZE[cut];
  if (cut === "laptop") return { vertical: false, x: t.m, y: 400, len: w - 2 * t.m, thick: 140, labelY: 566, countY: 650, endY: 720 };
  return { vertical: true, x: 600, y: 470, len: 600, thick: 300, labelY: 0, countY: 1110, endY: 1170 };
}
const box = (g: ReturnType<typeof geo>, o: number, u: number) => {
  const unit = g.len / 100;
  return g.vertical ? { left: g.x, top: g.y + o * unit, width: g.thick, height: u * unit } : { left: g.x + o * unit, top: g.y, width: u * unit, height: g.thick };
};

type Q = (s: string) => Element[];

function Bar({ cut }: { cut: Cut }) {
  const g = geo(cut);
  return (
    <>
      <div data-ghost style={{ position: "absolute", ...box(g, 0, 100), boxShadow: "inset 0 0 0 1.5px var(--line)" }} />
      {PIECES.map((p, i) => (
        <div
          key={i}
          data-piece
          style={{
            position: "absolute",
            ...box(g, START[i], p.units),
            background: `color-mix(in srgb, var(--ink) ${AREAS[p.area].shade}%, var(--bg))`,
            boxShadow: g.vertical ? "inset 0 -3px 0 var(--bg)" : "inset -3px 0 0 var(--bg)",
          }}
        >
          {p.step >= 0 && <div data-mark style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg, transparent 0 7px, var(--bg) 7px 10px)" }} />}
        </div>
      ))}
    </>
  );
}

function Readout({ cut }: { cut: Cut }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  return (
    <>
      <div data-count style={{ position: "absolute", left: t.m, top: g.countY, width: w - 2 * t.m, display: "flex", alignItems: "baseline", gap: cut === "laptop" ? 14 : 22 }}>
        <span style={{ fontSize: t.head, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          <span data-pct>100</span>%
        </span>
        <span style={{ fontSize: t.fact }}>of a month&apos;s cloud bill</span>
      </div>
      <Text data-end x={t.m} y={g.endY} w={w - 2 * t.m} size="small" style={{ color: "var(--muted)" }}>
        {END}
      </Text>
    </>
  );
}

/** Bar entrance, the readout, and the closing line. */
function base(tl: gsap.core.Timeline, q: Q, endAt: number) {
  const pieces = q("[data-piece]");
  tl.set([...pieces, ...q("[data-mark]"), ...q("[data-count]"), ...q("[data-end]"), ...q("[data-say]")], { opacity: 0 }, 0);
  tl.set(pieces, { x: 0, y: 0 }, 0);
  tl.set(q("[data-pct]")[0], { textContent: "100" }, 0);
  enter(tl, q("[data-ghost]"), 0.3);
  tl.fromTo(pieces, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "site-out", stagger: 0.03 }, 0.4);
  enter(tl, q("[data-count]"), 1.2);
  enter(tl, q("[data-end]"), endAt);
  outro(tl, q, endAt + 2.6);
}

/** Close the bar up once `gone` steps have left. */
function close(tl: gsap.core.Timeline, q: Q, g: ReturnType<typeof geo>, gone: (s: number) => boolean, at: number, dur: number) {
  const unit = g.len / 100;
  const to = offsets(gone);
  q("[data-piece]").forEach((el, i) => {
    if (PIECES[i].step >= 0 && gone(PIECES[i].step)) return;
    tl.to(el, { [g.vertical ? "y" : "x"]: (to[i] - START[i]) * unit, duration: dur, ease: "site-in-out" }, at);
  });
}

/* A: one slice per beat, named at the slice. */

const BEAT_A = 2.4;
const buildA: Build = (tl, q, cut) => {
  const g = geo(cut);
  const pieces = q("[data-piece]");
  const marks = q("[data-mark]");
  const says = q("[data-say]");
  const pct = q("[data-pct]")[0];
  const lift = g.vertical ? { x: 140 } : { y: -80 };
  let left = 100;
  STEPS.forEach((s, k) => {
    const at = 2.2 + k * BEAT_A;
    const pi = PIECES.findIndex((p) => p.step === k);
    const mi = PIECES.slice(0, pi).filter((p) => p.step >= 0).length;
    tl.to(marks[mi], { opacity: 1, duration: 0.3, ease: "site-out" }, at);
    tl.fromTo(says[k], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "site-out" }, at);
    tl.to(pieces[pi], { ...lift, opacity: 0, duration: 0.6, ease: "site-out" }, at + 0.9);
    close(tl, q, g, (st) => st <= k, at + 1.3, 0.7);
    count(tl, pct, left, left - s.units, at + 1.3, 0.7, "site-in-out");
    left -= s.units;
    tl.to(says[k], { opacity: 0, duration: 0.25, ease: "site-out" }, at + BEAT_A - 0.35);
  });
  base(tl, q, 2.2 + STEPS.length * BEAT_A + 0.2);
};

function SavingsA({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  const unit = g.len / 100;
  return (
    <Stage cut={cut} theme={theme} build={buildA} name="Savings A" headline={HEAD} label="Savings mock A: the cloud bill as one bar; each saving leaves on its own beat, named at the slice.">
      <Bar cut={cut} />
      {STEPS.map((s, k) => {
        // The slice's place on the bar at its own beat, after earlier ones left.
        const pi = PIECES.findIndex((p) => p.step === k);
        const o = offsets((st) => st < k)[pi];
        if (g.vertical) {
          const mid = g.y + (o + s.units / 2) * unit;
          return (
            <Text key={k} data-say x={t.m} y={mid - t.small * 0.6} w={g.x - t.m - 28} size="small" style={{ textAlign: "right" }}>
              {s.line}
            </Text>
          );
        }
        const mid = g.x + (o + s.units / 2) * unit;
        const lw = 380;
        const x = Math.max(t.m, Math.min(w - t.m - lw, mid - lw / 2));
        return (
          <Text key={k} data-say x={x} y={g.labelY} w={lw} size="small" style={{ textAlign: x === t.m ? "left" : x === w - t.m - lw ? "right" : "center" }}>
            {s.line}
          </Text>
        );
      })}
      <Readout cut={cut} />
    </Stage>
  );
}

/* B: the bill as 100 dots, two groups leave. */

function geoB(cut: Cut) {
  const { w } = SIZE[cut];
  if (cut === "laptop") {
    const dot = 22, gap = 14, side = 10 * (dot + gap) - gap;
    return { dot, gap, x: 200, y: 300, side, textX: 200 + side + 64, textW: w - (200 + side + 64) - 80, sayY: 300 + side - 150, countY: 300 + side - 90, endY: 300 + side - 20 };
  }
  const dot = 40, gap = 22, side = 10 * (dot + gap) - gap;
  return { dot, gap, x: (w - side) / 2, y: 440, side, textX: 72, textW: w - 144, sayY: 440 + side + 40, countY: 440 + side + 100, endY: 440 + side + 180 };
}
const GROUPS = [
  { size: QUICK, line: "Quick wins, config and small code: about a quarter." },
  { size: BIG, line: "With the bigger moves: over half." },
];
const DOT_GROUP = Array.from({ length: 100 }, (_, i) => (i >= 100 - QUICK ? 0 : i >= 100 - QUICK - BIG ? 1 : -1));
const BEAT_B = 3.6;

const buildB: Build = (tl, q, cut) => {
  const g = geoB(cut);
  const dots = q("[data-dot]");
  const fills = q("[data-dfill]");
  const says = q("[data-say]");
  const pct = q("[data-pct]")[0];
  tl.set([...dots, ...says, ...q("[data-count]"), ...q("[data-end]")], { opacity: 0 }, 0);
  tl.set(dots, { y: 0 }, 0);
  tl.set(fills, { opacity: 1 }, 0);
  tl.set(pct, { textContent: "100" }, 0);
  tl.fromTo(dots, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "site-out", stagger: 0.006 }, 0.3);
  enter(tl, q("[data-count]"), 1.2);
  let left = 100;
  GROUPS.forEach((grp, k) => {
    const at = 2.4 + k * BEAT_B;
    tl.fromTo(says[k], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "site-out" }, at);
    tl.to(fills.filter((_, i) => DOT_GROUP[i] === k), { opacity: 0, duration: 0.3, ease: "site-out", stagger: 0.012 }, at);
    tl.to(dots.filter((_, i) => DOT_GROUP[i] === k), { opacity: 0, y: g.dot, duration: 0.5, ease: "site-out", stagger: 0.015 }, at + 1.6);
    count(tl, pct, left, left - grp.size, at + 1.6, 0.9, "site-out");
    left -= grp.size;
    tl.to(says[k], { opacity: 0, duration: 0.25, ease: "site-out" }, at + BEAT_B - 0.35);
  });
  const endAt = 2.4 + GROUPS.length * BEAT_B + 0.2;
  enter(tl, q("[data-end]"), endAt);
  outro(tl, q, endAt + 2.6);
};

function SavingsB({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geoB(cut);
  const t = T[cut];
  const align = cut === "laptop" ? "left" : "center";
  return (
    <Stage cut={cut} theme={theme} build={buildB} name="Savings B" headline={HEAD} label="Savings mock B: the cloud bill as 100 dots; quick wins leave, then the bigger moves, about half stays.">
      {DOT_GROUP.map((_, i) => (
        <div
          key={i}
          data-dot
          style={{ position: "absolute", left: g.x + (i % 10) * (g.dot + g.gap), top: g.y + Math.floor(i / 10) * (g.dot + g.gap), width: g.dot, height: g.dot, borderRadius: 999, boxShadow: "inset 0 0 0 2px var(--ink)" }}
        >
          <div data-dfill style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--ink)" }} />
        </div>
      ))}
      {GROUPS.map((grp) => (
        <Text key={grp.line} data-say x={g.textX} y={g.sayY} w={g.textW} size="small" style={{ textAlign: align }}>
          {grp.line}
        </Text>
      ))}
      <Text data-count x={g.textX} y={g.countY} w={g.textW} style={{ textAlign: align, fontVariantNumeric: "tabular-nums" }}>
        <span data-pct>100</span>% of a month&apos;s cloud bill
      </Text>
      <Text data-end x={g.textX} y={g.endY} w={g.textW} size="small" style={{ textAlign: align, color: "var(--muted)", fontSize: t.small }}>
        {END}
      </Text>
    </Stage>
  );
}

/* C: the bar in two slow steps. */

const buildC: Build = (tl, q, cut) => {
  const g = geo(cut);
  const pieces = q("[data-piece]");
  const marks = q("[data-mark]");
  const says = q("[data-say]");
  const pct = q("[data-pct]")[0];
  const lift = g.vertical ? { x: 140 } : { y: -80 };
  const markIdx = PIECES.filter((p) => p.step >= 0);
  let left = 100;
  [true, false].forEach((quick, k) => {
    const at = 2.4 + k * 5.0;
    const inStep = (st: number) => STEPS[st].quick === quick;
    tl.fromTo(says[k], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "site-out" }, at);
    tl.to(marks.filter((_, i) => inStep(markIdx[i].step)), { opacity: 1, duration: 0.4, ease: "site-out", stagger: 0.12 }, at);
    tl.to(pieces.filter((_, i) => PIECES[i].step >= 0 && inStep(PIECES[i].step)), { ...lift, opacity: 0, duration: 0.8, ease: "site-out", stagger: 0.12 }, at + 1.6);
    close(tl, q, g, (st) => STEPS[st].quick || !quick, at + 2.8, 1.2);
    const size = quick ? QUICK : BIG;
    count(tl, pct, left, left - size, at + 2.8, 1.2, "site-in-out");
    left -= size;
    tl.to(says[k], { opacity: 0, duration: 0.25, ease: "site-out" }, at + 4.6);
  });
  base(tl, q, 2.4 + 2 * 5.0 + 0.2);
};

function SavingsC({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  const lines = ["Quick wins, config and small code: about a quarter.", "With the bigger moves: over half."];
  return (
    <Stage cut={cut} theme={theme} build={buildC} name="Savings C" headline={HEAD} label="Savings mock C: the cloud bill as one bar; quick wins leave, then the bigger moves, held slowly.">
      <Bar cut={cut} />
      {lines.map((l) =>
        g.vertical ? (
          <Text key={l} data-say x={t.m} y={g.y + g.len / 2 - t.small} w={g.x - t.m - 28} size="small" style={{ textAlign: "right" }}>
            {l}
          </Text>
        ) : (
          <Text key={l} data-say x={t.m} y={g.labelY} w={w - 2 * t.m} size="small">
            {l}
          </Text>
        ),
      )}
      <Readout cut={cut} />
    </Stage>
  );
}

export { SavingsA, SavingsB, SavingsC };
