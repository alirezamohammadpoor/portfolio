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
    sourceVideoElement,
    sourceRect,
    targetRect,
    clearTransition,
  } = usePageTransition();
  const mediaRef = useRef<HTMLElement>(null);

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

  // Video: paint the source video's current frame onto a canvas. Avoids
  // the clone <video>'s decode pipeline (which paints black for
  // 100–500ms on mobile after a route transition) and gives us an
  // instant-ready clone that morphs cleanly. Canvas taint from a
  // cross-origin drawImage only blocks readback methods — plain display
  // works, so no CORS setup is needed.
  if (mediaType === "video") {
    return (
      <canvas
        ref={(el) => {
          mediaRef.current = el;
          if (!el || !sourceVideoElement) return;
          const vw = sourceVideoElement.videoWidth;
          const vh = sourceVideoElement.videoHeight;
          if (vw === 0 || vh === 0) return;
          el.width = vw;
          el.height = vh;
          const ctx = el.getContext("2d");
          if (!ctx) return;
          try {
            ctx.drawImage(sourceVideoElement, 0, 0);
          } catch {
            // Source video not paintable yet (shouldn't happen since it's
            // been autoplaying on the homepage, but don't crash if it does).
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
