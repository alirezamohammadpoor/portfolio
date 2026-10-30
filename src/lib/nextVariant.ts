"use client";

import { useSyncExternalStore } from "react";

/**
 * Test switch for the next-project block (Ali, 30 Oct): five ways to show
 * where the page goes next, picked live on localhost. `?next=a..e` wins,
 * then the last pick (localStorage), so the choice survives project →
 * project navigation. Mocks: pf, page "Next project · alternatives".
 */
export const NEXT_VARIANTS = ["a", "b", "c", "d", "e"] as const;
export type NextVariant = (typeof NEXT_VARIANTS)[number];

const KEY = "next-variant";
const EVENT = "next-variant";
const DEFAULT: NextVariant = "a";

function isVariant(v: string | null): v is NextVariant {
  return v !== null && (NEXT_VARIANTS as readonly string[]).includes(v);
}

function read(): NextVariant {
  try {
    const q = new URLSearchParams(window.location.search).get("next");
    if (isVariant(q)) return q;
    const stored = window.localStorage.getItem(KEY);
    if (isVariant(stored)) return stored;
  } catch {}
  return DEFAULT;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("popstate", cb);
  };
}

export function setNextVariant(v: NextVariant) {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {}
  const url = new URL(window.location.href);
  url.searchParams.set("next", v);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(EVENT));
}

export function useNextVariant(): NextVariant {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}
