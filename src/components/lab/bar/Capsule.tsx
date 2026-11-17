"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { useModalFocus } from "@/hooks/useModalFocus";
import type { VariantProps } from "./BarLab";
import type { Panel } from "./types";
import {
  AboutBody,
  BAR_SHADOW,
  BAR_TOP,
  BarItems,
  DetailsBody,
  EASE,
  HomeView,
  NameButton,
  PostView,
  ProjectView,
  WorkIndex,
  useLabPanelFlag,
  usePresence,
  useReducedMotion,
  useScrollLock,
} from "./shared";

// Capsule (layout axis): the bar and the project pill are one object. On a
// project page the capsule grows a second row under Work · name · About:
// the project's name and, on a test clip, the test, wrapping to two lines
// so the longest A/B name is read in full instead of cut. Work, About and
// the details open inside the same capsule, below its rows, so nothing ever
// stacks frost on frost and nothing floats free on the page. On a laptop the
// capsule is compact at rest and widens to the panel it opens; each panel
// is as tall as what it holds.

/** Laptop widths: compact at rest, as wide as the open panel needs. */
const WIDTH: Record<NonNullable<Panel> | "none", string> = {
  none: "26rem",
  work: "min(64rem, calc(100vw - 48px))",
  about: "36rem",
  details: "40rem",
};

export default function Capsule({ data, page, go, setClip }: VariantProps) {
  const [open, setOpen] = useState<Panel>(null);
  const [shown, done] = usePresence(open);
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(null), []);
  const toggle = (p: Exclude<Panel, null>) => setOpen((o) => (o === p ? null : p));

  useScrollLock(shown !== null);
  useLabPanelFlag(shown !== null);
  useModalFocus(open !== null, rootRef, scrollRef, close);

  const project = page.kind === "project" ? data.projects[page.index] : null;
  const clip = page.kind === "project" ? page.clip : 0;
  const label = project?.clips[clip]?.label ?? null;

  const openRow = (r: { kind: "project" | "post"; index: number }) => {
    setOpen(null);
    go(r.kind === "project" ? { kind: "project", index: r.index, clip: 0 } : { kind: "post", index: r.index });
  };

  // 1ms, not 0, under reduced motion: transitionend still fires and closes.
  const dur = reduced ? 1 : 320;

  return (
    <>
      {page.kind === "home" && <HomeView data={data} go={go} />}
      {page.kind === "post" && <PostView data={data} index={page.index} />}
      {project && (
        <ProjectView project={project} clip={clip} setClip={setClip} pill={null} top="pt-[136px] desktop:pt-[152px]" />
      )}

      <div ref={rootRef}>
        <div
          className={`frost-strong ${BAR_SHADOW} fixed ${BAR_TOP} inset-x-[var(--grid-margin)] z-[60] flex flex-col overflow-hidden rounded-[20px] text-body desktop:right-auto desktop:left-1/2 desktop:w-[var(--cap-w)] desktop:-translate-x-1/2 desktop:transition-[width]`}
          style={{
            "--cap-w": WIDTH[open ?? "none"],
            // The open panel may use the screen down to 12px above its bottom
            // edge: bar row, project row (when docked) and gaps come off it.
            "--panel-max": `calc(100dvh - ${project ? 148 : 88}px)`, transitionDuration: `${dur}ms`, transitionTimingFunction: EASE } as CSSProperties}
        >
          {/* Work · name · About keep their places while the capsule widens. */}
          <nav aria-label="Site" className="mx-auto grid h-10 w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-7 px-5 desktop:max-w-[26rem]">
            <BarItems
              open={open}
              onWork={() => toggle("work")}
              onAbout={() => toggle("about")}
              centre={<NameButton onHome={() => { setOpen(null); go({ kind: "home" }); }} dim={open !== null} />}
            />
          </nav>

          {/* Second row: the project, docked. Grows in with the page. */}
          <div
            className="grid transition-[grid-template-rows] ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ gridTemplateRows: project ? "1fr" : "0fr", transitionDuration: `${dur}ms` }}
          >
            <div className="min-h-0 overflow-hidden">
              {project && (
                <button
                  type="button"
                  onClick={() => toggle("details")}
                  aria-expanded={open === "details"}
                  className="mx-auto flex w-full flex-col items-center px-5 pb-2.5 text-center transition-[scale] duration-[160ms] active:scale-[0.99] desktop:max-w-[26rem]"
                >
                  <span className={`line-clamp-1 ${open !== null && open !== "details" ? "text-secondary" : "text-primary"}`}>{project.title}</span>
                  {label && <span className="line-clamp-2 text-secondary [overflow-wrap:anywhere]">{label}</span>}
                </button>
              )}
            </div>
          </div>

          {/* The panel opens inside the capsule, under its rows, as tall as
              what it holds (About fits a phone without scrolling). */}
          <div
            className="grid transition-[grid-template-rows]"
            style={{ gridTemplateRows: open ? "1fr" : "0fr", transitionDuration: `${dur}ms`, transitionTimingFunction: EASE }}
            onTransitionEnd={(e) => {
              if (e.target === e.currentTarget && !open) done();
            }}
          >
            <div className="min-h-0 overflow-hidden">
              {shown && (
                <div
                  key={shown}
                  role="dialog"
                  aria-modal="true"
                  aria-label={shown === "work" ? "Work" : shown === "about" ? "About" : "Details"}
                  className="pt-4 desktop:pt-6"
                  style={{
                    opacity: open ? 1 : 0,
                    transition: `opacity ${open ? 200 : 100}ms ${EASE}`,
                    animation: reduced ? undefined : `lab-in 200ms ${EASE} 60ms both`,
                  }}
                >
                  {shown === "work" ? (
                    <WorkIndex data={data} onOpen={openRow} scrollRef={scrollRef} />
                  ) : (
                    <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className="max-h-[var(--panel-max)] overflow-y-auto overscroll-contain outline-none">
                      {shown === "about" ? <AboutBody about={data.about} /> : project && <DetailsBody project={project} clip={clip} />}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <style>{`@keyframes lab-in{from{opacity:0}to{opacity:1}}`}</style>
        {/* A scrim keeps the page from competing with the open capsule. */}
        <div
          aria-hidden
          onClick={close}
          className={`fixed inset-0 z-[59] bg-black/10 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
      </div>
    </>
  );
}
