"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/lib/viewTransitions";
import { getReelState } from "@/lib/reel";
import { prefersReducedMotion } from "@/lib/motion";
import { ClosingLine } from "./ClosingLine";
import {
  Cover,
  STATEMENT,
  href,
  useEntrance,
  useOpenProject,
  type Project,
  type CarouselProps,
} from "./carousel";

// Memoised here, not in carousel.tsx: a hover change re-renders only the
// covers whose `playing` flips, not all 2N of them.
const RowCover = memo(Cover);

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
 * The Saturn intro lands the first projects in their slots, then the row
 * starts to drift.
 */
export default function CarouselHome({ projects, contact, rootRef }: CarouselProps) {
  useEntrance(rootRef);
  const open = useOpenProject();
  const count = projects.length;
  // The recordings run flush and touching, down to the bottom edge (Ali
  // 11-26: no gap).
  // Two copies: one set is wider than any screen, so the second covers the
  // gap while the first wraps round. Only the first set carries the marks
  // the intro looks for.
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
    const glideOn = !reduced && getReelState() === "off";
    let x = 0;
    let speed = top;
    let last = performance.now();
    const start = last;
    let raf = 0;
    // Hover is a hit test each frame: the row moves under a resting cursor,
    // and the browser doesn't re-fire pointerenter for that. The test is
    // arithmetic on measurements cached on resize (each card's offset and
    // width, one set's width), not a layout read per frame; the row's band
    // on screen is read on pointer moves only.
    let lefts: number[] = [];
    let widths: number[] = [];
    let set = 0;
    const measure = () => {
      // Relative to the track: both carry its translate, so the difference
      // is where a card sits in the row.
      const cards = Array.from(track.children) as HTMLElement[];
      const origin = track.getBoundingClientRect().left;
      const rects = cards.map((c) => c.getBoundingClientRect());
      lefts = rects.map((r) => r.left - origin);
      widths = rects.map((r) => r.width);
      set = cards[count] ? lefts[count] - lefts[0] : track.scrollWidth / 2;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    let band: DOMRect | null = null;
    let mouse: { x: number; y: number } | null = null;
    // Whether the row is what the cursor is on, not something over it (the
    // open Work or About panel and its scrim): one elementFromPoint on each
    // move and every OCCLUDE_MS, not every frame.
    let onRow = false;
    let checkedAt = 0;
    const OCCLUDE_MS = 200;
    const checkOnRow = (now: number) => {
      checkedAt = now;
      const el = mouse && document.elementFromPoint(mouse.x, mouse.y);
      onRow = Boolean(el && track.contains(el));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouse = { x: e.clientX, y: e.clientY };
      band = track.parentElement?.getBoundingClientRect() ?? null;
      checkOnRow(performance.now());
    };
    let shiftNow = 0;
    const cardAt = (px: number, py: number): number | null => {
      if (!onRow || !band || py < band.top || py >= band.bottom || px < band.left || px >= band.right) return null;
      const local = px - band.left - shiftNow;
      for (let k = 0; k < lefts.length; k++) {
        if (local >= lefts[k] && local < lefts[k] + widths[k]) return k;
      }
      return null;
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
      if (reel === "waiting" || reel === "playing") {
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      const moving = now < movingUntil || (press?.moved ?? false) || Math.abs(fling) > 30;
      if (moving) {
        if (activeRef.current !== null) hold(null);
      } else if (mouse) {
        if (now - checkedAt > OCCLUDE_MS) checkOnRow(now);
        const i = cardAt(mouse.x, mouse.y);
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
      // One set's width (measured), from the first card to its twin: the
      // leading margin belongs to the first card only.
      if (set > 0) {
        while (-x >= set) x += set;
        while (x > 0) x -= set;
      }
      const t = glideOn ? Math.min(1, (now - start) / GLIDE_MS) : 1;
      const glide = (1 - glideEase(t)) * window.innerWidth;
      shiftNow = x + glide;
      track.style.transform = `translate3d(${shiftNow}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("wheel", onWheel);
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onDrag);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
    };
  }, [hold, count]);

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
          data-reveal
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
              onFocus={() => hold(i)}
              onBlur={() => hold(null)}
              onClick={(e) => {
                if (dragged.current) {
                  dragged.current = false;
                  e.preventDefault();
                  return;
                }
                open(e, project);
              }}
            >
              <RowCover
                project={project}
                mark={i < count}
                playing={active === null || active === i}
                priority={i === 0}
                frame="flush"
                sizes="96vh"
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
