"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Link } from "@/lib/viewTransitions";
import { getReelState, useReelState } from "@/lib/reel";
import { useIntroState } from "@/lib/intro";
import { ease, prefersReducedMotion } from "@/lib/motion";
import {
  Cover,
  STATEMENT,
  href,
  useEntrance,
  useOpenProject,
  type VariantProps,
} from "@/components/lab/home-layouts/shared";

// A release past this share of the strip, or faster than FLICK px/ms, goes
// to the next project; anything less springs back.
const COMMIT = 0.22;
const FLICK = 0.35;
const DRAG_SLOP = 6;
// Wheel: one gesture, one project (the old home's rule: a gesture ends after
// 150 ms of silence or on a change of direction).
const SILENCE_MS = 150;

/**
 * Flush (the old phone home, Mar–Nov, on the new covers): one project at a
 * time in a strip that runs edge to edge across the phone, its title and
 * line above it. You swipe inside the strip to the next one; the strip
 * follows the finger and the release decides (a short flick is enough). It
 * loops. A single nudge shows the next cover's edge if nobody has touched
 * it a moment after landing.
 */
export default function FlushHome({ projects, rootRef }: VariantProps & {}) {
  useEntrance(rootRef);
  const open = useOpenProject(rootRef);
  const count = projects.length;
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  // The title shown above the strip runs a step ahead of `current` while
  // the strip is still moving.
  const [title, setTitle] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const drag = useRef(0);
  const moved = useRef(false);
  const touched = useRef(false);
  const tween = useRef<gsap.core.Tween | null>(null);
  // Set while a release is carrying the strip on to the next project.
  const committing = useRef(false);

  /** Every slide placed round the current one: the next ones after it, the
   *  one before it on the other side. `d` is the drag in px. */
  const layout = useCallback(
    (d: number) => {
      const i = currentRef.current;
      slideRefs.current.forEach((el, k) => {
        if (!el) return;
        let p = (((k - i) % count) + count) % count;
        if (p === count - 1 && (d > 0 || count > 2)) p = -1;
        el.style.transform = `translate3d(calc(${p * 100}% + ${d}px),0,0)`;
      });
    },
    [count],
  );

  useLayoutEffect(() => {
    currentRef.current = current;
    drag.current = 0;
    layout(0);
  }, [current, layout]);

  /** Animates the drag to `to` px, then (with a direction) moves on. */
  const settle = useCallback(
    (dir: -1 | 0 | 1, velocity = 0) => {
      const strip = stripRef.current;
      if (!strip) return;
      const size = strip.offsetWidth;
      const to = -dir * size;
      const reduce = prefersReducedMotion();
      const left = Math.abs(to - drag.current);
      // A faster release lands sooner (0.28-0.5 s), never slower than the
      // finger was moving.
      const duration = reduce
        ? 0
        : Math.min(0.5, Math.max(0.28, velocity ? left / (Math.abs(velocity) * 1000) : 0.45));
      tween.current?.kill();
      const proxy = { d: drag.current };
      if (dir !== 0) {
        // The title swaps as the strip starts to move, so the words and
        // the picture travel together.
        const next = (currentRef.current + dir + count) % count;
        setTitle(next);
        committing.current = true;
      }
      tween.current = gsap.to(proxy, {
        d: to,
        duration,
        ease: ease.out,
        onUpdate: () => {
          drag.current = proxy.d;
          layout(proxy.d);
        },
        onComplete: () => {
          tween.current = null;
          committing.current = false;
          if (dir !== 0) setCurrent((c) => (c + dir + count) % count);
        },
      });
    },
    [count, layout],
  );

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const blocked = () => {
      const r = getReelState();
      return r === "waiting" || r === "playing";
    };
    let press: { id: number; start: number; last: number; t: number; v: number } | null = null;
    const pos = (e: PointerEvent) => e.clientX;
    const onDown = (e: PointerEvent) => {
      if (blocked() || (e.pointerType === "mouse" && e.button !== 0)) return;
      // A move already on its way to the next project finishes first (it
      // lasts at most half a second); a spring back can be caught.
      if (committing.current) return;
      touched.current = true;
      tween.current?.kill();
      tween.current = null;
      // A press mid-settle picks the strip up where it is.
      press = { id: e.pointerId, start: pos(e) - drag.current, last: pos(e), t: e.timeStamp, v: 0 };
      moved.current = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const p = pos(e);
      const d = p - press.start;
      if (!moved.current && Math.abs(d) < DRAG_SLOP) return;
      if (!moved.current) {
        moved.current = true;
        strip.setPointerCapture(e.pointerId);
      }
      const dt = Math.max(1, e.timeStamp - press.t);
      press.v = (p - press.last) / dt;
      press.last = p;
      press.t = e.timeStamp;
      drag.current = d;
      layout(d);
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const size = strip.offsetWidth;
      // A finger that stopped before lifting carries no flick.
      const v = e.timeStamp - press.t > 80 ? 0 : press.v;
      press = null;
      if (!moved.current && drag.current === 0) return;
      const d = drag.current;
      const dir: -1 | 0 | 1 =
        Math.abs(v) > FLICK ? (v < 0 ? 1 : -1) : Math.abs(d) > size * COMMIT ? (d < 0 ? 1 : -1) : 0;
      settle(dir, dir ? v : 0);
    };

    let lastWheelAt = 0;
    let lastSign = 0;
    let consumed = false;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (blocked()) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const now = performance.now();
      if (now - lastWheelAt > SILENCE_MS || Math.sign(delta) !== lastSign) consumed = false;
      lastWheelAt = now;
      lastSign = Math.sign(delta);
      if (consumed || Math.abs(delta) < 2 || tween.current) return;
      consumed = true;
      touched.current = true;
      settle(delta > 0 ? 1 : -1);
    };

    strip.addEventListener("pointerdown", onDown);
    strip.addEventListener("pointermove", onMove);
    strip.addEventListener("pointerup", onUp);
    strip.addEventListener("pointercancel", onUp);
    strip.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      strip.removeEventListener("pointerdown", onDown);
      strip.removeEventListener("pointermove", onMove);
      strip.removeEventListener("pointerup", onUp);
      strip.removeEventListener("pointercancel", onUp);
      strip.removeEventListener("wheel", onWheel);
      tween.current?.kill();
    };
  }, [layout, settle]);

  // One nudge, once the page has landed and nobody has touched the strip:
  // the strip leans a little towards the next cover and comes back, so the
  // next one is seen to be there (a hint, not a move: it never commits).
  const introDone = useIntroState() === "done";
  const reel = useReelState();
  const landed = introDone && (reel === "off" || reel === "done");
  useEffect(() => {
    if (!landed || prefersReducedMotion()) return;
    const id = window.setTimeout(() => {
      if (touched.current || tween.current) return;
      const proxy = { d: 0 };
      const tl = gsap.timeline({
        onUpdate: () => layout(proxy.d),
        onComplete: () => layout(0),
      });
      tl.to(proxy, { d: -44, duration: 0.45, ease: ease.inOut }).to(proxy, {
        d: 0,
        duration: 0.6,
        ease: ease.out,
      });
      // Any touch ends the nudge where it is and hands over.
      const stop = () => {
        tl.kill();
        drag.current = proxy.d;
      };
      stripRef.current?.addEventListener("pointerdown", stop, { once: true, capture: true });
    }, 1600);
    return () => window.clearTimeout(id);
  }, [landed, layout]);

  const shown = projects[title] ?? projects[0];
  if (!shown) return null;

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
      </section>

      <div className="min-h-6 flex-1" />

      {/* The project above the strip: title and line. Keyed, so each
          swap rises in out of its mask. */}
      <div data-item className="px-margin pb-3">
        <Link
          data-text
          href={href(shown)}
          onClick={(e) => open(e, shown)}
          className="block"
          aria-live="polite"
        >
          <span key={shown._id} className="block overflow-hidden">
            <span className="block animate-[flush-rise_420ms_cubic-bezier(0.23,1,0.32,1)_both] text-h2">
              {shown.title}
            </span>
          </span>
          <span
            key={`${shown._id}-line`}
            className="mt-1 line-clamp-2 min-h-[2lh] animate-[flush-fade_420ms_cubic-bezier(0.23,1,0.32,1)_60ms_both] text-sub text-primary"
          >
            {shown.shortDescription}
          </span>
        </Link>
      </div>

      {/* The strip: edge to edge and down to the bottom, 40 % of the screen
          tall (Ali 11-26: more height), so the covers crop a little at the
          sides. */}
      <div data-item>
        <div
          ref={stripRef}
          data-reveal
          data-lenis-prevent
          className="relative h-[40svh] w-full touch-pan-y select-none overflow-hidden bg-tertiary"
        >
          {projects.map((project, k) => (
            <Link
              key={project._id}
              ref={(el) => {
                slideRefs.current[k] = el;
              }}
              href={href(project)}
              draggable={false}
              aria-label={`View ${project.title ?? "project"}`}
              aria-hidden={k !== current || undefined}
              tabIndex={k !== current ? -1 : undefined}
              className="absolute inset-0 block will-change-transform"
              onClick={(e) => {
                if (moved.current) {
                  moved.current = false;
                  e.preventDefault();
                  return;
                }
                open(e, project);
              }}
            >
              <Cover
                project={project}
                frame="bleed"
                playing={k === current}
                priority={k === current || k === (current + 1) % count}
                className="pointer-events-none h-full w-full"
              />
            </Link>
          ))}
        </div>
      </div>

      <style>{`@keyframes flush-rise{from{transform:translateY(105%)}to{transform:none}}@keyframes flush-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
