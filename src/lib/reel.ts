/**
 * Home entry state. On the first fresh load of the home in a browser session
 * the inline gate script in the site layout marks `<html data-reel="pending">`
 * next to the intro's mark. The entry waits for its first cover to show a
 * frame, then every project flies out of the middle onto an oval, the oval
 * turns, and the view dives into the first project, landing on its slot at
 * the top of the home. No name plays in the middle (Ali 11-23); the bar
 * (the Pebble) is hidden over the ring and enters with the first project. The page content is held
 * back (src/lib/intro.ts) until the entry has landed.
 *
 * `?reel` in the URL forces it on any load; `?reel=scrub` (or `&scrub`)
 * keeps it paused under a slider for tuning the beats.
 */

import { useSyncExternalStore } from "react";
import { setIntroState } from "@/lib/intro";

/** off: no reel this load. waiting: covers loading. playing: the reel runs.
 *  done: the reel has landed. */
export type ReelState = "off" | "waiting" | "playing" | "done";

const SESSION_KEY = "home-reel";

/** Beats, seconds, from the first cover's first frame. */
export const SCATTER_BEAT = {
  /** The covers leave the middle. */
  start: 0.1,
  /** Every cover flies out from the middle to its place on the field. */
  scatter: 1.1,
  /** Offset between the covers leaving the middle. */
  stagger: 0.06,
  /** The oval turning the first project up to 12 o'clock. */
  hold: 1.0,
  /** Dive into the first project: it grows into its slot at the top of the
   *  home while the rest of the field drifts out of frame and fades. */
  dive: 1.4,
  /** The Pebble's entrance, ending as the dive lands. */
  barIn: 0.6,
  /** Crossfade from the stage to the page; the page's second row fades up
   *  here. */
  handOver: 0.5,
};

let state: ReelState =
  typeof document !== "undefined" && document.documentElement.dataset.reel === "pending"
    ? "waiting"
    : "off";

const listeners = new Set<() => void>();
const skipListeners = new Set<() => void>();

export function getReelState() {
  return state;
}

/** Advance the reel. The DOM mark changes before subscribers hear about it.
 *  "off" (the reel gave up) drops the mark and shows the page at once. */
export function setReelState(next: ReelState) {
  if (state === next) return;
  state = next;
  if (typeof document !== "undefined") {
    if (next === "off") delete document.documentElement.dataset.reel;
    else document.documentElement.dataset.reel = next;
  }
  if (next === "off") setIntroState("done");
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

/** Any input during the reel jumps it to its end. */
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

/** `&n=12`: repeat the projects on the stage up to n covers, to judge how
 *  the ring copes with more projects. Tuning only. */
export function reelCountOverride() {
  if (typeof location === "undefined") return 0;
  const n = Number(new URLSearchParams(location.search).get("n"));
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 40) : 0;
}
