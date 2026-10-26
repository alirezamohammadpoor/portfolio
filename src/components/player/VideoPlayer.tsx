"use client";

/**
 * Shared video player for the journal (strip layout: controls + label under
 * the video) and project pages (overlay layout: controls inside the media box,
 * caption drawn by the block). One state machine, one set of tokens.
 *
 * Behaviour (see docs in /video-player/audit.md):
 * - Autoplays muted when ≥50% in view, pauses out of view. Reduced motion:
 *   never autoplays; shows the first frame with a play button.
 * - Sound control exists only when the file has an audio track (prop or
 *   detection); the project masters are silent, the journal clips are not.
 * - Progress is written straight to the DOM from rAF; React state only
 *   changes on play/pause/mute/ended/scrub-start/scrub-end.
 * - Scrub: pointer drag on the tracker, arrow keys ±5 s, Home/End.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { track } from "@vercel/analytics";
import { prefersReducedMotion } from "@/lib/motion";

export type ControlLanguage = "icons" | "pills" | "text" | "iconword";
export type Tracker = "line" | "ring" | "counter";
export type Layout = "strip" | "overlay";
export type Aspect = "4/3" | "16/9" | "9/16" | "auto";

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  /** Uppercase label in the strip; ignored in overlay layout. */
  label?: string;
  aspect?: Aspect;
  layout?: Layout;
  language?: ControlLanguage;
  tracker?: Tracker;
  loop?: boolean;
  /** undefined = detect from the media element after metadata. */
  hasAudio?: boolean;
  /** Autoplay (muted) when in view. */
  autoplay?: boolean;
  /** Width in CSS px for fixed layouts; omit for fill. */
  width?: number;
  className?: string;
  /** Analytics name, e.g. the clip slug. */
  trackId?: string;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

