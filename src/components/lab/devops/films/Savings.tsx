"use client";

import type gsap from "gsap";
import Stage, { Label, SIZE, T, Text, count, enter, outro, type Build, type Cut, type Theme } from "../Stage";

// Film 5, v4: the bill as one bar in two slow steps (Ali 11-20 picked the
// bar). Black is what stays; what can go empties to an outline. Cost review at list
// prices, found, not applied. Area shares from the review; each saving sized from
// the inventory's per-fix estimates and scaled to about a quarter for the
// quick wins and over half with the bigger moves.
const AREAS = [
  { name: "Production", share: 28 },
  { name: "Older sites", share: 28 },
  { name: "Older cluster", share: 13 },
  { name: "Test and stage", share: 8 },
  { name: "Dev cluster", share: 9 },
  { name: "CI machines", share: 7 },
  { name: "Logs and images", share: 7 },
];
// One saving per beat, in the order they leave. `area` indexes AREAS.
const STEPS = [
  { area: 2, units: 10, quick: true, line: "The older cluster is sized to the load it really has." },
  { area: 4, units: 5, quick: true, line: "Stale review apps are removed from the dev cluster." },
  { area: 3, units: 5, quick: true, line: "A duplicate stage stack is turned off." },
  { area: 5, units: 3, quick: true, line: "CI machines start from zero instead of idling." },
  { area: 6, units: 2, quick: true, line: "Fewer logs are kept." },
  { area: 1, units: 24, quick: false, line: "The older sites move onto a shared shop platform at TRY." },
  { area: 2, units: 3, quick: false, line: "With them gone, the older cluster is retired." },
];
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
  if (cut === "laptop") return { vertical: false, x: t.m, y: 400, len: w - 2 * t.m, thick: 140, labelY: 566, countY: 690 };
  return { vertical: true, x: 600, y: 470, len: 560, thick: 300, labelY: 0, countY: 1076 };
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
            background: "var(--ink)",
            boxShadow: g.vertical ? "inset 0 -3px 0 var(--bg)" : "inset -3px 0 0 var(--bg)",
          }}
        >
          {p.step >= 0 && <div data-mark style={{ position: "absolute", inset: 0, background: "var(--bg)", boxShadow: g.vertical ? "inset 0 0 0 1.5px var(--ink), inset 0 -3px 0 var(--bg)" : "inset 0 0 0 1.5px var(--ink), inset -3px 0 0 var(--bg)" }} />}
        </div>
      ))}
      {/* One entrance for the whole bar: a cover that wipes off. */}
      <div data-wipe style={{ position: "absolute", ...box(g, 0, 100), left: box(g, 0, 100).left - 2, top: box(g, 0, 100).top - 2, width: box(g, 0, 100).width + 4, height: box(g, 0, 100).height + 4, background: "var(--bg)", transformOrigin: g.vertical ? "50% 100%" : "100% 50%" }} />
    </>
  );
}

