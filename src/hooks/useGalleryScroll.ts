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
  prevProjectSlug: string | undefined;
  isTransitioning: boolean;
  animateClone: (rect: Rect) => void;
  routerPush: (url: string) => void;
}

// Wheel deltaY units needed to trigger navigation (~20 mouse clicks or ~4 trackpad swipes)
const THRESHOLD = 2500;
// Delay before scroll + accumulation enable after mount (lets view transition settle)
const UNLOCK_DELAY_MS = 2000;
const BOTTOM_EDGE_PX = 10;
const TOP_EDGE_PX = 2;

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

export function useGalleryScroll({
  gallery,
  nextProjectSlug,
  prevProjectSlug,
  isTransitioning,
  animateClone,
  routerPush,
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
  const topAcc = useRef(0);
  const wasShowingBottom = useRef(false);
  const wasShowingTop = useRef(false);
  const lenisRef = useRef<Lenis | null>(null);
  const hasScrolledDown = useRef(false);
  const hasScrolledBack = useRef(false);
  const isReady = useRef(false);

  const prevTextWrapperRef = useRef<HTMLDivElement>(null);
  const prevTextRef = useRef<HTMLDivElement>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const showMobileNavRef = useRef(false);

  useLenis((lenis) => {
    lenisRef.current = lenis;
    if (isReady.current && lenis.scroll > lenis.limit * 0.1) hasScrolledDown.current = true;
    if (hasScrolledDown.current && lenis.scroll <= TOP_EDGE_PX) hasScrolledBack.current = true;
  });

  // Lock scroll on mount, reset to top, unlock after delay
  useEffect(() => {
    lockScroll();

    // Next tick: reset scroll + force-hide hint wrappers
    setTimeout(() => {
      window.scrollTo(0, 0);
      lenisRef.current?.scrollTo(0, { immediate: true });
      if (nextTextWrapperRef.current) gsap.set(nextTextWrapperRef.current, { autoAlpha: 0 });
      if (prevTextWrapperRef.current) gsap.set(prevTextWrapperRef.current, { autoAlpha: 0 });
    }, 0);

    const timer = setTimeout(() => {
      isReady.current = true;
      hasNavigated.current = false;
      window.scrollTo(0, 0);
      lenisRef.current?.start();
      lenisRef.current?.scrollTo(0, { immediate: true });
      unlockScroll();
    }, UNLOCK_DELAY_MS);

    return () => {
      clearTimeout(timer);
      // Always release the global lock on unmount. Without this, if the user
      // navigates away before the timer fires (common on mobile where taps
      // happen within 2s), the lock persists forever and scroll stays frozen
      // on every subsequent page.
      unlockScroll();
    };
  }, []);

  // Animate clone to first image position (homepage → project transition).
  // Wait for the destination first image to be ready (decoded) before morphing,
  // so the clone doesn't land on a black box on slow mobile networks.
  // Safety timeout fires the morph anyway after 600ms in case the load event
  // never arrives (broken asset, decoder hang).
  const firstReady = useRef(false);
  const cloneFired = useRef(false);

  const fireAnimateClone = useCallback(() => {
    if (cloneFired.current) return;
    if (!firstImageRef.current) return;
    cloneFired.current = true;
    requestAnimationFrame(() => {
      const el = firstImageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      animateClone({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    });
  }, [animateClone]);

  const onFirstReady = useCallback(() => {
    firstReady.current = true;
    fireAnimateClone();
  }, [fireAnimateClone]);

  useEffect(() => {
    if (!isTransitioning) {
      cloneFired.current = false;
      firstReady.current = false;
      return;
    }
    if (firstReady.current) {
      fireAnimateClone();
      return;
    }
    const timeout = setTimeout(fireAnimateClone, 600);
    return () => clearTimeout(timeout);
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
          if (val <= 5 && hasScrolledBack.current) toggleVisibility(prevTextWrapperRef.current, true, wasShowingTop);
          if (val > 20) toggleVisibility(prevTextWrapperRef.current, false, wasShowingTop);

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

  const isAtTop = useCallback(() => {
    const lenis = lenisRef.current;
    if (!lenis || !hasScrolledBack.current) return false;
    return lenis.scroll <= TOP_EDGE_PX;
  }, []);

  const updateBottomVisuals = useCallback((progress: number) => {
    animateClipReveal(nextTextRef.current, progress);
    animateClipReveal(footerWipeRef.current, progress);
    toggleVisibility(nextTextWrapperRef.current, progress > 0, wasShowingBottom);
  }, []);

  const updateTopVisuals = useCallback((progress: number) => {
    animateClipReveal(prevTextRef.current, progress);
    toggleVisibility(prevTextWrapperRef.current, progress > 0, wasShowingTop);
  }, []);

  // Wheel accumulation — desktop only
  useEffect(() => {
    if (isTransitioning) return;
    if (!window.matchMedia("(min-width: 75rem)").matches) return;

    const onWheel = (e: WheelEvent) => {
      if (!isReady.current || hasNavigated.current) return;

      // Already accumulating bottom
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
          routerPush(`/project/${nextProjectSlug}`);
        }
        return;
      }

      // Already accumulating top
      if (topAcc.current > 0) {
        e.preventDefault();
        topAcc.current = e.deltaY < 0
          ? Math.min(topAcc.current + Math.abs(e.deltaY), THRESHOLD)
          : Math.max(topAcc.current - e.deltaY, 0);
        updateTopVisuals(topAcc.current / THRESHOLD);
        if (topAcc.current >= THRESHOLD) {
          hasNavigated.current = true;
          lockScroll();
          lenisRef.current?.stop();
          routerPush(`/project/${prevProjectSlug}`);
        }
        return;
      }

      // Start accumulating at edges
      if (e.deltaY > 0 && nextProjectSlug && isAtBottom()) {
        e.preventDefault();
        bottomAcc.current = e.deltaY;
        updateBottomVisuals(bottomAcc.current / THRESHOLD);
        return;
      }

      if (e.deltaY < 0 && prevProjectSlug && hasScrolledBack.current && isAtTop()) {
        e.preventDefault();
        topAcc.current = Math.abs(e.deltaY);
        updateTopVisuals(topAcc.current / THRESHOLD);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [isTransitioning, nextProjectSlug, prevProjectSlug, routerPush, isAtBottom, isAtTop, updateBottomVisuals, updateTopVisuals]);

  return {
    galleryRef,
    firstImageRef,
    nextTextWrapperRef,
    nextTextRef,
    prevTextWrapperRef,
    prevTextRef,
    gallery,
    scrollProgressElRef,
    mobileProgressElRef,
    footerWipeRef,
    showMobileNav,
    onFirstReady,
  };
}
