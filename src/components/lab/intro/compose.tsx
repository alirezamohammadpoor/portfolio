import type gsap from "gsap";
import { ease } from "@/lib/motion";

/**
 * Compose (lab intro round 1, 11-26). Parked: Ali wants it for showcase
 * films, not for the home intro. The site's layout grid draws in red, the
 * statement sets onto it, the windows wipe in on their columns, then the
 * grid fades. About 1.9 s.
 *
 * Needs on the page: a `[data-statement]` heading and `[data-win]` windows.
 * Render `<ComposeOverlay />` above them and pass the timeline to
 * `buildCompose`.
 */

export function ComposeOverlay() {
  return (
    <div data-ov className="pointer-events-none fixed inset-0 z-[100] grid-site px-margin">
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          data-band
          className={`origin-top bg-[#ff3b30]/10 ${i >= 4 ? "hidden md:block" : ""}`}
        />
      ))}
    </div>
  );
}

export function buildCompose(tl: gsap.core.Timeline, q: (s: string) => HTMLElement[]) {
  tl.from(q("[data-band]"), { scaleY: 0, duration: 0.55, ease: ease.out, stagger: 0.03 }, 0)
    .from(
      q("[data-statement]"),
      { clipPath: "inset(0 0 100% 0)", y: 16, duration: 0.6, ease: ease.out },
      0.45,
    )
    .from(
      q("[data-win]"),
      { clipPath: "inset(0 100% 0 0)", duration: 0.75, ease: ease.inOut, stagger: 0.12 },
      0.6,
    )
    .to(q("[data-band]"), { autoAlpha: 0, duration: 0.4, ease: ease.out }, 1.45)
    .set(q("[data-ov]"), { display: "none" });
}
