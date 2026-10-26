"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import type Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { lockScroll, unlockScroll } from "@/hooks/useScrollLock";

type ProjectGalleryItems = NonNullable<NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["gallery"]>;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface UseGalleryScrollOptions {
  gallery: ProjectGalleryItems;
  nextProjectSlug: string | undefined;
  isTransitioning: boolean;
  /** Arrived in place (project → project): the clone does not move. */
  inPlace: boolean;
  animateClone: (rect: Rect) => void;
  /** Gallery item 1 has decoded: the clone may be removed once it lands. */
  markTargetReady: () => void;
  /** Threshold passed at the bottom: run the in-place next-project transition. */
  navigateNext: () => void;
}

// Wheel deltaY units needed to trigger navigation (~20 mouse clicks or ~4 trackpad swipes)
const THRESHOLD = 2500;
// Scroll + accumulation stay off while the arrival animation runs: the
// clone morph (home → project) or, for now, the root view transition
// (project → project).
const UNLOCK_DELAY_CLONE_MS = 800;
const UNLOCK_DELAY_IN_PLACE_MS = 250;
const UNLOCK_DELAY_MS = 1300;
// A trackpad keeps delivering inertia wheel events for up to ~1.5 s after
// the swipe that crossed the threshold. Unlocking on the timer alone lets
// that tail scroll the page that just landed, which reads as a yank, so the
// unlock also waits for the wheel to have been quiet for a moment.
const WHEEL_QUIET_MS = 160;
const UNLOCK_INERTIA_CAP_MS = 1500;

export const NEXT_THRESHOLD = THRESHOLD;
const BOTTOM_EDGE_PX = 10;

// Shared animation helpers
function animateClipReveal(el: HTMLElement | null, progress: number) {
  if (!el) return;
  gsap.to(el, {
    clipPath: `inset(0 ${100 - progress * 105}% 0 0)`,
    duration: 0.4,
    ease: "power2.out",
    overwrite: true,
  });
}

function toggleVisibility(
  el: HTMLElement | null,
  show: boolean,
  wasShowing: React.RefObject<boolean>,
) {
  if (!el) return;
  if (show && !wasShowing.current) {
    gsap.to(el, { autoAlpha: 1, duration: 0.2 });
    wasShowing.current = true;
  } else if (!show && wasShowing.current) {
    gsap.to(el, { autoAlpha: 0, duration: 0.2 });
    wasShowing.current = false;
  }
}

// Only the next project has a wheel gesture. Previous keeps its explicit
// link in the footer: there is no preview to morph from, and the old root
// slide was the one transition left outside the clone vocabulary.
export function useGalleryScroll({
  gallery,
  nextProjectSlug,
  isTransitioning,
  inPlace,
  animateClone,
  markTargetReady,
  navigateNext,
}: UseGalleryScrollOptions) {
  const scrollProgressElRef = useRef<HTMLElement>(null);
  const mobileProgressElRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const firstImageRef = useRef<HTMLDivElement>(null);
  const nextTextWrapperRef = useRef<HTMLDivElement>(null);
  const nextTextRef = useRef<HTMLDivElement>(null);
  const hasNavigated = useRef(false);
  const footerWipeRef = useRef<HTMLDivElement>(null);

  const bottomAcc = useRef(0);
  const wasShowingBottom = useRef(false);
  const lenisRef = useRef<Lenis | null>(null);
  const isReady = useRef(false);

  // Read once at mount: whether this page is the landing side of the clone.
  const arrivedByCloneRef = useRef(isTransitioning);
  const arrivedInPlaceRef = useRef(isTransitioning && inPlace);

  const [showMobileNav, setShowMobileNav] = useState(false);
  const showMobileNavRef = useRef(false);

  useLenis((lenis) => {
    lenisRef.current = lenis;
  });

  // Lock scroll on mount, reset to top, unlock after delay. Desktop only:
  // below the desktop breakpoint the page is the horizontal stage and the
  // global touchmove lock would make it unswipeable for UNLOCK_DELAY_MS.
  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 75rem)").matches;
    if (!isDesktop) {
      isReady.current = true;
      hasNavigated.current = false;
      return;
    }
    lockScroll();

    // Next tick: reset scroll + force-hide the hint wrapper
    setTimeout(() => {
      window.scrollTo(0, 0);
      lenisRef.current?.scrollTo(0, { immediate: true });
      if (nextTextWrapperRef.current) gsap.set(nextTextWrapperRef.current, { autoAlpha: 0 });
    }, 0);

    const delay = arrivedInPlaceRef.current
      ? UNLOCK_DELAY_IN_PLACE_MS
      : arrivedByCloneRef.current
        ? UNLOCK_DELAY_CLONE_MS
        : UNLOCK_DELAY_MS;
    const started = performance.now();
    let lastWheel = -Infinity;
    const onWheel = () => {
      lastWheel = performance.now();
    };
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });

    const unlock = () => {
      isReady.current = true;
      hasNavigated.current = false;
      window.scrollTo(0, 0);
      lenisRef.current?.start();
      lenisRef.current?.scrollTo(0, { immediate: true });
      unlockScroll();
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
      // on every subsequent page.
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
    });
  }, [animateClone]);

  const onFirstReady = useCallback(() => {
    fireAnimateClone();
    markTargetReady();
  }, [fireAnimateClone, markTargetReady]);

  useEffect(() => {
    if (!isTransitioning) {
      cloneFired.current = false;
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

  // Gallery scroll progress (0-100%) + hint visibility
  useGSAP(
    () => {
      if (!galleryRef.current || isTransitioning) return;

      ScrollTrigger.create({
        trigger: galleryRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const val = Math.round(self.progress * 100);
          if (scrollProgressElRef.current) scrollProgressElRef.current.textContent = String(val);
          if (mobileProgressElRef.current) mobileProgressElRef.current.textContent = String(val);

          if (!isReady.current) return;

          if (val >= 90) toggleVisibility(nextTextWrapperRef.current, true, wasShowingBottom);

          // Mobile nav row — only setState when value changes
          const shouldShow = val >= 95;
          if (shouldShow !== showMobileNavRef.current) {
            showMobileNavRef.current = shouldShow;
            setShowMobileNav(shouldShow);
          }
        },
      });
    },
    { scope: galleryRef, dependencies: [isTransitioning] },
  );

  const isAtBottom = useCallback(() => {
    const lenis = lenisRef.current;
    return lenis ? lenis.scroll >= lenis.limit - BOTTOM_EDGE_PX : false;
  }, []);

  const updateBottomVisuals = useCallback((progress: number) => {
    animateClipReveal(nextTextRef.current, progress);
    animateClipReveal(footerWipeRef.current, progress);
    toggleVisibility(nextTextWrapperRef.current, progress > 0, wasShowingBottom);
  }, []);

  // Wheel accumulation at the bottom edge — desktop only
  useEffect(() => {
    if (isTransitioning) return;
    if (!window.matchMedia("(min-width: 75rem)").matches) return;

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
    return () => window.removeEventListener("wheel", onWheel);
  }, [isTransitioning, nextProjectSlug, navigateNext, isAtBottom, updateBottomVisuals]);

  return {
    galleryRef,
    firstImageRef,
    nextTextWrapperRef,
    nextTextRef,
    gallery,
    scrollProgressElRef,
    mobileProgressElRef,
    footerWipeRef,
    showMobileNav,
    onFirstReady,
  };
}
