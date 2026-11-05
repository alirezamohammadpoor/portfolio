"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import type Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { lockScroll, unlockScroll } from "@/hooks/useScrollLock";
import { DESKTOP_QUERY } from "@/hooks/useIsDesktop";
import { dur, ease, prefersReducedMotion } from "@/lib/motion";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface UseGalleryScrollOptions {
  nextProjectSlug: string | undefined;
  isTransitioning: boolean;
  /** Arrived in place (project → project): the clone does not move. */
  inPlace: boolean;
  animateClone: (rect: Rect) => void;
  /** Gallery item 1 has decoded: the clone may be removed once it lands. */
  markTargetReady: () => void;
  /** Threshold passed at the bottom: run the in-place next-project transition. */
  navigateNext: () => void;
  /**
   * The page scrolls vertically (the chapter page). The gallery stage is a
   * fixed, unscrollable page with its own wheel steps: it is always "at the
   * bottom", so the bottom pull would add up every wheel event there and hand
   * off to the next project from any card.
   */
  verticalPage: boolean;
  /**
   * The page tree is in the DOM (the client renders a text shell on the
   * first pass). The progress trigger needs the gallery element, so it is
   * created once this flips; on a direct load nothing else re-runs it.
   */
  mounted: boolean;
}

// Wheel deltaY units needed to trigger navigation (~20 mouse clicks or ~4 trackpad swipes)
const THRESHOLD = 2500;
// Scroll + accumulation stay off while the arrival animation runs: the
// clone morph (home → project) or, for now, the root view transition
// (project → project).
const UNLOCK_DELAY_CLONE_MS = 800;
const UNLOCK_DELAY_IN_PLACE_MS = 250;
// A trackpad keeps delivering inertia wheel events for up to ~1.5 s after
// the swipe that crossed the threshold. Unlocking on the timer alone lets
// that tail scroll the page that just landed, which reads as a yank, so the
// unlock also waits for the wheel to have been quiet for a moment.
const WHEEL_QUIET_MS = 160;
const UNLOCK_INERTIA_CAP_MS = 1500;
// While that tail is swallowed the page would sit dead under a finger that
// is still moving. Instead the gallery column gives a little, with friction,
// like an overscroll edge: at most PULL_MAX px, approached exponentially per
// PULL_SCALE wheel units, and it springs back when the hold ends.
const PULL_MAX = 48;
const PULL_SCALE = 1200;

const BOTTOM_EDGE_PX = 10;

