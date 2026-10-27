import type { RefObject } from "react";

interface ScrollProgressProps {
  progressRef: RefObject<HTMLElement | null>;
  nextProjectSlug: string | undefined;
  nextTextWrapperRef: RefObject<HTMLDivElement | null>;
  nextTextRef: RefObject<HTMLDivElement | null>;
  /** Gallery page: under the fixed panel (left half). Chapter page: bottom right. */
  align?: "center" | "right";
}

export default function ScrollProgress({
  progressRef,
  nextProjectSlug,
  nextTextWrapperRef,
  nextTextRef,
  align = "center",
}: ScrollProgressProps) {
  const position = align === "right" ? "right-0 w-auto px-margin" : "left-0 w-1/2 px-6";
  return (
    <div className={`fixed bottom-0 hidden pb-6 text-right desktop:block ${position}`}>
      <p ref={progressRef as RefObject<HTMLParagraphElement | null>} className="text-h1 text-primary tabular-nums">0</p>

      {/* Next project hint */}
      {nextProjectSlug && (
        <div ref={nextTextWrapperRef} className="invisible relative mt-2">
          <p className="text-body uppercase text-primary/20">
            Scroll down to see next project
          </p>
          <div
            ref={nextTextRef}
            className="absolute -inset-x-6 inset-y-0 bg-pistachio"
            style={{ clipPath: "inset(0 100% 0 0)" }}
          >
            <p className="px-6 text-body font-medium uppercase text-primary text-right">
              Scroll down to see next project
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