function Readout({ cut }: { cut: Cut }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  // One column, so the gap under the number holds whatever the font.
  return (
    <div style={{ position: "absolute", left: t.m, top: g.countY, width: w - 2 * t.m, display: "flex", flexDirection: "column", gap: cut === "laptop" ? 18 : 28 }}>
      <div data-count style={{ display: "flex", alignItems: "baseline", gap: cut === "laptop" ? 14 : 22 }}>
        <span style={{ fontSize: t.head, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          <span data-pct>100</span>%
        </span>
        <span style={{ fontSize: t.fact }}>of a month&apos;s cloud bill</span>
      </div>
      <div data-end style={{ fontSize: t.small, lineHeight: 1.2, color: "var(--muted)" }}>
        {END}
      </div>
    </div>
  );
}

/** Bar entrance, the readout, and the closing line. */
function base(tl: gsap.core.Timeline, q: Q, g: ReturnType<typeof geo>, endAt: number) {
  const pieces = q("[data-piece]");
  tl.set([...pieces, ...q("[data-mark]"), ...q("[data-count]"), ...q("[data-end]"), ...q("[data-say]")], { opacity: 0 }, 0);
  tl.set(pieces, { x: 0, y: 0 }, 0);
  tl.set(q("[data-pct]")[0], { textContent: "100" }, 0);
  tl.set(pieces, { opacity: 1 }, 0);
  tl.fromTo(q("[data-wipe]"), { scaleX: 1, scaleY: 1 }, { [g.vertical ? "scaleY" : "scaleX"]: 0, duration: 1.1, ease: "site-in-out" }, 0.3);
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

/* The bar, one saving at a time: what is done, and how much of the bill it takes off. */

const STEP = 2.8;
const T0 = 2.4;
const GAP = 0.6;
const stepAt = (s: number) => T0 + s * STEP + (STEPS[s].quick ? 0 : GAP);
const END_AT = stepAt(STEPS.length - 1) + STEP + 0.2;

const buildC: Build = (tl, q, cut) => {
  const g = geo(cut);
  const pieces = q("[data-piece]");
  const marks = q("[data-mark]");
  const says = q("[data-say]");
  const groups = q("[data-group]");
  const pct = q("[data-pct]")[0];
  const lift = g.vertical ? { x: 140 } : { y: -80 };
  const markOf = PIECES.filter((p) => p.step >= 0).map((p) => p.step);
  tl.set(groups, { opacity: 0 }, 0);
  // Group heading: quick wins, then the bigger moves.
  [true, false].forEach((quick, k) => {
    const mine = STEPS.map((st, i) => ({ st, i })).filter((x) => x.st.quick === quick);
    const from = stepAt(mine[0].i);
    const to = stepAt(mine[mine.length - 1].i) + STEP - 0.3;
    tl.fromTo(groups[k], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "site-out" }, from);
    tl.to(groups[k], { opacity: 0, duration: 0.25, ease: "site-out" }, to);
  });
  let left = 100;
  STEPS.forEach((st, s) => {
    const at = stepAt(s);
    const piece = pieces.filter((_, i) => PIECES[i].step === s);
    const mark = marks.filter((_, i) => markOf[i] === s);
    // The words and the piece they name, together; then it leaves and the
    // gap closes while it goes.
    tl.fromTo(says[s], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "site-out" }, at);
    tl.to(mark, { opacity: 1, duration: 0.45, ease: "site-out" }, at);
    tl.to(piece, { ...lift, opacity: 0, duration: 0.8, ease: "site-out" }, at + 1.2);
    close(tl, q, g, (x) => x <= s, at + 1.6, 0.9);
    count(tl, pct, left, left - st.units, at + 1.6, 0.9, "site-in-out");
    left -= st.units;
    tl.to(says[s], { opacity: 0, duration: 0.25, ease: "site-out" }, at + STEP - 0.3);
  });
  base(tl, q, g, END_AT);
};

function SavingsC({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  const heads = ["Quick wins: config and small code", "Bigger moves"];
  const lines = STEPS.map((st) => `${st.line} ${st.units}% of the bill.`);
  // Laptop: heading and line under the bar. Phone: beside the bar, right-aligned.
  const sideW = g.x - t.m - 28;
  const mid = g.y + g.len / 2;
  return (
    <Stage cut={cut} theme={theme} build={buildC} name="Savings" headline={HEAD} label="Savings film: the cloud bill as one bar; each saving is named as its piece leaves, quick wins first, then the bigger moves.">
      <Bar cut={cut} />
      {heads.map((h) => (
        <Label
          key={h}
          data-group
          x={t.m}
          y={g.labelY}
          w={g.vertical ? sideW : w - 2 * t.m}
          // Phone: anchored by its bottom, so a two-line heading grows upward, clear of the line.
          style={g.vertical ? { textAlign: "right", top: "auto", bottom: SIZE[cut].h - (mid - 50) } : undefined}
        >
          {h}
        </Label>
      ))}
      {lines.map((l) => (
        <Text key={l} data-say x={t.m} y={g.vertical ? mid - 34 : g.labelY + 28} w={g.vertical ? sideW : w - 2 * t.m} size="small" style={g.vertical ? { textAlign: "right" } : undefined}>
          {l}
        </Text>
      ))}
      <Readout cut={cut} />
    </Stage>
  );
}

export default SavingsC;
