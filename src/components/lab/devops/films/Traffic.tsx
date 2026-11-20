"use client";

import Stage, { SIZE, T, Text, count, enter, outro, useCut, type Build, type Cut, type Theme } from "../Stage";

// Film 3, v3 (Ali 11-20: one thing at a time, words at the action).
// Measured: origin requests per page view 12.8 after a bad build, 6.2 with
// the cache key fixed; one API response 3.65 MB → 160 KB compressed (about
// 96% smaller); outbound 4.6 → 0.3 TB a month is an estimate from usage.
// Fixes in review. Compression is drawn as 23 repeats merging into one
// (3650 / 160 ≈ 23): compressed data stores a repeat once.
const BEFORE = 13;
const AFTER = 6;
const FROM = 3650;
const TO = 160;
const TILES = Math.round(FROM / TO);
const MID = Math.floor(TILES / 2);

function geo(cut: Cut) {
  const { w } = SIZE[cut];
  const t = T[cut];
  if (cut === "laptop") {
    const page = { x: t.m, y: 310, w: 280, h: 340 };
    const server = { x: w - t.m - 280, y: 310, w: 280, h: 340 };
    return { page, server, vertical: false, say: { x: 380, y: 700, w: 520 }, chip: { x: w / 2, y: 480 }, tile: 38, tileH: 120, tilesY: 400 };
  }
  const page = { x: t.m, y: 500, w: w - 2 * t.m, h: 150 };
  const server = { x: t.m, y: 1000, w: w - 2 * t.m, h: 150 };
  return { page, server, vertical: true, say: { x: t.m, y: 1170, w: w - 2 * t.m }, chip: { x: w / 2, y: 825 }, tile: 36, tileH: 180, tilesY: 620 };
}

// Fixed, uneven spread of the dots across the lane.
const lane = (i: number) => ((i * 7) % 13) / 12;

const build: Build = (tl, q, cut) => {
  const g = geo(cut);
  const dots = q("[data-dot]");
  const n = q("[data-n]")[0];
  const says = q("[data-say]");
  const cards = q("[data-card]");
  const tiles = q("[data-tile]");
  const size = q("[data-size-n]")[0];

  tl.set([...dots, ...says, ...q("[data-counter]"), ...q("[data-chip]"), ...q("[data-tick]"), ...tiles, ...q("[data-size]")], { opacity: 0 }, 0);
  tl.set(q("[data-cross]"), { opacity: 1 }, 0);
  tl.set(tiles, { x: 0 }, 0);
  tl.set(n, { textContent: "0" }, 0);
  tl.set(size, { textContent: String(FROM) }, 0);

  const say = (i: number, at: number, until: number) => {
    tl.fromTo(says[i], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "site-out" }, at);
    tl.to(says[i], { opacity: 0, duration: 0.3, ease: "site-out" }, until);
  };

  enter(tl, cards, 0.3);

  // Dots travel page → server (left to right on laptop, down on phone).
  const travel = g.vertical ? g.server.y - (g.page.y + g.page.h) - 30 : g.server.x - (g.page.x + g.page.w) - 30;
  const fly = (k: number, at: number) => {
    dots.slice(0, k).forEach((el, i) => {
      const t = at + i * 0.14;
      tl.fromTo(el, { x: 0, y: 0, opacity: 1 }, { ...(g.vertical ? { y: travel } : { x: travel }), duration: 0.9, ease: "site-in-out" }, t);
      tl.to(el, { opacity: 0, duration: 0.15, ease: "site-out" }, t + 0.9);
      tl.set(n, { textContent: String(i + 1) }, t + 0.9);
    });
  };

  // Before: a bad build, about 13 requests per page view.
  enter(tl, q("[data-counter]"), 1.0);
  fly(BEFORE, 1.3);
  tl.to(q("[data-counter]"), { opacity: 0, duration: 0.3, ease: "site-out" }, 4.9);

  // The cause, then the fix.
  enter(tl, q("[data-chip]"), 5.2);
  say(0, 5.3, 7.6);
  tl.to(q("[data-cross]"), { opacity: 0, duration: 0.2, ease: "site-out" }, 7.0);
  tl.fromTo(q("[data-tick]"), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: "site-out" }, 7.1);
  tl.to(q("[data-chip]"), { opacity: 0, duration: 0.3, ease: "site-out" }, 7.9);

  // After: half the requests.
  tl.set(n, { textContent: "0" }, 8.1);
  enter(tl, q("[data-counter]"), 8.2);
  fly(AFTER, 8.5);
  tl.to(q("[data-counter]"), { opacity: 0, duration: 0.3, ease: "site-out" }, 10.6);
  say(1, 10.8, 12.6);

  // One response, compressed: 23 repeats merge into one.
  tl.to(cards, { opacity: 0, duration: 0.4, ease: "site-out" }, 12.9);
  tl.fromTo(tiles, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "site-out", stagger: 0.02 }, 13.4);
  enter(tl, q("[data-size]"), 13.8);
  const home = (i: number) => (MID - i) * (g.tile + 4);
  tiles.forEach((el, i) => {
    if (i === MID) return;
    const at = 15.2 + (Math.abs(i - MID) - 1) * 0.16;
    tl.to(el, { x: home(i), duration: 0.9, ease: "site-in-out" }, at);
    tl.to(el, { opacity: 0, duration: 0.2, ease: "site-out" }, at + 0.75);
  });
  const squeeze = 0.16 * (MID - 1) + 0.9;
  count(tl, size, FROM, TO, 15.2, squeeze, "site-in-out");
  say(2, 15.2 + squeeze + 0.4, 18.9);
  say(3, 19.2, 22.0);
  outro(tl, q, 22.0);
};