/* ---------- icons: 24 grid, 1.5 stroke, same weight as the sub type ---------- */
const I = ({ d, size = 16 }: { d: React.ReactNode; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);
const IconPlay = (p: { size?: number }) => <I size={p.size} d={<path d="M7 4.5v15l12-7.5z" />} />;
const IconPause = (p: { size?: number }) => <I size={p.size} d={<path d="M7 5v14M17 5v14" />} />;
const IconMuted = (p: { size?: number }) => (
  <I size={p.size} d={<><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m22 9-6 6M16 9l6 6" /></>} />
);
const IconSound = (p: { size?: number }) => (
  <I
    size={p.size}
    d={<><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>}
  />
);

export default function VideoPlayer({
  src,
  poster,
  label,
  aspect = "auto",
  layout = "strip",
  language = "icons",
  tracker = "line",
  loop = true,
  hasAudio,
  autoplay = true,
  width,
  className = "",
  trackId,
}: VideoPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLSpanElement>(null);
  const durRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);
  const userPausedRef = useRef(false);
  const inViewRef = useRef(false);
  const wasPlayingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [audio, setAudio] = useState<boolean | undefined>(hasAudio);
  const [ratio, setRatio] = useState<string>(
    aspect === "auto" ? "4 / 3" : aspect.replace("/", " / "),
  );
  const [reduced, setReduced] = useState(false);
  const sliderId = useId();

  useEffect(() => setReduced(prefersReducedMotion()), []);

  /* progress → DOM, no React */
  const paint = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration || 0;
    const pct = d ? v.currentTime / d : 0;
    if (lineRef.current) lineRef.current.style.transform = `scaleX(${pct})`;
    if (handleRef.current) handleRef.current.style.left = `${pct * 100}%`;
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${pct})`;
    if (ringRef.current) {
      const c = 2 * Math.PI * 12;
      ringRef.current.style.strokeDashoffset = `${c * (1 - pct)}`;
    }
    if (sliderRef.current) {
      sliderRef.current.setAttribute("aria-valuenow", String(Math.round(pct * 100)));
      sliderRef.current.setAttribute("aria-valuetext", `${fmt(v.currentTime)} of ${fmt(d)}`);
    }
    if (curRef.current) curRef.current.textContent = fmt(v.currentTime);
    if (durRef.current) durRef.current.textContent = fmt(d);
  }, []);

  const loop60 = useCallback(() => {
    const step = () => {
      paint();
      rafRef.current = requestAnimationFrame(step);
    };
    step();
  }, [paint]);

  const stopLoop = useCallback(() => cancelAnimationFrame(rafRef.current), []);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.then(() => setBlocked(false)).catch(() => {
        setBlocked(true);
        setPlaying(false);
      });
    }
  }, []);

  /* media events */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => {
      setPlaying(true);
      setEnded(false);
      stopLoop();
      rafRef.current = requestAnimationFrame(loop60);
      track("player_play", { id: trackId ?? src, muted: v.muted });
    };
    const onPause = () => {
      setPlaying(false);
      stopLoop();
      paint();
    };
    const onEnded = () => {
      setEnded(true);
      track("player_ended", { id: trackId ?? src });
    };
    const onVol = () => {
      setMuted(v.muted);
      track("player_volumechange", { id: trackId ?? src, muted: v.muted });
    };
    const onSeeking = () => track("player_seeking", { id: trackId ?? src, t: Math.round(v.currentTime) });
    const detect = () => {
      if (hasAudio !== undefined) return;
      const anyV = v as HTMLVideoElement & {
        mozHasAudio?: boolean;
        webkitAudioDecodedByteCount?: number;
        audioTracks?: { length: number };
      };
      if (typeof anyV.mozHasAudio === "boolean") setAudio(anyV.mozHasAudio);
      else if (anyV.audioTracks) setAudio(anyV.audioTracks.length > 0);
      else if (typeof anyV.webkitAudioDecodedByteCount === "number")
        setAudio(anyV.webkitAudioDecodedByteCount > 0);
    };
    const onMeta = () => {
      if (aspect === "auto" && v.videoWidth && v.videoHeight)
        setRatio(`${v.videoWidth} / ${v.videoHeight}`);
      paint();
      detect();
    };
    const onTime = () => {
      // webkitAudioDecodedByteCount only moves once frames are decoded.
      if (audio === undefined) detect();
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    if (v.readyState >= 1) onMeta();
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
      stopLoop();
    };
  }, [aspect, audio, hasAudio, loop60, paint, src, stopLoop, trackId]);

  /* in-view autoplay (muted) */
  useEffect(() => {
    const el = rootRef.current;
    const v = videoRef.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        inViewRef.current = e.isIntersecting;
        if (e.isIntersecting) {
          if (autoplay && !reduced && !userPausedRef.current && v.paused) play();
        } else if (!v.paused) {
          v.pause();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    const onVis = () => {
      if (document.visibilityState === "visible" && inViewRef.current && autoplay && !reduced && !userPausedRef.current && v.paused) play();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [autoplay, play, reduced]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      if (v.ended) v.currentTime = 0;
      play();
    } else {
      userPausedRef.current = true;
      v.pause();
    }
  };

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) {
      v.volume = 0.15; // today's RichPreview level
      v.muted = false;
      // iOS pauses a video that is unmuted outside a gesture; we are inside one.
      if (v.paused && !userPausedRef.current) play();
    } else {
      v.muted = true;
    }
  };

  /* scrub */
  const seekFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    const r = e.currentTarget.getBoundingClientRect();
    if (!v || !v.duration || !r.width) return;
    const pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    v.currentTime = pct * v.duration;
    paint();
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    wasPlayingRef.current = !v.paused;
    if (!v.paused) v.pause();
    setScrubbing(true);
    seekFromPointer(e);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (scrubbing) seekFromPointer(e);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrubbing) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setScrubbing(false);
    if (wasPlayingRef.current) play();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const step = 5;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") v.currentTime = Math.min(v.duration, v.currentTime + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v.currentTime = Math.max(0, v.currentTime - step);
    else if (e.key === "Home") v.currentTime = 0;
    else if (e.key === "End") v.currentTime = v.duration;
    else return;
    e.preventDefault();
    paint();
  };

  /* ---------- pieces ---------- */
  const overlay = layout === "overlay";
  const ink = overlay ? "text-white" : "text-primary";
  const showPlayIcon = !playing || ended || blocked;

  const pill =
    "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sub uppercase font-medium text-primary transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.97] " +
    "bg-white border border-tertiary";
  const word = `text-sub uppercase font-medium tracking-[0.02em] ${ink} link-underline`;
  const bare = `flex size-11 -m-3 items-center justify-center ${ink} transition-opacity duration-[var(--dur-fast)] hover:opacity-70`;

  const playLabel = showPlayIcon ? "Play" : "Pause";
  const soundLabel = muted ? "Sound on" : "Sound off";

  const PlayGlyph = showPlayIcon ? IconPlay : IconPause;
  const SoundGlyph = muted ? IconMuted : IconSound;

  const ringButton = (
    <button type="button" onClick={togglePlay} aria-label={playLabel} className={`relative flex size-11 -m-1.5 items-center justify-center ${ink}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" className="absolute inset-0 m-auto" aria-hidden="true">
        <circle cx="14" cy="14" r="12" fill={overlay ? "none" : "white"} stroke={overlay ? "rgba(255,255,255,0.35)" : "white"} strokeWidth="2" />
        <circle
          ref={ringRef}
          cx="14"
          cy="14"
          r="12"
          fill="none"
          stroke={overlay ? "var(--color-pistachio)" : "var(--color-primary)"}
          strokeWidth="2"
          strokeDasharray={2 * Math.PI * 12}
          strokeDashoffset={2 * Math.PI * 12}
          transform="rotate(-90 14 14)"
        />
      </svg>
      <span className="relative"><PlayGlyph size={14} /></span>
    </button>
  );

  const playButton =
    tracker === "ring" ? (
      ringButton
    ) : language === "pills" ? (
      <button type="button" onClick={togglePlay} aria-label={playLabel} className={pill}>
        <PlayGlyph size={12} />
        <span>{playLabel}</span>
      </button>
    ) : language === "text" ? (
      <button type="button" onClick={togglePlay} className={word}>{playLabel}</button>
    ) : language === "iconword" ? (
      <button type="button" onClick={togglePlay} className={`flex items-center gap-1.5 ${word}`}>
        <PlayGlyph size={14} />
        <span>{playLabel}</span>
      </button>
    ) : (
      <button type="button" onClick={togglePlay} aria-label={playLabel} className={bare}>
        <PlayGlyph />
      </button>
    );

  const soundButton =
    audio === false ? null : language === "pills" ? (
      <button type="button" onClick={toggleSound} aria-label={soundLabel} aria-pressed={!muted} className={pill}>
        <SoundGlyph size={12} />
        <span>Sound</span>
      </button>
    ) : language === "text" ? (
      <button type="button" onClick={toggleSound} aria-pressed={!muted} className={word}>{soundLabel}</button>
    ) : language === "iconword" ? (
      <button type="button" onClick={toggleSound} aria-pressed={!muted} className={`flex items-center gap-1.5 ${word}`}>
        <SoundGlyph size={14} />
        <span>{soundLabel}</span>
      </button>
    ) : (
      <button type="button" onClick={toggleSound} aria-label={soundLabel} aria-pressed={!muted} className={bare}>
        <SoundGlyph />
      </button>
    );

  const timecodeSmall = (
    <span className={`text-sub tabular-nums ${ink} ${overlay ? "" : ""}`} aria-hidden="true">
      <span ref={curRef}>0:00</span> / <span ref={durRef}>0:00</span>
    </span>
  );

  const counter = (
    <span className={`flex items-baseline gap-1 ${ink}`} aria-hidden="true">
      <span ref={curRef} className="text-h3 font-medium tabular-nums leading-none">0:00</span>
      <span ref={durRef} className={`text-sub tabular-nums ${overlay ? "text-white/70" : "text-secondary"}`}>0:00</span>
    </span>
  );

  /* scrubbable line: at the bottom edge of the media box */
  const edgeLine = (
    <div
      id={sliderId}
      ref={sliderRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKey}
      className="group absolute inset-x-0 bottom-0 z-10 h-6 cursor-pointer touch-none outline-none"
    >
      <div className={`absolute inset-x-0 bottom-0 h-1 ${overlay ? "bg-white/30" : "bg-tertiary"}`}>
        <div ref={lineRef} className="h-full w-full origin-left bg-pistachio" style={{ transform: "scaleX(0)" }} />
      </div>
      <div
        ref={handleRef}
        className={`absolute bottom-[-3px] size-2.5 -translate-x-1/2 rounded-full bg-pistachio opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100 group-focus-visible:opacity-100 ${scrubbing ? "opacity-100" : ""}`}
        style={{ left: "0%" }}
      />
    </div>
  );

  const style: React.CSSProperties = width ? { width } : {};

  const media = (
    <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: ratio }}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop={loop}
        playsInline
        preload="metadata"
        className="absolute inset-0 size-full object-contain"
        aria-label={label}
      />
      {blocked && (
        <button type="button" onClick={togglePlay} aria-label="Play" className="absolute inset-0 flex items-center justify-center text-white">
          <span className="flex size-14 items-center justify-center rounded-full bg-black/50"><IconPlay size={24} /></span>
        </button>
      )}
      {tracker === "line" && edgeLine}
      {overlay && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 px-4 pb-4 pt-6 text-white" style={{ paddingBottom: tracker === "line" ? 16 : 16 }}>
          {playButton}
          {soundButton}
          <span className="flex-1" />
          {tracker === "counter" ? counter : timecodeSmall}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div ref={rootRef} className={`relative ${className}`} style={style} data-player data-layout="overlay" data-language={language} data-tracker={tracker} data-state={playing ? "playing" : ended ? "ended" : "paused"}>
        {media}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`flex flex-col overflow-hidden rounded-2xl bg-lightpistachio ${className}`} style={style} data-player data-layout="strip" data-language={language} data-tracker={tracker} data-state={playing ? "playing" : ended ? "ended" : "paused"}>
      {media}
      <div className={`relative flex items-center gap-3 px-3 ${tracker === "counter" ? "py-2.5" : "py-2"}`}>
        {tracker === "counter" && (
          <div ref={fillRef} className="absolute inset-0 origin-left bg-pistachio" style={{ transform: "scaleX(0)" }} aria-hidden="true" />
        )}
        <div className="relative flex items-center gap-3">
          {playButton}
          {soundButton}
        </div>
        {tracker === "counter" ? (
          <div className="relative flex min-w-0 flex-1 flex-col">
            {label && <span className="truncate text-sub font-medium uppercase tracking-[0.02em] text-primary">{label}</span>}
            {counter}
          </div>
        ) : (
          <>
            {label && <span className="relative min-w-0 flex-1 truncate text-right text-sub font-medium uppercase tracking-[0.02em] text-primary">{label}</span>}
            {!label && <span className="flex-1" />}
            {timecodeSmall}
          </>
        )}
      </div>
    </div>
  );
}
