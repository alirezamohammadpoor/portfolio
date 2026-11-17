"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./wp.css";

/**
 * Prototype picker for the Work panel's type sizes (Ali 11-17). Off unless
 * the page is opened with ?wp=N; the choice is kept for the session so it
 * survives links (?wp=off clears it). Each variant is a CSS rule set on
 * html[data-wp] in wp.css; the panel itself is the real one.
 */
const VARIANTS = ["Now", "Ranked", "Quiet", "Poster", "Ruled"];
const KEY = "wp-proto";

export default function WorkPanelPicker() {
  const [current, setCurrent] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let v: string | null = null;
    try {
      v = new URLSearchParams(location.search).get("wp");
      if (v === "off") sessionStorage.removeItem(KEY);
      else if (v) sessionStorage.setItem(KEY, v);
      else v = sessionStorage.getItem(KEY);
    } catch {}
    const n = v ? parseInt(v, 10) : NaN;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once on mount
    if (n >= 1 && n <= VARIANTS.length) setCurrent(n - 1);
  }, []);

  useEffect(() => {
    if (current === null) return;
    document.documentElement.dataset.wp = String(current + 1);
    try {
      sessionStorage.setItem(KEY, String(current + 1));
      const url = new URL(location.href);
      url.searchParams.set("wp", String(current + 1));
      history.replaceState(history.state, "", url);
    } catch {}
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= VARIANTS.length) setCurrent(num - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  useLayoutEffect(() => {
    if (current === null) return;
    const move = () => {
      const el = itemsRef.current[current];
      const hl = highlightRef.current;
      if (!el || !hl) return;
      hl.style.width = `${el.offsetWidth}px`;
      hl.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    const nav = navRef.current;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => nav?.setAttribute("data-ready", "")));
    window.addEventListener("resize", move);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", move);
    };
  }, [current]);

  if (current === null) return null;
  return (
    <nav ref={navRef} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {VARIANTS.map((name, i) => (
        <button
          key={name}
          ref={(el) => {
            itemsRef.current[i] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={i === current ? "" : undefined}
          aria-current={i === current ? "true" : undefined}
          onClick={() => setCurrent(i)}
        >
          {name}
        </button>
      ))}
    </nav>
  );
}
