"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PICKER_CSS } from "../pickerCss";
import PipelineScene from "./PipelineScene";
import ClusterScene from "./ClusterScene";
import TrafficScene from "./TrafficScene";

// The devops project's three gallery pieces as coded motion diagrams
// (direction A, Ali 11-20). One piece at a time, full width, on the page
// backdrop the gallery uses. Not linked, not indexed.
const SCENES = [
  { name: "Pipeline", View: PipelineScene },
  { name: "Cluster", View: ClusterScene },
  { name: "Traffic", View: TrafficScene },
];

export default function DevopsLab() {
  const [current, setCurrent] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const v = parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of the URL after hydration
    if (v >= 1 && v <= SCENES.length) setCurrent(v - 1);
    requestAnimationFrame(() => requestAnimationFrame(() => pickerRef.current?.setAttribute("data-ready", "")));
  }, []);

  const moveHighlight = useCallback(() => {
    const el = itemRefs.current[current];
    const hl = highlightRef.current;
    if (!el || !hl) return;
    hl.style.width = `${el.offsetWidth}px`;
    hl.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  useLayoutEffect(() => {
    moveHighlight();
    window.addEventListener("resize", moveHighlight);
    return () => window.removeEventListener("resize", moveHighlight);
  }, [moveHighlight]);

  const select = useCallback((i: number) => {
    if (i < 0 || i >= SCENES.length) return;
    setCurrent(i);
    setMountKey((k) => k + 1);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(history.state, "", url);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= SCENES.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % SCENES.length);
      else if (e.key === "ArrowLeft") select((current - 1 + SCENES.length) % SCENES.length);
      else if (e.key === "r" || e.key === "R") setMountKey((k) => k + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [select, current]);

  const { View } = SCENES[current];
  return (
    <>
      <style>{PICKER_CSS}</style>
      <div className="flex min-h-dvh items-center justify-center px-4 py-24 desktop:px-6">
        <div className="w-full" style={{ maxWidth: "min(1120px, (100dvh - 200px) * 4 / 3)" }} key={`${current}-${mountKey}`}>
          <View />
        </div>
      </div>
      <nav ref={pickerRef} className="proto-picker" aria-label="Prototype variants">
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {SCENES.map((s, i) => (
          <button
            key={s.name}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            onClick={() => select(i)}
          >
            {s.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={() => setMountKey((k) => k + 1)}>
          ↻
        </button>
      </nav>
    </>
  );
}
