"use client";

import { useEffect, useRef, useState } from "react";

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
  onAspect,
  loop = true,
  onEnded,
}: {
  src: string;
  poster?: string;
  label: string;
  /** false under the transition clone or for a hidden switcher panel: paused, no observer. */
  active?: boolean;
  className?: string;
  /** Width / height once the clip reports its size. */
  onAspect?: (aspect: number) => void;
  /** false for carousel steps: the clip plays through once and reports `onEnded`. */
  loop?: boolean;
  onEnded?: () => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [still, setStill] = useState(false);

  // Reduced motion: show the poster (the "before" frame) instead of the loop.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!active || still) {
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
  }, [active, still, src]);

  if (still && poster) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={poster} alt={label} className={`block w-full h-auto ${className}`} />;
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop={loop}
      onEnded={onEnded}
      playsInline
      preload={still ? "none" : "metadata"}
      aria-label={label}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (onAspect && v.videoWidth && v.videoHeight) onAspect(v.videoWidth / v.videoHeight);
      }}
      className={`block w-full h-auto bg-tertiary/40 ${className}`}
    />
  );
}
