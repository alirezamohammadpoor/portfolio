"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";

interface MediaPanelProps {
  coverMedia: PROJECTS_QUERY_RESULT[number]["coverMedia"];
  title: string;
  /** First slide on first paint — gets eager loading + fetchPriority high. */
  priority?: boolean;
  /** Currently visible slide — drives autoplay imperatively. */
  isActive?: boolean;
  /** Adjacent slide (±1 from active) — eagerly preloads the video so a
   *  scroll into view paints the first frame without a black flash, but
   *  the video remains paused (decode budget preserved). */
  shouldPreload?: boolean;
}

export default function MediaPanel({
  coverMedia,
  title,
  priority = false,
  isActive = false,
  shouldPreload = false,
}: MediaPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Force-fetch adjacent + active + priority slides. iOS Safari ignores
  // `preload="auto"` as a hint and won't fetch until user interaction
  // or visibility change — calling load() bypasses that. The
  // readyState < 2 guard prevents re-triggering load() on a video that
  // already has frames buffered (which would reset it).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const shouldFetch = priority || isActive || shouldPreload;
    if (shouldFetch && video.readyState < 2) {
      video.load();
    }
  }, [priority, isActive, shouldPreload]);

  // Play/pause the cover video imperatively. Only the active slide plays;
  // others freeze on their first frame (preserves mobile decode budget).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [isActive]);

  if (coverMedia?.type === "video" && coverMedia.video?.asset?._ref) {
    return (
      <div className="relative w-full overflow-hidden bg-black h-full">
        <video
          ref={videoRef}
          src={fileUrl(coverMedia.video.asset._ref)}
          className="h-full w-full object-cover"
          aria-label={`${title} cover video`}
          // autoPlay only on the first paint slide; the effect above
          // takes over once isActive flips after a scroll.
          autoPlay={priority}
          muted
          loop
          playsInline
          preload={priority || isActive || shouldPreload ? "auto" : "metadata"}
        />
      </div>
    );
  }

  if (coverMedia?.type === "image" && coverMedia.image?.asset) {
    return (
      <div className="relative w-full overflow-hidden bg-black h-full">
        <Image
          src={imageUrl(coverMedia.image, 1200)}
          alt={title}
          fill
          className="object-cover"
          sizes="(min-width: 75rem) 50vw, 100vw"
          priority={priority}
          fetchPriority={priority ? "high" : undefined}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-black h-full">
      <div className="flex h-full items-center justify-center text-sub text-secondary">
        {title} media
      </div>
    </div>
  );
}
