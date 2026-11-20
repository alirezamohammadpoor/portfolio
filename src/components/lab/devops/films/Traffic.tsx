"use client";

import Stage, { Captions, SIZE, T, Text, captionBeats, count, enter, outro, useCut, type Build, type Cut, type Theme } from "../Stage";

// Script film 3. Measured: origin requests per page view 12.8 after a bad
// build, 6.2 with the cache key fixed; one API response 3.65 MB → 160 KB
// with compression (about 96% smaller); outbound 4.6 → 0.3 TB a month is
// an estimate from usage. Fixes are in review.
const BEFORE = 13;
const AFTER = 6;
const SQUEEZE = 160 / 3650;

function geo(cut: Cut) {
  const { w } = SIZE[cut];
  const t = T[cut];
  if (cut === "laptop") {
    const page = { x: t.m, y: 310, w: 280, h: 340 };
    const server = { x: w - t.m - 280, y: 310, w: 280, h: 340 };
    return { page, server, vertical: false, counter: { x: t.m, y: 690 }, mid: { x: w / 2, y: 480 }, strip: { x: 400, w: 480, y: 456, h: 48 }, factY: 690 };
  }
  const page = { x: t.m, y: 500, w: w - 2 * t.m, h: 150 };
  const server = { x: t.m, y: 1000, w: w - 2 * t.m, h: 150 };
  return { page, server, vertical: true, counter: { x: t.m, y: 1180 }, mid: { x: w / 2, y: 825 }, strip: { x: 120, w: w - 240, y: 795, h: 60 }, factY: 1180 };
}

// Fixed, uneven spread of the dots across the lane.
const lane = (i: number) => ((i * 7) % 13) / 12;

const build: Build = (tl, q, cut) => {
  const g = geo(cut);
  const dots = q("[data-dot]");
  const n = q("[data-n]")[0];
  const strip = q("[data-strip]");
  const plates = q("[data-plate]");
  const size = q("[data-size-n]")[0];

  captionBeats(tl, q, [0.2, 1.5, 4.5, 6.1, 8.6, 12.4]);
  tl.set([...dots, ...q("[data-counter]"), ...q("[data-chip]"), ...q("[data-tick]"), ...strip, ...plates, ...q("[data-size]"), ...q("[data-fact]")], { opacity: 0 }, 0);
  tl.set(q("[data-cross]"), { opacity: 1 }, 0);
  tl.set(strip, { scaleX: 1, x: 0, y: 0 }, 0);
  tl.set(plates, { x: 0 }, 0);
  enter(tl, q("[data-card]"), 0.3);

  // Dots travel page → server (left to right on laptop, down on phone).
  const travel = g.vertical ? g.server.y - (g.page.y + g.page.h) - 30 : g.server.x - (g.page.x + g.page.w) - 30;
  const fly = (k: number, at: number) => {
    dots.slice(0, k).forEach((el, i) => {
      const t = at + i * 0.12;
      const to = g.vertical ? { y: travel } : { x: travel };
      const from = g.vertical ? { y: 0 } : { x: 0 };
      tl.fromTo(el, { ...from, opacity: 1 }, { ...to, duration: 0.9, ease: "site-in-out" }, t);
      tl.to(el, { opacity: 0, duration: 0.15, ease: "site-out" }, t + 0.9);
      tl.set(n, { textContent: String(i + 1) }, t + 0.9);
    });
    return at + (k - 1) * 0.12 + 1.05;
  };

  tl.set(n, { textContent: "0" }, 0);
  enter(tl, q("[data-counter]"), 1.5);
  fly(BEFORE, 1.7);

  // The cause: a wrong build cache key, then fixed.
  enter(tl, q("[data-chip]"), 4.6);
  tl.to(q("[data-cross]"), { opacity: 0, duration: 0.2, ease: "site-out" }, 5.5);
  tl.fromTo(q("[data-tick]"), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: "site-out" }, 5.6);

  // Half the requests.
  tl.set(n, { textContent: "0" }, 6.2);
  fly(AFTER, 6.3);

  // One response through the press.
  tl.to([...q("[data-chip]"), ...q("[data-counter]")], { opacity: 0, duration: 0.3, ease: "site-out" }, 8.5);
  enter(tl, [...strip, ...plates, ...q("[data-size]")], 8.8, 0.05);
  tl.set(size, { textContent: "3650" }, 0);
  const span = g.strip.w;
  const half = (span * (1 - SQUEEZE)) / 2;
  tl.to(strip, { scaleX: SQUEEZE, duration: 1.4, ease: "site-in-out" }, 9.7);
  tl.to(plates[0], { x: half - 6, duration: 1.4, ease: "site-in-out" }, 9.7);
  tl.to(plates[1], { x: -half + 6, duration: 1.4, ease: "site-in-out" }, 9.7);
  count(tl, size, 3650, 160, 9.7, 1.4, "site-in-out");
  tl.to(plates, { opacity: 0, duration: 0.3, ease: "site-out" }, 11.2);
  // The small response reaches the page.
  const toPage = g.vertical ? { y: -(g.strip.y - (g.page.y + g.page.h) - 10) } : { x: -(g.mid.x - (g.page.x + g.page.w) - 20) };
  tl.to(strip, { ...toPage, duration: 0.8, ease: "site-in-out" }, 11.4);

  enter(tl, q("[data-fact]"), 12.6);
  outro(tl, q, 15.2);
};

