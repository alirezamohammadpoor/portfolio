"use client";

import Stage, { Captions, SIZE, T, Text, captionBeats, count, enter, outro, type Build, type Cut, type Theme } from "../Stage";

// Script film 5. Cost review at list prices: quick wins 21–33% of the
// monthly bill, the full plan 54–63%. Found, not applied. Area shares are
// from the review; how each area splits into quick and big is drawn to
// land on about 75% and about 45% left.
const AREAS = [
  { name: "Production", share: 27, quick: 0, big: 0, shade: 100 },
  { name: "Older sites", share: 28, quick: 0, big: 20, shade: 62 },
  { name: "Older cluster", share: 13, quick: 4, big: 9, shade: 84 },
  { name: "Test and stage", share: 8, quick: 5, big: 0, shade: 44 },
  { name: "Dev cluster", share: 9, quick: 6, big: 0, shade: 72 },
  { name: "CI machines", share: 7, quick: 6, big: 0, shade: 34 },
  { name: "Logs and images", share: 7, quick: 4, big: 0, shade: 54 },
];
const TOTAL = AREAS.reduce((s, a) => s + a.share, 0);

type Kind = "keep" | "quick" | "big";
const PIECES = AREAS.flatMap((a, area) => {
  const parts: { area: number; kind: Kind; units: number; last: boolean }[] = [];
  const keep = a.share - a.quick - a.big;
  if (keep) parts.push({ area, kind: "keep", units: keep, last: false });
  if (a.quick) parts.push({ area, kind: "quick", units: a.quick, last: false });
  if (a.big) parts.push({ area, kind: "big", units: a.big, last: false });
  parts[parts.length - 1].last = true;
  return parts;
});
const offsets = (keepIf: (k: Kind) => boolean) => {
  let at = 0;
  return PIECES.map((p) => {
    const o = at;
    if (keepIf(p.kind)) at += p.units;
    return o;
  });
};
const START = offsets(() => true);
const AFTER_QUICK = offsets((k) => k !== "quick");
const AFTER_BIG = offsets((k) => k === "keep");
const pct = (keep: (k: Kind) => boolean) => Math.round((100 * PIECES.filter((p) => keep(p.kind)).reduce((s, p) => s + p.units, 0)) / TOTAL);

function geo(cut: Cut) {
  const t = T[cut];
  const { w } = SIZE[cut];
  if (cut === "laptop") return { vertical: false, x: t.m, y: 400, len: w - 2 * t.m, thick: 140, countY: 700, factY: 790 };
  return { vertical: true, x: 600, y: 480, len: 560, thick: 300, countY: 1070, factY: 1166 };
}

const build: Build = (tl, q, cut) => {
  const g = geo(cut);
  const unit = g.len / TOTAL;
  const pieces = q("[data-piece]");
  const marks = q("[data-mark]");
  const pctEl = q("[data-pct]")[0];
  const axis = g.vertical ? "y" : "x";
  const lift = g.vertical ? { x: 150 } : { y: -70 };

  captionBeats(tl, q, [0.2, 2.0, 4.0, 7.0, 10.0]);
  tl.set([...pieces, ...marks, ...q("[data-area]"), ...q("[data-count]"), ...q("[data-fact]")], { opacity: 0 }, 0);
  tl.set(pieces, { x: 0, y: 0 }, 0);
  tl.set(pctEl, { textContent: "100" }, 0);

  enter(tl, q("[data-ghost]"), 0.3);
  tl.fromTo(pieces, { opacity: 0, [axis]: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.45, ease: "site-out", stagger: 0.04 }, 0.4);
  enter(tl, q("[data-area]"), 1.0, 0.06);
  enter(tl, q("[data-count]"), 1.4);

  // Each area's idle share gets marked.
  tl.fromTo(marks, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "site-out", stagger: 0.07 }, 2.2);
  tl.to(q("[data-area]"), { opacity: 0, duration: 0.3, ease: "site-out" }, 3.9);

  const step = (kind: Kind, at: number, to: number[], from: number, toPct: number) => {
    const out = pieces.filter((_, i) => PIECES[i].kind === kind);
    tl.to(out, { ...lift, opacity: 0, duration: 0.6, ease: "site-out", stagger: 0.05 }, at);
    pieces.forEach((el, i) => {
      if (PIECES[i].kind === kind) return;
      tl.to(el, { [axis]: (to[i] - START[i]) * unit, duration: 0.9, ease: "site-in-out" }, at + 0.7);
    });
    count(tl, pctEl, from, toPct, at + 0.7, 0.9, "site-in-out");
  };
  const afterQuick = pct((k) => k !== "quick");
  step("quick", 4.2, AFTER_QUICK, 100, afterQuick);
  step("big", 7.2, AFTER_BIG, afterQuick, pct((k) => k === "keep"));

  enter(tl, q("[data-fact]"), 10.2);
  outro(tl, q, 12.6);
};