// Only the next project has a wheel gesture.
export function useGalleryScroll({
  nextProjectSlug,
  isTransitioning,
  inPlace,
  animateClone,
  markTargetReady,
  navigateNext,
  mounted,
  verticalPage,
}: UseGalleryScrollOptions) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const firstImageRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLElement>(null);
  const pullRef = useRef<HTMLElement>(null);
  const hasNavigated = useRef(false);

  const bottomAcc = useRef(0);
  const lenisRef = useRef<Lenis | null>(null);
  const isReady = useRef(false);

  // Read once at mount: whether this page is the landing side of the clone.
  const arrivedByCloneRef = useRef(isTransitioning);
  const arrivedInPlaceRef = useRef(isTransitioning && inPlace);

  useLenis((lenis) => {
    lenisRef.current = lenis;
  });

  // Lock scroll on arrival, reset to top, unlock after delay. Desktop only:
  // below the desktop breakpoint the page is the horizontal stage and the
  // global touchmove lock would make it unswipeable for the delay.
  // A direct load has no arrival animation to protect, so it never locks:
  // the reader may already be scrolling (the server HTML scrolls before
  // hydration), and a reset to the top would throw them back up with the
  // progress bar.
  useEffect(() => {
    const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
    const arrived = arrivedByCloneRef.current;
    // Shown again after a threshold navigation (browser back; Next keeps the
    // page mounted hidden and runs the effects again): the accumulator and
    // the pull bar are still where the hand-off left them, so the first
    // wheel tick would navigate again. Both start from zero on every show.
    bottomAcc.current = 0;
    if (pullRef.current) gsap.set(pullRef.current, { "--pull": 0, overwrite: true });
    if (!isDesktop || !arrived) {
      isReady.current = true;
      hasNavigated.current = false;
      return;
    }
    // The global lock only cancels native scrolling; Lenis turns the same
    // wheel events into its own scroll, so it is stopped too. Otherwise the
    // page moves under the lock and the unlock below snaps it back to 0.
    lockScroll();
    lenisRef.current?.stop();

    setTimeout(() => {
      window.scrollTo(0, 0);
      lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    }, 0);

    const delay = arrivedInPlaceRef.current ? UNLOCK_DELAY_IN_PLACE_MS : UNLOCK_DELAY_CLONE_MS;
    const started = performance.now();
    let lastWheel = -Infinity;
    let unlocked = false;
    // The column mounts one tick after this effect, so it is resolved lazily.
    const canPull = arrivedInPlaceRef.current && !prefersReducedMotion();
    let pull: ((y: number) => void) | null = null;
    let column: HTMLDivElement | null = null;
    let pulled = 0;
    const onWheel = (e: WheelEvent) => {
      lastWheel = performance.now();
      if (!canPull || unlocked) return;
      if (!column) {
        column = galleryRef.current;
        if (!column) return;
        pull = gsap.quickTo(column, "y", { duration: dur.fast, ease: ease.out });
      }
      pulled = Math.max(0, pulled + e.deltaY);
      pull?.(-PULL_MAX * (1 - Math.exp(-pulled / PULL_SCALE)));
    };
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });

    const unlock = () => {
      unlocked = true;
      isReady.current = true;
      hasNavigated.current = false;
      // From here on the page behaves like a direct load: shown again later
      // (browser back) it must not replay the arrival lock and the reset to
      // the top, which would throw the reader off their reading position.
      arrivedByCloneRef.current = false;
      arrivedInPlaceRef.current = false;
      window.scrollTo(0, 0);
      lenisRef.current?.start();
      lenisRef.current?.scrollTo(0, { immediate: true });
      unlockScroll();
      if (pull && column) gsap.to(column, { y: 0, duration: dur.ui, ease: ease.out, overwrite: true });
    };
    let timer = 0;
    const tryUnlock = () => {
      const now = performance.now();
      const sinceWheel = now - lastWheel;
      if (sinceWheel >= WHEEL_QUIET_MS || now - started >= delay + UNLOCK_INERTIA_CAP_MS) {
        unlock();
        return;
      }
      timer = window.setTimeout(tryUnlock, WHEEL_QUIET_MS - sinceWheel);
    };
    timer = window.setTimeout(tryUnlock, delay);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("wheel", onWheel, { capture: true });
      // Always release the global lock on unmount. Without this, if the user
      // navigates away before the timer fires (common on mobile where taps
      // happen within 2s), the lock persists forever and scroll stays frozen
      // on every subsequent page. Lenis is one instance for the whole site:
      // left stopped here (a header link or Back during the lock window) the
      // next page could not scroll at all until a reload.
      if (!unlocked) lenisRef.current?.start();
      unlockScroll();
    };
  }, []);

  // Animate clone to first image position (homepage → project transition).
  // The morph starts as soon as the landing slot has a layout; it does not
  // wait for the media to decode. Decoding only gates when the overlay may
  // remove the clone (markTargetReady), so a slow network shows the clone
  // resting on the slot instead of a black box, and a fast one never waits.
  // Safety: if the slot never appears (empty gallery), collapse after 600 ms.
  const cloneFired = useRef(false);
  const retargetRef = useRef<ResizeObserver | null>(null);

  const fireAnimateClone = useCallback((force = false) => {
    if (cloneFired.current) return;
    if (!firstImageRef.current && !force) return;
    cloneFired.current = true;
    requestAnimationFrame(() => {
      const el = firstImageRef.current;
      if (!el) {
        // No landing element (empty gallery): collapse the clone at the
        // viewport centre so the transition still clears instead of leaving
        // the page hidden behind isTransitioning forever.
        animateClone({ top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 });
        return;
      }
      const rect = el.getBoundingClientRect();
      animateClone({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      // Card 1 may still take its real size (a clip reporting its ratio on
      // metadata): follow it until the transition clears, the overlay glides
      // the clone onto the new rect instead of landing on a stale one.
      retargetRef.current?.disconnect();
      const ro = new ResizeObserver(() => {
        const r = el.getBoundingClientRect();
        animateClone({ top: r.top, left: r.left, width: r.width, height: r.height });
      });
      ro.observe(el);
      // The strip too: on the phone it is as tall as its tallest card and
      // sits vertically centred, so a neighbour reporting its ratio moves
      // card 1 without resizing it, and a padding change shifts it sideways.
      const strip = el.closest<HTMLElement>("[data-stage-strip]") ?? el.parentElement;
      if (strip) ro.observe(strip);
      retargetRef.current = ro;
    });
  }, [animateClone]);

  // Left mid-transition (a header link during the morph): the observer must
  // not outlive the page and aim the clone at a detached card.
  useEffect(
    () => () => {
      retargetRef.current?.disconnect();
      retargetRef.current = null;
    },
    [],
  );

  const onFirstReady = useCallback(() => {
    fireAnimateClone();
    markTargetReady();
  }, [fireAnimateClone, markTargetReady]);

  useEffect(() => {
    if (!isTransitioning) {
      cloneFired.current = false;
      retargetRef.current?.disconnect();
      retargetRef.current = null;
      return;
    }
    // Only the landing page targets the clone. The page being left also sees
    // isTransitioning flip (project → project) and must not aim the clone at
    // its own, off-screen first item.
    if (!arrivedByCloneRef.current) return;
    // Poll a few frames for the slot (the media tree mounts one effect tick
    // after the page), then force-fire so the page can never stay hidden.
    let raf = 0;
    const started = performance.now();
    const tryFire = () => {
      if (cloneFired.current) return;
      if (firstImageRef.current || performance.now() - started > 600) {
        fireAnimateClone(true);
        return;
      }
      raf = requestAnimationFrame(tryFire);
    };
    tryFire();
    return () => cancelAnimationFrame(raf);
  }, [isTransitioning, fireAnimateClone]);

  // Page scroll progress (0-100%) + hint visibility. The bar reads like a
  // scrollbar, so it maps the whole scrollable page: full exactly at the
  // bottom edge, where the pull to the next project takes over. Media boxes
  // settle their ratio after load (video metadata), which moves the page's
  // end; the trigger is re-measured whenever the page changes height.
  useGSAP(
    () => {
      if (!galleryRef.current || isTransitioning) return;

      let raf = 0;
      const resize = new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => ScrollTrigger.refresh());
      });
      resize.observe(document.body);

      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          if (progressFillRef.current) progressFillRef.current.style.setProperty("--p", self.progress.toFixed(4));
        },
      });

      return () => {
        cancelAnimationFrame(raf);
        resize.disconnect();
      };
    },
    { scope: galleryRef, dependencies: [isTransitioning, mounted] },
  );

  const isAtBottom = useCallback(() => {
    const lenis = lenisRef.current;
    // A page that cannot scroll (the fixed stage: limit ≈ 0) has no bottom
    // edge to pull from.
    return lenis ? lenis.limit > BOTTOM_EDGE_PX && lenis.scroll >= lenis.limit - BOTTOM_EDGE_PX : false;
  }, []);

  const updateBottomVisuals = useCallback((progress: number) => {
    if (pullRef.current) {
      gsap.to(pullRef.current, {
        "--pull": Math.min(1, Math.max(0, progress)),
        duration: prefersReducedMotion() ? 0 : 0.4,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }, []);

  // Wheel accumulation at the bottom edge — desktop only
  useEffect(() => {
    if (isTransitioning || !verticalPage) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;

    const onWheel = (e: WheelEvent) => {
      if (!isReady.current || hasNavigated.current) return;

      // Already accumulating
      if (bottomAcc.current > 0) {
        e.preventDefault();
        bottomAcc.current = e.deltaY > 0
          ? Math.min(bottomAcc.current + e.deltaY, THRESHOLD)
          : Math.max(bottomAcc.current + e.deltaY, 0);
        updateBottomVisuals(bottomAcc.current / THRESHOLD);
        if (bottomAcc.current >= THRESHOLD) {
          hasNavigated.current = true;
          lockScroll();
          lenisRef.current?.stop();
          navigateNext();
        }
        return;
      }

      // Start accumulating at the bottom edge
      if (e.deltaY > 0 && nextProjectSlug && isAtBottom()) {
        e.preventDefault();
        bottomAcc.current = e.deltaY;
        updateBottomVisuals(bottomAcc.current / THRESHOLD);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      // The threshold stopped Lenis and took the global lock for the
      // hand-off. When this page is left they are given back: on a clone
      // hand-off the landing page locks again in the same commit (React runs
      // the leaving page's cleanups before the landing page's mount effects),
      // so the in-place morph keeps its lock; on a plain push (nothing to
      // clone) the next page is no longer frozen.
      if (hasNavigated.current) {
        lenisRef.current?.start();
        unlockScroll();
      }
    };
  }, [isTransitioning, verticalPage, nextProjectSlug, navigateNext, isAtBottom, updateBottomVisuals]);

  return {
    galleryRef,
    firstImageRef,
    progressFillRef,
    pullRef,
    onFirstReady,
  };
}
