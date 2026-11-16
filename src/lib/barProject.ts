"use client";

import { useSyncExternalStore, type ReactNode } from "react";

// The project page and the capsule bar share the top of the screen (Ali,
// 11-16): the stage publishes what the bar may show (title, the centred
// clip's A/B test, the details) and the bar renders it in its second row.
// `chrome` says which arrangement is on: "pill" is today's name pill on the
// stage, the others are the /lab/project directions.

export type StageChrome = "pill" | "docked" | "title" | "overlay";

export type BarProject = {
  title: string;
  /** The centred clip's A/B test or clip label, null on a plain clip. */
  label: string | null;
  /** The A/B test's replay slot, when one is centred. */
  replay: ReactNode;
  detailsOpen: boolean;
  toggleDetails: () => void;
  closeDetails: () => void;
  /** The project's text, for a bar that opens the details inside itself. */
  details: ReactNode;
};

type State = { chrome: StageChrome; project: BarProject | null };

let state: State = { chrome: "pill", project: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: State = { chrome: "pill", project: null };

export function setBarProject(project: BarProject | null) {
  state = { ...state, project };
  emit();
}

export function setStageChrome(chrome: StageChrome) {
  if (state.chrome === chrome) return;
  state = { ...state, chrome };
  emit();
}

export function useBarState(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}