function Card({ x, y, w, h, title, rows }: { x: number; y: number; w: number; h: number; title: string; rows: number[] }) {
  const cut = useCut();
  const t = T[cut];
  return (
    <div data-card style={{ position: "absolute", left: x, top: y, width: w, height: h, boxShadow: "inset 0 0 0 1.5px var(--line)", padding: cut === "laptop" ? 20 : 28 }}>
      <div style={{ fontSize: t.label, fontWeight: 650, textTransform: "uppercase", letterSpacing: 0, marginBottom: cut === "laptop" ? 22 : 20 }}>{title}</div>
      {rows.map((r, i) => (
        <div key={i} style={{ height: cut === "laptop" ? 12 : 14, width: `${r * 100}%`, background: "var(--line)", marginBottom: 14 }} />
      ))}
    </div>
  );
}

export default function Traffic({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  const dot = cut === "laptop" ? 14 : 22;
  const row = TILES * (g.tile + 4) - 4;
  const tilesX = (w - row) / 2;
  const sayBelowTiles = g.tilesY + g.tileH + (cut === "laptop" ? 96 : 120);
  return (
    <Stage
      cut={cut}
      theme={theme}
      build={build}
      name="Traffic"
      headline={"Half the requests,\na fraction of the bytes"}
      label="Traffic film: a build cache bug had each page view hit the server about 13 times; fixed, about 6. One response compressed from 3.65 MB to 160 KB. In review."
    >
      <Card {...g.page} title="Page view" rows={cut === "laptop" ? [0.9, 0.7, 0.8, 0.5] : [0.5, 0.35]} />
      <Card {...g.server} title="Server" rows={cut === "laptop" ? [1, 1, 1] : [0.6, 0.6]} />

      {Array.from({ length: BEFORE }, (_, i) => {
        const left = g.vertical ? g.page.x + 40 + lane(i) * (g.page.w - 80) : g.page.x + g.page.w + 14;
        const top = g.vertical ? g.page.y + g.page.h + 14 : g.page.y + 30 + lane(i) * (g.page.h - 60);
        return <div key={i} data-dot style={{ position: "absolute", left, top, width: dot, height: dot, borderRadius: 999, background: "var(--ink)" }} />;
      })}

      <Text data-counter x={g.say.x} y={g.say.y} w={g.say.w} style={{ textAlign: g.vertical ? "left" : "center" }}>
        <span data-n style={{ fontVariantNumeric: "tabular-nums" }}>0</span> requests per page view
      </Text>

      <div
        data-chip
        style={{
          position: "absolute",
          left: g.chip.x,
          top: g.chip.y,
          transform: "translate(-50%, -50%)",
          height: cut === "laptop" ? 48 : 76,
          padding: cut === "laptop" ? "0 20px" : "0 30px",
          borderRadius: 999,
          boxShadow: "inset 0 0 0 1.5px var(--ink)",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          gap: cut === "laptop" ? 12 : 18,
          fontSize: t.label,
          fontWeight: 650,
          textTransform: "uppercase",
          letterSpacing: 0,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ position: "relative", width: cut === "laptop" ? 16 : 26, height: cut === "laptop" ? 16 : 26 }}>
          <svg data-cross viewBox="0 0 16 16" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
            <path d="M3 3l10 10M13 3L3 13" stroke="var(--ink)" strokeWidth="2" />
          </svg>
          <svg data-tick viewBox="0 0 16 16" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
            <path d="M2 8.5l4 4L14 4" stroke="var(--ink)" strokeWidth="2" fill="none" />
          </svg>
        </span>
        Build cache key
      </div>

      {Array.from({ length: TILES }, (_, i) => (
        <div key={i} data-tile style={{ position: "absolute", left: tilesX + i * (g.tile + 4), top: g.tilesY, width: g.tile, height: g.tileH, background: "var(--ink)" }}>
          <div style={{ position: "absolute", left: "30%", width: "40%", top: "28%", height: "12%", background: "var(--bg)" }} />
          <div style={{ position: "absolute", left: "30%", width: "40%", top: "60%", height: "12%", background: "var(--bg)" }} />
        </div>
      ))}
      <Text data-size x={t.m} y={g.tilesY + g.tileH + (cut === "laptop" ? 36 : 48)} w={w - 2 * t.m} style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
        One response: <span data-size-n>{FROM}</span> KB
      </Text>

      {/* The words, one at a time, where the eye is. */}
      <Text data-say x={g.say.x} y={g.chip.y + (cut === "laptop" ? 48 : 70)} w={g.vertical ? g.say.w : g.say.w} size="small" style={{ textAlign: "center" }}>
        The cache key was wrong, so good cache was thrown away. In review.
      </Text>
      <Text data-say x={g.say.x} y={g.say.y} w={g.say.w} style={{ textAlign: g.vertical ? "left" : "center" }}>
        6 per view: half the requests. In review.
      </Text>
      <Text data-say x={t.m} y={sayBelowTiles} w={w - 2 * t.m} size="small" style={{ textAlign: "center" }}>
        About 96% smaller. In review.
      </Text>
      <Text data-say x={t.m} y={sayBelowTiles} w={w - 2 * t.m} size="small" style={{ textAlign: "center" }}>
        Across the API: about 4.6 → 0.3 TB a month. Estimate.
      </Text>
    </Stage>
  );
}
