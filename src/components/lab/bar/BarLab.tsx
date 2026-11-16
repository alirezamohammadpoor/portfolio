"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type LabData, type LabPage, worstCase } from "./types";
import Capsule from "./Capsule";
import Sheet from "./Sheet";

export type VariantProps = {
  data: LabData;
  page: LabPage;
  go: (p: LabPage) => void;
  setClip: (i: number) => void;
};

const VARIANTS = [
  { name: "Capsule", Component: Capsule },
  { name: "Sheet", Component: Sheet },
] as const;

// Picker: PICKER.md (Emil Kowalski's prototype skill), verbatim. Harness
// chrome, not part of the design under test.
const PICKER_CSS = `
.proto-picker{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;background:rgba(10,10,10,.82);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 8px 24px rgba(0,0,0,.24),0 2px 6px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1;-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
.proto-picker-highlight{position:absolute;top:4px;left:0;height:28px;border-radius:999px;background:rgba(255,255,255,.12)}
.proto-picker[data-ready] .proto-picker-highlight{transition:transform 250ms cubic-bezier(.23,1,.32,1),width 250ms cubic-bezier(.23,1,.32,1)}
@media (prefers-reduced-motion:reduce){.proto-picker[data-ready] .proto-picker-highlight{transition:none}}
.proto-picker-item{position:relative;display:flex;align-items:center;height:28px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.55);font:inherit;cursor:pointer;transition:color 150ms ease-out,transform 160ms cubic-bezier(.23,1,.32,1)}
@media (hover:hover) and (pointer:fine){.proto-picker-item:hover{color:rgba(255,255,255,.85)}}
.proto-picker-item:active{transform:scale(.97)}
.proto-picker-item:focus-visible{outline:2px solid rgba(255,255,255,.4);outline-offset:2px}
.proto-picker-item[data-active]{color:#fff}
.proto-picker-divider{width:1px;height:16px;margin:0 4px;background:rgba(255,255,255,.12)}
.proto-picker-replay{padding:0 10px;font-size:14px}
.proto-picker[data-position="top"]{bottom:auto;top:24px}
.lab-data{position:fixed;bottom:68px;left:50%;transform:translateX(-50%);z-index:2147483646;display:flex;gap:2px;padding:2px;border-radius:999px;background:#e5e5e5;font:12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.lab-data button{height:24px;padding:0 10px;border:0;border-radius:999px;background:transparent;color:#555;cursor:pointer}
.lab-data button[aria-pressed="true"]{background:#fff;color:#111}
html[data-lab-panel] .proto-picker,html[data-lab-panel] .lab-data{opacity:0;pointer-events:none}
`;

function readParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function writeParam(name: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  history.replaceState(history.state, "", url);
}

export default function BarLab({ data: real }: { data: LabData }) {
  const [current, setCurrent] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const [worst, setWorst] = useState(false);
  const [page, setPage] = useState<LabPage>({ kind: "home" });
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Selection and data set come from the URL after hydration (?v=2, ?data=worst).
  useEffect(() => {
    const v = parseInt(readParam("v") ?? "", 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of the URL after hydration
    if (v >= 1 && v <= VARIANTS.length) setCurrent(v - 1);
    if (readParam("data") === "worst") setWorst(true);
    requestAnimationFrame(() => requestAnimationFrame(() => pickerRef.current?.setAttribute("data-ready", "")));
  }, []);

  const data = useMemo(() => (worst ? worstCase(real) : real), [real, worst]);

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
    setMountKey((k) => k + 1);
    writeParam("v", String(i + 1));
  }, []);

  const replay = useCallback(() => setMountKey((k) => k + 1), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") select((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") replay();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select, replay]);

  const go = useCallback((p: LabPage) => {
    setPage(p);
    window.scrollTo(0, 0);
  }, []);
  const setClip = useCallback((clip: number) => setPage((p) => (p.kind === "project" ? { ...p, clip } : p)), []);

  const toggleData = (w: boolean) => {
    setWorst(w);
    setPage({ kind: "home" });
    writeParam("data", w ? "worst" : null);
  };

  const { Component } = VARIANTS[current];
  return (
    <>
      <style>{PICKER_CSS}</style>
      <Component key={`${current}-${mountKey}-${worst}`} data={data} page={page} go={go} setClip={setClip} />
      <div className="lab-data" role="group" aria-label="Data set">
        <button type="button" aria-pressed={!worst} onClick={() => toggleData(false)}>
          Demo data
        </button>
        <button type="button" aria-pressed={worst} onClick={() => toggleData(true)}>
          Worst case
        </button>
      </div>
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
        <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={replay}>
          ↻
        </button>
      </nav>
    </>
  );
}
