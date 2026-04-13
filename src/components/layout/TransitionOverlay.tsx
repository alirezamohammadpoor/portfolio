"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePageTransition } from "@/context/TransitionContext";

export default function TransitionOverlay() {
  const {
    isTransitioning,
    mediaType,
    imageUrl,
    videoSrc,
    videoCurrentTime,
    sourceRect,
    targetRect,
    clearTransition,
  } = usePageTransition();
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);

  // Animate clone from sourceRect → targetRect via transform (compositor-friendly)
  useGSAP(() => {
    if (!mediaRef.current || !targetRect || !sourceRect) return;

    const dx = targetRect.left - sourceRect.left;
    const dy = targetRect.top - sourceRect.top;
    const sx = targetRect.width / sourceRect.width;
    const sy = targetRect.height / sourceRect.height;

    gsap.to(mediaRef.current, {
      x: dx,
      y: dy,
      scaleX: sx,
      scaleY: sy,
      duration: 0.7,
      ease: "power3.inOut",
      onComplete: clearTransition,
    });
  }, { dependencies: [targetRect, sourceRect, clearTransition] });

  if (!isTransitioning || !sourceRect) return null;

  const commonStyle: React.CSSProperties = {
    position: "fixed",
    top: sourceRect.top,
    left: sourceRect.left,
    width: sourceRect.width,
    height: sourceRect.height,
    zIndex: 50,
    objectFit: "cover",
    pointerEvents: "none",
    transformOrigin: "top left",
    willChange: "transform",
  };

  if (mediaType === "video" && videoSrc) {
    return (
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        onLoadedMetadata={(e) => {
          if (videoCurrentTime != null) {
            e.currentTarget.currentTime = videoCurrentTime;
          }
        }}
        style={commonStyle}
        aria-hidden="true"
      />
    );
  }

  if (mediaType === "image" && imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={mediaRef as React.RefObject<HTMLImageElement>}
        src={imageUrl}
        alt=""
        aria-hidden="true"
        style={commonStyle}
      />
    );
  }

  return null;
}
