import type gsap from "gsap";
import { ease } from "@/lib/motion";
import { DESKTOP_QUERY } from "@/hooks/useIsDesktop";

/**
 * The Pebble as the planet (Ali 11-26): from the first frame it sits in the
 * middle of the ring, a little larger, with the projects going round it;
 * then it rises to its own place at the top and the page is its home.
 * Returns false when there is no bar, so the caller can bring it in the
 * usual way.
 *
 * Only the transform is cleared at the end: the stylesheet hides the bar
 * until the intro reports done, and the inline opacity keeps it showing in
 * the moment between the rise and the end of the timeline.
 */
export function pebblePlanet(
  tl: gsap.core.Timeline,
  { centreY, rise, dur = 0.9 }: { centreY: number; rise: number; dur?: number },
) {
  const bar = document.querySelector<HTMLElement>("[data-site-bar]");
  if (!bar) return false;
  const r = bar.getBoundingClientRect();
  const dy = centreY - (r.top + r.height / 2);
  // A fifth larger on the laptop; the phone's Pebble is already most of the
  // screen's width.
  const big = window.matchMedia(DESKTOP_QUERY).matches ? 1.2 : 1;
  tl.fromTo(
    bar,
    { autoAlpha: 0, y: dy, scale: big * 0.92 },
    { autoAlpha: 1, scale: big, duration: 0.5, ease: ease.out },
    0,
  );
  tl.to(bar, { y: 0, scale: 1, duration: dur, ease: ease.inOut, clearProps: "transform" }, rise);
  return true;
}
