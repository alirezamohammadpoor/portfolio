"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
  SHEET_EASE,
  WorkIndex,
  pillText,
  usePresence,
  useReducedMotion,
  useScrollLock,
} from "./shared";

// Island (motion axis): everything that opens grows out of the thing you
// touched. Work and About grow out of the bar, the details grow out of the
// project pill under the card. The bar never changes: on a project page it
// still reads Work · name · About, and the project's name and the clip's
// A/B test live in the pill under the card (truncated there, in full in the
// details).

const FULL = "inset(0px 0px 0px 0px round 24px)";

function MorphPanel({
  originRef,
  open,
  onClosed,
  contentKey,
  children,
}: {
  originRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClosed: () => void;
  contentKey: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const phase = useRef<"new" | "open" | "closing">("new");
  // Swapping Work ↔ About inside an open panel crossfades at once; the
  // first content waits for the panel to have mostly grown (a dense 2D
  // morph sequences its content, choreograph).
  const [firstKey] = useState(contentKey);

  const originInset = useCallback(() => {
    const el = ref.current;
    const o = originRef.current?.getBoundingClientRect();
    if (!el || !o) return FULL;
    const p = el.getBoundingClientRect();
    return `inset(${o.top - p.top}px ${p.right - o.right}px ${p.bottom - o.bottom}px ${o.left - p.left}px round ${o.height / 2}px)`;
  }, [originRef]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.style.clipPath = "none";
      el.style.transition = "opacity 160ms ease";
      if (phase.current === "new") {
        el.style.opacity = "0";
        void el.offsetWidth;
      }
      el.style.opacity = open ? "1" : "0";
      phase.current = open ? "open" : "closing";
      return;
    }
    if (open) {
      // A fresh open starts at the origin; a reopen mid-close retargets
      // from wherever the clip is (CSS transitions are interruptible).
      if (phase.current === "new") {
        el.style.transition = "none";
        el.style.clipPath = originInset();
        void el.offsetWidth;
      }
      el.style.transition = `clip-path 420ms ${SHEET_EASE}`;
      el.style.clipPath = FULL;
      phase.current = "open";
    } else {
      el.style.transition = `clip-path 300ms ${EASE}`;
      el.style.clipPath = originInset();
      phase.current = "closing";
    }
  }, [open, reduced, originInset]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      onTransitionEnd={(e) => {
        if (e.target !== e.currentTarget || open) return;
        onClosed();
      }}
      className={`frost-strong fixed inset-x-[var(--grid-margin)] ${BAR_TOP} bottom-3 z-[55] flex flex-col desktop:bottom-4`}
    >
      {/* The bar sits in the panel's top row. */}
      <div className="h-14 shrink-0 desktop:h-[72px]" />
      <div
        key={contentKey}
        className="min-h-0 flex-1 transition-opacity duration-100"
        style={{
          opacity: open ? 1 : 0,
          animation: reduced ? undefined : `lab-in 200ms ${EASE} ${contentKey === firstKey ? 180 : 0}ms both`,
        }}
      >
        {children}
      </div>
      <style>{`@keyframes lab-in{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

export default function Island({ data, page, go, setClip }: VariantProps) {
  const [open, setOpen] = useState<Panel>(null);
  const [shown, done] = usePresence(open);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(null), []);
  const toggle = (p: Exclude<Panel, null>) => setOpen((o) => (o === p ? null : p));

  useScrollLock(shown !== null);
  useModalFocus(open !== null, rootRef, scrollRef, close);

  const project = page.kind === "project" ? data.projects[page.index] : null;
  const clip = page.kind === "project" ? page.clip : 0;
  const origin = shown === "details" ? pillRef : barRef;

  const openRow = (r: { kind: "project" | "post"; index: number }) => {
    setOpen(null);
    go(r.kind === "project" ? { kind: "project", index: r.index, clip: 0 } : { kind: "post", index: r.index });
  };

  const pill = project && (
    <button
      ref={pillRef}
      type="button"
      onClick={() => toggle("details")}
      aria-expanded={open === "details"}
      title={pillText(project, clip)}
      className={`frost-strong ${BAR_SHADOW} inline-flex h-9 max-w-full min-w-0 items-center rounded-full px-4 text-body text-primary transition-[scale] duration-[160ms] active:scale-[0.97] desktop:max-w-[min(40rem,100%)]`}
    >
      <span className="truncate">{pillText(project, clip)}</span>
    </button>
  );

  return (
    <>
      {page.kind === "home" && <HomeView data={data} go={go} />}
      {page.kind === "post" && <PostView data={data} index={page.index} />}
      {project && <ProjectView project={project} clip={clip} setClip={setClip} pill={pill} />}

      <div ref={rootRef}>
        <nav
          ref={barRef}
          aria-label="Site"
          className={`fixed ${BAR_TOP} inset-x-[var(--grid-margin)] z-[60] grid h-10 grid-cols-[1fr_auto_1fr] items-center gap-x-7 rounded-full px-5 text-body desktop:right-auto desktop:left-1/2 desktop:-translate-x-1/2`}
        >
          {/* The pill's own frost steps aside while a panel grown from it is up:
              the panel's frost is the same surface, never two stacked blurs. */}
          <span
            aria-hidden
            className={`frost-strong ${BAR_SHADOW} pointer-events-none absolute inset-0 -z-10 rounded-full ${shown && shown !== "details" ? "opacity-0" : "opacity-100"}`}
          />
          <BarItems open={open} onWork={() => toggle("work")} onAbout={() => toggle("about")} centre={<NameButton onHome={() => { setOpen(null); go({ kind: "home" }); }} dim={open !== null} />} />
        </nav>

        {shown && (
          <MorphPanel originRef={origin} open={open !== null} onClosed={done} contentKey={shown}>
            {shown === "work" ? (
              <WorkIndex data={data} onOpen={openRow} scrollRef={scrollRef} />
            ) : (
              <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className="h-full overflow-y-auto overscroll-contain outline-none">
                {shown === "about" ? <AboutBody about={data.about} /> : project && <DetailsBody project={project} clip={clip} />}
              </div>
            )}
          </MorphPanel>
        )}
      </div>
    </>
  );
}
