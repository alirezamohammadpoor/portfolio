"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { usePageTransition } from "@/context/TransitionContext";

export default function TransitionOverlay() {
  const { isTransitioning, imageUrl, sourceRect, targetRect, clearTransition } =
    usePageTransition();
  const imgRef = useRef<HTMLImageElement>(null);

  // Animate clone from sourceRect → targetRect when targetRect is set
  useEffect(() => {
    if (!imgRef.current || !targetRect) return;

    gsap.to(imgRef.current, {
      top: targetRect.top,
      left: targetRect.left,
      width: targetRect.width,
      height: targetRect.height,
      duration: 0.7,
      ease: "power3.inOut",
      onComplete: clearTransition,
    });
  }, [targetRect, clearTransition]);

  if (!isTransitioning || !imageUrl || !sourceRect) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={imageUrl}
      alt=""
      style={{
        position: "fixed",
        top: sourceRect.top,
        left: sourceRect.left,
        width: sourceRect.width,
        height: sourceRect.height,
        zIndex: 50,
        objectFit: "cover",
        pointerEvents: "none",
      }}
    />
  );
}
