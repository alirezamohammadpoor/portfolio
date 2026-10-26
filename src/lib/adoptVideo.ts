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
