import type { StartTransitionArgs } from "@/context/TransitionContext";

/**
 * Build the clone-morph source from whatever media is painted inside `el`:
 * an <img> (any state) or a <video> with a decoded frame. Returns null when
 * there is nothing the overlay could paint, so the caller falls back to a
 * plain route push.
 */
export function cloneSourceFromElement(
  el: HTMLElement | null,
  { allowLoadingVideo = false }: { allowLoadingVideo?: boolean } = {},
): StartTransitionArgs | null {
  if (!el) return null;
  const media = el.querySelector<HTMLImageElement | HTMLVideoElement>("img, video");
  const rectSource = media ?? el;
  const r = rectSource.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  const sourceRect = { top: r.top, left: r.left, width: r.width, height: r.height };

  if (media instanceof HTMLVideoElement) {
    // A video without a decoded frame cannot be snapshotted for a morph. In
    // place (project → project) the element itself is carried over and keeps
    // loading where it is, which beats a route push that swaps the page
    // under a black box.
    if (!allowLoadingVideo && (media.readyState < 2 || media.videoWidth === 0)) return null;
    return {
      mediaType: "video",
      videoSrc: media.currentSrc || media.src,
      videoCurrentTime: media.currentTime,
      sourceVideoElement: media,
      sourceRect,
    };
  }
  if (media instanceof HTMLImageElement) {
    const src = media.currentSrc || media.src;
    if (!src) return null;
    return { mediaType: "image", imageUrl: src, sourceRect };
  }
  return null;
}
