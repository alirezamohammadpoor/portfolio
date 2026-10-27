"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useAnchoredMobileOverlay } from "@/hooks/useAnchoredMobileOverlay";
import VideoPlayer from "@/components/player/VideoPlayer";

interface RichPreviewProps {
  videoUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  url?: string;
  label?: string;
  children: React.ReactNode;
}

// How long the fade-out runs before the player is unmounted.
const FADE_MS = 300;
// Grace period when the pointer travels from the phrase to the popup.
const LEAVE_MS = 150;

/**
 * Pop-up preview on a phrase in a journal post. The card is portaled to
 * <body>: the mark sits inside a <p>, and the shared VideoPlayer renders
 * block elements, which a <p> cannot contain. The player only mounts while
 * the card is open, so hidden previews never fetch or autoplay.
 */
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
  const [mounted, setMounted] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  // Last measured position, kept through the fade-out (the hook clears it
  // the moment `visible` drops).
  const lastPosition = useRef<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setVisible(false);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  const { isMobile, position, placement, caretLeft, ready } =
    useAnchoredMobileOverlay(triggerRef, popupRef, {
      visible,
      onClose: close,
      anchorPoint,
      anchorOnDesktop: true,
    });

  // Keep the card in the DOM through the fade-out, then drop the player.
  // Mounting happens in `show` (same commit as `visible`), so the anchoring
  // hook can measure the card in its layout effect; an effect here would
  // mount it one commit too late and leave the card unpositioned.
  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(t);
  }, [visible]);

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

  const show = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setMounted(true);
    setVisible(true);
  };

  const hideSoon = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setVisible(false), LEAVE_MS);
  };

  const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
    setAnchorPoint({ x: event.clientX, y: event.clientY });
    if (visible) {
      close();
      return;
    }
    show();
  };

  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    [],
  );

  const card = (width: string | number) => (
    <div className="relative flex flex-col" style={{ width }}>
      <div className="flex flex-col overflow-hidden rounded-2xl bg-lightpistachio">
        {hasVideo && mounted ? (
          <VideoPlayer
            src={videoUrl!}
            label={label}
            aspect="16/9"
            fit="cover"
            trackId={label}
            className="rounded-none"
          />
        ) : hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imageAlt ?? ""}
              className="aspect-video w-full object-contain"
            />
            {label && (
              <span className="px-3 pt-2 text-sub font-medium uppercase tracking-[0.02em] text-primary">
                {label}
              </span>
            )}
          </>
        ) : null}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label ? `See more about ${label}` : "See more"}
            onClick={(e) => e.stopPropagation()}
            className="mx-3 mb-2 mt-1 self-start border-b border-primary text-sub text-primary"
          >
            See more →
          </a>
        )}
      </div>

      {caretLeft !== null && placement === "above" && (
        <span
          className="absolute top-full size-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[6px] border-t-lightpistachio"
          style={{ left: caretLeft }}
        />
      )}
      {caretLeft !== null && placement === "below" && (
        <span
          className="absolute bottom-full size-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-b-[6px] border-b-lightpistachio"
          style={{ left: caretLeft }}
        />
      )}
    </div>
  );

  if (position) lastPosition.current = { top: position.top, left: position.left };
  const place = position ?? lastPosition.current;
  const showPopup = visible && ready;
  const width = isMobile ? "min(420px, calc(100vw - 32px))" : 600;

  return (
    <span
      className="relative inline"
      onMouseEnter={isMobile ? undefined : show}
      onMouseLeave={isMobile ? undefined : hideSoon}
      onFocus={isMobile ? undefined : show}
      onBlur={isMobile ? undefined : hideSoon}
    >
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            onMouseEnter={isMobile ? undefined : show}
            onMouseLeave={isMobile ? undefined : hideSoon}
            className={`fixed z-50 transition-[opacity,transform] duration-300 ease-[var(--ease-out)] ${
              showPopup
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none translate-y-1 opacity-0"
            }`}
            style={
              place
                ? { top: place.top, left: place.left }
                : { top: 0, left: 0, visibility: "hidden" as const }
            }
          >
            {card(width)}
          </div>,
          document.body,
        )}

      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={label ? `Preview: ${label}` : "Show preview"}
        aria-expanded={visible}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick(e as unknown as MouseEvent<HTMLSpanElement>);
          }
        }}
        className="cursor-pointer"
      >
        {children}
      </span>
    </span>
  );
}
