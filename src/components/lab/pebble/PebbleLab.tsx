"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { setProjectRow, type ProjectRow } from "@/lib/barProject";
import { PICKER_CSS } from "../pickerCss";

// Three layouts for the project row in the Pebble (Ali, 11-17). "Now" is
// Docked as built, for comparison.
const VARIANTS: { name: string; row: ProjectRow }[] = [
  { name: "Now", row: "now" },
  { name: "List", row: "list" },
  { name: "Inner pill", row: "inner" },
  { name: "Grid", row: "grid" },
];

// The filmstrip owns the bottom centre and the Pebble the top, so the
// picker sits bottom right on a laptop and under the thumbnails on a phone.
// ←/→ step through the gallery on this page, so only 1–4 and R switch.
const CORNER = `.proto-picker[data-corner]{bottom:4px}@media (min-width:75rem){.proto-picker[data-corner]{left:auto;right:16px;bottom:16px;transform:none}}`;

export default function PebbleLab({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const v = parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of the URL after hydration
    if (v >= 1 && v <= VARIANTS.length) setCurrent(v - 1);
    requestAnimationFrame(() => requestAnimationFrame(() => pickerRef.current?.setAttribute("data-ready", "")));
  }, []);

  // On only while the lab is mounted; leaving it restores today's row.
  useEffect(() => {
    setProjectRow(VARIANTS[current].row);
  }, [current]);
  useEffect(() => () => setProjectRow("now"), []);

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
      else if (e.key === "r" || e.key === "R") setMountKey((k) => k + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [select]);

  return (
    <>
      <style>{PICKER_CSS + CORNER}</style>
      <div key={`${current}-${mountKey}`}>{children}</div>
      <nav ref={pickerRef} className="proto-picker" data-corner="" aria-label="Prototype variants">
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
        <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={() => setMountKey((k) => k + 1)}>
          ↻
        </button>
      </nav>
    </>
  );
}
