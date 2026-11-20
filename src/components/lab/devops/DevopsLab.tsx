"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PICKER_CSS } from "../pickerCss";
import type { Cut, Theme } from "./Stage";
import { SIZE } from "./Stage";
import Cluster from "./films/Cluster";
import Load from "./films/Load";
import Pipeline from "./films/Pipeline";
import Savings from "./films/Savings";
import Traffic from "./films/Traffic";

// The devops project's five gallery films (script approved by Ali 11-20),
// in TRY's look, laptop 4:3 and phone 4:5 cuts. Not linked, not indexed.
// `?solo=<n>&cut=laptop|phone` renders one bare stage at native size for
// the frame renderer.
const SCENES: { name: string; View: (p: { cut: Cut; theme: Theme }) => React.ReactNode }[] = [
  { name: "Pipeline", View: Pipeline },
  { name: "Cluster", View: Cluster },
  { name: "Traffic", View: Traffic },
  { name: "Load", View: Load },
  { name: "Savings", View: Savings },
];

function readParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    v: parseInt(p.get("v") ?? "", 10),
    cut: (p.get("cut") === "phone" ? "phone" : "laptop") as Cut,
    theme: (p.get("theme") === "site" ? "site" : "try") as Theme,
    solo: p.get("solo"),
  };
}

export default function DevopsLab() {
  const [current, setCurrent] = useState(0);
  const [cut, setCut] = useState<Cut>("laptop");
  const [theme, setTheme] = useState<Theme>("try");
  const [solo, setSolo] = useState<number | null>(null);
  const [mountKey, setMountKey] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const p = readParams();
    /* eslint-disable react-hooks/set-state-in-effect -- one read of the URL after hydration */
    if (p.v >= 1 && p.v <= SCENES.length) setCurrent(p.v - 1);
    setCut(p.cut);
    setTheme(p.theme);
    if (p.solo) setSolo(Math.max(0, Math.min(SCENES.length - 1, parseInt(p.solo, 10) - 1)));
    /* eslint-enable react-hooks/set-state-in-effect */
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

  const setParam = (k: string, v: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(k, v);
    history.replaceState(history.state, "", url);
  };

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

  if (solo !== null) {
    const { View } = SCENES[solo];
    return (
      <div data-solo style={{ position: "fixed", left: 0, top: 0, width: SIZE[cut].w, zIndex: 2147483647 }}>
        <style>{"header, nextjs-portal { display: none !important; }"}</style>
        <View cut={cut} theme={theme} />
      </div>
    );
  }

  const { View } = SCENES[current];
  const { w, h } = SIZE[cut];
  return (
    <>
      <style>{PICKER_CSS}</style>
      <div className="flex min-h-dvh items-center justify-center px-4 py-24 desktop:px-6">
        <div className="w-full" style={{ maxWidth: `min(1120px, (100dvh - 220px) * ${w} / ${h})` }} key={`${current}-${mountKey}-${cut}-${theme}`}>
          <View cut={cut} theme={theme} />
        </div>
      </div>
      <div className="lab-data" role="group" aria-label="Cut and look">
        {(["laptop", "phone"] as Cut[]).map((k) => (
          <button key={k} type="button" aria-pressed={cut === k} onClick={() => { setCut(k); setParam("cut", k); }}>
            {k === "laptop" ? "Laptop" : "Phone"}
          </button>
        ))}
        {(["try", "site"] as Theme[]).map((k) => (
          <button key={k} type="button" aria-pressed={theme === k} onClick={() => { setTheme(k); setParam("theme", k); }}>
            {k === "try" ? "TRY" : "Site"}
          </button>
        ))}
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
