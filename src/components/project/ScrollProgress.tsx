import type { RefObject } from "react";

interface ScrollProgressProps {
  progressRef: RefObject<HTMLElement | null>;
  nextProjectSlug: string | undefined;
  nextTextWrapperRef: RefObject<HTMLDivElement | null>;
  nextTextRef: RefObject<HTMLDivElement | null>;
  prevProjectSlug: string | undefined;
  prevTextWrapperRef: RefObject<HTMLDivElement | null>;
  prevTextRef: RefObject<HTMLDivElement | null>;
}

export default function ScrollProgress({
  progressRef,
  nextProjectSlug,
  nextTextWrapperRef,
  nextTextRef,
  prevProjectSlug,
  prevTextWrapperRef,
  prevTextRef,
}: ScrollProgressProps) {
  return (
    <div className="fixed bottom-0 left-0 hidden w-1/2 px-6 pb-6 text-right desktop:block">
      {/* Prev project hint — top-anchored */}
      {prevProjectSlug && (
        <div ref={prevTextWrapperRef} className="relative mb-2" style={{ visibility: "hidden", opacity: 0 }}>
          <p className="text-body uppercase text-primary/20">
            Scroll up to see previous project
          </p>
          <div
            ref={prevTextRef}
            className="absolute -inset-x-6 inset-y-0 bg-pistachio"
            style={{ clipPath: "inset(0 100% 0 0)" }}
          >
            <p className="px-6 text-body font-medium uppercase text-primary text-right">
              Scroll up to see previous project
            </p>
          </div>
        </div>
      )}

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
