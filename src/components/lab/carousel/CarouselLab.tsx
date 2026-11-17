"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BarData } from "@/sanity/lib/bar";
import { PICKER_CSS } from "../pickerCss";
import HomeCarousel, { type Caption } from "./HomeCarousel";

const VARIANTS: { name: string; caption: Caption }[] = [
  { name: "Under", caption: "under" },
  { name: "On video", caption: "on" },
  { name: "Fixed spot", caption: "fixed" },
];

/**
 * The drifting carousel home behind the prototype picker (PICKER.md verbatim:
 * keys 1-3, arrows, ?v=N, replay). The variants differ only in where the held
 * project's description shows; replay runs the glide-in again.
 */
export default function CarouselLab({ bar }: { bar: BarData }) {
  const [current, setCurrent] = useState(0);
  const [replay, setReplay] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const v = parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of the URL after hydration
    if (v >= 1 && v <= VARIANTS.length) setCurrent(v - 1);
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
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
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
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") setReplay((n) => n + 1);
      else if (e.key === "ArrowLeft") select((current - 1 + VARIANTS.length) % VARIANTS.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select]);

  return (
    <>
      <style>{PICKER_CSS}</style>
      <HomeCarousel bar={bar} caption={VARIANTS[current].caption} replay={replay} />
      <nav ref={pickerRef} className="proto-picker" aria-label="Prototype variants">
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANTS.map((v, i) => (
          <button
            key={v.name}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            onClick={() => select(i)}
          >
            {v.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Replay" onClick={() => setReplay((n) => n + 1)}>
          ↻
        </button>
      </nav>
    </>
  );
}
