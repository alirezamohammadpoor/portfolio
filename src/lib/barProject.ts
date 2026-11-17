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
 * How Work and About lay out in the capsule's window (/lab/panels, 11-17).
 * "now" is what shipped; the others are the Figma directions Ali picked to
 * prototype: Work refined (row-snapped) and full bleed, About spread over
 * the rows and one narrow column.
 */
export type PanelLayout = { work: "now" | "refined" | "bleed"; about: "now" | "spread" | "column" };
const NOW: PanelLayout = { work: "now", about: "now" };

/**
 * What the shut bar is made of (/lab/home, 11-17). "pebble" is the frosted
 * capsule; "flat" drops the frost and shadow and sets the words in white,
 * for a page that is one full-bleed picture. An open panel is always frost.
 */
export type BarSurface = "pebble" | "flat";

type State = { chrome: StageChrome; project: BarProject | null; workOpen: WorkOpen; panels: PanelLayout; surface: BarSurface };

let state: State = { chrome: "pill", project: null, workOpen: "fade", panels: NOW, surface: "pebble" };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: State = { chrome: "pill", project: null, workOpen: "fade", panels: NOW, surface: "pebble" };

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

export function setPanelLayout(panels: PanelLayout | null) {
  const next = panels ?? NOW;
  if (state.panels.work === next.work && state.panels.about === next.about) return;
  state = { ...state, panels: next };
  emit();
}

export function setBarSurface(surface: BarSurface) {
  if (state.surface === surface) return;
  state = { ...state, surface };
  emit();
}

export function useBarState(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}