export default function Savings({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  const unit = g.len / TOTAL;
  const box = (o: number, units: number) =>
    g.vertical ? { left: g.x, top: g.y + o * unit, width: g.thick, height: units * unit } : { left: g.x + o * unit, top: g.y, width: units * unit, height: g.thick };
  const areaStart = AREAS.map((_, i) => AREAS.slice(0, i).reduce((s, a) => s + a.share, 0));
  return (
    <Stage
      cut={cut}
      theme={theme}
      build={build}
      name="Savings"
      headline={"Where the cloud\nbill can shrink"}
      label="Savings film: a month of cloud spend by area. Quick wins take about a quarter off, the bigger moves over half. Found in a cost review, not applied yet."
    >
      <Captions
        lines={[
          "One month of cloud spend, by area.",
          "Mapped area by area: what sits idle.",
          "Quick wins, config and small code changes: about a quarter.",
          "With the bigger moves: over half.",
          "Proposed. Nothing is applied yet.",
        ]}
      />
      <div data-ghost style={{ position: "absolute", ...box(0, TOTAL), boxShadow: "inset 0 0 0 1.5px var(--line)" }} />
      {PIECES.map((p, i) => (
        <div
          key={i}
          data-piece
          style={{
            position: "absolute",
            ...box(START[i], p.units),
            background: `color-mix(in srgb, var(--ink) ${AREAS[p.area].shade}%, var(--bg))`,
            boxShadow: p.last ? (g.vertical ? "inset 0 -3px 0 var(--bg)" : "inset -3px 0 0 var(--bg)") : undefined,
          }}
        >
          {p.kind !== "keep" && (
            <div
              data-mark
              style={{
                position: "absolute",
                inset: 0,
                background: "repeating-linear-gradient(45deg, transparent 0 7px, var(--bg) 7px 10px)",
              }}
            />
          )}
        </div>
      ))}

      {AREAS.map((a, i) => {
        const label = `${a.name} ${a.share}%`;
        if (g.vertical) {
          const mid = g.y + (areaStart[i] + a.share / 2) * unit;
          return (
            <Text key={a.name} data-area x={t.m} y={mid - t.small * 0.6} w={g.x - t.m - 32} size="small" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              {label}
            </Text>
          );
        }
        // Three staggered rows under the bar, each with a tick up to its area.
        const row = i % 3;
        const right = i === AREAS.length - 1;
        const x = g.x + (right ? areaStart[i] + a.share : areaStart[i]) * unit;
        const top = g.y + g.thick + 14 + row * 30;
        return (
          <div key={a.name} data-area>
            <div style={{ position: "absolute", left: x - (right ? 2 : 0), top: g.y + g.thick + 4, width: 1.5, height: top - (g.y + g.thick + 4) + 18, background: "var(--muted)" }} />
            <Text x={right ? x - 260 - 8 : x + 8} y={top} w={260} size="small" style={{ whiteSpace: "nowrap", textAlign: right ? "right" : "left" }}>
              {label}
            </Text>
          </div>
        );
      })}

      <div data-count style={{ position: "absolute", left: t.m, top: g.countY, width: w - 2 * t.m, display: "flex", alignItems: "baseline", gap: cut === "laptop" ? 16 : 24 }}>
        <span style={{ fontSize: t.head, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          <span data-pct>100</span>%
        </span>
        <span style={{ fontSize: t.fact }}>of a month&apos;s cloud bill left</span>
      </div>
      <Text data-fact x={t.m} y={g.factY} w={w - 2 * t.m} size="small" style={{ color: "var(--muted)" }}>
        Found in a cost review, not applied yet. List-price estimates.
      </Text>
    </Stage>
  );
}
