"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ease, prefersReducedMotion } from "@/lib/motion";
import { RING, ringB } from "./ring";

/** Gap share of the ring (path length 100): the one Cassini gap. */
const GAP = 4;
/** Dash offset that rests the gap at the front left (path starts at 3
 *  o'clock and runs clockwise on screen: 25 is 6 o'clock, 37 front left). */
const REST = 98 - 37;

/**
 * The cursor ring (ring brief, 11-26). Over a project the pointer gets a
 * level ring opened 26.7° with one gap. It arrives in orbit: the gap comes
 * round half a turn, front moving right to left like the carousel, and the
 * ring settles to full size, then holds still. It leaves faster than it came.
 * Touch has no hover: a press draws the ring once round the finger and it is
 * gone. Reduced motion: it only fades.
 */
export default function RingCursor({
  targets = "[data-card], [data-cover]",
}: {
  targets?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const ringRef = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const ring = ringRef.current;
    if (!svg || !ring) return;
    const reduce = prefersReducedMotion();
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const rx = hover ? 46 : 40;
    const box = rx * 2 + 8;
    svg.setAttribute("width", String(box));
    svg.setAttribute("height", String(box));
    svg.setAttribute("viewBox", `${-box / 2} ${-box / 2} ${box} ${box}`);
    ring.setAttribute("rx", String(rx));
    ring.setAttribute("ry", String(ringB(rx, RING.open.wide)));
    gsap.set(svg, { autoAlpha: 0, xPercent: -50, yPercent: -50 });
    const setX = gsap.quickSetter(svg, "x", "px");
    const setY = gsap.quickSetter(svg, "y", "px");
    const offset = { o: REST };
    const paint = () => ring.setAttribute("stroke-dashoffset", String(offset.o));
    paint();
    let tl: gsap.core.Timeline | null = null;

    const enter = () => {
      tl?.kill();
      tl = gsap.timeline();
      if (reduce) {
        offset.o = REST;
        paint();
        tl.to(svg, { autoAlpha: 1, scale: 1, duration: 0.16, ease: "none" });
        return;
      }
      // Half a turn in, the gap moving the way the front of the ring does.
      offset.o = REST + 50;
      paint();
      tl.fromTo(svg, { scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: ease.out }, 0);
      tl.to(offset, { o: REST, duration: 0.6, ease: ease.out, onUpdate: paint }, 0);
    };
    const leave = () => {
      tl?.kill();
      tl = gsap.timeline();
      tl.to(svg, { autoAlpha: 0, scale: reduce ? 1 : 0.85, duration: 0.16, ease: "none" });
    };

    const ac = new AbortController();
    const { signal } = ac;
    if (hover) {
      let inside = false;
      let down = false;
      window.addEventListener(
        "pointermove",
        (e) => {
          setX(e.clientX);
          setY(e.clientY);
          const over =
            !down &&
            !!(e.target as Element | null)?.closest?.(targets) &&
            !(e.target as Element).closest(".proto-picker");
          if (over && !inside) enter();
          else if (!over && inside) leave();
          inside = over;
        },
        { signal, passive: true },
      );
      // Dragging the row is not pointing at a project: the ring steps aside.
      window.addEventListener(
        "pointerdown",
        () => {
          down = true;
          if (inside) leave();
          inside = false;
        },
        { signal },
      );
      window.addEventListener("pointerup", () => (down = false), { signal });
      document.documentElement.addEventListener(
        "pointerleave",
        () => {
          if (inside) leave();
          inside = false;
        },
        { signal },
      );
    } else {
      window.addEventListener(
        "pointerdown",
        (e) => {
          if (e.pointerType === "mouse") return;
          if (!(e.target as Element | null)?.closest?.(targets)) return;
          setX(e.clientX);
          setY(e.clientY);
          tl?.kill();
          tl = gsap.timeline();
          if (reduce) {
            tl.set(ring, { attr: { "stroke-dasharray": `${100 - GAP} ${GAP}` } });
            tl.to(svg, { autoAlpha: 1, duration: 0.12, ease: "none" });
            tl.to(svg, { autoAlpha: 0, duration: 0.16, ease: "none" }, 0.36);
            return;
          }
          // Draw once round the finger (240 ms), then go.
          const draw = { d: 0 };
          const dash = () => ring.setAttribute("stroke-dasharray", `${draw.d} ${100 - draw.d}`);
          dash();
          tl.set(svg, { autoAlpha: 1, scale: 1 });
          tl.to(draw, { d: 100 - GAP, duration: 0.24, ease: ease.out, onUpdate: dash });
          tl.to(svg, { autoAlpha: 0, duration: 0.16, ease: "none" }, 0.3);
        },
        { signal, passive: true },
      );
    }
    return () => {
      ac.abort();
      tl?.kill();
    };
  }, [targets]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] text-white mix-blend-difference"
    >
      <ellipse
        ref={ringRef}
        cx="0"
        cy="0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        pathLength={100}
        strokeDasharray={`${100 - GAP} ${GAP}`}
      />
    </svg>
  );
}
