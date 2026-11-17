"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { setPanelLayout, type PanelLayout } from "@/lib/barProject";
import { PICKER_CSS } from "../pickerCss";

type Variant<K extends keyof PanelLayout> = { name: string; value: PanelLayout[K] };

const WORK: Variant<"work">[] = [
  { name: "Now", value: "now" },
  { name: "Refined", value: "refined" },
  { name: "Full bleed", value: "bleed" },
];
const ABOUT: Variant<"about">[] = [
  { name: "Now", value: "now" },
  { name: "Spread", value: "spread" },
  { name: "Column", value: "column" },
];

/** Opens the real header's Work or About panel, unless it is already open. */
function openPanel(panel: "work" | "about") {
  const el = document.querySelector<HTMLElement>(
    panel === "work" ? 'header nav button[aria-controls="bar-panel"]' : 'header nav a[aria-controls="bar-panel"]',
  );
  if (el && el.getAttribute("aria-expanded") !== "true") el.click();
}

/**
 * The lab sets the layout in the bar store and opens the panel in the site's
 * own capsule, so each variant is judged in place, full size, over a page.
 * Picker: PICKER.md verbatim (keys 1-3, arrows, ?v=N; R reopens the panel).
 */
export default function PanelsLab({ panel, backdrop }: { panel: "work" | "about"; backdrop: string | null }) {
  const variants = panel === "work" ? WORK : ABOUT;
  const [current, setCurrent] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const v = parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of the URL after hydration
    if (v >= 1 && v <= variants.length) setCurrent(v - 1);
    requestAnimationFrame(() => requestAnimationFrame(() => pickerRef.current?.setAttribute("data-ready", "")));
    return () => setPanelLayout(null);
  }, [variants.length]);

  // Apply the layout, then open the panel (the header waits for the intro).
  useEffect(() => {
    const value = variants[current].value;
    setPanelLayout(panel === "work" ? { work: value as PanelLayout["work"], about: "now" } : { work: "now", about: value as PanelLayout["about"] });
    const t = setTimeout(() => openPanel(panel), 60);
    return () => clearTimeout(t);
  }, [current, panel, variants]);

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

  const select = useCallback(
    (i: number) => {
      if (i < 0 || i >= variants.length) return;
      setCurrent(i);
      const url = new URL(window.location.href);
      url.searchParams.set("v", String(i + 1));
      history.replaceState(history.state, "", url);
    },
    [variants.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= variants.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % variants.length);
      else if (e.key === "ArrowLeft") select((current - 1 + variants.length) % variants.length);
      else if (e.key === "r" || e.key === "R") openPanel(panel);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select, variants.length, panel]);

  return (
    <>
      <style>{PICKER_CSS}</style>
      {/* A page behind the window, so the frost reads as it does on the site. */}
      {backdrop && (
        // eslint-disable-next-line @next/next/no-img-element -- lab backdrop
        <img src={backdrop} alt="" className="fixed inset-0 -z-10 h-full w-full object-cover" />
      )}
      <nav ref={pickerRef} className="proto-picker" aria-label="Prototype variants">
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {variants.map((v, i) => (
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
