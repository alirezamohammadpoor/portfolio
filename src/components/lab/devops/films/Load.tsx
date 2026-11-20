"use client";

import Stage, { Captions, Label, T, Text, captionBeats, count, enter, outro, type Build, type Cut, type Theme } from "../Stage";

// Script film 4. Three load fixes together take about a third of the API's
// requests away (in review). The lane densities are drawn, not measured:
// only the 100 → 67% total is a fact.
const LANES = [
  { name: "Page data", every: 0.35, gate: null, stop: "" },
  { name: "Asset and junk paths", every: 1.0, gate: 4.0, stop: "Filtered" },
  { name: "Preflight checks", every: 1.9, gate: 6.0, stop: "Cached" },
  { name: "Review widget", every: 2.8, gate: 8.0, stop: "Cached" },
] as const;

// Every chip's lane and start time, fixed so the film is deterministic.
const CHIPS = LANES.flatMap((l, lane) => {
  const out: { lane: number; t: number }[] = [];
  for (let t = 0.3 + lane * 0.17; t < 12.2; t += l.every) out.push({ lane, t: Math.round(t * 100) / 100 });
  return out;
});
const TRAVEL = 1.6;

function geo(cut: Cut) {
  const t = T[cut];
  if (cut === "laptop") {
    const lane = (i: number) => 380 + i * 110;
    return { lane, trackX: 320, boxX: 1000, boxY: 330, boxW: 200, boxH: 420, gateX: 430, gateW: 100, gateH: 44, chipW: 40, chipH: 20, labelX: t.m, labelY: (i: number) => lane(i) - 11, labelW: 220, lift: 40 };
  }
  const lane = (i: number) => 600 + i * 190;
  return { lane, trackX: t.m, boxX: 760, boxY: 520, boxW: 248, boxH: 700, gateX: 200, gateW: 170, gateH: 64, chipW: 56, chipH: 30, labelX: t.m, labelY: (i: number) => lane(i) - 82, labelW: 700, lift: 60 };
}

const build: Build = (tl, q, cut) => {
  const g = geo(cut);
  const chips = q("[data-chip]");
  const gates = q("[data-gate]");
  const meter = q("[data-meter]")[0];

  captionBeats(tl, q, [1.5, 4.0, 6.0, 8.0, 10.0]);
  tl.set([...chips, ...gates, ...q("[data-lane-label]")], { opacity: 0 }, 0);
  tl.set(chips, { x: 0, scale: 1 }, 0);
  tl.set(meter, { textContent: "100" }, 0);
  enter(tl, [...q("[data-box]"), ...q("[data-track]")], 0.2, 0.04);
  enter(tl, q("[data-lane-label]"), 1.5, 0.08);

  const full = g.boxX - g.trackX - g.chipW;
  const speed = full / TRAVEL;
  const stop = g.gateX - g.trackX - g.chipW - 6;

  chips.forEach((el, i) => {
    const { lane, t } = CHIPS[i];
    const gate = LANES[lane].gate;
    const atGate = t + stop / speed;
    tl.to(el, { opacity: 1, duration: 0.15, ease: "site-out" }, t);
    if (gate !== null && atGate >= gate + 0.3) {
      tl.to(el, { x: stop, duration: stop / speed, ease: "none" }, t);
      if (lane === 1) {
        // Junk bounces off the filter.
        tl.to(el, { x: stop - g.lift, opacity: 0, duration: 0.45, ease: "site-out" }, atGate);
      } else {
        // Preflight and widget calls are answered by the cache.
        tl.to(el, { scale: 0.4, opacity: 0, duration: 0.3, ease: "site-out" }, atGate);
      }
      return;
    }
    tl.to(el, { x: full, duration: TRAVEL, ease: "none" }, t);
    tl.to(el, { opacity: 0, duration: 0.12, ease: "none" }, t + TRAVEL - 0.12);
  });

  LANES.forEach((l, i) => {
    if (l.gate === null) return;
    const el = gates[i - 1];
    tl.fromTo(el, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45, ease: "site-out" }, l.gate);
  });

  count(tl, meter, 100, 67, 10.2, 1.6, "site-out");
  outro(tl, q, 13.0);
};

export default function Load({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  return (
    <Stage
      cut={cut}
      theme={theme}
      build={build}
      name="Load"
      headline={"A third fewer\nAPI requests"}
      label="Load film: four kinds of request reached the API; filtering junk paths and caching preflight checks and the review widget leaves about two thirds. In review."
    >
      <Captions
        lines={[
          "Before: every request reached the API, even ones it can't answer.",
          "Asset and junk paths skip the lookup. In review.",
          "Browsers keep the preflight answer. In review.",
          "Review widgets read from cache. In review.",
          "About a third fewer requests reach the API.",
        ]}
      />
      {LANES.map((l, i) => (
        <div key={l.name}>
          <div data-track style={{ position: "absolute", left: g.trackX, top: g.lane(i) - 1, width: g.boxX - g.trackX, height: 2, background: "var(--line)" }} />
          <Text data-lane-label x={g.labelX} y={g.labelY(i)} w={g.labelW} size="small">
            {l.name}
          </Text>
        </div>
      ))}

      {CHIPS.map((c, i) => (
        <div
          key={i}
          data-chip
          style={{
            position: "absolute",
            left: g.trackX,
            top: g.lane(c.lane) - g.chipH / 2,
            width: g.chipW,
            height: g.chipH,
            borderRadius: 999,
            background: c.lane === 0 ? "var(--ink)" : "var(--bg)",
            boxShadow: c.lane === 0 ? undefined : "inset 0 0 0 2px var(--ink)",
          }}
        />
      ))}

      {LANES.slice(1).map((l, i) => (
        <div
          key={l.name}
          data-gate
          style={{
            position: "absolute",
            left: g.gateX,
            top: g.lane(i + 1) - g.gateH / 2,
            width: g.gateW,
            height: g.gateH,
            background: "var(--ink)",
            color: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: t.label,
            fontWeight: 650,
            textTransform: "uppercase",
            letterSpacing: 0,
          }}
        >
          {l.stop}
        </div>
      ))}

      <div data-box style={{ position: "absolute", left: g.boxX, top: g.boxY, width: g.boxW, height: g.boxH, boxShadow: "inset 0 0 0 1.5px var(--ink)", background: "var(--bg)" }}>
        <Label x={cut === "laptop" ? 20 : 24} y={cut === "laptop" ? 20 : 24}>
          API
        </Label>
        <div style={{ position: "absolute", left: cut === "laptop" ? 20 : 24, bottom: cut === "laptop" ? 20 : 28, right: 12 }}>
          <div style={{ fontSize: t.head, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            <span data-meter>100</span>%
          </div>
          <div style={{ fontSize: t.small, lineHeight: 1.2, marginTop: 8, color: "var(--muted)" }}>of requests</div>
        </div>
      </div>
    </Stage>
  );
}
