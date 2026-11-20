"use client";

import Stage, { swapText } from "./Stage";

// Traffic. Measured: origin requests per page view 12.8 after a bad build,
// 6.2 with the cache key fixed; one large API response 3.65 MB → 160 KB
// with compression (about 96% smaller).
const BEFORE = 13;
const AFTER = 6;
const PAGE = { x: 120, y: 300, w: 220, h: 280 };
const ORIGIN = { x: 940, y: 300, w: 220, h: 280 };
const BLOCK = 360;
const SHRINK = Math.sqrt(160 / 3650);

function dotY(i: number) {
  // Spread the dots over the lane in a fixed, uneven order.
  return PAGE.y + 40 + ((i * 7) % 13) * 16;
}

function build(tl: gsap.core.Timeline, q: (s: string) => Element[]) {
  const fade = q("[data-fade]");
  const dots = q("[data-dot]");
  const block = q("[data-block]");
  tl.set([...q("[data-cap='mid']"), ...q("[data-cap='after']"), ...q("[data-count='after']"), ...q("[data-size='after']")], { opacity: 0 }, 0);
  tl.set([...dots, ...block, ...q("[data-size='before']")], { opacity: 0 }, 0);
  tl.fromTo([...fade, ...q("[data-cap='before']"), ...q("[data-count='before']")], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "site-out", stagger: 0.07 }, 0);

  // One page view, every request it sends to the server.
  const fly = (n: number, at: number) => {
    dots.slice(0, n).forEach((el, i) => {
      const t = at + i * 0.12;
      tl.fromTo(el, { x: 0, opacity: 0 }, { x: ORIGIN.x - PAGE.x - PAGE.w - 24, opacity: 1, duration: 0.9, ease: "site-in-out" }, t);
      tl.to(el, { opacity: 0, duration: 0.2, ease: "site-out" }, t + 0.9);
    });
    return at + (n - 1) * 0.12 + 1.1;
  };
  const b = fly(BEFORE, 0.8);
  const a = b + 0.5;
  swapText(tl, q("[data-cap='before']"), q("[data-cap='mid']"), a);
  swapText(tl, q("[data-count='before']"), q("[data-count='after']"), a);
  const m = fly(AFTER, a + 0.6);

  // One response, before and after compression.
  const c = m + 0.6;
  swapText(tl, q("[data-cap='mid']"), q("[data-cap='after']"), c);
  tl.to([...q("[data-count='after']"), ...q("[data-lane]")], { opacity: 0, duration: 0.3, ease: "site-out" }, c);
  tl.fromTo(block, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.5, ease: "site-out" }, c + 0.3);
  tl.fromTo(q("[data-size='before']"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "site-out" }, c + 0.4);
  tl.to(block, { scale: SHRINK, duration: 0.9, ease: "site-in-out" }, c + 1.6);
  swapText(tl, q("[data-size='before']"), q("[data-size='after']"), c + 1.9);

  tl.to([...fade, ...block, ...q("[data-cap]"), ...q("[data-size]")], { opacity: 0, duration: 0.4, ease: "site-out" }, "+=2.4");
}

function Box({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: React.ReactNode }) {
  return (
    <div
      data-fade
      style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 12, background: "#f7f7f7", boxShadow: "inset 0 0 0 1px #d6d6d3", padding: 20 }}
    >
      {children}
    </div>
  );
}

export default function TrafficScene() {
  return (
    <Stage build={build} label="Traffic: a cache fix halved the requests each page view sends, and compression made one large response about 96% smaller.">
      <div data-fade style={{ position: "absolute", left: 96, top: 88, fontSize: 44, lineHeight: "52px" }}>
        Fewer requests, smaller responses
      </div>
      <div style={{ position: "absolute", left: 96, top: 152, fontSize: 24, lineHeight: "32px", color: "var(--color-secondary)" }}>
        <span data-cap="before" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          A build cache bug sent every page view to the server twice as often.
        </span>
        <span data-cap="mid" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          With the cache key fixed, each page view asks for half as much.
        </span>
        <span data-cap="after" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          Compressing the largest response made it a fraction of its size.
        </span>
      </div>

      <Box {...PAGE}>
        <div style={{ fontSize: 20, marginBottom: 20 }}>Page view</div>
        {[0.9, 0.7, 0.8, 0.5].map((w, i) => (
          <div key={i} style={{ height: 14, width: `${w * 100}%`, borderRadius: 4, background: "#dcdcd8", marginBottom: 14 }} />
        ))}
      </Box>
      <Box {...ORIGIN}>
        <div style={{ fontSize: 20, marginBottom: 20 }}>Server</div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 44, borderRadius: 6, background: "#dcdcd8", marginBottom: 12 }} />
        ))}
      </Box>

      <div data-lane>
        {Array.from({ length: BEFORE }, (_, i) => (
          <div
            key={i}
            data-dot
            style={{ position: "absolute", left: PAGE.x + PAGE.w + 12, top: dotY(i), width: 14, height: 14, borderRadius: 999, background: "#1a1a1a" }}
          />
        ))}
      </div>

      <div style={{ position: "absolute", left: PAGE.x, top: PAGE.y + PAGE.h + 32, fontSize: 24, lineHeight: "28px" }}>
        <span data-count="before" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          13 requests per page view
        </span>
        <span data-count="after" style={{ position: "absolute", whiteSpace: "nowrap" }}>
          6 requests per page view
        </span>
      </div>

      <div
        data-block
        style={{
          position: "absolute",
          left: 640 - BLOCK / 2,
          top: 260,
          width: BLOCK,
          height: BLOCK,
          borderRadius: 12,
          background: "var(--color-pistachio)",
          transformOrigin: "50% 50%",
        }}
      />
      <div style={{ position: "absolute", left: 640, top: 660, fontSize: 24, lineHeight: "28px" }}>
        <span data-size="before" style={{ position: "absolute", whiteSpace: "nowrap", transform: "translateX(-50%)" }}>
          3.6 MB
        </span>
        <span data-size="after" style={{ position: "absolute", whiteSpace: "nowrap", transform: "translateX(-50%)" }}>
          160 KB, about 96% smaller
        </span>
      </div>
    </Stage>
  );
}
