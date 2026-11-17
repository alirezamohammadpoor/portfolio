"use client";

import type { ReactNode } from "react";
import type { ProjectRow } from "@/lib/barProject";

const PRESS = "transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]";

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
          {replay}
        </div>
      </div>
    );
  }

  if (layout === "inner") {
    // The project in its own tinted pill, nested in the Pebble: replay at
    // its left edge, title over test, the chevron at the end.
    return (
      <div className="mx-auto w-full px-2 pb-2 desktop:max-w-[30rem]">
        <div className="flex min-h-11 items-center gap-2 rounded-[calc(var(--bar-r)-8px)] bg-black/[0.05] p-1.5">
          {replay}
          <button {...toggle} className={`flex min-w-0 flex-1 items-center gap-2 py-1 pr-2 text-left ${replay ? "" : "pl-2.5"} ${PRESS}`}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`truncate leading-[1.25rem] ${tone}`}>{title}</span>
              {label && <span className="line-clamp-2 text-[0.9375rem] leading-[1.25rem] text-secondary [overflow-wrap:anywhere]">{label}</span>}
            </span>
            <Chevron open={detailsOpen} className={tone} />
          </button>
        </div>
      </div>
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
