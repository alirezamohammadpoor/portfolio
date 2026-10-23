"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 75rem)"; // Tailwind `desktop:` breakpoint

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getSnapshot = () => window.matchMedia(QUERY).matches;
// Server (and hydration) renders the desktop tree, which is what the site
// shipped before the mobile stage existed; the client re-renders once with
// the real match before the entrance animations start.
const getServerSnapshot = () => true;

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
