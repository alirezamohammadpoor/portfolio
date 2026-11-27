"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/viewTransitions";
import { getReelState } from "@/lib/reel";
import { prefersReducedMotion } from "@/lib/motion";
import { ClosingLine } from "@/components/home/ScatterHome";
import {
  Cover,
  STATEMENT,
  href,
  useEntrance,
  useOpenProject,
  type VariantProps,
} from "@/components/lab/home-layouts/shared";

// Slower than the laptop's 96 px/s: a phone screen is a third as wide, so
// the same speed reads as a rush. A touch holds the row; it picks up again
// once the finger has been off it for RESUME_MS.
const DRIFT = 40;
const SETTLE = 4;
const FRICTION = 2.6;
const DRAG_SLOP = 6;
const RESUME_MS = 2400;
// With no entry ring, the row glides in from the right.
const GLIDE_MS = 1400;
const glideEase = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * The laptop carousel on the phone: statement and closing line at the top,
 * a row of project windows near the thumb that drifts left on a loop. A
 * finger holds it, a drag moves it, a flick throws it; tap opens the
 * project. The window nearest the left margin is the one being read: its
 * title and line sit above the row and swap as the next one takes its
 * place.
 */
export default function PhoneCarousel({
  projects,
  contact,
  rootRef,
  entry = "glide",
  gap = 0,
}: VariantProps & {
  /** Px between the windows (Ali 11-26 18:13: none, a pixel, less). */
  gap?: number;
  entry?: "glide" | "stagger";
}) {
  useEntrance(rootRef);
  const open = useOpenProject(rootRef);
  const count = projects.length;
  const items = [...projects, ...projects];
  const trackRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const [lead, setLead] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = prefersReducedMotion();
    const top = reduced ? 0 : DRIFT;
    const glideOn = !reduced && entry === "glide" && getReelState() === "off";
    let x = 0;
    let speed = top;
    let last = performance.now();
    const start = last;
    let raf = 0;
    let fling = 0;
    let heldUntil = 0;
    let leadNow = 0;

    let press: { id: number; x: number; t: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      const reel = getReelState();
      if (reel === "waiting" || reel === "playing") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      press = { id: e.pointerId, x: e.clientX, t: performance.now(), moved: false };
      dragged.current = false;
      fling = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x;
      if (!press.moved && Math.abs(dx) < DRAG_SLOP) return;
      if (!press.moved) {
        press.moved = true;
        dragged.current = true;
        track.setPointerCapture(e.pointerId);
      }
      const t = performance.now();
      x += dx;
      fling = (dx / Math.max(1, t - press.t)) * 1000;
      press.x = e.clientX;
      press.t = t;
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      if (performance.now() - press.t > 80) fling = 0;
      press = null;
      heldUntil = performance.now() + RESUME_MS;
    };
    const onWheel = (e: WheelEvent) => {
      const reel = getReelState();
      if (reel === "waiting" || reel === "playing") return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : 1;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      x -= d * unit;
      fling = 0;
      heldUntil = performance.now() + RESUME_MS;
    };
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    track.addEventListener("wheel", onWheel, { passive: false });

    const frame = (now: number) => {
      const reel = getReelState();
      const entering = "entering" in document.documentElement.dataset;
      if (entering) speed = 0;
      if (reel === "waiting" || reel === "playing" || entering) {
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Held while a finger is on it, and for a moment after.
      const held = press !== null || now < heldUntil;
      speed += ((held ? 0 : top) - speed) * Math.min(1, dt * SETTLE);
      if (!(press?.moved ?? false)) {
        x -= speed * dt;
        x += fling * dt;
        fling *= Math.exp(-FRICTION * dt);
      }
      const first = track.children[0] as HTMLElement | undefined;
      const twin = track.children[count] as HTMLElement | undefined;
      const set = first && twin ? twin.offsetLeft - first.offsetLeft : track.scrollWidth / 2;
      // Wrap.
      if (set > 0) {
        let shift = 0;
        while (-(x + shift) >= set) shift += set;
        while (x + shift > 0) shift -= set;
        x += shift;
      }
      const t = glideOn ? Math.min(1, (now - start) / GLIDE_MS) : 1;
      const glide = (1 - glideEase(t)) * window.innerWidth;
      track.style.transform = `translate3d(${x + glide}px,0,0)`;
      // The lead: the window whose middle is closest to a window's width in
      // from the left edge, i.e. the one sitting where the first one starts.
      if (first) {
        const w = first.offsetWidth;
        let best = 0;
        let bestD = Infinity;
        for (let k = 0; k < track.children.length; k++) {
          const c = track.children[k] as HTMLElement;
          const mid = c.offsetLeft + x + glide + c.offsetWidth / 2;
          const d = Math.abs(mid - w / 2);
          if (d < bestD) {
            bestD = d;
            best = k % count;
          }
        }
        if (best !== leadNow) {
          leadNow = best;
          setLead(best);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
      track.removeEventListener("wheel", onWheel);
    };
  }, [entry, count]);

  const shown = projects[lead] ?? projects[0];

  return (
    <div
      ref={rootRef}
      className="flex flex-col"
      style={{ minHeight: "calc(100svh - var(--header-height))" }}
    >
      <section className="px-margin pt-8">
        <h2 data-statement className="text-h3">
          {STATEMENT}
        </h2>
        {contact && (
          <div data-item className="mt-4">
            <p data-text className="text-sub text-primary">
              <ClosingLine contact={contact} />
            </p>
          </div>
        )}
      </section>

      <div className="min-h-6 flex-1" />

      {shown && (
        <div data-item className="px-margin pb-1">
          <div data-text aria-live="polite">
            <span key={shown._id} className="block overflow-hidden">
              <span className="block animate-[carousel-rise_420ms_cubic-bezier(0.23,1,0.32,1)_both] text-h3">
                {shown.title}
              </span>
            </span>
            <span
              key={`${shown._id}-line`}
              className="mt-1 line-clamp-2 min-h-[2lh] animate-[carousel-fade_420ms_cubic-bezier(0.23,1,0.32,1)_60ms_both] text-sub text-primary"
            >
              {shown.shortDescription}
            </span>
          </div>
        </div>
      )}

      {/* The row, down to the bottom edge: whole 16:10 windows (Ali 11-26:
          the full width must show, no crop), 90 % of the screen wide so they
          stand tall, flush and touching, the next one peeking at the right. */}
      <div data-item className="mt-3 h-[calc(90vw*0.625)] shrink-0 overflow-hidden">
        <div
          ref={trackRef}
          data-reveal={entry === "glide" ? "" : undefined}
          data-lenis-prevent
          className="flex h-full w-max touch-pan-y select-none will-change-transform"
        >
          {items.map((project, i) => (
            <Link
              key={`${project._id}-${i}`}
              href={href(project)}
              data-card={i}
              aria-hidden={i >= count || undefined}
              tabIndex={i >= count ? -1 : undefined}
              draggable={false}
              className="block h-full w-[90vw] shrink-0"
              style={gap ? { marginRight: gap } : undefined}
              onClick={(e) => {
                if (dragged.current) {
                  dragged.current = false;
                  e.preventDefault();
                  return;
                }
                open(e, project);
              }}
            >
              <Cover
                project={project}
                mark={i < count}
                priority={i === 0}
                frame="bleed"
                className="pointer-events-none h-full w-full"
              />
            </Link>
          ))}
        </div>
      </div>

      <style>{`@keyframes carousel-rise{from{transform:translateY(105%)}to{transform:none}}@keyframes carousel-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
