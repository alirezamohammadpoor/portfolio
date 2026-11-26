"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Link } from "@/lib/viewTransitions";
import { getReelState } from "@/lib/reel";
import { ease, prefersReducedMotion } from "@/lib/motion";
import { ClosingLine } from "@/components/home/ScatterHome";
import Order, { type OrderMode } from "./Order";
import {
  Cover,
  STATEMENT,
  href,
  useEntrance,
  useOpenProject,
  type VariantProps,
} from "@/components/lab/home-layouts/shared";

// Slower than the laptop's 64 px/s: a phone screen is a third as wide, so
// the same speed reads as a rush. A touch holds the row; it picks up again
// once the finger has been off it for RESUME_MS.
const DRIFT = 26;
const SETTLE = 4;
const FRICTION = 2.6;
const DRAG_SLOP = 6;
const RESUME_MS = 2400;
// With no entry ring, the row glides in from the right.
const GLIDE_MS = 1400;
const glideEase = (t: number) => 1 - Math.pow(1 - t, 4);
// Step (Ali 11-26, "automatically moves"): the row rests on a window, then
// moves one window on by itself. A rest long enough to take in a clip, a
// move short enough to feel like a page turn; a release snaps to a window.
const STEP_REST_MS = 3200;
const STEP_MS = 800;
const SNAP_MS = 450;

/**
 * The laptop carousel on the phone: statement and closing line at the top,
 * a row of project windows near the thumb that drifts left on a loop. A
 * finger holds it, a drag moves it, a flick throws it; tap opens the
 * project. The window nearest the left margin is the one being read: its
 * title and line sit above the row and swap as the next one takes its
 * place. Hints under the row say how and leave once used.
 */
