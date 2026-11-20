"use client";

import type gsap from "gsap";
import Stage, { SIZE, T, Text, count, enter, outro, useCut, type Build, type Cut, type Theme } from "../Stage";

// Three mocks for the traffic film's compression beat (Ali 11-20): one API
// response, 3.65 MB → 160 KB once compressed (in review). One thing moves at
// a time and the words sit right under the payload.
const FROM = 3650;
const TO = 160;
const SIDE = Math.sqrt(TO / FROM); // each side of an area-true shrink, about 0.21

const centre = (cut: Cut) => (cut === "laptop" ? { x: 640, y: 520 } : { x: 540, y: 800 });

/** Size readout and the one line under the payload. */
function Readout({ y }: { y: number }) {
  const cut = useCut();
  const t = T[cut];
  const { w } = SIZE[cut];
  return (
    <>
      <Text data-size x={t.m} y={y} w={w - 2 * t.m} style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
        <span data-size-n>{FROM}</span> KB
      </Text>
      <Text data-line x={t.m} y={y + t.fact * 1.6} w={w - 2 * t.m} size="small" style={{ textAlign: "center", color: "var(--muted)" }}>
        About 96% smaller. In review.
      </Text>
    </>
  );
}

function frame(tl: gsap.core.Timeline, q: (s: string) => Element[], squeezeAt: number, squeezeFor: number) {
  const n = q("[data-size-n]")[0];
  tl.set(q("[data-line]"), { opacity: 0 }, 0);
  tl.set(n, { textContent: String(FROM) }, 0);
  enter(tl, q("[data-size]"), 0.6);
  count(tl, n, FROM, TO, squeezeAt, squeezeFor, "site-in-out");
  enter(tl, q("[data-line]"), squeezeAt + squeezeFor + 0.4);
  outro(tl, q, squeezeAt + squeezeFor + 3.2);
}

/* A: the response's text folds down into a packet. */

const LINES = [
  "{",
  '  "products": [',
  "    {",
  '      "id": 10482,',
  '      "title": "Linen shirt",',
  '      "variants": [ … 48 ],',
  '      "images": [ … 12 ],',
  '      "related": [ … 24 ],',
  "    },",
  '    { "id": 10483, … },',
  '    { "id": 10484, … },',
  "  ]",
  "}",
];

function geoA(cut: Cut) {
  const c = centre(cut);
  const w = cut === "laptop" ? 440 : 700;
  const lh = cut === "laptop" ? 24 : 36;
  const pad = cut === "laptop" ? 24 : 36;
  const h = LINES.length * lh + 2 * pad;
  return { x: c.x - w / 2, y: c.y - h / 2, w, h, lh, pad };
}

const buildA: Build = (tl, q, cut) => {
  const g = geoA(cut);
  const card = q("[data-card]")[0];
  const lines = q("[data-l]");
  const fill = q("[data-fill]")[0];
  tl.set(card, { opacity: 0, scale: 1 }, 0);
  tl.set(lines, { y: 0, opacity: 1 }, 0);
  tl.set(fill, { opacity: 0 }, 0);
  tl.fromTo(card, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "site-out" }, 0.3);
  // Step one: the repeated lines fold onto each other.
  lines.forEach((el, i) => {
    tl.to(el, { y: -(i - (LINES.length - 1) / 2) * g.lh * 0.92, duration: 1.4, ease: "site-in-out" }, 2.0);
    tl.to(el, { opacity: 0.25, duration: 1.4, ease: "site-in-out" }, 2.0);
  });
  // Step two: what's left packs into a solid packet.
  tl.to(card, { scale: SIDE * 1.4, duration: 1.4, ease: "site-in-out" }, 3.5);
  tl.to(fill, { opacity: 1, duration: 0.6, ease: "site-out" }, 3.9);
  frame(tl, q, 2.0, 2.9);
};

