"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { urlFor, fileUrl } from "@/sanity/lib/image";

interface MediaPanelProps {
  coverMedia: PROJECTS_QUERY_RESULT[number]["coverMedia"];
  title: string;
  /** First slide on first paint — gets eager loading + fetchPriority high. */
  priority?: boolean;
  /** Currently visible slide — drives autoplay and fetchPriority once
   *  the user scrolls past the initial slide. */
  isActive?: boolean;
}

export default function MediaPanel({
  coverMedia,
  title,
  priority = false,
  isActive = false,
}: MediaPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Play/pause the cover video imperatively so off-screen slides aren't
  // decoding and competing for the mobile media-element budget. Only the
  // active slide plays; others freeze on their first frame.
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
      <div className="relative w-full overflow-hidden bg-tertiary h-full">
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
          preload={priority || isActive ? "auto" : "metadata"}
        />
      </div>
    );
  }

  if (coverMedia?.type === "image" && coverMedia.image?.asset) {
    return (
      <div className="relative w-full overflow-hidden bg-tertiary h-full">
        <Image
          src={urlFor(coverMedia.image).width(1400).quality(85).url()}
          alt={title}
          fill
          className="object-cover"
          sizes="(min-width: 75rem) 50vw, 100vw"
          priority={priority}
          fetchPriority={priority || isActive ? "high" : "auto"}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-tertiary h-full">
      <div className="flex h-full items-center justify-center text-sub text-secondary">
        {title} media
      </div>
    </div>
  );
}
