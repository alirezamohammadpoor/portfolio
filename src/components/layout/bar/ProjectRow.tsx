"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ProjectRow } from "@/lib/barProject";

const PRESS = "transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]";

/** The replay slot fills from white to pistachio as the test plays (Ali, 11-17). */
const REPLAY_FILL = "[&>button]:bg-white [&>button>span]:bg-pistachio [&>button>svg]:mix-blend-normal [&>button>svg]:stroke-primary";

function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={`size-3 shrink-0 motion-safe:transition-transform motion-safe:duration-200 ${className}`}
      style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The project row in the Pebble, three layouts to compare on /lab/pebble
 * (Ali, 11-17: Docked as built feels cramped and unstructured).
 */
export default function ProjectRowLayout({
  layout,
  title,
  label,
  replay,
  detailsOpen,
  dim,
  controls,
  onToggle,
}: {
  layout: Exclude<ProjectRow, "now">;
  title: string;
  label: string | null;
  replay: ReactNode;
  detailsOpen: boolean;
  dim: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const tone = dim ? "text-secondary" : "text-primary";
  const toggle = { type: "button" as const, onClick: onToggle, "aria-expanded": detailsOpen, "aria-controls": controls };

  if (layout === "list") {
    // A hairline under Work · name · About, then a list row: what it is on
    // the left (title over test), what you can do on the right.
    return (
      <div className="mx-auto w-full desktop:max-w-[30rem]">
        <div className="mx-4 h-px bg-black/[0.08]" />
        <div className="flex items-center gap-3 py-2.5 pr-3 pl-5">
          <button {...toggle} className={`flex min-w-0 flex-1 items-center gap-3 text-left ${PRESS}`}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`truncate ${tone}`}>{title}</span>
              {label && <span className="line-clamp-2 text-[0.9375rem] leading-[1.25rem] text-secondary [overflow-wrap:anywhere]">{label}</span>}
            </span>
            <Chevron open={detailsOpen} className={tone} />
          </button>
          {/* Ali 11-17: only the button takes the pistachio here; it fills
              from white to pistachio as the test plays. */}
          {replay && <span className={`flex ${REPLAY_FILL}`}>{replay}</span>}
        </div>
      </div>
    );
  }

  if (layout === "inner") {
    return (
      <InnerPill replay={replay} toggle={toggle} tone={tone} title={title} label={label} detailsOpen={detailsOpen} />
    );
  }

  // Grid: centred, but every piece has a slot. Replay pinned left, chevron
  // pinned right, the test on its own line under the title.
  return (
    <div className="mx-auto grid w-full grid-cols-[56px_1fr_56px] items-center px-2 pb-2.5 desktop:max-w-[30rem]">
      <div className="flex justify-center">{replay}</div>
      <button {...toggle} className={`flex min-w-0 flex-col items-center text-center ${PRESS}`}>
        <span className={`max-w-full truncate ${tone}`}>{title}</span>
        {label && <span className="line-clamp-2 text-[0.9375rem] leading-[1.25rem] text-secondary [overflow-wrap:anywhere]">{label}</span>}
      </button>
      <button {...toggle} aria-label={detailsOpen ? "Hide details" : "Show details"} className={`flex size-11 items-center justify-center justify-self-center rounded-full ${PRESS}`}>
        <Chevron open={detailsOpen} className={tone} />
      </button>
    </div>
  );
}

/**
 * Inner pill (Ali, 11-17): the project in its own pill nested in the
 * Pebble. On a test clip the pill itself fills from white to pistachio as
 * the test plays, in step with the replay slot (whose own fill it copies
 * each frame); a plain clip shows it full.
 */
function InnerPill({
  replay,
  toggle,
  tone,
  title,
  label,
  detailsOpen,
}: {
  replay: ReactNode;
  toggle: { type: "button"; onClick: () => void; "aria-expanded": boolean; "aria-controls": string };
  tone: string;
  title: string;
  label: string | null;
  detailsOpen: boolean;
}) {
  const pillRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const testing = Boolean(replay);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    if (!testing) {
      fill.style.transform = "none";
      return;
    }
    let raf = 0;
    const tick = () => {
      const src = pillRef.current?.querySelector<HTMLElement>('button[aria-label^="Replay"] > span');
      fill.style.transform = src?.style.transform || "scaleX(0)";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [testing]);

  return (
    <div className="mx-auto w-full px-2 pb-2 desktop:max-w-[30rem]">
      <div
        ref={pillRef}
        className="relative isolate flex min-h-11 items-center gap-2 overflow-hidden rounded-[calc(var(--bar-r)-8px)] bg-white p-1.5 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]"
      >
        <span ref={fillRef} aria-hidden className="absolute inset-0 -z-10 origin-left bg-pistachio" style={{ transform: testing ? "scaleX(0)" : "none" }} />
        {/* The slot keeps the replay; the pill carries the progress. */}
        {replay && <span className="flex [&>button]:bg-white/70 [&>button>span]:opacity-0 [&>button>svg]:mix-blend-normal [&>button>svg]:stroke-primary">{replay}</span>}
        <button {...toggle} className={`flex min-w-0 flex-1 items-center gap-2 py-1 pr-2 text-left ${replay ? "" : "pl-2.5"} ${PRESS}`}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate leading-[1.25rem] ${tone}`}>{title}</span>
            {label && <span className="line-clamp-2 text-[0.9375rem] leading-[1.25rem] text-primary/65 [overflow-wrap:anywhere]">{label}</span>}
          </span>
          <Chevron open={detailsOpen} className={tone} />
        </button>
      </div>
    </div>
  );
}
