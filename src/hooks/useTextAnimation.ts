"use client";

import { type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ease, prefersReducedMotion } from "@/lib/motion";

interface AnimationOptions {
  duration?: number;
  delay?: number;
  skip?: boolean;
  dependencies?: unknown[];
}

/**
 * Animate heading text — chars drop in from above. The block itself may be
 * pre-hidden with `gsap-hidden` (a hard load would otherwise paint the
 * server text and pull it back when the split starts): it is shown as it is
 * split, with the chars already above their masks.
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
        // The heading keeps its text as an aria-label and the chars are
        // aria-hidden, so it is not read letter by letter.
        aria: "auto",
        onSplit: (self) => {
          gsap.set(ref.current, { autoAlpha: 1 });
          return gsap.from(self.chars, {
            duration,
            yPercent: -120,
            ease: ease.out,
            delay,
          });
        },
      });
    },
    { scope, dependencies: [skip, ...dependencies] },
  );
}

/**
 * Animate body text — lines slide up. Shows a `gsap-hidden` block as it is
 * split, like useTitleAnimation.
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
        onSplit: (self) => {
          gsap.set(ref.current, { autoAlpha: 1 });
          return gsap.from(self.lines, {
            duration,
            yPercent: 105,
            ease: ease.out,
            delay,
          });
        },
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
                ease: ease.out,
              delay,
            }),
        });
      });
    },
    { scope, dependencies: [skip, ...dependencies] },
  );
}
