"use client";

import { useCallback, type CSSProperties, type RefObject } from "react";
import { NEXT_VARIANTS, setNextVariant, useNextVariant, type NextVariant } from "@/lib/nextVariant";

interface ScrollProgressProps {
  /** Receives --p (0..1) from the scroll hook; the bar's fill reads it. */
  progressFillRef: RefObject<HTMLElement | null>;
  /** Receives --pull (0..1) at the bottom edge; green wipes down over the bar. */
  pullRef: RefObject<HTMLElement | null>;
  nextProjectSlug: string | undefined;
  nextProjectTitle?: string | null;
}

/**
 * Scroll indicator, desktop only (Ali, 30 Oct): a bar the width of the grid
 * gutter sits flush to the right edge and fills black from the top with the
 * scroll, like a scrollbar. Green is the pull towards the next project at
 * the foot of the page (--pull), wiping over the black top-down.
 *
 * The scroll number is gone (the bar does the same job). Where the next
 * project's title shows is under test, five variants (useNextVariant):
 *   A  only the foot section, title at 88px; the bar alone tracks
 *   B  the title pinned to the bottom corner from 90 %, 56px, on a plate
 *   C  the title rides beside the bar at the end of the black fill
 *   D  on the pull the bar widens into a pistachio panel with the title
 *   E  from 90 % the bar widens to 56px and the title runs up inside it
 *
 * --p and --pull are written on the root and inherited by every layer, so
 * a scroll frame only repaints: fills are revealed by clip-path, widths and
 * positions are calc()s of the two properties.
 */
const GUTTER = "var(--grid-gutter)";
const FILL_CLIP = "inset(0 0 calc((1 - var(--p, 0)) * 100%) 0)";
const PULL_CLIP = "inset(0 0 calc((1 - var(--pull, 0)) * 100%) 0)";
/** 0 → 1 over the last 10 % of the page. */
const END = "clamp(0, calc((var(--p, 0) - 0.9) * 10), 1)";
/** 0 → 1 between 90 and 92.5 %: B and C's title arrives with the last tenth. */
const ARRIVE = "clamp(0, calc((var(--p, 0) - 0.9) * 40), 1)";
const E_WIDTH = "56px";

export default function ScrollProgress({
  progressFillRef,
  pullRef,
  nextProjectSlug,
  nextProjectTitle,
}: ScrollProgressProps) {
  const variant = useNextVariant();
  const title = nextProjectTitle ?? "project";
  const hasNext = Boolean(nextProjectSlug);

  // One element carries both properties; the hook animates each by ref.
  const rootRef = useCallback(
    (el: HTMLDivElement | null) => {
      progressFillRef.current = el;
      pullRef.current = el;
    },
    [progressFillRef, pullRef],
  );

  const barWidth =
    variant === "e"
      ? `calc(${GUTTER} + (${E_WIDTH} - ${GUTTER}) * ${END})`
      : variant === "d"
        ? `calc(${GUTTER} + (100vw - ${GUTTER}) * var(--pull, 0))`
        : GUTTER;

  return (
    <>
      <div
        ref={rootRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10 hidden desktop:block"
        style={{ "--p": 0, "--pull": 0 } as CSSProperties}
      >
        <div className="absolute inset-y-0 right-0 overflow-hidden" style={{ width: barWidth }}>
          {variant === "d" && hasNext && <PullPanel title={title} />}
          <div className="absolute inset-y-0 right-0" style={{ width: variant === "d" ? GUTTER : "100%" }}>
            <div className="absolute inset-0 bg-primary" style={{ clipPath: FILL_CLIP }}>
              {hasNext && <BarText variant={variant} title={title} className="text-bg" />}
              {/* The pull is a second, green copy of the bar wiped down over
                  the black, text included, so the text stays on top and
                  turns dark exactly where the green has reached it. */}
              {variant !== "d" && (
                <div className="absolute inset-0 bg-pistachio" style={{ clipPath: PULL_CLIP }}>
                  {hasNext && <BarText variant={variant} title={title} className="text-primary" />}
                </div>
              )}
            </div>
          </div>
        </div>

        {hasNext && variant === "b" && (
          <div
            className="absolute bottom-6 flex flex-col items-end whitespace-nowrap text-primary"
            style={{ right: `calc(${GUTTER} + var(--grid-margin))`, opacity: ARRIVE }}
          >
            {/* A plate, not a blend mode: the root is fixed, so its own
                stacking context would blend against nothing. */}
            <p className="bg-bg px-3 text-body text-secondary">Next,</p>
            <p className="bg-bg px-3 text-display">{title}</p>
          </div>
        )}

        {hasNext && variant === "c" && (
          <div
            className="absolute top-0 whitespace-nowrap"
            style={{
              right: GUTTER,
              opacity: ARRIVE,
              transform: "translateY(clamp(var(--header-height), calc(var(--p, 0) * 100vh - 100%), calc(100vh - 100% - 1.5rem)))",
            }}
          >
            <p className="bg-bg px-3 text-h1 text-primary">
              <span className="text-secondary">Next,</span> {title}
            </p>
          </div>
        )}
      </div>

      <VariantSwitch active={variant} />
    </>
  );
}

/** The text riding on the fill's end: the scroll hint, or E's title. */
function BarText({ variant, title, className }: { variant: NextVariant; title: string; className: string }) {
  if (variant === "c") return null;
  const isTitle = variant === "e";
  return (
    <p
      className="absolute top-0 right-0"
      style={{
        transform: "translateY(calc(var(--p, 0) * 100vh - 100% - 0.75rem))",
        opacity: isTitle ? END : undefined,
      }}
    >
      <span
        className={`block whitespace-nowrap ${isTitle ? "text-h1" : "text-center text-sub font-medium uppercase"} ${className}`}
        style={{
          width: isTitle ? E_WIDTH : GUTTER,
          lineHeight: isTitle ? E_WIDTH : GUTTER,
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
        }}
      >
        {isTitle ? `Next, ${title}` : "Scroll down to see next project"}
      </span>
    </p>
  );
}

/** D: the bar opened into a panel; fades in on the first wheel of the pull. */
function PullPanel({ title }: { title: string }) {
  return (
    <div
      className="absolute inset-0 bg-pistachio"
      style={{ opacity: "clamp(0, calc(var(--pull, 0) * 20), 1)" }}
    >
      <p
        className="absolute bottom-6 left-6 whitespace-nowrap text-display text-primary"
        style={{ opacity: "clamp(0, calc((var(--pull, 0) - 0.15) * 5), 1)" }}
      >
        {title}
      </p>
    </div>
  );
}

/** Test-only: pick a variant live. Remove once one is chosen. */
function VariantSwitch({ active }: { active: NextVariant }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[70] hidden -translate-x-1/2 gap-1 rounded-full bg-primary p-1 desktop:flex">
      {NEXT_VARIANTS.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setNextVariant(v)}
          className={`h-8 w-8 rounded-full text-sub font-medium uppercase ${v === active ? "bg-pistachio text-primary" : "text-bg"}`}
          aria-pressed={v === active}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