function SqueezeA({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geoA(cut);
  const t = T[cut];
  return (
    <Stage cut={cut} theme={theme} build={buildA} name="Compression A" headline={"One response,\ncompressed"} label="Compression mock A: a response's text folds down into a small packet, 3.65 MB to 160 KB.">
      <div data-card style={{ position: "absolute", left: g.x, top: g.y, width: g.w, height: g.h, boxShadow: "inset 0 0 0 1.5px var(--ink)", background: "var(--bg)", transformOrigin: "50% 50%" }}>
        {LINES.map((l, i) => (
          <div
            key={i}
            data-l
            style={{ position: "absolute", left: g.pad, top: g.pad + i * g.lh, height: g.lh, fontSize: t.small, lineHeight: `${g.lh}px`, fontFamily: "ui-monospace, Menlo, monospace", whiteSpace: "pre", color: "var(--ink)", letterSpacing: 0 }}
          >
            {l}
          </div>
        ))}
        <div data-fill style={{ position: "absolute", inset: 0, background: "var(--ink)" }} />
      </div>
      <Readout y={g.y + g.h + (cut === "laptop" ? 40 : 60)} />
    </Stage>
  );
}

/* B: the parcel vacuum-packs around its contents. */

const ITEMS = [
  [0.12, 0.18], [0.46, 0.1], [0.78, 0.22],
  [0.2, 0.55], [0.55, 0.45], [0.82, 0.62],
  [0.1, 0.82], [0.42, 0.8], [0.7, 0.86],
];

function geoB(cut: Cut) {
  const c = centre(cut);
  const w = cut === "laptop" ? 460 : 720;
  const h = cut === "laptop" ? 340 : 520;
  const item = cut === "laptop" ? 40 : 60;
  return { c, x: c.x - w / 2, y: c.y - h / 2, w, h, item, gap: cut === "laptop" ? 4 : 6, wall: cut === "laptop" ? 3 : 4 };
}

const buildB: Build = (tl, q, cut) => {
  const g = geoB(cut);
  const box = q("[data-box]")[0];
  const items = q("[data-item]");
  tl.set(box, { opacity: 0, left: g.x, top: g.y, width: g.w, height: g.h }, 0);
  tl.set(items, { opacity: 0, x: 0, y: 0, scale: 1 }, 0);
  tl.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "site-out" }, 0.3);
  tl.fromTo(items, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: "site-out", stagger: 0.04 }, 0.5);
  // Step one: the contents pack together.
  const s = 0.5;
  const cell = g.item * s + g.gap;
  items.forEach((el, i) => {
    const [fx, fy] = ITEMS[i];
    const from = { x: g.x + fx * (g.w - g.item) + g.item / 2, y: g.y + fy * (g.h - g.item) + g.item / 2 };
    const to = { x: g.c.x + ((i % 3) - 1) * cell, y: g.c.y + (Math.floor(i / 3) - 1) * cell };
    tl.to(el, { x: to.x - from.x, y: to.y - from.y, scale: s, duration: 1.3, ease: "site-in-out" }, 2.0);
  });
  // Step two: the walls close in.
  const bw = g.w * SIDE;
  const bh = g.h * SIDE;
  tl.to(box, { left: g.c.x - bw / 2, top: g.c.y - bh / 2, width: bw, height: bh, duration: 1.3, ease: "site-in-out" }, 3.5);
  frame(tl, q, 2.0, 2.8);
};

function SqueezeB({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geoB(cut);
  return (
    <Stage cut={cut} theme={theme} build={buildB} name="Compression B" headline={"One response,\ncompressed"} label="Compression mock B: a parcel vacuum-packs around its contents, 3.65 MB to 160 KB.">
      <div data-box style={{ position: "absolute", left: g.x, top: g.y, width: g.w, height: g.h, boxShadow: `inset 0 0 0 ${g.wall}px var(--ink)` }} />
      {ITEMS.map(([fx, fy], i) => (
        <div
          key={i}
          data-item
          style={{
            position: "absolute",
            left: g.x + fx * (g.w - g.item),
            top: g.y + fy * (g.h - g.item),
            width: g.item,
            height: g.item,
            borderRadius: i % 3 === 1 ? 999 : 4,
            background: i % 2 ? "var(--ink)" : "var(--muted)",
          }}
        />
      ))}
      <Readout y={g.y + g.h + (cut === "laptop" ? 40 : 60)} />
    </Stage>
  );
}

/* C: 23 repeated tiles merge into one (3650 / 160 ≈ 23). */

const TILES = Math.round(FROM / TO);

function geoC(cut: Cut) {
  const c = centre(cut);
  const tile = cut === "laptop" ? 38 : 36;
  const gap = 4;
  const row = TILES * (tile + gap) - gap;
  const h = cut === "laptop" ? 120 : 180;
  return { c, tile, gap, h, x: c.x - row / 2, y: c.y - h / 2 };
}

const buildC: Build = (tl, q, cut) => {
  const g = geoC(cut);
  const tiles = q("[data-tile]");
  tl.set(tiles, { opacity: 0, x: 0 }, 0);
  tl.fromTo(tiles, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "site-out", stagger: 0.02 }, 0.3);
  // Every repeat slides home onto the one tile that stays, left to right.
  const home = g.c.x - g.tile / 2;
  tiles.forEach((el, i) => {
    // Nearest repeats first, so the row closes in on the middle.
    const at = 2.0 + (Math.abs(i - Math.floor(TILES / 2)) - 1) * 0.16;
    const dx = home - (g.x + i * (g.tile + g.gap));
    tl.to(el, { x: dx, duration: 0.9, ease: "site-in-out" }, at);
    if (i !== Math.floor(TILES / 2)) tl.to(el, { opacity: 0, duration: 0.2, ease: "site-out" }, at + 0.75);
  });
  frame(tl, q, 2.0, 0.16 * (Math.floor(TILES / 2) - 1) + 0.9);
};

function SqueezeC({ cut, theme }: { cut: Cut; theme: Theme }) {
  const g = geoC(cut);
  return (
    <Stage cut={cut} theme={theme} build={buildC} name="Compression C" headline={"One response,\ncompressed"} label="Compression mock C: 23 repeated tiles merge into one, 3.65 MB to 160 KB.">
      {Array.from({ length: TILES }, (_, i) => (
        <div key={i} data-tile style={{ position: "absolute", left: g.x + i * (g.tile + g.gap), top: g.y, width: g.tile, height: g.h, background: "var(--ink)" }}>
          <div style={{ position: "absolute", left: "30%", width: "40%", top: "28%", height: "12%", background: "var(--bg)" }} />
          <div style={{ position: "absolute", left: "30%", width: "40%", top: "60%", height: "12%", background: "var(--bg)" }} />
        </div>
      ))}
      <Readout y={g.y + g.h + (cut === "laptop" ? 40 : 60)} />
    </Stage>
  );
}

export { SqueezeA, SqueezeB, SqueezeC };
