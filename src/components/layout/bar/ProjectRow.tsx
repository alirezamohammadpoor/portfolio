"use client";

import { useState, type ReactNode } from "react";
import { EASE_OUT_CSS } from "@/lib/motion";

const PRESS = "transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]";

/** The replay slot fills from white to pistachio as the test plays (Ali, 11-17).
 * A hairline keeps the white part of the pill visible on the white Pebble. */
const REPLAY_FILL = "[&>button]:bg-white [&>button]:outline [&>button]:outline-1 [&>button]:-outline-offset-1 [&>button]:outline-black/10 [&>button>span]:bg-pistachio [&>button>svg]:mix-blend-normal [&>button>svg]:stroke-primary";

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
 * The project row in the Pebble (List, picked by Ali 11-17): a hairline
 * under Work · name · About, then what it is on the left (title over the
 * test) and what you can do on the right (chevron, replay).
 */
export default function ProjectRowLayout({
  title,
  label,
  replay,
  detailsOpen,
  dim,
  controls,
  onToggle,
}: {
  title: string;
  label: string | null;
  replay: ReactNode;
  detailsOpen: boolean;
  dim: boolean;
  controls: string;
  onToggle: () => void;
}) {
  // The test line opens and folds like the Pebble's rows (320ms, same
  // ease) instead of snapping, and keeps its last name while it folds.
  const [shownLabel, setShownLabel] = useState(label);
  if (label && label !== shownLabel) setShownLabel(label);
  const tone = dim ? "text-secondary" : "text-primary";
  const toggle = { type: "button" as const, onClick: onToggle, "aria-expanded": detailsOpen, "aria-controls": controls };

  return (
    <div className="mx-auto w-full desktop:max-w-[30rem]">
      <div className="mx-4 h-px bg-black/[0.08]" />
      <div className="flex items-center gap-3 py-2.5 pr-3 pl-5">
        <button {...toggle} className={`flex min-w-0 flex-1 items-center gap-3 text-left ${PRESS}`}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate ${tone}`}>{title}</span>
            <span
              aria-hidden={!label}
              className="grid motion-safe:transition-[grid-template-rows,opacity]"
              style={{ gridTemplateRows: label ? "1fr" : "0fr", opacity: label ? 1 : 0, transitionDuration: "320ms", transitionTimingFunction: EASE_OUT_CSS }}
            >
              <span className="min-h-0 overflow-hidden">
                {shownLabel && <span className="line-clamp-2 block text-[0.9375rem] leading-[1.25rem] text-secondary [overflow-wrap:anywhere]">{shownLabel}</span>}
              </span>
            </span>
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
