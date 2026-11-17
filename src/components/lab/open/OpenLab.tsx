"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { setWorkOpen, type WorkOpen } from "@/lib/barProject";
import { PICKER_CSS } from "../pickerCss";

const VARIANTS: { name: string; mode: NonNullable<WorkOpen>; line: string }[] = [
  { name: "Shrink", mode: "shrink", line: "The list fades and the window folds back while the video flies." },
  { name: "Hold", mode: "hold", line: "The window stays open until the video has landed, then folds." },
  { name: "Fade", mode: "fade", line: "The capsule fades out and comes back once the project is up." },
];

// The picker only sets what the capsule does; open Work, pick a project and
// the real flight runs. Browser back returns here with the same pick (?v=N).
export default function OpenLab() {
  const [current, setCurrent] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const v = parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of the URL after hydration
    if (v >= 1 && v <= VARIANTS.length) setCurrent(v - 1);
    requestAnimationFrame(() => requestAnimationFrame(() => pickerRef.current?.setAttribute("data-ready", "")));
  }, []);

  // On only while the lab is mounted. A flight already under way keeps its
  // mode when this page unmounts under it.
  useEffect(() => {
    setWorkOpen(VARIANTS[current].mode);
  }, [current]);
  useEffect(() => () => setWorkOpen(null), []);

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
    const n = (i + VARIANTS.length) % VARIANTS.length;
    setCurrent(n);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(n + 1));
    history.replaceState(history.state, "", url);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight") select(current + 1);
      else if (e.key === "ArrowLeft") select(current - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select]);

  return (
    <>
      {/* Out of the way while the capsule is open (it locks the page). */}
      <style>{PICKER_CSS + `html[style*="overflow: hidden"] .proto-picker{opacity:0;pointer-events:none}`}</style>
      <section className="grid-site px-margin pt-[calc(var(--header-height)+48px)]">
        <div className="col-span-4 desktop:col-span-6 desktop:col-start-4">
          <h1 className="text-lead text-primary">Open Work and pick a project.</h1>
          <p className="mt-2 text-body text-secondary">{VARIANTS[current].line}</p>
          <p className="mt-6 text-body text-secondary">On a phone the first tap previews, the second opens. Browser back comes here again.</p>
        </div>
      </section>
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
      </nav>
    </>
  );
}
