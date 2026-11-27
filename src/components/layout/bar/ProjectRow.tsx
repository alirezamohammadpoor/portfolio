"use client";

import { useState, type ReactNode } from "react";
import { EASE_OUT_CSS } from "@/lib/motion";
import type { BarNext, NextInBar } from "@/lib/barProject";
import { Thumb } from "@/components/project/GalleryProgress";

const PRESS =
  "transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]";

/** The replay button is pistachio all the time (Ali, 11-27: "it can be
 * pistachio all the time"); the clip meter under the card shows the test's
 * progress, so the slot no longer fills as the test plays. */
const REPLAY_FILL =
  "[&>button]:bg-pistachio [&>button>span]:hidden [&>button>svg]:mix-blend-normal [&>button>svg]:stroke-primary";

function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={`size-3 shrink-0 motion-safe:transition-transform motion-safe:duration-200 ${className}`}
      style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Arrow() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="relative size-3.5">
      <path
        d="M3 8h9.5M8.5 4l4 4-4 4"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The way to the next project, where the replay button sits. "countdown"
 * fills it with pistachio over the hold before the page moves on. */
function GoButton({ next, countdown }: { next: BarNext; countdown: boolean }) {
  const run = countdown && next.holding;
  return (
    <button
      type="button"
      onClick={next.go}
      aria-label={`Open ${next.title}`}
      className={`relative isolate inline-flex h-7 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full active:scale-[0.94] ${countdown ? "bg-tertiary" : "bg-pistachio"} transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]`}
    >
      {countdown && (
        <span
          aria-hidden
          className="absolute inset-0 origin-left bg-pistachio"
          style={{
            transform: run ? "scaleX(1)" : "scaleX(0)",
            transition: run ? `transform ${next.holdMs}ms linear` : "transform 160ms ease-out",
          }}
        />
      )}
      <Arrow />
    </button>
  );
}

/**
 * The project row in the Pebble (List, picked by Ali 11-17): a hairline
 * under Work · name · About, then what it is on the left (title over the
 * test) and what you can do on the right (chevron, replay).
 */
export default function ProjectRowLayout({
  title,
  label: clipLabel,
  replay,
  detailsOpen,
  dim,
  controls,
  onToggle,
  next = null,
  nextMode = "pill",
}: {
  title: string;
  label: string | null;
  replay: ReactNode;
  detailsOpen: boolean;
  dim: boolean;
  controls: string;
  onToggle: () => void;
  /** The next project, while its cover is centred (/lab/next-pebble). */
  next?: BarNext | null;
  nextMode?: NextInBar;
}) {
  const label = !next
    ? clipLabel
    : nextMode === "line"
      ? null
      : nextMode === "carry"
        ? `Next – ${next.title}`
        : "Next project";
  // Swap and countdown name the next project and show its cover.
  const named = Boolean(next) && nextMode !== "carry";
  const thumb = named && nextMode !== "line";
  // The test line opens and folds like the Pebble's rows (320ms, same
  // ease) instead of snapping, and keeps its last name while it folds.
  const [shownLabel, setShownLabel] = useState(label);
  if (label && label !== shownLabel) setShownLabel(label);
  const tone = dim ? "text-secondary" : "text-primary";
  const toggle = {
    type: "button" as const,
    onClick: onToggle,
    "aria-expanded": detailsOpen,
    "aria-controls": controls,
  };

  return (
    <div className="mx-auto w-full desktop:max-w-[30rem]">
      <div className="mx-4 h-px bg-black/[0.08]" />
      <div className="flex items-center gap-3 py-2.5 pr-3 pl-5">
        <button
          {...(next ? { type: "button" as const, onClick: next.go } : toggle)}
          className={`flex min-w-0 flex-1 items-center text-left ${PRESS}`}
        >
          {/* The next project's cover opens in front of its name (swap). */}
          <span
            aria-hidden
            className="relative h-7 shrink-0 overflow-hidden rounded-full bg-tertiary motion-safe:transition-[width,margin,opacity]"
            style={{
              width: thumb ? 44 : 0,
              marginLeft: thumb ? -8 : 0,
              marginRight: thumb ? 12 : 0,
              opacity: thumb ? 1 : 0,
              transitionDuration: "320ms",
              transitionTimingFunction: EASE_OUT_CSS,
            }}
          >
            {next && thumb && <Thumb src={next.cover} label="" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate ${tone}`}>
              {next && named ? next.title : title}
              {next && nextMode === "line" && (
                <span className="ml-2 text-secondary">Next project</span>
              )}
            </span>
            <span
              aria-hidden={!label}
              className="grid motion-safe:transition-[grid-template-rows,opacity]"
              style={{
                gridTemplateRows: label ? "1fr" : "0fr",
                opacity: label ? 1 : 0,
                transitionDuration: "320ms",
                transitionTimingFunction: EASE_OUT_CSS,
              }}
            >
              <span className="min-h-0 overflow-hidden">
                {shownLabel && (
                  <span className="line-clamp-2 block text-[0.9375rem] leading-[1.25rem] text-secondary [overflow-wrap:anywhere]">
                    {shownLabel}
                  </span>
                )}
              </span>
            </span>
          </span>
          {!next && <Chevron open={detailsOpen} className={`ml-3 ${tone}`} />}
        </button>
        {/* Only the button takes the pistachio here (Ali 11-17), solid
            since 11-27. */}
        {next ? (
          <GoButton next={next} countdown={nextMode === "countdown"} />
        ) : (
          replay && <span className={`flex ${REPLAY_FILL}`}>{replay}</span>
        )}
      </div>
    </div>
  );
}
