"use client";

import { useState, useRef, useEffect } from "react";

interface RichPreviewProps {
  videoUrl: string;
  url?: string;
  label?: string;
  children: React.ReactNode;
}

export default function RichPreview({
  videoUrl,
  url,
  label,
  children,
}: RichPreviewProps) {
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const rafRef = useRef<number>(0);

  const tick = () => {
    if (videoRef.current && videoRef.current.duration && progressRef.current) {
      const pct = videoRef.current.currentTime / videoRef.current.duration;
      progressRef.current.style.transform = `scaleX(${pct})`;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startRAF = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopRAF = () => {
    cancelAnimationFrame(rafRef.current);
  };

  const show = () => {
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const hide = () => {
    setVisible(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleClick = () => {
    if (visible) {
      hide();
      return;
    }
    show();
  };

  useEffect(() => {
    if (visible) {
      if (videoRef.current) videoRef.current.volume = 0.15;
      videoRef.current?.play();
      startRAF();
    } else {
      videoRef.current?.pause();
      stopRAF();
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && visible && videoRef.current?.paused) {
        videoRef.current.play();
        startRAF();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopRAF();
    };
  }, [visible]);

  return (
    <span
      className="relative inline"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {/* Preview card — fixed centered on mobile, absolute on desktop */}
      <span
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 desktop:absolute desktop:bottom-full desktop:top-auto desktop:translate-y-0 desktop:-translate-x-1/2 mb-0 flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] z-50 ${visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 desktop:translate-y-1"}`}
      >
        <span className="rounded-2xl overflow-hidden bg-lightpistachio w-[380px] desktop:w-[600px] flex flex-col">
          <span className="relative">
            <video
              ref={videoRef}
              src={videoUrl}
              muted={muted}
              loop
              playsInline
              preload="metadata"
              className="w-full aspect-video object-cover"
            />
            {/* Mute toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMuted((prev) => !prev);
              }}
              aria-label={muted ? "Unmute video" : "Mute video"}
              className="absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white cursor-pointer transition-opacity hover:bg-black/60"
            >
              {muted ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
          </span>
          <span className="relative px-3 py-2 flex flex-col gap-1 overflow-hidden">
            {/* Progress fill */}
            <span
              ref={progressRef}
              className="absolute inset-0 bg-pistachio origin-left transition-none"
              style={{ transform: "scaleX(0)" }}
            />
            {label && (
              <span className="relative text-sub uppercase text-primary font-medium">
                {label}
              </span>
            )}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => videoRef.current?.pause()}
                className="relative text-sub text-primary border-b border-primary self-start"
              >
                See more →
              </a>
            )}
          </span>
        </span>
        {/* Arrow */}
        <span className="hidden desktop:block w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-lightpistachio" />
      </span>
      {/* Highlighted term */}
      <span
        onClick={handleClick}
        className="bg-lightpistachio cursor-pointer"
      >
        {children}
      </span>
    </span>
  );
}