export default function PhoneCarousel({
  projects,
  contact,
  rootRef,
  entry = "glide",
  motion = "drift",
  order = "rail",
  reserve = 0,
}: VariantProps & {
  /** "drift": the row glides on at a steady speed. "step": it rests on one
   *  window at a time and moves on by itself, one window per step. */
  motion?: "drift" | "step";
  /** How the place in the order shows, under the row. */
  order?: OrderMode;
  /** Lab only: px kept free at the foot for the prototype picker. */
  reserve?: number;
  entry?: "glide" | "stagger";
}) {
  useEntrance(rootRef);
  const open = useOpenProject(rootRef);
  const count = projects.length;
  const items = [...projects, ...projects];
  const trackRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const [lead, setLead] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = prefersReducedMotion();
    const stepping = motion === "step";
    const top = reduced || stepping ? 0 : DRIFT;
    // Step mode: the move under way (x eases from `from` to `to`).
    let anim: { from: number; to: number; t0: number; ms: number } | null = null;
    let nextStepAt = performance.now() + STEP_REST_MS;
    const cardW = () => (track.children[0] as HTMLElement | undefined)?.offsetWidth ?? 0;
    const moveTo = (to: number, ms: number, now: number) => {
      anim = reduced ? null : { from: x, to, t0: now, ms };
      if (reduced) x = to;
    };
    const glideOn = !reduced && entry === "glide" && getReelState() === "off";
    let x = 0;
    let speed = top;
    let last = performance.now();
    const start = last;
    let raf = 0;
    let fling = 0;
    let heldUntil = 0;
    let leadNow = 0;
    let hinted = false;
    const used = () => {
      if (hinted || !hintRef.current) return;
      hinted = true;
      gsap.to(hintRef.current, { autoAlpha: 0, duration: 0.3, ease: ease.out });
    };

    let press: { id: number; x: number; t: number; moved: boolean } | null = null;
    // Where the row was when the finger went down (step mode's snap).
    let pressX0 = 0;
    const onDown = (e: PointerEvent) => {
      const reel = getReelState();
      if (reel === "waiting" || reel === "playing") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      press = { id: e.pointerId, x: e.clientX, t: performance.now(), moved: false };
      dragged.current = false;
      fling = 0;
      anim = null;
      pressX0 = x;
    };
    const onMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x;
      if (!press.moved && Math.abs(dx) < DRAG_SLOP) return;
      if (!press.moved) {
        press.moved = true;
        dragged.current = true;
        track.setPointerCapture(e.pointerId);
        used();
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
      const now = performance.now();
      heldUntil = now + RESUME_MS;
      nextStepAt = now + RESUME_MS;
      // Step mode: a release without a throw settles on the nearest window
      // (a throw settles once it has slowed, in the frame loop).
      const w = cardW();
      if (stepping && w && Math.abs(fling) <= 300) {
        fling = 0;
        // A drag past a fifth of a window turns the page that way; less
        // springs back to the window it started on.
        const d = x - pressX0;
        const k =
          Math.abs(d) > w * 0.2
            ? d < 0
              ? Math.floor(x / w)
              : Math.ceil(x / w)
            : Math.round(x / w);
        moveTo(k * w, SNAP_MS, now);
      }
    };
    const onWheel = (e: WheelEvent) => {
      const reel = getReelState();
      if (reel === "waiting" || reel === "playing") return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : 1;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      x -= d * unit;
      fling = 0;
      anim = null;
      heldUntil = performance.now() + RESUME_MS;
      nextStepAt = heldUntil;
      used();
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
      if (stepping && !press) {
        const w = cardW();
        if (Math.abs(fling) > 300) {
          // still thrown
        } else if (fling !== 0 && w) {
          // A throw that has slowed settles on the window it is heading to.
          const to = (fling < 0 ? Math.floor(x / w) : Math.ceil(x / w)) * w;
          fling = 0;
          moveTo(to, SNAP_MS, now);
        } else if (anim) {
          const a: { from: number; to: number; t0: number; ms: number } = anim;
          const p = Math.min(1, (now - a.t0) / a.ms);
          x = a.from + (a.to - a.from) * glideEase(p);
          if (p >= 1) {
            anim = null;
            nextStepAt = Math.max(nextStepAt, now + STEP_REST_MS);
          }
        } else if (!held && now >= nextStepAt && w && !reduced) {
          moveTo(Math.round(x / w) * w - w, STEP_MS, now);
        } else if (!held && reduced && now >= nextStepAt && w) {
          x = Math.round(x / w) * w - w;
          nextStepAt = now + STEP_REST_MS;
        }
      }
      const first = track.children[0] as HTMLElement | undefined;
      const twin = track.children[count] as HTMLElement | undefined;
      const set = first && twin ? twin.offsetLeft - first.offsetLeft : track.scrollWidth / 2;
      // Wrap (a move under way shifts with it, so it lands the same).
      if (set > 0) {
        let shift = 0;
        while (-(x + shift) >= set) shift += set;
        while (x + shift > 0) shift -= set;
        x += shift;
        if (anim && shift) anim = { ...anim, from: anim.from + shift, to: anim.to + shift };
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
        // The place in the order, fractional as the row moves (every window
        // is the same width).
        const pos = (((-(x + glide) / w) % count) + count) % count;
        rootRef.current?.style.setProperty("--pos", String(pos));
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
  }, [entry, count, rootRef, motion]);

  const shown = projects[lead] ?? projects[0];

  return (
    <div
      ref={rootRef}
      className="flex flex-col"
      style={{ minHeight: "calc(100svh - var(--header-height))", paddingBottom: reserve }}
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

      {/* The row: windows 78 % of the screen wide (inset, so 16 px of page
          colour round each recording), the next one in view at the right. */}
      <div
        data-item
        className="shrink-0 overflow-hidden"
        style={{ height: "calc(78vw * 0.625 + 32px)" }}
      >
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
              className="block h-full shrink-0"
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
                hug
                className="pointer-events-none h-full w-auto"
              />
            </Link>
          ))}
        </div>
      </div>

      <div data-item className="pt-3">
        <div data-text>
          <Order mode={order} projects={projects} active={lead} />
        </div>
      </div>

      <div
        ref={hintRef}
        data-item
        className="flex justify-between px-margin pb-4 pt-3 text-sub uppercase text-secondary"
      >
        <span data-text>Drag ← →</span>
        <span data-text>Tap to view</span>
      </div>
      <style>{`@keyframes carousel-rise{from{transform:translateY(105%)}to{transform:none}}@keyframes carousel-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