function Card({ x, y, w, h, title, rows }: { x: number; y: number; w: number; h: number; title: string; rows: number[] }) {
  const cut = useCut();
  const t = T[cut];
  return (
    <div data-card style={{ position: "absolute", left: x, top: y, width: w, height: h, boxShadow: "inset 0 0 0 1.5px var(--line)", padding: cut === "laptop" ? 20 : 28 }}>
      <div style={{ fontSize: t.label, fontWeight: 650, textTransform: "uppercase", letterSpacing: 0, marginBottom: cut === "laptop" ? 22 : 20 }}>{title}</div>
      {rows.map((r, i) => (
        <div key={i} style={{ height: cut === "laptop" ? 12 : 14, width: `${r * 100}%`, background: "var(--line)", marginBottom: cut === "laptop" ? 14 : 14 }} />
      ))}
    </div>
  );
}

export default function Traffic({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geo(cut);
  const t = T[cut];
  const { w } = SIZE[cut];
  const dot = cut === "laptop" ? 14 : 22;
  return (
    <Stage
      cut={cut}
      theme={theme}
      build={build}
      name="Traffic"
      headline={"Half the requests,\na fraction of the bytes"}
      label="Traffic film: a build cache bug had each page view hit the server about 13 times; fixed, about 6. One response compressed from 3.65 MB to 160 KB. In review."
    >
      <Captions
        lines={[
          "Every page view asks the server for data.",
          "After a bad build, each page view hit the server about 13 times.",
          "The cache key was wrong, so good cache was thrown away. In review.",
          "Fixed: about 6 per view, half the requests.",
          "One response, compressed: about 96% smaller. In review.",
          "Across the API, the same fix cuts outbound traffic. Estimate.",
        ]}
      />
      <Card {...g.page} title="Page view" rows={cut === "laptop" ? [0.9, 0.7, 0.8, 0.5] : [0.5, 0.35]} />
      <Card {...g.server} title="Server" rows={cut === "laptop" ? [1, 1, 1] : [0.6, 0.6]} />

      {Array.from({ length: BEFORE }, (_, i) => {
        const left = g.vertical ? g.page.x + 40 + lane(i) * (g.page.w - 80) : g.page.x + g.page.w + 14;
        const top = g.vertical ? g.page.y + g.page.h + 14 : g.page.y + 30 + lane(i) * (g.page.h - 60);
        return <div key={i} data-dot style={{ position: "absolute", left, top, width: dot, height: dot, borderRadius: 999, background: "var(--ink)" }} />;
      })}

      <Text data-counter x={g.counter.x} y={g.counter.y} w={w - 2 * t.m}>
        <span data-n style={{ fontVariantNumeric: "tabular-nums" }}>0</span> requests per page view
      </Text>

      <div
        data-chip
        style={{
          position: "absolute",
          left: g.mid.x,
          top: g.mid.y,
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

      <div
        data-strip
        style={{
          position: "absolute",
          left: g.strip.x,
          top: g.strip.y,
          width: g.strip.w,
          height: g.strip.h,
          transformOrigin: "50% 50%",
          background: "repeating-linear-gradient(90deg, var(--ink) 0 10px, var(--line) 10px 16px)",
        }}
      />
      {[0, 1].map((i) => (
        <div
          key={i}
          data-plate
          style={{
            position: "absolute",
            left: i === 0 ? g.strip.x - 12 : g.strip.x + g.strip.w,
            top: g.strip.y - (cut === "laptop" ? 36 : 44),
            width: 12,
            height: g.strip.h + (cut === "laptop" ? 72 : 88),
            background: "var(--ink)",
          }}
        />
      ))}
      <Text data-size x={g.mid.x - 300} y={g.strip.y + g.strip.h + (cut === "laptop" ? 52 : 64)} w={600} style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
        <span data-size-n>3650</span> KB
      </Text>

      <Text data-fact x={t.m} y={g.factY} w={w - 2 * t.m} size="small" style={{ color: "var(--muted)" }}>
        Outbound traffic across the API: about 4.6 → 0.3 TB a month, estimated from usage.
      </Text>
    </Stage>
  );
}
