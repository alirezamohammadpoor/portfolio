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
 *
 * Experiment (Ali 11-04): `?reel=scatter` plays the scatter variant instead:
 * the name is written on an empty page and, as it leaves for the header,
 * every project scatters out from the middle onto one field, holds, and the
 * view dives into the first one. `?reel=scatter&scrub` scrubs it;
 * `&early` scatters behind the name while it is still being written.
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
  /** The other heroes pass upward, each quicker than the last, up to the
   *  second-last project (quadratic ease-in). */
  reel: 3.0,
  reelEase: "power1.in",
  /** Soft stop (Ali 11-02, over a rubber band; the hard hit into the pull
   *  back was too sharp): the last project decelerates in, power1.out
   *  leaving at the speed power1.in arrived with, and holds. */
  stop: 0.75,
  stopHold: 0.3,
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
export const REEL_PULL_BACK_AT = REEL_BEAT.hold + REEL_BEAT.reel + REEL_BEAT.stop + REEL_BEAT.stopHold;

export type ReelVariant = "reel" | "scatter";

/** Which entry plays: the cover reel (default) or the scatter experiment. */
export function reelVariant(): ReelVariant {
  if (typeof location === "undefined") return "reel";
  return new URLSearchParams(location.search).get("reel") === "scatter" ? "scatter" : "reel";
}

/** Beats of the scatter variant, seconds. */
export const SCATTER_BEAT = {
  /** The name is written alone on the empty page (≈2.6 s writing plus its
   *  0.5 s hold); the scatter starts as it leaves for the header. */
  write: 3.1,
  /** Every cover flies out from the middle to its place on the field. */
  scatter: 1.1,
  /** Offset between the covers leaving the middle. */
  stagger: 0.06,
  /** The whole field, still but for a slow drift toward the first project. */
  hold: 1.0,
  /** Dive into the first project: it grows into its slot at the top of the
   *  home while the rest of the field passes out of frame. */
  dive: 1.2,
  /** `&early` (Ali 11-04): the covers scatter out behind the name while it
   *  is still being written, from this point. */
  earlyStart: 1.0,
  /** Earliest dive after the name has landed in the header. */
  afterName: 0.3,
  /** Crossfade from the stage to the page's own covers. */
  handOver: 0.3,
};

/** When the covers leave the middle: as the name moves, or with `&early`
 *  while it is still writing. */
export function scatterStartsAt() {
  const early = typeof location !== "undefined" && new URLSearchParams(location.search).has("early");
  return early ? SCATTER_BEAT.earlyStart : SCATTER_BEAT.write;
}

/** When the name leaves the middle for the header, by variant. */
export function reelNameMoveAt() {
  return reelVariant() === "scatter" ? SCATTER_BEAT.write : REEL_PULL_BACK_AT;
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
  if (typeof location === "undefined") return false;
  const params = new URLSearchParams(location.search);
  return params.get("reel") === "scrub" || params.has("scrub");
}
