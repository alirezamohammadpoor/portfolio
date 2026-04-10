"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePageTransition } from "@/context/TransitionContext";

export default function TransitionOverlay() {
  const { isTransitioning, imageUrl, sourceRect, targetRect, clearTransition } =
    usePageTransition();
  const imgRef = useRef<HTMLImageElement>(null);

  // Animate clone from sourceRect → targetRect using transform (GPU-composited)
  useGSAP(() => {
    if (!imgRef.current || !targetRect || !sourceRect) return;

    const dx = targetRect.left - sourceRect.left;
    const dy = targetRect.top - sourceRect.top;
    const sx = targetRect.width / sourceRect.width;
    const sy = targetRect.height / sourceRect.height;

    gsap.to(imgRef.current, {
      x: dx,
      y: dy,
      scaleX: sx,
      scaleY: sy,
      duration: 0.7,
      ease: "power3.inOut",
      onComplete: clearTransition,
    });
  }, { dependencies: [targetRect, clearTransition] });

  if (!isTransitioning || !imageUrl || !sourceRect) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={imageUrl}
      alt=""
      aria-hidden="true"
      style={{
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
      }}
    />
  );
}
