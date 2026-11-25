"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PICKER_CSS } from "@/components/lab/devops/pickerCss";
import ProjectPageClient from "@/components/project/ProjectPageClient";
import { AUTO_BARS, AutoBarContext } from "@/components/project/AutoProgress";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

// The picker sits under the header on a laptop (the filmstrip owns the
// bottom); on a phone it goes under the filmstrip, small, so all ten fit.
const PLACE = `.proto-picker{bottom:auto;top:calc(var(--header-height) + 64px)}@media (max-width:600px){.proto-picker{top:auto;bottom:8px}.proto-picker-item{padding:0 7px;font-size:12px}}`;

/**
 * The real TRY Devops stage with each clip meter look (AutoProgress). Picking
 * a look, or ↻ / R, starts the gallery from its first clip again: any click
 * or key on the page hands the stage back to the visitor, the picker's own
 * included, so every pick remounts it. `?v=1..10` opens on a look.
 */
export default function ProgressLab({ project }: { project: Project }) {
  const [current, setCurrent] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const v = parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of the URL after hydration
    if (v >= 1 && v <= AUTO_BARS.length) setCurrent(v - 1);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => pickerRef.current?.setAttribute("data-ready", "")),
    );
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
    if (i < 0 || i >= AUTO_BARS.length) return;
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
      const n = e.key === "0" ? 10 : parseInt(e.key, 10);
      if (n >= 1 && n <= AUTO_BARS.length) select(n - 1);
      else if (e.key === "r" || e.key === "R") setMountKey((k) => k + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [select]);

  return (
    <>
      <style>{PICKER_CSS + PLACE}</style>
      <AutoBarContext.Provider value={AUTO_BARS[current].id}>
        <ProjectPageClient key={mountKey} project={project} nextProject={project.nextProject} />
      </AutoBarContext.Provider>
      <nav ref={pickerRef} className="proto-picker" aria-label="Prototype variants">
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {AUTO_BARS.map((b, i) => (
          <button
            key={b.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            onClick={() => select(i)}
          >
            {b.id}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          type="button"
          className="proto-picker-item proto-picker-replay"
          aria-label="Play from the first clip (R)"
          onClick={() => setMountKey((k) => k + 1)}
        >
          ↻
        </button>
      </nav>
    </>
  );
}
