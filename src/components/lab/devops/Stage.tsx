"use client";

/**
 * One devops film on a fixed stage, scaled to its box: laptop 1280 x 960
 * (4:3) or phone 1080 x 1350 (4:5). One GSAP timeline per film, looping.
 *
 * Deterministic like the test morphs: every change goes through the
 * timeline and nothing reads the clock, so a renderer can pause the
 * timeline on `window.__devops` and seek it frame by frame.
 *
 * Look: TRY's house brand (white, black, greys, TWK Lausanne Pan). The
 * font files are local only (public/lab-fonts, gitignored): previews
 * without them fall back to Helvetica; the rendered clips carry the
 * real face. `theme="site"` swaps in the portfolio's own colours.
 */

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { registerMotion } from "@/lib/motion";

registerMotion();

export type Cut = "laptop" | "phone";
export type Theme = "try" | "site";
export const SIZE: Record<Cut, { w: number; h: number }> = {
  laptop: { w: 1280, h: 960 },
  phone: { w: 1080, h: 1350 },
};

const THEMES: Record<Theme, CSSProperties> = {
  try: {
    "--bg": "#ffffff",
    "--ink": "#000000",
    "--muted": "#767676",
    "--line": "#e0e0e0",
    "--soft": "#f2f2f2",
    "--accent": "#000000",
    "--accent-ink": "#ffffff",
    "--font": '"TWK Lausanne Pan", "Helvetica Neue", Helvetica, Arial, sans-serif',
  } as CSSProperties,
  site: {
    "--bg": "#f7f7f7",
    "--ink": "#1a1a1a",
    "--muted": "#8f8f8f",
    "--line": "#e2e2e2",
    "--soft": "#ededeb",
    "--accent": "#bedcaa",
    "--accent-ink": "#1a1a1a",
    "--font": 'var(--font-sans)',
  } as CSSProperties,
};

/** Type and spacing per cut, in stage pixels. */
export const T = {
  laptop: { m: 80, head: 48, cap: 24, label: 14, fact: 22, small: 18 },
  phone: { m: 72, head: 76, cap: 38, label: 26, fact: 34, small: 30 },
};

const CutContext = createContext<Cut>("laptop");
export const useCut = () => useContext(CutContext);

type Q = (sel: string) => Element[];
/** Theme colours resolved to real values, for tweens that can't read var(). */
export type Colors = { bg: string; ink: string; muted: string; line: string; soft: string; accent: string; accentInk: string };
export type Build = (tl: gsap.core.Timeline, q: Q, cut: Cut, c: Colors) => void;

const FONT_CSS = `
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-350.woff2) format("woff2");font-weight:350;font-display:block}
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-400.woff2) format("woff2");font-weight:400;font-display:block}
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-650.woff2) format("woff2");font-weight:650;font-display:block}
`;

type Props = {
  cut: Cut;
  theme: Theme;
  build: Build;
  label: string;
  /** Film name, set small in capitals bottom left like TRY's slides. */
  name: string;
  headline: string;
  children: ReactNode;
};

