import { originalSrc } from "./sharedVideo";

/**
 * Project → project: the clone carries the preview's live <video> across the
 * route swap. When the landing page's first item is the same file, it takes
 * that element as is instead of decoding a second copy and seeking it to the
 * clone's time — so the hand-off is the same decoder on the same frame, with
 * nothing to buffer or seek.
 */
export function adoptableVideo(
  source: HTMLVideoElement | null,
  inPlace: boolean,
  src: string | undefined,
): HTMLVideoElement | null {
  if (!inPlace || !source || !src || typeof location === "undefined") return null;
  try {
    const a = new URL(originalSrc(source.currentSrc || source.src), location.href).href;
    const b = new URL(src, location.href).href;
    return a === b ? source : null;
  } catch {
    return null;
  }
}

/** Moves the carried element into `host` as the item's own video. */
export function mountAdoptedVideo(host: HTMLElement, video: HTMLVideoElement, label: string): void {
  video.className = "h-full w-full object-cover";
  video.removeAttribute("style");
  video.removeAttribute("aria-hidden");
  video.setAttribute("aria-label", label);
  host.appendChild(video);
  const p = video.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

/**
 * Home → project: the morph carries a still of the cover, not its <video>.
 * When the landing page's first item is the same file it starts on that
 * frame instead of from 0, and so does the clone's own copy of the clip
 * (TransitionOverlay), which then plays on through the morph. Returns null
 * when the files differ, the time is unknown, or the move is in place (that
 * path adopts the element itself).
 */
export function handoffTime(
  handoff: { sourceTime: number | null; sourceSrc: string | null; inPlace: boolean },
  src: string | undefined,
  duration: number,
): number | null {
  const { sourceTime, sourceSrc, inPlace } = handoff;
  if (inPlace || sourceTime === null || !sourceSrc || !src || !(duration > 0)) return null;
  if (!sameUrl(sourceSrc, src)) return null;
  return sourceTime % duration;
}

/**
 * The clone's own <video> (home → project), while it plays. The landing
 * item reads its time once it plays, so the page lands on the frame the
 * clone is showing when the clone goes.
 */
let cloneClock: HTMLVideoElement | null = null;
export function setCloneClock(video: HTMLVideoElement | null): void {
  cloneClock = video;
}
export function cloneClockTime(src: string | undefined): number | null {
  const v = cloneClock;
  if (!v || !src || v.paused || !v.isConnected) return null;
  return sameUrl(v.currentSrc || v.src, src) ? v.currentTime : null;
}

// Covers play their clip as a blob (sharedVideo); compare the files they stand for.
function sameUrl(a: string, b: string): boolean {
  a = originalSrc(a);
  b = originalSrc(b);
  try {
    const base = typeof location === "undefined" ? "http://localhost/" : location.href;
    return new URL(a, base).href === new URL(b, base).href;
  } catch {
    return a === b;
  }
}
