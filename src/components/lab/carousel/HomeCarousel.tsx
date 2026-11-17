"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClosingLine } from "@/components/home/ScatterHome";
import type { BarData, BarRow } from "@/sanity/lib/bar";

export type Caption = "on" | "fixed";

// Drift speed in px/s, and how fast the row eases to a stop on hover (or back
// up to speed after): a per-second rate for an exponential approach.
const DRIFT = { desk: 64, phone: 40 };
// A flick keeps the row going and dies away at this per-second rate.
const FRICTION = 3;
// Movement past this many px turns a press into a drag (no click, no tap).
const DRAG_SLOP = 6;
const SETTLE = 5;
// The entrance: the row starts one screen to the right and glides into place
// while the drift is already running, so the two read as one motion.
const GLIDE_MS = 1600;
const glideEase = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Home as a drifting row of laptop videos (Ali, 11-17 grill + review): one
 * screen in two rows, intro and closing line in the top half, the clips in
 * the bottom half bleeding to the bottom edge. The row drifts left on a loop
 * with every clip playing; the wheel, a trackpad or a drag moves it too.
 * Hover (or a first tap on a phone) eases it to a stop, pauses the other
 * clips and shows the description on the clip or in one fixed spot. Click
 * (second tap) opens the project.
 */
export default function HomeCarousel({
  bar,
  caption,
  replay,
}: {
  bar: BarData;
  caption: Caption;
  replay: number;
}) {
  const rows = bar.projects;
  // Two copies: one set is wider than any screen, so the second covers the
  // gap while the first wraps round.
  const items = [...rows, ...rows];
  const trackRef = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const activeRef = useRef<number | null>(null);
  const visible = useRef<Set<number>>(new Set());
  // A card held by a tap or keyboard focus, which the hover hit test must leave alone.
  const touchHeld = useRef(false);
  // Set when a press turned into a drag, so the click that ends it is dropped.
  const dragged = useRef(false);

  // Play what is on screen; while one card is held, only that one.
  const syncPlayback = useCallback(() => {
    videos.current.forEach((v, i) => {
      if (!v) return;
      const held = activeRef.current;
      const play = visible.current.has(i) && (held === null || held === i);
      if (play && v.paused) v.play().catch(() => {});
      else if (!play && !v.paused) v.pause();
    });
  }, []);

  const hold = useCallback(
    (i: number | null) => {
      activeRef.current = i;
      setActive(i);
      syncPlayback();
    },
    [syncPlayback],
  );

  // Only clips in view decode and play.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.i);
          if (e.isIntersecting) visible.current.add(i);
          else visible.current.delete(i);
        }
        syncPlayback();
      },
      { rootMargin: "0px 10% 0px 10%" },
    );
    videos.current.forEach((v) => v && io.observe(v));
    return () => io.disconnect();
  }, [syncPlayback, items.length]);

  // The drift + the glide in, one rAF loop writing one transform.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(min-width: 75rem)").matches;
    const top = reduced ? 0 : fine ? DRIFT.desk : DRIFT.phone;
    let x = 0;
    let speed = top;
    let last = performance.now();
    const start = last;
    let raf = 0;
    // Hover is a hit test each frame, not pointerenter: the row moves under a
    // resting cursor, and the browser doesn't re-fire enter for that.
    let mouse: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") mouse = { x: e.clientX, y: e.clientY };
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) mouse = null;
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerout", onOut);

    // Wheel and trackpad, anywhere on the (one screen) page: either axis
    // moves the row, straight away.
    let fling = 0;
    const onWheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : 1;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      x -= d * unit;
      fling = 0;
    };
    // Drag (finger or mouse): the row follows, and a flick carries on.
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
        touchHeld.current = false;
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
      // A pause before letting go means no flick.
      if (performance.now() - press.t > 80) fling = 0;
      press = null;
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onDrag);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);

    const frame = (now: number) => {
      if (mouse) {
        const card = document.elementFromPoint(mouse.x, mouse.y)?.closest<HTMLElement>("[data-card]");
        const i = card ? Number(card.dataset.card) : null;
        if (i !== activeRef.current) hold(i);
      } else if (activeRef.current !== null && !touchHeld.current) hold(null);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = activeRef.current === null ? top : 0;
      speed += (target - speed) * Math.min(1, dt * SETTLE);
      const pressed = press?.moved ?? false;
      if (!pressed) {
        x -= speed * dt;
        x += fling * dt;
        fling *= Math.exp(-FRICTION * dt);
      }
      const set = track.scrollWidth / 2;
      if (set > 0) {
        while (-x >= set) x += set;
        while (x > 0) x -= set;
      }
      const t = reduced ? 1 : Math.min(1, (now - start) / GLIDE_MS);
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
  }, [replay, hold]);

  // A tap outside the row lets it go again.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      if (!(e.target as HTMLElement).closest("[data-card]")) {
        touchHeld.current = false;
        hold(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [hold]);

  const held = active === null ? null : items[active];

  const words = (r: BarRow, tone: "ink" | "white", big = false) => (
    <>
      <p className={`${big ? "text-body desktop:text-h3" : "text-body"} ${tone === "white" ? "text-white" : "text-primary"}`}>{r.title}</p>
      <p className={`mt-1 text-body ${tone === "white" ? "text-white/80" : "text-secondary"} ${big ? "line-clamp-1 desktop:line-clamp-2" : "line-clamp-2"}`}>{r.line}</p>
    </>
  );

  return (
    // Two rows: the top half takes what the header leaves, the clips take the
    // bottom half of the screen and run to its bottom edge.
    <div className="flex h-[calc(100dvh-var(--header-height))] flex-col overflow-hidden">
      <section className="grid min-h-0 flex-1 grid-cols-4 grid-rows-[auto_auto_1fr] gap-x-3 px-margin pt-4 pb-6 desktop:grid-site desktop:pt-8 desktop:pb-8">
        {/* Opening statement, cols 1-7, as on the home today. A phone has room
            for the h3 size only, with the clips taking half the screen. */}
        <h2 className="col-span-4 text-h3 desktop:col-start-1 desktop:col-end-8 desktop:text-h1">
          Frontend developer at the intersection of product and design. Currently at TRY, Stockholm.
        </h2>
        {bar.about && (
          <p
            className={`col-span-4 col-start-1 row-start-2 mt-3 text-body desktop:col-start-1 desktop:col-end-8 desktop:mt-6 desktop:text-lead ${caption === "fixed" && held ? "invisible desktop:visible" : ""}`}
          >
            <ClosingLine contact={bar.about} />
          </p>
        )}
        {/* Fixed spot: one caption that swaps to whichever card is held, at
            the foot of the top half (cols 9-12 on the laptop). A phone has no
            spare room there, so it takes the closing line's place instead. */}
        {caption === "fixed" && (
          <div
            key={held?.href ?? "none"}
            className={`col-span-4 col-start-1 row-start-2 mt-3 self-start desktop:mt-0 desktop:self-end desktop:col-start-9 desktop:col-end-13 desktop:row-start-1 desktop:row-end-4 ${held ? "animate-[caption-in_240ms_cubic-bezier(0.23,1,0.32,1)_both]" : ""}`}
          >
            {held && words(held, "ink", true)}
          </div>
        )}
      </section>

      <div className="h-[50dvh] shrink-0 overflow-hidden">
        <div
          ref={trackRef}
          className="flex h-full w-max cursor-grab touch-none gap-3 select-none will-change-transform active:cursor-grabbing desktop:gap-4"
          style={{ transform: "translate3d(100vw,0,0)" }}
        >
          {items.map((r, i) => {
            const on = active === i;
            return (
              <Link
                key={i}
                href={r.href}
                data-card={i}
                aria-hidden={i >= rows.length || undefined}
                tabIndex={i >= rows.length ? -1 : undefined}
                // Laptop: the clip's own 16:10 at half the screen's height.
                // Phone: most of the width, cropped to the same height.
                className="relative block h-full w-[78vw] shrink-0 overflow-hidden bg-tertiary desktop:w-auto desktop:aspect-[16/10]"
                draggable={false}
                onFocus={(e) => {
                  if (!e.currentTarget.matches(":focus-visible")) return;
                  touchHeld.current = true;
                  hold(i);
                }}
                onBlur={() => {
                  touchHeld.current = false;
                  hold(null);
                }}
                onClick={(e) => {
                  if (dragged.current) {
                    dragged.current = false;
                    e.preventDefault();
                    return;
                  }
                  // Touch: the first tap holds the card, the second opens it.
                  if (activeRef.current !== i) {
                    e.preventDefault();
                    touchHeld.current = true;
                    hold(i);
                  }
                }}
              >
                {r.video ? (
                  <video
                    ref={(el) => {
                      videos.current[i] = el;
                    }}
                    data-i={i}
                    src={r.video}
                    poster={r.still ?? undefined}
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : r.still ? (
                  // eslint-disable-next-line @next/next/no-img-element -- lab stand-in for a missing clip
                  <img src={r.still} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
                ) : null}
                {caption === "on" && (
                  <div
                    className={`absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.6),transparent)] p-4 pt-16 transition-opacity duration-[240ms] desktop:p-6 desktop:pt-20 ${on ? "opacity-100" : "opacity-0"}`}
                  >
                    {words(r, "white", true)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes caption-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
