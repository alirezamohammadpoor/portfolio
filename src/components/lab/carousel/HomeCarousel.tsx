"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClosingLine } from "@/components/home/ScatterHome";
import type { BarData, BarRow } from "@/sanity/lib/bar";

export type Caption = "under" | "on" | "fixed";

// Drift speed in px/s, and how fast the row eases to a stop on hover (or back
// up to speed after): a per-second rate for an exponential approach.
const DRIFT = { desk: 36, phone: 24 };
const SETTLE = 5;
// The entrance: the row starts one screen to the right and glides into place
// while the drift is already running, so the two read as one motion.
const GLIDE_MS = 1600;
const glideEase = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Home as a drifting row of laptop videos (Ali, 11-17 grill): intro on top,
 * the row across the middle, closing line at the foot, one screen. The row
 * drifts left on a loop with every clip playing; hover (or a first tap on a
 * phone) eases it to a stop, pauses the other clips and shows that project's
 * description in one of three places. Click (second tap) opens the project.
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
      x -= speed * dt;
      const set = track.scrollWidth / 2;
      if (set > 0 && -x >= set) x += set;
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
      <p className={`${big ? "text-h3" : "text-body"} ${tone === "white" ? "text-white" : "text-primary"}`}>{r.title}</p>
      <p className={`mt-1 text-body ${tone === "white" ? "text-white/80" : "text-secondary"} line-clamp-2`}>{r.line}</p>
    </>
  );

  return (
    // pb-20 keeps the closing line clear of the lab picker.
    <div className="flex h-[calc(100dvh-var(--header-height))] flex-col overflow-hidden pb-20">
      {/* Opening statement, cols 1-7, as on the home today. */}
      <section className="px-margin pt-4 desktop:grid desktop:grid-cols-12 desktop:gap-4 desktop:pt-8">
        {/* One screen on a phone leaves no room for the h2 the home uses there. */}
        <h2 className="text-h3 desktop:col-start-1 desktop:col-end-8 desktop:text-h1">
          Frontend developer at the intersection of product and design. Currently at TRY, Stockholm.
        </h2>
      </section>

      {/* The row, centred in what is left of the screen. */}
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div ref={trackRef} className="flex w-max gap-3 will-change-transform desktop:gap-4" style={{ transform: "translate3d(100vw,0,0)" }}>
          {items.map((r, i) => {
            const on = active === i;
            return (
              <Link
                key={i}
                href={r.href}
                data-card={i}
                aria-hidden={i >= rows.length || undefined}
                tabIndex={i >= rows.length ? -1 : undefined}
                className="block w-[68vw] shrink-0 desktop:w-[30vw]"
                // Keyboard only: a tap focuses the link too, and must not count as the first tap.
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
                  // Touch: the first tap holds the card, the second opens it.
                  if (activeRef.current !== i) {
                    e.preventDefault();
                    touchHeld.current = true;
                    hold(i);
                  }
                }}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-tertiary">
                  {r.video ? (
                    <video
                      ref={(el) => {
                        videos.current[i] = el;
                      }}
                      data-i={i}
                      src={r.video}
                      poster={r.still ?? undefined}
                      className="absolute inset-0 h-full w-full object-cover"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : r.still ? (
                    // eslint-disable-next-line @next/next/no-img-element -- lab stand-in for a missing clip
                    <img src={r.still} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  {caption === "on" && (
                    <div
                      className={`absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.6),transparent)] p-3 pt-10 transition-opacity duration-[240ms] desktop:p-4 desktop:pt-12 ${on ? "opacity-100" : "opacity-0"}`}
                    >
                      {words(r, "white")}
                    </div>
                  )}
                </div>
                {caption === "under" && (
                  // Room is kept for the words so nothing shifts when they show.
                  <div className={`h-20 pt-3 transition-opacity duration-[240ms] ${on ? "opacity-100" : "opacity-0"}`}>
                    {words(r, "ink")}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Fixed spot: one caption block that swaps to whichever card is held. */}
      {caption === "fixed" && (
        <div className="h-24 px-margin desktop:grid desktop:h-28 desktop:grid-cols-12 desktop:gap-4">
          <div
            key={held?.href ?? "none"}
            className={`desktop:col-start-1 desktop:col-end-6 ${held ? "animate-[caption-in_240ms_cubic-bezier(0.23,1,0.32,1)_both]" : ""}`}
          >
            {held && words(held, "ink", true)}
          </div>
        </div>
      )}

      {bar.about && (
        <section className="px-margin desktop:grid desktop:grid-cols-12 desktop:gap-4">
          <p className="text-lead desktop:col-start-1 desktop:col-end-8">
            <ClosingLine contact={bar.about} />
          </p>
        </section>
      )}
      <style>{`@keyframes caption-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