export default function Stage({ cut, theme, build, label, name, headline, children }: Props) {
  const { w, h } = SIZE[cut];
  const t = T[cut];
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => setScale(box.clientWidth / w);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [w]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ctx: gsap.Context | null = null;
    let cancelled = false;
    // Measure text only once the brand face (or its fallback) is in.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      // Next keeps visited pages mounted but hidden: reverting the context
      // drops every tween and inline style when this unmounts or re-runs.
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ paused: true, repeat: reduced ? 0 : -1 });
        const q: Q = (sel) => gsap.utils.toArray<Element>(sel, stage);
        // The chrome (logo, headline, film name) never moves: the loop seam
        // lands on a chrome-only frame, so the first frame is that too.
        const cs = getComputedStyle(stage);
        const v = (n: string) => cs.getPropertyValue(n).trim();
        build(tl, q, cut, { bg: v("--bg"), ink: v("--ink"), muted: v("--muted"), line: v("--line"), soft: v("--soft"), accent: v("--accent"), accentInk: v("--accent-ink") });
        (window as unknown as { __devops?: gsap.core.Timeline }).__devops = tl;
        if (reduced) tl.progress(1);
        else tl.play(0);
      }, stage);
    });
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [build, cut, theme]);

  const headX = cut === "laptop" ? 640 : t.m;
  const headY = cut === "laptop" ? 56 : 160;
  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={label}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${w} / ${h}`, background: THEMES[theme]["--bg" as keyof CSSProperties] as string }}
    >
      <style>{FONT_CSS}</style>
      <div
        ref={stageRef}
        aria-hidden="true"
        data-stage
        style={{
          ...THEMES[theme],
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          visibility: scale ? "visible" : "hidden",
          background: "var(--bg)",
          color: "var(--ink)",
          fontFamily: "var(--font)",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          overflow: "hidden",
        }}
      >
        <CutContext.Provider value={cut}>
          <Logo x={t.m} y={cut === "laptop" ? 64 : 72} scale={cut === "laptop" ? 1 : 2} />
          <div
            data-chrome
            style={{ position: "absolute", left: headX, top: headY, width: w - headX - t.m, fontSize: t.head, lineHeight: 1.1, letterSpacing: "-0.02em", whiteSpace: "pre-line" }}
          >
            {headline}
          </div>
          <Label data-chrome x={t.m} y={h - (cut === "laptop" ? 64 : 80)}>
            {name}
          </Label>
          {children}
        </CutContext.Provider>
      </div>
    </div>
  );
}

function Logo({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <svg data-chrome width={68 * scale} height={20 * scale} viewBox="0 0 68 20" style={{ position: "absolute", left: x, top: y }} fill="var(--ink)">
      <path d="M40.26 4.18v8.6c0 1.68-1.39 3.04-3.09 3.04s-3.09-1.36-3.09-3.04v-8.6h6.18ZM44.52 0H29.82v12.79C29.82 16.77 33.11 20 37.17 20s7.35-3.23 7.35-7.21V0Z" />
      <path d="m33.5 12.1-3.01-2.95-8.03 7.88 3.01 2.96 8.03-7.89Z" />
      <path d="M59.18 0h-4.26v11.8h4.26V0Z" />
      <path d="m58.55 10.71-3.01-2.95-9.45 9.27 3.01 2.96 9.45-9.28Z" />
      <path d="m64.99 19.99 3.01-2.96-9.45-9.27-3.01 2.95 9.45 9.28Z" />
      <path d="M44.52 0H23.23v4.18h21.29V0Z" />
      <path d="M12.37 2.96H8.11v16.62h4.26V2.96Z" />
      <path d="M20.48 4.18V0H0v4.18h20.48Z" />
    </svg>
  );
}

type Pos = { x: number; y: number; w?: number; style?: CSSProperties; children: ReactNode; [data: `data-${string}`]: string | boolean | undefined };

/** Small capitals in the heavier weight, TRY's overline. */
export function Label({ x, y, w, style, children, ...data }: Pos) {
  const t = T[useCut()];
  return (
    <div {...data} style={{ position: "absolute", left: x, top: y, width: w, fontSize: t.label, fontWeight: 650, letterSpacing: 0, textTransform: "uppercase", lineHeight: 1.1, ...style }}>
      {children}
    </div>
  );
}

/** Plain text at a size from the cut's scale. */
export function Text({ x, y, w, size = "fact", style, children, ...data }: Pos & { size?: "cap" | "fact" | "small" | "head" }) {
  const t = T[useCut()];
  return (
    <div {...data} style={{ position: "absolute", left: x, top: y, width: w, fontSize: t[size], lineHeight: 1.2, ...style }}>
      {children}
    </div>
  );
}

/**
 * The caption under the headline: one line per beat, stacked in place.
 * `captionBeats` swaps them at the given times.
 */
export function Captions({ lines }: { lines: string[] }) {
  const cut = useCut();
  const t = T[cut];
  const { w } = SIZE[cut];
  const x = cut === "laptop" ? 640 : t.m;
  const y = cut === "laptop" ? 178 : 360;
  return (
    <>
      {lines.map((line, i) => (
        <div
          key={i}
          data-cap={i}
          style={{ position: "absolute", left: x, top: y, width: w - x - t.m, fontSize: t.cap, lineHeight: 1.25, color: "var(--muted)", fontWeight: 350 }}
        >
          {line}
        </div>
      ))}
    </>
  );
}

/** Show caption `i` at `times[i]`; the previous one lifts away first. */
export function captionBeats(tl: gsap.core.Timeline, q: Q, times: number[]) {
  const caps = q("[data-cap]");
  tl.set(caps, { opacity: 0 }, 0);
  times.forEach((at, i) => {
    if (i > 0) tl.to(caps[i - 1], { opacity: 0, y: -12, duration: 0.25, ease: "site-out" }, at);
    tl.fromTo(caps[i], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "site-out" }, i > 0 ? at + 0.15 : at);
  });
}

/** Count a number in an element from `from` to `to`, tween-driven so a
 * paused, seeked timeline renders it too (no callbacks). */
export function count(tl: gsap.core.Timeline, el: Element, from: number, to: number, at: number, duration: number, ease = "none") {
  tl.fromTo(el, { textContent: from }, { textContent: to, snap: { textContent: 1 }, duration, ease }, at);
}

/** Ease a set of elements in from below, staggered. */
export function enter(tl: gsap.core.Timeline, els: Element[], at: number, stagger = 0.07) {
  tl.fromTo(els, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "site-out", stagger }, at);
}

/** End of every film: fade the film's own layers, keep the chrome, so the
 * loop seam lands on the chrome-only frame the next pass starts from. */
export function outro(tl: gsap.core.Timeline, q: Q, at: number) {
  const layers = q("[data-stage] > *:not([data-chrome]):not(style)");
  tl.to(layers, { opacity: 0, duration: 0.5, ease: "site-out" }, at);
  tl.to({}, { duration: 0.4 }, at + 0.5);
}
