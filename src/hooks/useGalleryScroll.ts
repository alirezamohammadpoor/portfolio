"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "lenis/react";
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

export function useGalleryScroll({
  images,
  nextProjectSlug,
  isTransitioning,
  animateClone,
  routerPush,
}: UseGalleryScrollOptions) {
  const [isReeling, setIsReeling] = useState(true);
  const scrollProgressRef = useRef(0);
  const nextProgressRef = useRef(0);
  const scrollProgressElRef = useRef<HTMLElement>(null);
  const mobileProgressElRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const firstImageRef = useRef<HTMLDivElement>(null);
  const nextTextWrapperRef = useRef<HTMLDivElement>(null);
  const nextTextRef = useRef<HTMLDivElement>(null);
  const hasAutoNavigated = useRef(false);
  const enteredViaClone = useRef(false);
  const footerWipeRef = useRef<HTMLDivElement>(null);
  const footerNextHintRef = useRef<HTMLElement>(null);
  const footerScrollInfoRef = useRef<HTMLElement>(null);

  const originalCount = images.length;

  // During reel: original images + duplicate set
  // After reel: just original images
  const displayImages = useMemo(() => {
    if (!isReeling || originalCount <= 1) return images;
    return [
      ...images,
      ...images.map((img, i) => ({ ...img, _key: `${img._key}-dup-${i}` })),
    ];
  }, [images, isReeling, originalCount]);

  // scroll-to-top on mount handled by GsapProvider pathname effect

  // Disable Lenis scroll during gallery reel
  const lenisInstance = useLenis();
  useEffect(() => {
    if (!lenisInstance) return;
    if (isReeling) {
      lenisInstance.stop();
    } else {
      lenisInstance.start();
    }
  }, [isReeling, lenisInstance]);

  // When transitioning from homepage, animate clone to first image position
  useEffect(() => {
    if (!isTransitioning || !firstImageRef.current) return;
    enteredViaClone.current = true;

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

  // Gallery reel — scroll down through duplicated set, land on duplicate first image
  useGSAP(
    () => {
      if (
        !galleryRef.current ||
        !isReeling ||
        isTransitioning ||
        originalCount <= 1
      )
        return;

      const duplicateFirst = galleryRef.current.children[
        originalCount
      ] as HTMLElement;
      if (!duplicateFirst) return;

      requestAnimationFrame(() => {
        const targetScroll =
          duplicateFirst.offsetTop - galleryRef.current!.offsetTop;
        window.scrollTo(0, 0);

        const obj = { value: 0 };
        gsap.to(obj, {
          value: targetScroll,
          duration: 2,
          delay: enteredViaClone.current ? 0 : 1,
          ease: "power2.inOut",
          onUpdate: () => window.scrollTo(0, obj.value),
          onComplete: () => {
            setIsReeling(false);
            window.scrollTo(0, 0);
          },
        });
      });
    },
    { scope: galleryRef, dependencies: [isReeling, isTransitioning] },
  );

  // Scroll progress — tracks gallery scroll position
  useGSAP(
    () => {
      if (!galleryRef.current || isReeling || isTransitioning) return;

      ScrollTrigger.create({
        trigger: galleryRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const val = Math.round(self.progress * 100);
          scrollProgressRef.current = val;
          if (scrollProgressElRef.current) scrollProgressElRef.current.textContent = String(val);
          if (mobileProgressElRef.current) mobileProgressElRef.current.textContent = String(val);

          // Toggle footer next-project hint at 100%
          const atEnd = val >= 100;
          if (footerNextHintRef.current) footerNextHintRef.current.style.display = atEnd ? "" : "none";
          if (footerScrollInfoRef.current) footerScrollInfoRef.current.style.display = atEnd ? "none" : "";
        },
      });
    },
    { scope: galleryRef, dependencies: [isReeling, isTransitioning] },
  );

  // Pin gallery at end + text fill animation + auto-navigate
  useGSAP(
    () => {
      if (!galleryRef.current || isReeling || isTransitioning || !nextProjectSlug) return;

      ScrollTrigger.create({
        trigger: galleryRef.current,
        start: "bottom bottom",
        end: "+=60%",
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          nextProgressRef.current = self.progress;
          // Scrub footer wipe to match next-project progress
          if (footerWipeRef.current) {
            const pct = 100 - self.progress * 100;
            footerWipeRef.current.style.clipPath = `inset(${pct}% 0 0 0)`;
          }
        },
        onEnter: () => nextTextWrapperRef.current && gsap.to(nextTextWrapperRef.current, { autoAlpha: 1, duration: 0.3 }),
        onLeaveBack: () => {
          nextProgressRef.current = 0;
          if (footerWipeRef.current) footerWipeRef.current.style.clipPath = "inset(100% 0 0 0)";
          if (nextTextWrapperRef.current) gsap.to(nextTextWrapperRef.current, { autoAlpha: 0, duration: 0.3 });
        },
      });

      if (nextTextRef.current) {
        gsap.fromTo(
          nextTextRef.current,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 -5% 0 0)",
            ease: "none",
            scrollTrigger: {
              trigger: galleryRef.current,
              start: "bottom bottom",
              end: "+=60%",
              scrub: true,
              onUpdate: (self) => {
                if (self.progress >= 0.95 && !hasAutoNavigated.current) {
                  hasAutoNavigated.current = true;
                  routerPush(`/project/${nextProjectSlug}`);
                }
              },
            },
          },
        );
      }
    },
    { scope: galleryRef, dependencies: [isReeling, isTransitioning, nextProjectSlug] },
  );

  return {
    galleryRef,
    firstImageRef,
    nextTextWrapperRef,
    nextTextRef,
    displayImages,
    isReeling,
    originalCount,
    scrollProgressElRef,
    mobileProgressElRef,
    footerWipeRef,
    footerNextHintRef,
    footerScrollInfoRef,
  };
}
