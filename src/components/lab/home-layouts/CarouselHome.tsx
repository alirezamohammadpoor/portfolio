"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  type Project,
  type VariantProps,
} from "./shared";

// Drift speed in px/s (Ali 11-26: a bit faster than 64); the rate the row eases to a stop on hover (or back up
// to speed after); a flick's friction; the px that turn a press into a drag.
const DRIFT = 96;
const SETTLE = 5;
const FRICTION = 3;
const DRAG_SLOP = 6;
// The entrance: the row starts one screen to the right and glides into the
// drift (skipped when the entry ring has just landed on the row).
const GLIDE_MS = 1600;
const glideEase = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Carousel (Elodie Fabbri's reel, with recordings): one screen, the
 * statement and closing line in the top half, a row of project windows in
 * the bottom half that drifts left on a loop. Wheel, trackpad or a drag move
 * it; hover eases it to a stop, pauses the other clips and shows the held
 * project's line in one fixed spot top right. Click opens the project.
 * Ported from the parked carousel lab (11-17), now on the project window.
 */
export default function CarouselHome({
  projects,
  contact,
  rootRef,
  entry = "glide",
  gap = 0,
}: VariantProps & {
  /** Px between the recordings (Ali 11-26 18:13: none, a pixel, less). */
  gap?: number;
  /** With no entry ring: "glide" slides the row in from the right; "stagger"
   *  leaves the row in place for the caller to bring the cards in one by one
   *  (/lab/home-intro, Ali 11-26). */
  entry?: "glide" | "stagger";
}) {
  useEntrance(rootRef);
  const open = useOpenProject(rootRef);
  const count = projects.length;
  // The recordings run flush and touching, down to the bottom edge (Ali
  // 11-26: no gap), whatever the lab's frame switch says.
  // Two copies: one set is wider than any screen, so the second covers the
  // gap while the first wraps round. Only the first set carries the marks
  // the entry ring and the morph look for.
  const items = [...projects, ...projects];
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const activeRef = useRef<number | null>(null);
  const dragged = useRef(false);

  const hold = useCallback((i: number | null) => {
    activeRef.current = i;
    setActive(i);
  }, []);

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
    // Hover is a hit test each frame: the row moves under a resting cursor,
    // and the browser doesn't re-fire pointerenter for that.
    let mouse: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") mouse = { x: e.clientX, y: e.clientY };
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) mouse = null;
    };
    let fling = 0;
    let movingUntil = 0;
    const onWheel = (e: WheelEvent) => {
      // A wheel under the entry ring only skips it; the row stays on the
      // slots the ring is landing on.
      const reel = getReelState();
      if (reel === "waiting" || reel === "playing") return;
      const unit = e.deltaMode === 1 ? 16 : 1;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      x -= d * unit;
      fling = 0;
      movingUntil = performance.now() + 350;
    };
    let press: { id: number; x: number; t: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      press = { id: e.pointerId, x: e.clientX, t: performance.now(), moved: false };
      dragged.current = false;
      fling = 0;
    };
    const onDrag = (e: PointerEvent) => {
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
      movingUntil = t + 350;
      fling = (dx / Math.max(1, t - press.t)) * 1000;
      press.x = e.clientX;
      press.t = t;
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      if (performance.now() - press.t > 80) fling = 0;
      press = null;
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerout", onOut);
    window.addEventListener("wheel", onWheel, { passive: true });
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onDrag);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);

    const frame = (now: number) => {
      // The row holds still under the entry ring, which lands every project
      // in its slot; it starts drifting once the ring has handed over.
      const reel = getReelState();
      // Stagger entry (Ali 11-26): the row stands still until the last
      // window has dropped in (the lab clears data-entering), then eases
      // up to speed from rest.
      const entering = "entering" in document.documentElement.dataset;
      if (entering) speed = 0;
      if (reel === "waiting" || reel === "playing" || entering) {
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      const moving = now < movingUntil || (press?.moved ?? false) || Math.abs(fling) > 30;
      if (moving) {
        if (activeRef.current !== null) hold(null);
      } else if (mouse) {
        const card = document
          .elementFromPoint(mouse.x, mouse.y)
          ?.closest<HTMLElement>("[data-card]");
        const i = card ? Number(card.dataset.card) : null;
        // A card focused from the keyboard keeps the row held while the
        // cursor rests somewhere else.
        const focused = i === null && track.querySelector(":focus-visible") !== null;
        if (i !== activeRef.current && !focused) hold(i);
      } else if (activeRef.current !== null && !track.contains(document.activeElement)) hold(null);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = activeRef.current === null ? top : 0;
      speed += (target - speed) * Math.min(1, dt * SETTLE);
      if (!(press?.moved ?? false)) {
        x -= speed * dt;
        x += fling * dt;
        fling *= Math.exp(-FRICTION * dt);
      }
      // One set's width, from the first card to its twin (the leading margin
      // belongs to the first card only, so half the track is 4 px off).
      const first = track.children[0] as HTMLElement | undefined;
      const twin = track.children[count] as HTMLElement | undefined;
      const set = first && twin ? twin.offsetLeft - first.offsetLeft : track.scrollWidth / 2;
      if (set > 0) {
        while (-x >= set) x += set;
        while (x > 0) x -= set;
      }
      const t = glideOn ? Math.min(1, (now - start) / GLIDE_MS) : 1;
      const glide = (1 - glideEase(t)) * window.innerWidth;
      track.style.transform = `translate3d(${x + glide}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("wheel", onWheel);
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onDrag);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
    };
  }, [hold, entry, count]);

  const held: Project | null = active === null ? null : items[active];

  return (
    <div
      ref={rootRef}
      className="flex h-[calc(100svh-var(--header-height))] flex-col overflow-hidden"
    >
      <section className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[auto_auto_1fr] gap-x-4 px-margin pb-8 pt-12">
        <h2 data-statement className="col-start-1 col-end-8 text-h1">
          {STATEMENT}
        </h2>
        {contact && (
          <div data-item className="col-start-1 col-end-8 row-start-2 mt-6">
            <p data-text className="text-lead">
              <ClosingLine contact={contact} />
            </p>
          </div>
        )}
        <div
          key={held?._id ?? "none"}
          className={`col-start-9 col-end-13 row-start-1 row-end-4 self-end ${held ? "animate-[caption-in_240ms_cubic-bezier(0.23,1,0.32,1)_both]" : ""}`}
        >
          {held && (
            <>
              <p className="text-h3">{held.title}</p>
              <p className="mt-1 line-clamp-2 text-body text-primary">{held.shortDescription}</p>
            </>
          )}
        </div>
      </section>

      <div data-item className="h-[60svh] shrink-0 overflow-hidden">
        <div
          ref={trackRef}
          data-reveal={entry === "glide" ? "" : undefined}
          className="flex h-full w-max cursor-grab touch-none select-none will-change-transform active:cursor-grabbing"
        >
          {items.map((project, i) => (
            <Link
              key={`${project._id}-${i}`}
              href={href(project)}
              data-card={i}
              aria-hidden={i >= count || undefined}
              tabIndex={i >= count ? -1 : undefined}
              draggable={false}
              className="block h-full shrink-0"
              style={gap ? { marginRight: gap } : undefined}
              onFocus={() => hold(i)}
              onBlur={() => hold(null)}
              onClick={(e) => {
                if (dragged.current) {
                  dragged.current = false;
                  e.preventDefault();
                  return;
                }
                // The second set opens from its twin in the first set.
                open(e, project);
              }}
            >
              <Cover
                project={project}
                mark={i < count}
                playing={active === null || active === i}
                priority={i === 0}
                frame="flush"
                className="pointer-events-none h-full w-auto"
              />
            </Link>
          ))}
        </div>
      </div>
      <style>{`@keyframes caption-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
