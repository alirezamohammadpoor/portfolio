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
    const a = new URL(source.currentSrc || source.src, location.href).href;
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
 * Home → project: the morph carries a still of the cover, not its <video>,
 * so when the landing page's first item is the same file it starts where
 * the cover was plus the time the morph has taken, instead of from 0. The
 * clone plays the same file from the same point (TransitionOverlay), so the
 * two land on the same frame. Returns null when the files differ, the time
 * is unknown, or the move is in place (that path adopts the element itself).
 */
export function handoffTime(
  handoff: { sourceTime: number | null; sourceSrc: string | null; startedAt: number; inPlace: boolean },
  src: string | undefined,
  duration: number,
  now: number,
): number | null {
  const { sourceTime, sourceSrc, startedAt, inPlace } = handoff;
  if (inPlace || sourceTime === null || !sourceSrc || !src || !(duration > 0)) return null;
  if (!sameUrl(sourceSrc, src)) return null;
  const t = sourceTime + Math.max(0, now - startedAt) / 1000;
  return t % duration;
}

function sameUrl(a: string, b: string): boolean {
  try {
    const base = typeof location === "undefined" ? "http://localhost/" : location.href;
    return new URL(a, base).href === new URL(b, base).href;
  } catch {
    return a === b;
  }
}
