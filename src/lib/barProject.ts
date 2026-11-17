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

/**
 * What the capsule does when a project opened from Work flies its preview
 * into card 1. Ali picked "fade" from /lab/open (11-17): the capsule fades
 * out and comes back once the page is up. null: a plain route change.
 *  shrink: the list fades, the window folds back while the video flies
 *  hold:   the window stays open (emptied) until the video has landed
 */
export type WorkOpen = "shrink" | "hold" | "fade" | null;

/**
 * How Work's preview changes when another project leads (/lab/preview,
 * Ali 11-17: the phone swap needs a better transition).
 *  fade:     the new clip fades in over the old one, which keeps playing
 *  slide:    the new clip slides in from the side you moved to in the list
 *  dissolve: the old clip softens away while the new one sharpens in
 */
export type PreviewSwap = "fade" | "slide" | "dissolve";

/**
 * How the project row in the Pebble is laid out (/lab/pebble, Ali 11-17).
 *  now:   centred, replay beside the title, test under it (Docked as built)
 *  list:  a hairline, then title and test stacked on the left, chevron and
 *         replay on the right
 *  inner: the project in its own tinted pill inside the Pebble
 *  grid:  centred on fixed slots, replay left, chevron right
 */
export type ProjectRow = "now" | "list" | "inner" | "grid";

type State = { chrome: StageChrome; project: BarProject | null; workOpen: WorkOpen; previewSwap: PreviewSwap; projectRow: ProjectRow };

let state: State = { chrome: "docked", project: null, workOpen: "fade", previewSwap: "fade", projectRow: "now" };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: State = { chrome: "docked", project: null, workOpen: "fade", previewSwap: "fade", projectRow: "now" };

export function setBarProject(project: BarProject | null) {
  state = { ...state, project };
  emit();
}

export function setStageChrome(chrome: StageChrome) {
  if (state.chrome === chrome) return;
  state = { ...state, chrome };
  emit();
}

export function setWorkOpen(workOpen: WorkOpen) {
  if (state.workOpen === workOpen) return;
  state = { ...state, workOpen };
  emit();
}

export function setPreviewSwap(previewSwap: PreviewSwap) {
  if (state.previewSwap === previewSwap) return;
  state = { ...state, previewSwap };
  emit();
}

export function setProjectRow(projectRow: ProjectRow) {
  if (state.projectRow === projectRow) return;
  state = { ...state, projectRow };
  emit();
}

export function useBarState(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}
