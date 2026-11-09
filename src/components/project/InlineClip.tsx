"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A silent film for the chapter page: no chrome, no controls. Plays muted
 * on loop while it is in view and `active`, pauses otherwise. Chapter films
 * are production → variant recordings, so they are content, not a player.
 *
 * `once` (an A/B test clip in the gallery, Ali 11-05): no loop. Each time it
 * turns active it plays from the start (today) and holds on its last frame
 * (the design); inactive it rests on the first frame. A new `replay` value
 * plays it again. Under reduced motion it rests on the last frame and plays
 * only on replay, which the visitor asked for.
 */
export default function InlineClip({
  src,
  poster,
  label,
  active = true,
  className = "",
  onAspect,
  once = false,
  replay = 0,
  onEndedChange,
}: {
  src: string;
  poster?: string;
  label: string;
  /** false under the transition clone or for a hidden switcher panel: paused, no observer. */
  active?: boolean;
  className?: string;
  /** Width / height once the clip reports its size. */
  onAspect?: (aspect: number) => void;
  /** Play once per activation and hold the last frame (see above). */
  once?: boolean;
  /** Bump to play a `once` clip again from the start. */
  replay?: number;
  /** A `once` clip started (false) or reached its last frame (true). */
  onEndedChange?: (ended: boolean) => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [still, setStill] = useState(false);
  const onEndedRef = useRef(onEndedChange);
  useEffect(() => {
    onEndedRef.current = onEndedChange;
  }, [onEndedChange]);

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
    if (!video || once) return;
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
  }, [active, still, src, once]);

  // `once`: play from the start each time the clip turns active; rest on the
  // first frame while inactive. Reduced motion holds the last frame instead.
  useEffect(() => {
    const video = ref.current;
    if (!video || !once) return;
    if (!active) {
      video.pause();
      if (video.readyState > 0) video.currentTime = 0;
      onEndedRef.current?.(false);
      return;
    }
    if (still) {
      const toEnd = () => {
        if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, video.duration - 0.05);
        onEndedRef.current?.(true);
      };
      if (video.readyState > 0) toEnd();
      else {
        video.addEventListener("loadedmetadata", toEnd, { once: true });
        // iOS Safari ignores preload="metadata": ask for it, or the seek never comes.
        video.load();
      }
      return () => video.removeEventListener("loadedmetadata", toEnd);
    }
    if (video.readyState > 0) video.currentTime = 0;
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return () => video.pause();
  }, [active, still, src, once]);

  // Replay: a new value plays a `once` clip again from the start.
  const lastReplay = useRef(replay);
  useEffect(() => {
    const video = ref.current;
    if (!video || !once || replay === lastReplay.current) return;
    lastReplay.current = replay;
    // Only the centred clip answers; the others take the count silently.
    if (!active) return;
    video.currentTime = 0;
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [replay, once, active]);

  if (still && poster && !once) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt={label}
        className={`block w-full h-auto ${className}`}
        // The still stands in for the clip, so it reports the ratio too:
        // otherwise a portrait recording keeps the landscape frame it was
        // guessed into until metadata that never arrives.
        onLoad={(e) => {
          const i = e.currentTarget;
          if (onAspect && i.naturalWidth && i.naturalHeight) onAspect(i.naturalWidth / i.naturalHeight);
        }}
      />
    );
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop={!once}
      data-once={once || undefined}
      playsInline
      preload={still && !once ? "none" : "metadata"}
      onPlay={once ? () => onEndedRef.current?.(false) : undefined}
      onEnded={once ? () => onEndedRef.current?.(true) : undefined}
      aria-label={label}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (onAspect && v.videoWidth && v.videoHeight) onAspect(v.videoWidth / v.videoHeight);
      }}
      className={`block w-full h-auto bg-tertiary/40 ${className}`}
    />
  );
}
