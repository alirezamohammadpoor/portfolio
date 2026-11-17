"use client";

/**
 * Prototype picker for the plain page transition (11-17, Emil Kowalski's
 * /prototype skill). Off unless the session asked for it: open any page with
 * `?pt=1` (or 2, 3, 4) and the picker stays for the rest of the tab session;
 * `?pt=off` removes it. The choice sits on `html[data-pt]`, which the
 * view-transition rules in globals.css read; without it the live slide runs
 * untouched. Only plain `Link` navigations use it: the four media hand-offs
 * set `html[data-custom-clone]` and keep their own motion.
 *
 * Picker chrome = PICKER.md, verbatim. Keys 1-4 switch; the arrow keys are
 * left alone because they already step the project stage.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./pt.css";

const VARIANTS = [
  { id: "crossfade", name: "Crossfade" },
  { id: "through", name: "Fade through" },
  { id: "rise", name: "Rise" },
  { id: "slide", name: "Slide (live)" },
] as const;

const KEY = "pt-variant";

function readStored(): number | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    return n >= 1 && n <= VARIANTS.length ? n - 1 : null;
  } catch {
    return null;
  }
}

function apply(i: number | null) {
  const root = document.documentElement;
  if (i === null || VARIANTS[i].id === "slide") delete root.dataset.pt;
  else root.dataset.pt = VARIANTS[i].id;
}

export default function PageTransitionPicker() {
  const [current, setCurrent] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const highlightRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const param = new URLSearchParams(location.search).get("pt");
    let next = readStored();
    if (param === "off") {
      try {
        sessionStorage.removeItem(KEY);
      } catch {}
      next = null;
    } else if (param) {
      const n = parseInt(param, 10);
      next = n >= 1 && n <= VARIANTS.length ? n - 1 : 0;
    }
    apply(next);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is client-only
    setCurrent(next);
  }, []);

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    try {
      sessionStorage.setItem(KEY, String(i + 1));
    } catch {}
    const url = new URL(location.href);
    url.searchParams.set("pt", String(i + 1));
    history.replaceState(history.state, "", url);
    apply(i);
    setCurrent(i);
  }, []);

  const moveHighlight = useCallback(() => {
    const el = current === null ? null : itemsRef.current[current];
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

  useEffect(() => {
    if (current === null || ready) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, [current, ready]);

  useEffect(() => {
    if (current === null) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select]);

  if (current === null) return null;

  return (
    <nav className="proto-picker" aria-label="Prototype variants" data-ready={ready ? "" : undefined}>
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {VARIANTS.map((v, i) => (
        <button
          key={v.id}
          ref={(el) => {
            itemsRef.current[i] = el;
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
  );
}
