"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import type Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

type ProjectImages = NonNullable<NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["images"]>;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface UseGalleryScrollOptions {
  images: ProjectImages;
  nextProjectSlug: string | undefined;
  isTransitioning: boolean;
  animateClone: (rect: Rect) => void;
  routerPush: (url: string) => void;
}

const WHEEL_THRESHOLD = 1750;
const TOUCH_MULTIPLIER = 2.5;

export function useGalleryScroll({
  images,
  nextProjectSlug,
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
  const hasAutoNavigated = useRef(false);
  const footerWipeRef = useRef<HTMLDivElement>(null);
  const footerNextHintRef = useRef<HTMLElement>(null);
  const footerScrollInfoRef = useRef<HTMLElement>(null);

  // Wheel/touch accumulation refs
  const isAtBottom = useRef(false);
  const bottomFrames = useRef(0);
  const accumulationRef = useRef(0);
  const wasShowingHint = useRef(false);
  const touchStartY = useRef(0);
  const lenisRef = useRef<Lenis | null>(null);

  // Reset on project change
  useEffect(() => {
    hasAutoNavigated.current = false;
    accumulationRef.current = 0;
    wasShowingHint.current = false;
    bottomFrames.current = 0;
    isAtBottom.current = false;
  }, [nextProjectSlug]);

  // When transitioning from homepage, animate clone to first image position
  useEffect(() => {
    if (!isTransitioning || !firstImageRef.current) return;

    requestAnimationFrame(() => {
      const rect = firstImageRef.current!.getBoundingClientRect();
      animateClone({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    });
  }, [isTransitioning, animateClone]);

  // Scroll progress — tracks gallery scroll position (0-100% text only)
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
        },
      });
    },
    { scope: galleryRef, dependencies: [isTransitioning] },
  );

  // Track page bottom via Lenis (3-frame debounce to avoid trackpad inertia)
  useLenis((lenis) => {
    lenisRef.current = lenis;
    if (lenis.scroll >= lenis.limit - 1) {
      bottomFrames.current = Math.min(bottomFrames.current + 1, 10);
      isAtBottom.current = bottomFrames.current >= 3;
    } else {
      bottomFrames.current = 0;
      isAtBottom.current = false;
    }
  });

  // Visual feedback driven by accumulation progress (0-1)
  const updateVisuals = useCallback((progress: number) => {
    // Desktop: clip-path text fill
    if (nextTextRef.current) {
      const pct = 100 - progress * 105; // slight overshoot so text is fully revealed
      nextTextRef.current.style.clipPath = `inset(0 ${pct}% 0 0)`;
    }

    // Desktop: show/hide the "Scroll to see next project" wrapper
    if (nextTextWrapperRef.current) {
      if (progress > 0 && !wasShowingHint.current) {
        gsap.to(nextTextWrapperRef.current, { autoAlpha: 1, duration: 0.3 });
        wasShowingHint.current = true;
      } else if (progress === 0 && wasShowingHint.current) {
        gsap.to(nextTextWrapperRef.current, { autoAlpha: 0, duration: 0.3 });
        wasShowingHint.current = false;
      }
    }

    // Mobile: footer wipe
    if (footerWipeRef.current) {
      const pct = 100 - progress * 100;
      footerWipeRef.current.style.clipPath = `inset(${pct}% 0 0 0)`;
    }

    // Mobile: hint toggle
    if (footerNextHintRef.current) footerNextHintRef.current.style.display = progress > 0 ? "" : "none";
    if (footerScrollInfoRef.current) footerScrollInfoRef.current.style.display = progress > 0 ? "none" : "";
  }, []);

  // Shared accumulation logic for wheel and touch
  const accumulate = useCallback((deltaY: number) => {
    if (hasAutoNavigated.current || !nextProjectSlug) return;

    if (deltaY > 0 && (isAtBottom.current || accumulationRef.current > 0)) {
      accumulationRef.current = Math.min(accumulationRef.current + deltaY, WHEEL_THRESHOLD);
      updateVisuals(accumulationRef.current / WHEEL_THRESHOLD);

      if (accumulationRef.current >= WHEEL_THRESHOLD) {
        hasAutoNavigated.current = true;
        routerPush(`/project/${nextProjectSlug}`);
      }
      return true; // consumed
    }

    if (deltaY < 0 && accumulationRef.current > 0) {
      accumulationRef.current = Math.max(accumulationRef.current + deltaY, 0);
      updateVisuals(accumulationRef.current / WHEEL_THRESHOLD);
      return true; // consumed
    }

    return false; // not consumed, let Lenis handle it
  }, [nextProjectSlug, routerPush, updateVisuals]);

  // Wheel accumulation at page bottom
  useEffect(() => {
    if (!nextProjectSlug || isTransitioning) return;

    const onWheel = (e: WheelEvent) => {
      if (!isAtBottom.current && accumulationRef.current === 0) return;
      if (accumulate(e.deltaY)) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [nextProjectSlug, isTransitioning, accumulate]);

  // Touch accumulation at page bottom
  useEffect(() => {
    if (!nextProjectSlug || isTransitioning) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = (touchStartY.current - currentY) * TOUCH_MULTIPLIER;
      touchStartY.current = currentY;

      if (!isAtBottom.current && accumulationRef.current === 0) return;
      if (accumulate(deltaY)) {
        e.preventDefault();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [nextProjectSlug, isTransitioning, accumulate]);

  return {
    galleryRef,
    firstImageRef,
    nextTextWrapperRef,
    nextTextRef,
    images,
    scrollProgressElRef,
    mobileProgressElRef,
    footerWipeRef,
    footerNextHintRef,
    footerScrollInfoRef,
  };
}
