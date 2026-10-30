import type { RefObject } from "react";

interface ScrollProgressProps {
  progressRef: RefObject<HTMLElement | null>;
  /** Receives --p (0..1) from the scroll hook; the bar's fill reads it. */
  progressFillRef: RefObject<HTMLElement | null>;
  /** Receives --pull (0..1) at the bottom edge; the bar darkens from its foot. */
  pullRef: RefObject<HTMLElement | null>;
  nextProjectSlug: string | undefined;
  nextProjectTitle?: string | null;
  nextTextWrapperRef: RefObject<HTMLDivElement | null>;
  /** The next title's text node: measured before it travels to the next page's h1. */
  nextTitleRef?: RefObject<HTMLSpanElement | null>;
}

/**
 * Scroll indicator, desktop only (Ali, 30 Oct): the right page margin is a
 * pistachio bar that fills from the top with the scroll, like a scrollbar
 * track in the site's colour. At the foot of the page the pull towards the
 * next project darkens the bar from the bottom (--pull). The number sits at
 * the bar's foot and, from 90 % down, the next project's title above it.
 * The number and both fills are driven by useGalleryScroll. On the pull the
 * title leaves for the next page's h1 (lib/titleTravel.ts).
 */
export default function ScrollProgress({
  progressRef,
  progressFillRef,
  pullRef,
  nextProjectSlug,
  nextProjectTitle,
  nextTextWrapperRef,
  nextTitleRef,
}: ScrollProgressProps) {
  const numberRef = progressRef as RefObject<HTMLParagraphElement | null>;
  const fillRef = progressFillRef as RefObject<HTMLDivElement | null>;
  const pullFillRef = pullRef as RefObject<HTMLDivElement | null>;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 right-0 z-10 hidden w-[var(--grid-margin)] desktop:block"
      >
        <div
          ref={fillRef}
          className="absolute inset-x-0 top-0 overflow-hidden bg-pistachio"
          style={{ height: "calc(var(--p, 0) * 100%)" }}
        >
          {/* The hint rides on the fill's end and emerges as the bar grows. */}
          {nextProjectSlug && (
            <p
              className="absolute right-0 bottom-3 w-[var(--grid-margin)] text-center text-sub font-medium uppercase text-primary"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", lineHeight: "var(--grid-margin)" }}
            >
              Scroll down to see next project
            </p>
          )}
        </div>
        <div
          ref={pullFillRef}
          className="absolute inset-x-0 bottom-0 bg-primary"
          style={{ height: "calc(var(--pull, 0) * 100%)" }}
        />
      </div>
      <div className="pointer-events-none fixed right-[calc(var(--grid-margin)+8px)] bottom-6 z-10 hidden text-right desktop:block">
        {nextProjectSlug && (
          <div ref={nextTextWrapperRef} className="invisible mb-1 whitespace-nowrap">
            <p className="text-body text-primary">
              Next, <span ref={nextTitleRef}>{nextProjectTitle ?? "project"}</span>
            </p>
          </div>
        )}
        <p ref={numberRef} className="text-h1 text-primary tabular-nums">
          0
        </p>
      </div>
    </>
  );
}
