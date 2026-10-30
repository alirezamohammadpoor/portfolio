/**
 * The next project's title travels from the scroll indicator at the foot of
 * one project page into the h1 of the next (project → project, laptop), the
 * way the home intro's name lands in the header: one FLIP move, transform
 * only, on the site's in-out curve.
 *
 * The leaving page calls `startTitleTravel` with the indicator's title node
 * before it slides out; a copy of that node is pinned to the body, outside
 * React, so it survives the route swap. The landing page claims it with
 * `takeTitleTravel` once its h1 has a rect, moves it there and removes it.
 * A traveller nobody claims (a failed navigation, a different title) is
 * removed after a grace period so it can never stick to the viewport.
 */

interface Traveller {
  el: HTMLElement;
  text: string;
  from: DOMRect;
  timer: number;
}

let current: Traveller | null = null;

const ORPHAN_MS = 4000;

export function startTitleTravel(source: HTMLElement | null): boolean {
  if (!source || typeof document === "undefined") return false;
  cancelTitleTravel();
  const text = source.textContent?.trim() ?? "";
  if (!text) return false;
  const from = source.getBoundingClientRect();
  if (!from.width || !from.height) return false;

  const cs = getComputedStyle(source);
  const el = document.createElement("span");
  el.textContent = text;
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    margin: "0",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: "60",
    transformOrigin: "0 0",
    willChange: "transform",
    font: cs.font,
    letterSpacing: cs.letterSpacing,
    color: cs.color,
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  // The indicator's own copy steps aside; the page is leaving anyway.
  source.style.visibility = "hidden";

  const timer = window.setTimeout(() => {
    if (current?.el === el) cancelTitleTravel();
  }, ORPHAN_MS);
  current = { el, text, from, timer };
  return true;
}

/** Is a traveller for this title waiting? Does not claim it. */
export function hasTitleTravel(title: string | null | undefined): boolean {
  return !!current && !!title && current.text === title.trim();
}

/** Claim the traveller for this title; the caller moves and removes it. */
export function takeTitleTravel(title: string | null | undefined): Traveller | null {
  if (!hasTitleTravel(title) || !current) return null;
  const t = current;
  window.clearTimeout(t.timer);
  current = null;
  return t;
}

export function cancelTitleTravel() {
  if (!current) return;
  window.clearTimeout(current.timer);
  current.el.remove();
  current = null;
}
