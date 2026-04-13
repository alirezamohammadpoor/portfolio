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

  // Animate clone from sourceRect → targetRect
  useGSAP(() => {
    if (!mediaRef.current || !targetRect) return;

    gsap.to(mediaRef.current, {
      top: targetRect.top,
      left: targetRect.left,
      width: targetRect.width,
      height: targetRect.height,
      duration: 0.7,
      ease: "power3.inOut",
      onComplete: clearTransition,
    });
  }, { dependencies: [targetRect, clearTransition] });

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
