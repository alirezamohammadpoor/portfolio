/**
 * Home intro state. The intro (name scrambles English → Persian in the middle
 * of the page, then shrinks into the header slot) plays on a fresh load of
 * the home only. An inline script in the site layout marks
 * `<html data-intro="pending">` before hydration when that is the case, so the
 * page content stays hidden until the name has landed; this module reads that
 * mark once and keeps the state for the life of the document, so a client-side
 * return to the home (name link, back) never replays it.
 */

import { useSyncExternalStore } from "react";

export type IntroState = "pending" | "playing" | "done";

let state: IntroState =
  typeof document !== "undefined" && document.documentElement.dataset.intro === "pending"
    ? "pending"
    : "done";

const listeners = new Set<() => void>();

// The entry reel (src/lib/reel.ts) lands after the name: while it holds the
// intro, "done" is kept back and applied on release.
let held = false;
let doneDeferred = false;

export function getIntroState() {
  return state;
}

/** Advance the intro. Subscribers are told before the DOM mark changes, so
 *  an entrance can set its start values before the content becomes visible. */
export function setIntroState(next: IntroState) {
  if (state === next) return;
  if (next === "done" && held) {
    doneDeferred = true;
    return;
  }
  state = next;
  listeners.forEach((cb) => cb());
  if (typeof document !== "undefined") document.documentElement.dataset.intro = next;
}

export function holdIntro() {
  held = true;
}

export function releaseIntro() {
  held = false;
  if (doneDeferred) {
    doneDeferred = false;
    setIntroState("done");
  }
}

export function subscribeIntro(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const serverSnapshot = (): IntroState => "done";

/** Current intro state; "done" on the server and on any visit without an intro. */
export function useIntroState() {
  return useSyncExternalStore(subscribeIntro, getIntroState, serverSnapshot);
}
