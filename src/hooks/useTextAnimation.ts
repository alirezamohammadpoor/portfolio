"use client";

import { type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";

interface AnimationOptions {
  duration?: number;
  delay?: number;
  skip?: boolean;
  dependencies?: unknown[];
}

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animate heading text — chars drop in from above.
 */
export function useTitleAnimation(
  ref: RefObject<HTMLElement | null>,
  scope: RefObject<HTMLElement | null>,
  { duration = 1, delay = 0, skip = false, dependencies = [] }: AnimationOptions = {},
) {
  useGSAP(
    () => {
      if (skip || !ref.current) return;
      if (prefersReducedMotion()) {
        gsap.set(ref.current, { autoAlpha: 1 });
        return;
      }
      SplitText.create(ref.current, {
        type: "words, chars",
        autoSplit: true,
        mask: "chars",
        charsClass: "char",
        aria: "none",
        onSplit: (self) =>
          gsap.from(self.chars, {
            duration,
            yPercent: -120,
            scale: 1.08,
            filter: "blur(4px)",
            ease: "power4.out",
            delay,
          }),
      });
    },
    { scope, dependencies: [skip, ...dependencies] },
  );
}

/**
 * Animate body text — lines slide up.
 */
export function useBodyAnimation(
  ref: RefObject<HTMLElement | null>,
  scope: RefObject<HTMLElement | null>,
  { duration = 0.9, delay = 0, skip = false, dependencies = [] }: AnimationOptions = {},
) {
  useGSAP(
    () => {
      if (skip || !ref.current) return;
      if (prefersReducedMotion()) {
        gsap.set(ref.current, { autoAlpha: 1 });
        return;
      }
      SplitText.create(ref.current, {
        type: "lines, words",
        autoSplit: true,
        mask: "lines",
        linesClass: "line",
        aria: "none",
        onSplit: (self) =>
          gsap.from(self.lines, {
            duration,
            yPercent: 105,
            filter: "blur(3px)",
            ease: "power4.out",
            delay,
          }),
      });
    },
    { scope, dependencies: [skip, ...dependencies] },
  );
}

/**
 * Animate multiple inline elements (links, spans) — lines slide up.
 */
export function useInlineAnimation(
  ref: RefObject<HTMLElement | null>,
  scope: RefObject<HTMLElement | null>,
  selector: string,
  { duration = 0.9, delay = 0, skip = false, dependencies = [] }: AnimationOptions = {},
) {
  useGSAP(
    () => {
      if (skip || !ref.current) return;
      if (prefersReducedMotion()) {
        gsap.set(ref.current, { autoAlpha: 1 });
        return;
      }
      const elements = ref.current.querySelectorAll(selector);
      elements.forEach((el) => {
        SplitText.create(el, {
          type: "lines, words",
          autoSplit: true,
          mask: "lines",
          linesClass: "line",
          aria: "none",
          onSplit: (self) =>
            gsap.from(self.lines, {
              duration,
              yPercent: 105,
              filter: "blur(3px)",
              ease: "power4.out",
              delay,
            }),
        });
      });
    },
    { scope, dependencies: [skip, ...dependencies] },
  );
}
