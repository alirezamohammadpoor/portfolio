"use client";

import { useLayoutEffect, useRef } from "react";
import type { Project } from "@/components/lab/home-layouts/shared";

/**
 * Ways to show which project is up, and where it sits in the order (Ali
 * 11-26, after the "01 / 06" eyebrow came out). Picked with `?order=` or the
 * picker's Order button (O). The continuous ones read `--pos` off the page
 * root: the position in projects, fractional while the strip or row moves
 * (0 = first project in place, 1.5 = halfway from the second to the third).
 */
export type OrderMode = "rail" | "ticks" | "dots" | "names" | "next";
export const ORDER_MODES: { key: OrderMode; name: string }[] = [
  { key: "rail", name: "Rail" },
  { key: "ticks", name: "Ticks" },
  { key: "dots", name: "Dots" },
  { key: "names", name: "Names" },
  { key: "next", name: "Next up" },
];

const OUT = "cubic-bezier(0.23,1,0.32,1)";

export default function Order({
  mode,
  projects,
  active,
}: {
  mode: OrderMode;
  projects: Project[];
  /** The project being read (whole number). */
  active: number;
}) {
  const count = projects.length;
  if (count < 2) return null;

  if (mode === "rail") {
    // One thumb a project wide on a hairline track, carried by the finger
    // (it is the strip's own position, not a step after it). Past the last
    // project the thumb leaves on the right and its twin comes in on the
    // left, the way the loop does.
    const thumb = (shift: number) => ({
      width: `${100 / count}%`,
      transform: `translateX(calc((var(--pos, 0) - ${shift}) * 100%))`,
    });
    return (
      <div aria-hidden="true" className="px-margin">
        <div className="relative h-[2px] overflow-hidden bg-tertiary">
          <span className="absolute inset-y-0 left-0 bg-primary" style={thumb(0)} />
          <span className="absolute inset-y-0 left-0 bg-primary" style={thumb(count)} />
        </div>
      </div>
    );
  }

  if (mode === "ticks") {
    // A segment per project across the width, the current one filled.
    return (
      <div aria-hidden="true" className="flex gap-1 px-margin">
        {projects.map((p, k) => (
          <span
            key={p._id}
            className="h-[2px] flex-1 transition-colors duration-300"
            style={{
              backgroundColor: k === active ? "var(--color-primary)" : "var(--color-tertiary)",
            }}
          />
        ))}
      </div>
    );
  }

  if (mode === "dots") {
    // Dots, the current one stretched into a pill (width eases, so the
    // pill seems to slide from one dot to the next).
    return (
      <div aria-hidden="true" className="flex justify-center gap-1.5 px-margin">
        {projects.map((p, k) => (
          <span
            key={p._id}
            className="h-1.5 rounded-full"
            style={{
              width: k === active ? 18 : 6,
              backgroundColor: k === active ? "var(--color-primary)" : "var(--color-tertiary)",
              transition: `width 400ms ${OUT}, background-color 300ms ${OUT}`,
            }}
          />
        ))}
      </div>
    );
  }

  if (mode === "names") return <Names projects={projects} active={active} />;

  // Next up: what the next swipe brings, so the order is felt one step
  // ahead. No label (Ali: no eyebrows), just the arrow and the name.
  const next = projects[(active + 1) % count];
  return (
    <div className="flex gap-2 px-margin text-sub text-secondary">
      <span aria-hidden="true">→</span>
      <span className="block overflow-hidden">
        <span
          key={next._id}
          className="block animate-[order-rise_420ms_cubic-bezier(0.23,1,0.32,1)_both]"
        >
          {next.title}
        </span>
      </span>
      <style>{`@keyframes order-rise{from{transform:translateY(105%)}to{transform:none}}`}</style>
    </div>
  );
}

/** Every name in order on one line; the line slides so the current name
 *  sits at the margin, the ones after it trailing off to the right. */
function Names({ projects, active }: { projects: Project[]; active: number }) {
  const rowRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = rowRef.current;
    const el = row?.children[active] as HTMLElement | undefined;
    if (row && el) row.style.transform = `translateX(${-el.offsetLeft}px)`;
  }, [active]);
  return (
    <div aria-hidden="true" className="overflow-hidden px-margin">
      <div
        ref={rowRef}
        className="flex w-max gap-4 text-sub"
        style={{ transition: `transform 500ms ${OUT}` }}
      >
        {projects.map((p, k) => (
          <span
            key={p._id}
            className="whitespace-nowrap transition-colors duration-300"
            style={{ color: k === active ? "var(--color-primary)" : "var(--color-secondary)" }}
          >
            {p.title}
          </span>
        ))}
      </div>
    </div>
  );
}
