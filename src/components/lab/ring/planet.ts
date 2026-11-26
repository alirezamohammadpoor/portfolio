import type gsap from "gsap";
import { ease } from "@/lib/motion";
import { DESKTOP_QUERY } from "@/hooks/useIsDesktop";

/**
 * The Pebble as the planet (Ali 11-26: "make pebble planet size then into
 * pebble"). A round disc in the Pebble's own material (fill and shadow) sits
 * in the middle of the ring from the first frame, planet sized, in front of
 * the cards so it always reads (the big front cards hid it). Then it rises and
 * reshapes into the Pebble at the top, and the real bar takes over in place.
 * Returns false when there is no bar, so the caller brings it in as usual.
 *
 * The disc lives in the reel's world, so it goes with the stage. The bar
 * keeps an inline opacity at the end: the stylesheet hides it until the
 * intro reports done.
 */
export function pebblePlanet(
  tl: gsap.core.Timeline,
  world: HTMLElement,
  {
    centreX,
    centreY,
    rise,
    dur = 0.9,
  }: { centreX: number; centreY: number; rise: number; dur?: number },
) {
  const bar = document.querySelector<HTMLElement>("[data-site-bar]");
  if (!bar) return false;
  const r = bar.getBoundingClientRect();
  const D = window.matchMedia(DESKTOP_QUERY).matches ? 220 : 140;

  const disc = document.createElement("div");
  disc.setAttribute("aria-hidden", "true");
  disc.className = "absolute bg-bg";
  disc.style.cssText = `left:${centreX - D / 2}px;top:${centreY - D / 2}px;width:${D}px;height:${D}px;border-radius:${D / 2}px;z-index:30;box-shadow:${getComputedStyle(bar).boxShadow};visibility:hidden;opacity:0`;
  world.appendChild(disc);

  // In: the planet appears in the middle as the projects leave it.
  tl.fromTo(
    disc,
    { autoAlpha: 0, scale: 0.9 },
    { autoAlpha: 1, scale: 1, duration: 0.5, ease: ease.out },
    0,
  );
  // Up and out of the ring, reshaping into the Pebble.
  tl.to(
    disc,
    {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      borderRadius: r.height / 2,
      duration: dur,
      ease: ease.inOut,
    },
    rise,
  );
  // The real bar takes over where the disc lands: its words fade in on it.
  const arrive = rise + dur;
  tl.fromTo(bar, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: "none" }, arrive - 0.1);
  tl.to(disc, { autoAlpha: 0, duration: 0.15, ease: "none" }, arrive + 0.15);
  return true;
}
