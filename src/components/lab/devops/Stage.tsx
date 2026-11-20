"use client";

/**
 * One devops film: a fixed 1280 x 960 stage (4:3, the gallery's landscape
 * clip shape) scaled to its box, driven by one GSAP timeline that loops.
 *
 * Same determinism as the test morphs: every change goes through the
 * timeline and nothing reads the clock, so the film can later be seeked
 * frame by frame for a recording. The timeline sits on `window.__devops`.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { registerMotion } from "@/lib/motion";

registerMotion();

export const W = 1280;
export const H = 960;

type Props = {
  build: (tl: gsap.core.Timeline, q: (sel: string) => Element[]) => void;
  children: ReactNode;
  label: string;
};

export default function Stage({ build, children, label }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => setScale(box.clientWidth / W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Next keeps visited pages mounted but hidden: the context reverts every
    // tween and inline style when this unmounts or re-runs.
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, repeat: reduced ? 0 : -1, repeatDelay: 0.6 });
      build(tl, (sel) => gsap.utils.toArray<Element>(sel, stage));
      (window as unknown as { __devops?: gsap.core.Timeline }).__devops = tl;
      if (reduced) tl.progress(1);
      else tl.play(0);
    }, stage);
    return () => ctx.revert();
  }, [build]);

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={label}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${W} / ${H}`, background: "#ededeb" }}
    >
      <div
        ref={stageRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          visibility: scale ? "visible" : "hidden",
          fontFamily: "var(--font-sans)",
          color: "var(--color-primary)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Two lines of text that swap in place: the outgoing one lifts away, the
 * incoming one rises in. Both stay in the DOM so the swap is one tween. */
export function swapText(tl: gsap.core.Timeline, out: Element[], into: Element[], at: number | string) {
  tl.to(out, { y: -16, opacity: 0, duration: 0.3, ease: "site-out" }, at);
  tl.fromTo(into, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "site-out" }, `<0.12`);
}
