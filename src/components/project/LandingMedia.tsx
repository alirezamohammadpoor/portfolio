"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { onFirstVideoFrame } from "@/lib/firstFrame";
import { adoptableVideo, mountAdoptedVideo } from "@/lib/adoptVideo";
import { usePageTransition } from "@/context/TransitionContext";

type GalleryItem = NonNullable<NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["gallery"]>[number];

interface LandingMediaProps {
  item: GalleryItem | null;
  title: string | null;
  /** The 4:3 box: the clone's landing rect (home → project, project → project). */
  slotRef: RefObject<HTMLDivElement | null>;
  /** The media has a frame to paint: the clone may be removed. */
  onReady?: () => void;
  sizes?: string;
}

/**
 * The hero's landing media on the chapter page: the project's first gallery
 * item in a 4:3 box, the same box the gallery page renders as item 1, so the
 * clone morph from the home card (and the in-place hand-off from the previous
 * project's preview, which carries its live <video> over, see adoptVideo.ts)
 * lands here unchanged.
 */
export default function LandingMedia({ item, title, slotRef, onReady, sizes = "(min-width: 75rem) 50vw, 100vw" }: LandingMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { isTransitioning, inPlace, sourceVideoElement } = usePageTransition();
  const src = item?._type === "galleryVideo" && item.video?.asset?._ref ? fileUrl(item.video.asset._ref) : undefined;
  const [adopted] = useState(() => adoptableVideo(sourceVideoElement, inPlace, src));
  const adoptHostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = adoptHostRef.current;
    if (!adopted || !host || isTransitioning || adopted.parentElement === host) return;
    mountAdoptedVideo(host, adopted, `${title} — 1`);
    videoRef.current = adopted;
  }, [adopted, isTransitioning, title]);

  // A video reports ready on its first presented frame, so the clone never
  // leaves while it still paints black. An adopted element is that frame.
  useEffect(() => {
    if (!onReady) return;
    if (adopted) {
      onReady();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    return onFirstVideoFrame(video, onReady);
  }, [onReady, adopted]);

  // Keep playing once the page is shown again (Activity restore, tab back).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tryPlay = () => {
      if (!video.paused) return;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    const onVis = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    tryPlay();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [adopted]);

  // No media at all: an empty slot keeps the layout; the clone collapses on it.
  const isImage = item?._type === "galleryImage";

  return (
    <div ref={slotRef} className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: 4 / 3 }}>
      {isImage && item.image?.asset && (
        <Image
          src={imageUrl(item.image, 1200)}
          alt={`${title} — 1`}
          fill
          className="object-cover"
          sizes={sizes}
          priority
          onLoad={onReady}
        />
      )}
      {src && adopted && <div ref={adoptHostRef} className="absolute inset-0" />}
      {src && !adopted && (
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full object-cover"
          aria-label={`${title} — 1`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      )}
    </div>
  );
}
