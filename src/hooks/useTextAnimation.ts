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
      SplitText.create(ref.current, {
        type: "words, chars",
        autoSplit: true,
        mask: "chars",
        charsClass: "char",
        onSplit: (self) =>
          gsap.from(self.chars, {
            duration,
            yPercent: -120,
            scale: 1.2,
            stagger: 0.01,
            ease: "expo.out",
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
      SplitText.create(ref.current, {
        type: "lines, words",
        autoSplit: true,
        mask: "lines",
        linesClass: "line",
        onSplit: (self) =>
          gsap.from(self.lines, {
            duration,
            yPercent: 105,
            stagger: 0.04,
            ease: "expo.out",
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
      const elements = ref.current.querySelectorAll(selector);
      elements.forEach((el) => {
        SplitText.create(el, {
          type: "lines, words",
          autoSplit: true,
          mask: "lines",
          linesClass: "line",
          onSplit: (self) =>
            gsap.from(self.lines, {
              duration,
              yPercent: 105,
              stagger: 0.04,
              ease: "expo.out",
              delay,
            }),
        });
      });
    },
    { scope, dependencies: [skip, ...dependencies] },
  );
}
