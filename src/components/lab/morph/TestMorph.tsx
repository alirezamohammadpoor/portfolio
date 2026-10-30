"use client";

/**
 * A test morph: one paused GSAP timeline on a fixed 390 x 844 stage, scaled
 * to its box. The timeline is the whole film, so the same code plays it once,
 * scrubs it in the lab, or seeks it frame by frame for a render.
 *
 * Determinism (from the product-films method): every change goes through the
 * timeline, nothing reads the clock, and layers are positioned in stage points
 * before the timeline is built.
 */

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ease, registerMotion } from "@/lib/motion";
import type { Layer, Scene } from "./scenes";

registerMotion();

export type TestMorphHandle = {
  timeline: () => gsap.core.Timeline | null;
  replay: () => void;
};

type Props = {
  scene: Scene;
  /** Play once when at least half the frame is on screen. */
  autoplay?: boolean;
  className?: string;
  onUpdate?: (t: number, d: number) => void;
};

function LayerView({ layer }: { layer: Layer }) {
  const [y0, y1] = layer.from ?? [0, layer.still.h];
  const [x0, x1] = layer.cols ?? [0, layer.still.w];
  return (
    <div
      data-layer={layer.id}
      style={{
        position: "absolute",
        left: layer.x,
        top: layer.y,
        width: x1 - x0,
        height: y1 - y0,
        overflow: "hidden",
        visibility: layer.hidden ? "hidden" : "inherit",
        willChange: "transform",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size stage slices of a preloaded still */}
      <img
        data-content
        src={layer.still.src}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: -x0,
          top: -y0,
          width: layer.still.w,
          height: layer.still.h,
          maxWidth: "none",
        }}
      />
    </div>
  );
}

