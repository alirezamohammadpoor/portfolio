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
}

/**
 * Scroll indicator, desktop only (Ali, 30 Oct): a pistachio bar the width of
 * the grid gutter sits flush to the right edge, inside the page margin, and
 * fills from the top with the scroll, like a scrollbar track in the site's
 * colour. At the foot of the page the pull towards the
 * next project darkens the bar from the bottom (--pull). The number sits at
 * the bar's foot and, from 90 % down, the next project's title above it.
 * The number and both fills are driven by useGalleryScroll.
 *
 * Both fills are full-height layers revealed by clip-path / scaleY, so a
 * scroll frame repaints the bar without laying out the page.
 */
/** Bar width: the grid gutter (--grid-gutter is 16px on a laptop). */
const BAR = "var(--grid-gutter)";

export default function ScrollProgress({
  progressRef,
  progressFillRef,
  pullRef,
  nextProjectSlug,
  nextProjectTitle,
  nextTextWrapperRef,
}: ScrollProgressProps) {
  const numberRef = progressRef as RefObject<HTMLParagraphElement | null>;
  const fillRef = progressFillRef as RefObject<HTMLDivElement | null>;
  const pullFillRef = pullRef as RefObject<HTMLDivElement | null>;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 right-0 z-10 hidden desktop:block"
        style={{ width: BAR }}
      >
        <div
          ref={fillRef}
          className="absolute inset-0 bg-pistachio"
          style={{ clipPath: "inset(0 0 calc((1 - var(--p, 0)) * 100%) 0)" }}
        >
          {/* The hint rides on the fill's end and emerges as the bar grows. */}
          {nextProjectSlug && (
            <p
              className="absolute top-0 right-0"
              style={{ transform: "translateY(calc(var(--p, 0) * 100vh - 100% - 0.75rem))" }}
            >
              <span
                className="block text-center text-sub font-medium uppercase text-primary"
                style={{ width: BAR, lineHeight: BAR, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Scroll down to see next project
              </span>
            </p>
          )}
        </div>
        <div
          ref={pullFillRef}
          className="absolute inset-0 origin-bottom bg-primary"
          style={{ transform: "scaleY(var(--pull, 0))" }}
        />
      </div>
      <div className="pointer-events-none fixed right-[var(--grid-margin)] bottom-6 z-10 hidden text-right desktop:block">
        {nextProjectSlug && (
          <div ref={nextTextWrapperRef} className="invisible mb-1 whitespace-nowrap">
            <p className="text-body text-primary">
              Next, {nextProjectTitle ?? "project"}
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
