"use client";

/**
 * Diagnostic recorder for the journal link previews, off unless the URL has
 * `?trace=1`. Records the raw input stream (pointer, wheel, scroll) and, every
 * frame, Lenis's own state plus which preview is open, so a real trackpad
 * session can be replayed in a test. Nothing is sent anywhere: the panel
 * downloads a JSON file.
 */

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

type Row = (string | number | boolean | null)[];

// A preview phrase, by the label it carries for this tracer (its accessible
// name is its own text; the card is the labelled dialog it controls).
const PREVIEW = "[role=button][data-preview-label]";

function where(target: EventTarget | null): string {
  if (!(target instanceof Element)) return "-";
  const mark = target.closest(PREVIEW);
  if (mark) return "link:" + (mark.getAttribute("data-preview-label") ?? "").slice(0, 31);
  if (target.closest("video")?.closest(".fixed") || target.closest("[data-preview-card]")) return "card";
  return target.tagName.toLowerCase();
}

export default function HoverTrace() {
  const [enabled, setEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const rows = useRef<Row[]>([]);
  const t0 = useRef(0);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("trace") === "1") setEnabled(true);
  }, []);

  useEffect(() => {
    if (!recording) return;
    const t = () => Math.round((performance.now() - t0.current) * 10) / 10;
    const push = (r: Row) => rows.current.push(r);
    const opts = { capture: true, passive: true } as const;

    const onMove = (e: PointerEvent) =>
      push([t(), "move", e.clientX, e.clientY, e.movementX, e.movementY, e.pointerType, where(e.target)]);
    const onOver = (e: PointerEvent) => push([t(), "over", e.clientX, e.clientY, where(e.target)]);
    const onOut = (e: PointerEvent) => push([t(), "out", e.clientX, e.clientY, where(e.target)]);
    const onWheel = (e: WheelEvent) => push([t(), "wheel", e.clientX, e.clientY, e.deltaX, e.deltaY, e.deltaMode]);
    const onScroll = () => push([t(), "scroll", Math.round(window.scrollY * 10) / 10]);
    const onDown = (e: PointerEvent) => push([t(), "down", e.clientX, e.clientY, where(e.target)]);

    window.addEventListener("pointermove", onMove, opts);
    window.addEventListener("pointerover", onOver, opts);
    window.addEventListener("pointerout", onOut, opts);
    window.addEventListener("wheel", onWheel, opts);
    window.addEventListener("scroll", onScroll, opts);
    window.addEventListener("pointerdown", onDown, opts);

    let raf = 0;
    let lastFrame = "";
    const frame = () => {
      const l = lenisRef.current;
      const open = [...document.querySelectorAll(PREVIEW)]
        .filter((el) => el.getAttribute("aria-expanded") === "true")
        .map((el) => (el.getAttribute("aria-label") ?? "").slice(9, 40));
      const card = [...document.querySelectorAll("video")]
        .map((v) => v.closest(".fixed"))
        .find((el) => el && getComputedStyle(el).opacity !== "0");
      const rect = card?.getBoundingClientRect();
      const state = [
        l ? Math.round(l.animatedScroll * 10) / 10 : null,
        l ? Math.round(l.velocity * 100) / 100 : null,
        l ? String(l.isScrolling) : null,
        open.join("|") || "-",
        card ? Number(getComputedStyle(card).opacity).toFixed(2) : "-",
        rect ? Math.round(rect.top) : null,
      ];
      const key = JSON.stringify(state);
      if (key !== lastFrame) push([t(), "frame", ...state]);
      lastFrame = key;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const counter = setInterval(() => setCount(rows.current.length), 250);

    return () => {
      window.removeEventListener("pointermove", onMove, opts);
      window.removeEventListener("pointerover", onOver, opts);
      window.removeEventListener("pointerout", onOut, opts);
      window.removeEventListener("wheel", onWheel, opts);
      window.removeEventListener("scroll", onScroll, opts);
      window.removeEventListener("pointerdown", onDown, opts);
      cancelAnimationFrame(raf);
      clearInterval(counter);
    };
  }, [recording]);

  if (!enabled) return null;

  const start = () => {
    rows.current = [];
    t0.current = performance.now();
    rows.current.push([0, "meta", navigator.userAgent, window.innerWidth, window.innerHeight, window.devicePixelRatio, window.scrollY, location.pathname]);
    // Link positions in page coordinates, so a replay can check the layout matches.
    document.querySelectorAll(PREVIEW).forEach((el) => {
      const r = el.getBoundingClientRect();
      rows.current.push([0, "link", (el.getAttribute("aria-label") ?? "").slice(9, 40), Math.round(r.left), Math.round(r.top + window.scrollY), Math.round(r.width), Math.round(r.height)]);
    });
    setCount(rows.current.length);
    setRecording(true);
  };

  const stop = () => {
    setRecording(false);
    const blob = new Blob([JSON.stringify({ version: 1, rows: rows.current })], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hover-trace-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-sub text-white shadow-lg">
      <span className={`size-2 rounded-full ${recording ? "bg-red-500" : "bg-white/40"}`} />
      <span className="tabular-nums">{recording ? `${count} events` : "Hover trace"}</span>
      <button type="button" onClick={recording ? stop : start} className="rounded-full bg-white px-3 py-1 text-primary">
        {recording ? "Stop + download" : "Start"}
      </button>
    </div>
  );
}