const TestMorph = forwardRef<TestMorphHandle, Props>(function TestMorph(
  { scene, autoplay = false, className, onUpdate },
  ref,
) {
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [scale, setScale] = useState(1);
  const [reduced, setReduced] = useState(false);

  useImperativeHandle(ref, () => ({
    timeline: () => tlRef.current,
    replay: () => tlRef.current?.restart(),
  }));

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  // Scale the fixed stage to the box width. The box itself keeps the aspect
  // ratio in CSS, so nothing around it shifts (CLS 0).
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 390));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || reduced) return;
    const q = (id: string) => stage.querySelector<HTMLElement>(`[data-layer="${id}"]`);
    const content = (id: string) => q(id)?.querySelector<HTMLElement>("[data-content]") ?? null;
    const chrome = new Set(scene.chrome ?? []);

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: ease.inOut },
      onUpdate: () => onUpdate?.(tl.time(), tl.duration()),
    });

    // Known starting values, so seeking backwards restores them.
    for (const l of scene.layers) {
      const el = q(l.id);
      if (!el) continue;
      gsap.set(el, { y: 0, opacity: 1, visibility: l.hidden ? "hidden" : "inherit" });
      if (l.reveal === "down") gsap.set(el, { clipPath: "inset(0% 0% 100% 0%)" });
      if (l.reveal === "right") gsap.set(el, { clipPath: "inset(0% 100% 0% 0% round 3px)" });
      if (l.reveal) gsap.set(content(l.id), { opacity: 0, y: l.reveal === "down" ? 10 : 0 });
    }

    let n = 0;
    for (const s of scene.steps) {
      if (s.kind === "hold") {
        tl.to({}, { duration: s.d });
        continue;
      }
      if (s.kind === "move") {
        const els = s.ids.map(q).filter(Boolean);
        tl.to(els, { y: `+=${s.dy}`, duration: s.d, immediateRender: false }, s.at);
        continue;
      }
      if (s.kind === "reveal") {
        const label = `L${n++}`;
        tl.addLabel(label, s.at);
        s.ids.forEach((id, i) => {
          const l = scene.layers.find((x) => x.id === id);
          const el = q(id);
          if (!l || !el) return;
          const at = i * (s.stagger ?? 0);
          const open = l.reveal === "right" ? "inset(0% 0% 0% 0% round 3px)" : "inset(0% 0% 0% 0%)";
          tl.to(el, { clipPath: open, duration: s.d }, `${label}+=${at}`);
          tl.to(content(id), { opacity: 1, y: 0, duration: s.d * 0.8, ease: ease.out }, `${label}+=${at + s.d * 0.2}`);
        });
        continue;
      }
      if (s.kind === "tap") {
        // A soft finger: lands, presses, lifts. Taps are ~0.45 s each.
        const dot = stage.querySelector<HTMLElement>("[data-tap]");
        if (!dot) continue;
        const label = `L${n++}`;
        tl.addLabel(label, s.at);
        tl.set(dot, { x: s.x - 22, y: s.y - 22, visibility: "inherit" }, label);
        tl.fromTo(dot, { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.18, ease: ease.out, immediateRender: false }, label);
        tl.to(dot, { scale: 0.86, duration: 0.1, ease: ease.out }, `${label}+=0.2`);
        tl.to(dot, { opacity: 0, scale: 1, duration: 0.18, ease: ease.out }, `${label}+=0.3`);
        tl.set(dot, { visibility: "hidden" }, `${label}+=0.48`);
        continue;
      }
      if (s.kind === "fade") {
        const label = `L${n++}`;
        tl.addLabel(label, s.at);
        for (const id of s.out ?? []) {
          const el = q(id);
          if (!el) continue;
          // Chrome is replaced by the incoming chrome drawn on top: it never
          // fades, so the stage colour can't show through mid-dissolve.
          if (!chrome.has(id)) {
            tl.to(el, { opacity: 0, y: s.dy ? `+=${s.dy}` : "+=0", duration: s.d, ease: ease.out, immediateRender: false }, label);
          }
          tl.set(el, { visibility: "hidden" }, `${label}+=${s.d}`);
        }
        for (const id of s.in ?? []) {
          const el = q(id);
          if (!el) continue;
          tl.set(el, { visibility: "inherit" }, label);
          tl.fromTo(
            el,
            { opacity: 0, y: s.dy && !chrome.has(id) ? -s.dy : 0 },
            { opacity: 1, y: 0, duration: s.d, ease: ease.out, immediateRender: false },
            label,
          );
        }
      }
    }

    const dot = stage.querySelector<HTMLElement>("[data-tap]");
    if (dot) gsap.set(dot, { visibility: "hidden", opacity: 0 });
    tl.progress(0);
    tlRef.current = tl;
    onUpdate?.(0, tl.duration());
    return () => {
      tl.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when the scene changes
  }, [scene, reduced]);

  // Play once when the frame is mostly on screen.
  useEffect(() => {
    if (!autoplay || reduced) return;
    const box = boxRef.current;
    if (!box) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          tlRef.current?.play(0);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(box);
    return () => io.disconnect();
  }, [autoplay, reduced, scene]);

  const clip = scene.clip;
  const chrome = new Set(scene.chrome ?? []);
  const inClip = scene.layers.filter((l) => clip && !chrome.has(l.id));
  const free = scene.layers.filter((l) => !clip || chrome.has(l.id));

  return (
    <div
      ref={boxRef}
      className={className}
      style={{ position: "relative", aspectRatio: "390 / 844", overflow: "hidden", background: scene.bg }}
    >
      <div
        ref={stageRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 390,
          height: 844,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {reduced ? (
          <LayerView layer={{ id: "poster", still: scene.poster.still, x: scene.poster.x, y: scene.poster.y }} />
        ) : (
          <>
            {clip && (
              <div style={{ position: "absolute", left: 0, top: clip[0], width: 390, height: clip[1] - clip[0], overflow: "hidden", background: scene.clipBg }}>
                <div style={{ position: "absolute", left: 0, top: -clip[0], width: 390, height: 844 }}>
                  {inClip.map((l) => (
                    <LayerView key={l.id} layer={l} />
                  ))}
                </div>
              </div>
            )}
            {free.map((l) => (
              <LayerView key={l.id} layer={l} />
            ))}
            {scene.steps.some((s) => s.kind === "tap") && (
              <div
                data-tap
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(26, 26, 26, 0.16)",
                  boxShadow: "inset 0 0 0 1.5px rgba(26, 26, 26, 0.28)",
                  visibility: "hidden",
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default TestMorph;
