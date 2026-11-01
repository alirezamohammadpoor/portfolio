import { useCallback, type CSSProperties, type RefObject } from "react";

interface ScrollProgressProps {
  /** Receives --p (0..1) from the scroll hook; the bar's fill reads it. */
  progressFillRef: RefObject<HTMLElement | null>;
  /** Receives --pull (0..1) at the bottom edge; green wipes down over the bar. */
  pullRef: RefObject<HTMLElement | null>;
  nextProjectSlug: string | undefined;
  nextProjectTitle?: string | null;
}

/**
 * Scroll indicator, desktop only (Ali, 30 Oct – 1 Nov): a bar the width of
 * the grid gutter sits flush to the right edge and fills black from the top
 * with the scroll, like a scrollbar. Over the last tenth of the page it
 * widens to the page margin (24px) and the next project's title runs up inside it, light on
 * the black. The pull towards the next project (--pull) is a green copy of
 * the bar wiping down over the black, title included, so the text turns dark
 * exactly where the green has reached it. No scroll number: the bar does
 * that job.
 *
 * --p and --pull are written on the root and inherited by every layer, so a
 * scroll frame only repaints: fills are revealed by clip-path, the width
 * and the title's fade are calc()s of the two properties.
 */
const GUTTER = "var(--grid-gutter)";
/** The page margin: the bar grows into it and never over the content. */
const WIDE = "var(--grid-margin)";
const FILL_CLIP = "inset(0 0 calc((1 - var(--p, 0)) * 100%) 0)";
const PULL_CLIP = "inset(0 0 calc((1 - var(--pull, 0)) * 100%) 0)";
/** 0 → 1 over the last 10 % of the page. */
const END = "clamp(0, calc((var(--p, 0) - 0.9) * 10), 1)";

export default function ScrollProgress({
  progressFillRef,
  pullRef,
  nextProjectSlug,
  nextProjectTitle,
}: ScrollProgressProps) {
  // One element carries both properties; the hook animates each by ref.
  const rootRef = useCallback(
    (el: HTMLDivElement | null) => {
      progressFillRef.current = el;
      pullRef.current = el;
    },
    [progressFillRef, pullRef],
  );
  const title = nextProjectSlug ? `Next project – ${nextProjectTitle ?? ""}` : null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-y-0 right-0 z-10 hidden overflow-hidden desktop:block"
      style={{ "--p": 0, "--pull": 0, width: `calc(${GUTTER} + (${WIDE} - ${GUTTER}) * ${END})` } as CSSProperties}
    >
      <div className="absolute inset-0 bg-primary" style={{ clipPath: FILL_CLIP }}>
        {title && <Title text={title} className="text-bg" />}
        <div className="absolute inset-0 bg-pistachio" style={{ clipPath: PULL_CLIP }}>
          {title && <Title text={title} className="text-primary" />}
        </div>
      </div>
    </div>
  );
}

/** Reads bottom to top, riding on the fill's end. */
function Title({ text, className }: { text: string; className: string }) {
  return (
    <p
      className="absolute top-0 right-0"
      style={{ transform: "translateY(calc(var(--p, 0) * 100vh - 100% - 0.75rem))", opacity: END }}
    >
      <span
        className={`block whitespace-nowrap text-body font-medium ${className}`}
        style={{ width: WIDE, lineHeight: WIDE, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {text}
      </span>
    </p>
  );
}
