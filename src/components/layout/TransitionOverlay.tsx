"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePageTransition } from "@/context/TransitionContext";
import { dur, ease, prefersReducedMotion } from "@/lib/motion";

/** Progress of the morph at which the destination text starts masking in. */
export const REVEAL_AT = 0.4;

/**
 * The media clone that carries the home cover onto the project page.
 *
 * FLIP: the clone is laid out once at the source rect and the morph is a
 * transform (translate + scale) on a compositor layer, so nothing lays out or
 * paints per frame while the new route hydrates. The window stretches
 * non-uniformly (home panel → 4:3 item); the media inside counter-scales to a
 * uniform `max(sx, sy)` each frame so it keeps covering the window instead
 * of distorting, exactly like `object-fit: cover` would.
 */
export default function TransitionOverlay() {
  const {
    isTransitioning,
    mediaType,
    imageUrl,
    sourceVideoElement,
    sourceRect,
    targetRect,
    targetReady,
    inPlace,
    revealContent,
    revealPage,
    clearTransition,
  } = usePageTransition();
  // The morph has landed; the clone leaves once the media under it is ready
  // (or after a grace period, so a broken asset never leaves it stuck).
  const [landed, setLanded] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLElement>(null);
  const targetKey = targetRect
    ? `${targetRect.top}:${targetRect.left}:${targetRect.width}:${targetRect.height}`
    : "none";

  useGSAP(
    () => {
      const win = windowRef.current;
      const media = mediaRef.current;
      if (!win || !media || !sourceRect || !targetRect) return;

      if (prefersReducedMotion()) {
        revealContent();
        gsap.to(win, {
          autoAlpha: 0,
          duration: dur.fast,
          ease: "none",
          onComplete: clearTransition,
        });
        return;
      }

      const dx = targetRect.left - sourceRect.left;
      const dy = targetRect.top - sourceRect.top;
      const sx = targetRect.width / Math.max(sourceRect.width, 1);
      const sy = targetRect.height / Math.max(sourceRect.height, 1);

      // Already on the landing rect (project → project after the gallery has
      // carried the preview into the first-item slot): nothing to morph. The
      // clone just covers the swap until the media under it has decoded.
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) {
        revealContent();
        setLanded(true);
        return;
      }
      // In place but not pixel-exact (the stage's title block differs in
      // height, or the preview card was tapped before it centred): a short
      // settle, not the page-level morph, and the text does not wait for it.
      if (inPlace) revealContent();

      // Plain style writes: GSAP's quickSetter("transform") does not take a
      // raw transform string, and a silent no-op here means no morph at all.
      const setWin = (v: string) => {
        win.style.transform = v;
      };
      const setMedia = (v: string) => {
        media.style.transform = v;
      };
      const proxy = { p: 0 };
      let revealed = false;

      gsap.to(proxy, {
        p: 1,
        duration: inPlace ? dur.ui : dur.page,
        ease: inPlace ? ease.out : ease.inOut,
        onUpdate: () => {
          const p = proxy.p;
          const wx = 1 + (sx - 1) * p;
          const wy = 1 + (sy - 1) * p;
          const k = Math.max(wx, wy);
          setWin(`translate3d(${dx * p}px, ${dy * p}px, 0) scale(${wx}, ${wy})`);
          setMedia(`scale(${k / wx}, ${k / wy})`);
          if (!revealed && p >= REVEAL_AT) {
            revealed = true;
            revealContent();
          }
        },
        onComplete: () => setLanded(true),
      });
    },
    { dependencies: [targetKey, inPlace, clearTransition, revealContent] },
  );

  useEffect(() => {
    if (!isTransitioning) {
      setLanded(false);
      return;
    }
    if (!landed) return;
    if (targetReady) {
      // Show the page under the clone first, then give the compositor two
      // frames to draw it (a <video> coming out of an opacity-0 subtree paints
      // black for a frame otherwise) before the cover goes.
      revealPage();
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(clearTransition);
      });
      return () => cancelAnimationFrame(raf);
    }
    const grace = window.setTimeout(clearTransition, 1000);
    return () => window.clearTimeout(grace);
  }, [isTransitioning, landed, targetReady, revealPage, clearTransition]);

  if (!isTransitioning || !sourceRect) return null;

  const windowStyle: React.CSSProperties = {
    position: "fixed",
    top: sourceRect.top,
    left: sourceRect.left,
    width: sourceRect.width,
    height: sourceRect.height,
    zIndex: 50,
    overflow: "hidden",
    pointerEvents: "none",
    transformOrigin: "0 0",
    willChange: "transform",
  };

  const mediaStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transformOrigin: "50% 50%",
  };

  // Video: paint the source video's current frame onto a canvas. Avoids
  // the clone <video>'s decode pipeline (which paints black for
  // 100–500ms on mobile after a route transition) and gives us an
  // instant-ready clone that morphs cleanly. Canvas taint from a
  // cross-origin drawImage only blocks readback methods — plain display
  // works, so no CORS setup is needed.
  const media =
    mediaType === "video" ? (
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
        style={mediaStyle}
        aria-hidden="true"
      />
    ) : mediaType === "image" && imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={mediaRef as React.RefObject<HTMLImageElement>}
        src={imageUrl}
        alt=""
        aria-hidden="true"
        style={mediaStyle}
      />
    ) : null;

  if (!media) return null;

  return (
    <div ref={windowRef} style={windowStyle} aria-hidden="true">
      {media}
    </div>
  );
}
