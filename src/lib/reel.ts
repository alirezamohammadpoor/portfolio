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

/** When the pull back starts: the name leaves for the header then. */
export const REEL_NAME_MOVE_AT = REEL_BEAT.hold + REEL_BEAT.reel;

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
