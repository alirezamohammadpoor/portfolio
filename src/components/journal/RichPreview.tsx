"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useAnchoredMobileOverlay } from "@/hooks/useAnchoredMobileOverlay";

interface RichPreviewProps {
  videoUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  url?: string;
  label?: string;
  children: React.ReactNode;
}

export default function RichPreview({
  videoUrl,
  imageUrl,
  imageAlt,
  url,
  label,
  children,
}: RichPreviewProps) {
  const hasVideo = Boolean(videoUrl);
  const hasImage = !hasVideo && Boolean(imageUrl);
  const [visible, setVisible] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const rafRef = useRef<number>(0);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLSpanElement>(null);

  const close = useCallback(() => {
    setVisible(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const { isMobile, position, placement, caretLeft, ready } =
    useAnchoredMobileOverlay(triggerRef, popupRef, {
      visible,
      onClose: close,
      anchorPoint,
    });

  useGSAP(
    () => {
      const el = triggerRef.current;
      if (!el) return;

      gsap.set(el, {
        backgroundImage:
          "linear-gradient(var(--color-pistachio), var(--color-pistachio))",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        backgroundSize: "0% 100%",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      });

      // See GlossaryTerm for rationale — IntersectionObserver avoids the
      // "already filled when I arrive" bug that ScrollTrigger + once + delay caused
      // during page transitions / fast scrolls.
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry?.isIntersecting) return;
          observer.disconnect();
          gsap.to(el, {
            backgroundSize: "100% 100%",
            duration: 0.8,
            ease: "power2.out",
          });
        },
        { threshold: 0.5 },
      );
      observer.observe(el);

      return () => observer.disconnect();
    },
    { scope: triggerRef, dependencies: [isMobile, videoUrl, imageUrl, label] },
  );

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

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }, []);

  const show = () => {
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const hide = () => {
    setVisible(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
    setAnchorPoint({ x: event.clientX, y: event.clientY });

    if (visible) {
      hide();
      return;
    }
    show();
  };

  useEffect(() => {
    if (!hasVideo) return;
    if (visible) {
      if (videoRef.current) videoRef.current.volume = 0.15;
      playVideo();
      startRAF();
    } else {
      videoRef.current?.pause();
      stopRAF();
    }

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        visible &&
        videoRef.current?.paused
      ) {
        playVideo();
        startRAF();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopRAF();
    };
  }, [visible, playVideo, hasVideo]);

  const videoCard = (width: string | number, mobile = false) => (
    <span className="relative flex flex-col" style={{ width }}>
      <span className="flex flex-col overflow-hidden rounded-2xl bg-lightpistachio">
        <span className="relative">
          {hasVideo ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                muted={muted}
                loop
                playsInline
                preload="metadata"
                className="aspect-video w-full object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMuted((prev) => !prev);
                }}
                aria-label={muted ? "Unmute video" : "Mute video"}
                className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:bg-black/60"
              >
                {muted ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>
            </>
          ) : hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={imageAlt ?? ""}
              className="aspect-video w-full object-contain"
            />
          ) : null}
        </span>
        <span className="relative flex flex-col gap-1 overflow-hidden px-3 py-2">
          {hasVideo && (
            <span
              ref={progressRef}
              className="absolute inset-0 origin-left bg-pistachio transition-none"
              style={{ transform: "scaleX(0)" }}
            />
          )}
          {label && (
            <span className="relative text-sub font-medium uppercase text-primary">
              {label}
            </span>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label ? `See more about ${label}` : "See more"}
              onClick={(e) => {
                e.stopPropagation();
                videoRef.current?.pause();
              }}
              className="relative self-start border-b border-primary text-sub text-primary"
            >
              See more →
            </a>
          )}
        </span>
      </span>

      {mobile && caretLeft !== null && placement === "above" && (
        <span
          className="absolute top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[6px] border-t-lightpistachio"
          style={{ left: caretLeft }}
        />
      )}
      {mobile && caretLeft !== null && placement === "below" && (
        <span
          className="absolute bottom-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-b-[6px] border-b-lightpistachio"
          style={{ left: caretLeft }}
        />
      )}
    </span>
  );

  if (isMobile) {
    const showPopup = visible && ready;

    return (
      <span className="relative inline">
        {typeof document !== "undefined" &&
          createPortal(
            <span
              ref={popupRef}
              className={`fixed z-50 transition-opacity duration-300 ${
                showPopup ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              style={
                showPopup && position
                  ? { top: position.top, left: position.left }
                  : { top: 0, left: 0, visibility: "hidden" as const }
              }
            >
              {videoCard("min(420px, calc(100vw - 32px))", showPopup)}
            </span>,
            document.body,
          )}

        <span
          ref={triggerRef}
          role="button"
          tabIndex={0}
          aria-label={label ? `Preview: ${label}` : "Show preview"}
          aria-expanded={visible}
          onClick={handleClick}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(e as unknown as MouseEvent<HTMLSpanElement>); } }}
          className="cursor-pointer"
        >
          {children}
        </span>
      </span>
    );
  }

  return (
    <span
      className="relative inline"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span
        ref={popupRef}
        className={`fixed top-1/2 left-1/2 z-50 mb-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] desktop:absolute desktop:bottom-full desktop:top-auto desktop:-translate-x-1/2 desktop:translate-y-0 ${
          visible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0 desktop:translate-y-1"
        }`}
      >
        {videoCard(600)}
        <span className="hidden h-0 w-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-lightpistachio desktop:block" />
      </span>

      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={label ? `Preview: ${label}` : "Show preview"}
        aria-expanded={visible}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(e as unknown as MouseEvent<HTMLSpanElement>); } }}
        className="cursor-pointer"
      >
        {children}
      </span>
    </span>
  );
}
