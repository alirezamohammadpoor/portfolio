"use client";

import { useEffect, useRef } from "react";

/**
 * A silent film for the chapter page: no chrome, no controls. Plays muted
 * on loop while it is in view and `active`, pauses otherwise. Chapter films
 * are production → variant recordings, so they are content, not a player.
 */
export default function InlineClip({
  src,
  poster,
  label,
  active = true,
  className = "",
}: {
  src: string;
  poster?: string;
  label: string;
  /** false under the transition clone or for a hidden switcher panel: paused, no observer. */
  active?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!active) {
      video.pause();
      return;
    }
    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tryPlay();
        else video.pause();
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [active, src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
      className={`block w-full h-auto ${className}`}
    />
  );
}
