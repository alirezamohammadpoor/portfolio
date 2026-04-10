"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePageTransition } from "@/context/TransitionContext";

export default function TransitionOverlay() {
  const { isTransitioning, imageUrl, sourceRect, targetRect, clearTransition } =
    usePageTransition();
  const imgRef = useRef<HTMLImageElement>(null);

  // Animate clone from sourceRect → targetRect
  useGSAP(() => {
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
      }}
    />
  );
}
