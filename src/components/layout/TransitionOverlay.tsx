"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePageTransition } from "@/context/TransitionContext";
import { dur, ease, prefersReducedMotion } from "@/lib/motion";

/** Progress of the morph at which the destination text starts masking in. */
export const REVEAL_AT = 0.4;
/**
 * A transition whose landing page never aims the clone (a 404 or error page
 * on the project route, a navigation that never commits) is dropped after
 * this long, so the cover cannot stay fixed over every later page. The
 * slowest legitimate landing measured was about 2.4 s on a throttled link;
 * past the limit the page simply shows without the morph.
 */
const WATCHDOG_MS = 3000;

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
    id,
    mediaType,
    imageUrl,
    sourceVideoElement,
    sourceRect,
    targetRect,
    targetElement,
    targetReady,
    inPlace,
    revealContent,
    revealPage,
    clearTransition,
  } = usePageTransition();
  // The morph has landed; the clone leaves once the media under it is ready
  // (or after a grace period, so a broken asset never leaves it stuck).
  const [landed, setLanded] = useState(false);

  // Only a landing project page sets targetRect. Without one in time the
  // transition is dropped (see WATCHDOG_MS); a new transition re-arms it.
  useEffect(() => {
    if (!isTransitioning || targetRect) return;
    const timer = window.setTimeout(clearTransition, WATCHDOG_MS);
    return () => window.clearTimeout(timer);
  }, [isTransitioning, targetRect, clearTransition, id]);

  // Superseded: a header link clicked while the project route was still on
  // its way commits another route. No project page will ever land the clone,
  // so it goes at once. The transition starts on the page being left (the
  // pathname is still the old one), so that first pathname is remembered
  // and only a later, non-project one clears.
  const pathname = usePathname();
  const startRef = useRef<{ id: number; pathname: string } | null>(null);
  useEffect(() => {
    if (!isTransitioning) {
      startRef.current = null;
      return;
    }
    if (startRef.current?.id !== id) {
      startRef.current = { id, pathname };
      return;
    }
    if (pathname !== startRef.current.pathname && !pathname.startsWith("/project/")) clearTransition();
  }, [isTransitioning, id, pathname, clearTransition]);
  const windowRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLElement>(null);
  const adoptRef = useRef<HTMLDivElement>(null);
  // Project → project: the preview's <video> is moved into the clone as is,
  // so it keeps playing through the route swap instead of freezing on a
  // snapshot. React never removes it individually: the old page unmounts by
  // its root. When the clone goes, the landing page's first item takes the
  // element in the same commit (see adoptVideo.ts), so it is never paused
  // here: a detached media element only pauses if it is still detached at
  // the next stable state.
  const adopt = inPlace && mediaType === "video" && Boolean(sourceVideoElement);
  useLayoutEffect(() => {
    const host = adoptRef.current;
    const video = sourceVideoElement;
    if (!adopt || !host || !video) return;
    const prev = {
      position: video.style.position,
      inset: video.style.inset,
      width: video.style.width,
      height: video.style.height,
      objectFit: video.style.objectFit,
    };
    Object.assign(video.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" });
    host.appendChild(video);
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return () => {
      Object.assign(video.style, prev);
      video.remove();
    };
  }, [adopt, sourceVideoElement]);
  // The snapshot is painted once per source element. An inline ref callback
  // would run again on every overlay render (landed, targetRect, the reveal
  // flags) and, by resetting width/height, clear and repaint the canvas from
  // a source that may have moved on a frame: a visible jump mid-morph.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintSnapshot = !adopt && mediaType === "video";
  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!paintSnapshot || !el || !sourceVideoElement) return;
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
  }, [paintSnapshot, sourceVideoElement]);
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
      // In place but not pixel-exact: a short settle when the preview sits a
      // few pixels off (the stage's title block differs in height, or the
      // card was tapped before it centred); the page-level morph when the
      // landing is somewhere else (a phone chapter page handing off to a
      // stage, whose card sits mid-screen). The text does not wait for it.
      if (inPlace) revealContent();
      const far = Math.hypot(dx, dy) > 64 || Math.abs(sx - 1) > 0.1 || Math.abs(sy - 1) > 0.1;
      const settle = inPlace && !far;

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

      // The landing rect was measured as soon as the card had a layout. A
      // video card is a 16:10 placeholder until its metadata arrives, and on
      // the phone a neighbour's late ratio moves card 1 too, so by the time
      // the morph lands the card may sit elsewhere. Measured again here: a
      // short settle from where the clone is onto where the card is now, so
      // the media does not jump when the clone goes. Nothing changes when the
      // card kept its box.
      const land = () => {
        const el = targetElement;
        const r = el?.isConnected ? el.getBoundingClientRect() : null;
        const moved =
          r &&
          (Math.abs(r.left - targetRect.left) > 1 ||
            Math.abs(r.top - targetRect.top) > 1 ||
            Math.abs(r.width - targetRect.width) > 1 ||
            Math.abs(r.height - targetRect.height) > 1);
        if (!r || !moved) {
          setLanded(true);
          return;
        }
        const dx2 = r.left - sourceRect.left;
        const dy2 = r.top - sourceRect.top;
        const sx2 = r.width / Math.max(sourceRect.width, 1);
        const sy2 = r.height / Math.max(sourceRect.height, 1);
        const q = { p: 0 };
        gsap.to(q, {
          p: 1,
          duration: dur.ui,
          ease: ease.out,
          onUpdate: () => {
            const p = q.p;
            const wx = sx + (sx2 - sx) * p;
            const wy = sy + (sy2 - sy) * p;
            const k = Math.max(wx, wy);
            setWin(`translate3d(${dx + (dx2 - dx) * p}px, ${dy + (dy2 - dy) * p}px, 0) scale(${wx}, ${wy})`);
            setMedia(`scale(${k / wx}, ${k / wy})`);
          },
          onComplete: () => setLanded(true),
        });
      };

      gsap.to(proxy, {
        p: 1,
        duration: settle ? dur.ui : dur.page,
        ease: settle ? ease.out : ease.inOut,
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
        onComplete: land,
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
  const media = adopt ? (
    <div
      ref={(el) => {
        adoptRef.current = el;
        mediaRef.current = el;
      }}
      style={mediaStyle}
      aria-hidden="true"
    />
  ) : mediaType === "video" ? (
      <canvas
        ref={(el) => {
          mediaRef.current = el;
          canvasRef.current = el;
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
