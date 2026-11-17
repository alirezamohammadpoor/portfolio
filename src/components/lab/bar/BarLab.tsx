"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type LabData, type LabPage, worstCase } from "./types";
import Capsule from "./Capsule";
import Sheet from "./Sheet";
import { PICKER_CSS } from "../pickerCss";

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
