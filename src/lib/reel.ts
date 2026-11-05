/**
 * Home entry state. On the first fresh load of the home in a browser session
 * the inline gate script in the site layout marks `<html data-reel="pending">`
 * next to the intro's mark. The entry waits for its first cover to show a
 * frame, then plays with the handwritten name (Ali 11-05, "scatter early";
 * replaced the cover reel of PR #46): while the name is being written every
 * project flies out of the middle onto one field, the name leaves for the
 * header, and the view dives into the first project, landing on its slot at
 * the top of the home. The intro holds back its "done" until the entry has
 * landed (src/lib/intro.ts).
 *
 * `?reel` in the URL forces it on any load; `?reel=scrub` (or `&scrub`)
 * keeps it paused under a slider for tuning the beats.
 */

import { useSyncExternalStore } from "react";

/** off: no reel this load. waiting: covers loading, the name waits too.
 *  playing: the reel and the name run together. done: the reel has landed. */
export type ReelState = "off" | "waiting" | "playing" | "done";

const SESSION_KEY = "home-reel";

/** Beats, seconds. The name starts writing at 0. */
export const SCATTER_BEAT = {
  /** The covers leave the middle behind the name while it is still being
   *  written (Ali 11-04: earlier than the name's move). */
  start: 1.0,
  /** The name leaves the middle for the header: ≈2.6 s writing plus its
   *  0.5 s hold. */
  write: 3.1,
  /** Every cover flies out from the middle to its place on the field. */
  scatter: 1.1,
  /** Offset between the covers leaving the middle. */
  stagger: 0.06,
  /** The whole field, still but for a slow drift toward the first project. */
  hold: 1.0,
  /** Dive into the first project: it grows into its slot at the top of the
   *  home while the rest of the field drifts out of frame and fades. */
  dive: 1.4,
  /** Earliest dive after the name has landed in the header. */
  afterName: 0.3,
  /** Crossfade from the stage to the page; the page's second row fades up
   *  here. */
  handOver: 0.5,
};

/** When the name leaves the middle for the header. */
export const REEL_NAME_MOVE_AT = SCATTER_BEAT.write;

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
