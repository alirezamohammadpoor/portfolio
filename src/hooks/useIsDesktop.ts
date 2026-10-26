"use client";

import { useSyncExternalStore } from "react";

/** Tailwind's `desktop:` screen. The one place the breakpoint is spelled. */
export const DESKTOP_QUERY = "(min-width: 75rem)";
const QUERY = DESKTOP_QUERY;

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getSnapshot = () => window.matchMedia(QUERY).matches;
// Server and hydration render assume desktop; callers that mount media gate
// on a client-only `mounted` flag so the server HTML carries neither tree.
const getServerSnapshot = () => true;

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Below the desktop breakpoint. Server and hydration render as desktop. */
export function useIsMobile(): boolean {
  return !useIsDesktop();
}
