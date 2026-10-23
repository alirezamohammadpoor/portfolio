"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 75rem)"; // Tailwind `desktop:` breakpoint

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
