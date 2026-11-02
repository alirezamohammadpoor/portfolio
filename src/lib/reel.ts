/**
 * Home entry reel state (script: /mnt/project-files/home-reel/script.md).
 * On the first fresh load of the home in a browser session the inline gate
 * script in the site layout marks `<html data-reel="pending">` next to the
 * intro's mark. The reel then waits for its first cover to show a frame,
 * plays under the handwritten name and hands over to the page; the intro
 * holds back its "done" until the reel has landed (src/lib/intro.ts).
 *
 * `?reel` in the URL forces it on any load; `?reel=scrub` keeps it paused
 * under a slider for tuning the beats.
 */

import { useSyncExternalStore } from "react";

/** off: no reel this load. waiting: covers loading, the name waits too.
 *  playing: the reel and the name run together. done: the reel has landed. */
export type ReelState = "off" | "waiting" | "playing" | "done";

const SESSION_KEY = "home-reel";

/**
 * Beats, seconds (script: /mnt/project-files/home-reel/script.md). The name
 * starts writing at 0 and leaves for the header as the pull back starts.
 * Ali 10-30: the first cut (hold 0.9, reel 1.8 on power2.in) went too fast.
 */
export const REEL_BEAT = {
  /** The first project holds full bleed while the name starts. */
  hold: 0.6,
  /** The other heroes pass upward, each quicker than the last. With a
   *  quadratic ease-in over 3.4 s each is on screen about 0.65, 0.5, 0.4,
   *  0.36 s after the first one's 1.5 s. */
  reel: 3.4,
  reelEase: "power1.in",
  /** Rubber band at the bottom (Ali 11-02: the hit into the pull back was
   *  too sharp). The scroll runs past the last project by this share of the
   *  screen, decelerating from the reel's speed... */
  overshoot: 0.15,
  overshootTime: 0.25,
  /** ...springs back onto it... */
  settle: 0.55,
  /** ...and the pull back starts this long before the spring has settled. */
  settleOverlap: 0.15,
  /** Soft stop instead (`?end=soft`): the reel runs this long to the
   *  second-last project, the last one decelerates in over `softStop`
   *  (power1.out, so it leaves at the speed power1.in arrived with) and
   *  holds `softHold` before the pull back. */
  softReel: 3.0,
  softStop: 0.75,
  softHold: 0.3,
  /** Pull back to the whole home while the heroes slide into their slots. */
  out: 0.9,
  /** Top-to-bottom offset between the heroes' slides. */
  stagger: 0.03,
  /** The whole home, small and still. Ali 10-30: slow the ending a bit. */
  map: 0.8,
  /** Dive into the top of the page. */
  dive: 1.1,
  /** Crossfade from the stage to the page's own covers. */
  handOver: 0.3,
};

export type ReelEnding = "band" | "soft";

/** How the reel meets the bottom; `?end=soft` picks the soft stop while Ali
 *  compares the two (11-02). */
export function reelEnding(): ReelEnding {
  return typeof location !== "undefined" && new URLSearchParams(location.search).get("end") === "soft" ? "soft" : "band";
}

/** When the pull back starts: the name leaves for the header then. */
export function reelPullBackAt(ending: ReelEnding = reelEnding()) {
  const b = REEL_BEAT;
  return ending === "soft"
    ? b.hold + b.softReel + b.softStop + b.softHold
    : b.hold + b.reel + b.overshootTime + b.settle - b.settleOverlap;
}

let state: ReelState =
  typeof document !== "undefined" && document.documentElement.dataset.reel === "pending"
    ? "waiting"
    : "off";

const listeners = new Set<() => void>();
const skipListeners = new Set<() => void>();

export function getReelState() {
  return state;
}

/** Advance the reel. The DOM mark changes before subscribers hear about it,
 *  so the name reads its reel colours when it builds. "off" (the reel gave
 *  up) drops the mark and the intro plays as it always has. */
export function setReelState(next: ReelState) {
  if (state === next) return;
  state = next;
  if (typeof document !== "undefined") {
    if (next === "off") delete document.documentElement.dataset.reel;
    else document.documentElement.dataset.reel = next;
  }
  if (next === "playing") {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
  }
  listeners.forEach((cb) => cb());
}

export function subscribeReel(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const serverSnapshot = (): ReelState => "off";

export function useReelState() {
  return useSyncExternalStore(subscribeReel, getReelState, serverSnapshot);
}

/** Any input during the reel jumps it and the name to their end. */
export function skipReel() {
  skipListeners.forEach((cb) => cb());
}

export function onReelSkip(cb: () => void) {
  skipListeners.add(cb);
  return () => {
    skipListeners.delete(cb);
  };
}

export function reelScrubMode() {
  return typeof location !== "undefined" && new URLSearchParams(location.search).get("reel") === "scrub";
}
