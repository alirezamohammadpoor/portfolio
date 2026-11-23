"use client";

/**
 * The shared stage of the highlights reel: a fixed 1080 x 1080 square scaled
 * to fit the viewport, the reel's type, and one way to run a section's master
 * timeline. Every section is one paused GSAP timeline, so the same code plays
 * in the browser, scrubs, and renders frame by frame (window.__reel).
 *
 * Query: ?speed=0.5 slows playback, ?render parks the timeline for a frame
 * renderer, ?t=3.2 parks it at a time.
 */

import { useLayoutEffect, useState, type ReactNode, type Ref } from "react";
import type gsap from "gsap";

export const SQ = 1080;
export const FONT = '"TWK Lausanne Pan", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** The text column and the screen share one left edge. */
export const COL = { x: 150, w: 780 };

export function ReelStage({ children, ref }: { children: ReactNode; ref: Ref<HTMLDivElement> }) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth, window.innerHeight) / SQ);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      <style>{`
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-350.woff2) format("woff2");font-weight:350;font-display:block}
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-650.woff2) format("woff2");font-weight:650;font-display:block}
`}</style>
      <div
        ref={ref}
        data-reel
        style={{
          position: "relative",
          width: SQ,
          height: SQ,
          flex: "none",
          background: "#fff",
          color: "#000",
          fontFamily: FONT,
          transform: `scale(${scale})`,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Expose the timeline and play it (click replays). Returns the cleanup. */
export function runReel(tl: gsap.core.Timeline, el: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  tl.timeScale(Number(params.get("speed") ?? "1") || 1);
  (window as unknown as { __reel?: gsap.core.Timeline }).__reel = tl;
  if (params.has("t")) {
    tl.pause().totalTime(Number(params.get("t")) || 0);
    return () => tl.kill();
  }
  if (params.has("render")) return () => tl.kill();
  const go = () => tl.play(0);
  const t = window.setTimeout(go, 400);
  el.addEventListener("click", go);
  return () => {
    window.clearTimeout(t);
    el.removeEventListener("click", go);
    tl.kill();
  };
}
