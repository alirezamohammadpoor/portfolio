/**
 * Motion tokens. One place for the site's easings and durations; the CSS side
 * lives in `globals.css` (`--ease-out`, `--ease-in-out`, `--dur-*`) and the
 * two must stay in step.
 *
 * Register `CustomEase` once (GsapProvider does) before the `ease.*` strings
 * are used in a tween.
 */

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

export const EASE_OUT_CSS = "cubic-bezier(0.23, 1, 0.32, 1)";
export const EASE_IN_OUT_CSS = "cubic-bezier(0.77, 0, 0.175, 1)";

let registered = false;

/** Create the named GSAP eases. Safe to call more than once. */
export function registerMotion() {
  if (registered) return;
  registered = true;
  gsap.registerPlugin(CustomEase);
  CustomEase.create("site-out", "0.23, 1, 0.32, 1");
  CustomEase.create("site-in-out", "0.77, 0, 0.175, 1");
}

/** GSAP ease names, mirrored from the CSS curves above. */
export const ease = {
  /** Enter / settle: strong deceleration. */
  out: "site-out",
  /** On-screen movement from A to B. */
  inOut: "site-in-out",
} as const;

/** Seconds. */
export const dur = {
  /** Press feedback, hint fades. */
  fast: 0.16,
  /** Small UI: drawers, pills, crossfades. */
  ui: 0.24,
  /** A block of text masking out before a page change. */
  exit: 0.4,
  /** Entrances of a block of text. */
  text: 0.9,
  /** Page-level moves: the media morph. */
  page: 0.7,
} as const;

/** Stagger between title → body → byline → image, seconds. */
export const stagger = 0.07;

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Reverse of the SplitText entrances in `useTextAnimation`: every `.char`
 * and `.line` under `root` leaves upward through the mask it was split into.
 * Returns false when there is nothing to animate (reduced motion, no split).
 */
export function maskOutText(root: HTMLElement | null): boolean {
  if (!root || prefersReducedMotion()) return false;
  const chars = root.querySelectorAll(".char");
  const lines = root.querySelectorAll(".line");
  if (!chars.length && !lines.length) return false;
  if (chars.length) {
    gsap.to(chars, { yPercent: -120, duration: dur.exit, ease: ease.out, stagger: 0.004, overwrite: true });
  }
  if (lines.length) {
    gsap.to(lines, { yPercent: -105, duration: dur.exit, ease: ease.out, delay: 0.04, overwrite: true });
  }
  return true;
}

/** How long the route push waits for an exit to be mostly visible, ms. */
export const EXIT_LEAD_MS = 180;
