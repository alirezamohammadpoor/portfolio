import type { RefObject } from "react";

interface ScrollProgressProps {
  progress: number;
  nextProjectSlug: string | undefined;
  nextTextWrapperRef: RefObject<HTMLDivElement | null>;
  nextTextRef: RefObject<HTMLDivElement | null>;
}

export default function ScrollProgress({
  progress,
  nextProjectSlug,
  nextTextWrapperRef,
  nextTextRef,
}: ScrollProgressProps) {
  return (
    <div className="fixed bottom-0 left-0 hidden w-1/2 px-6 pb-6 text-right desktop:block">
      <p className="text-h1 text-primary tabular-nums">{progress}</p>
      {nextProjectSlug && (
        <div ref={nextTextWrapperRef} className="invisible relative mt-2">
          <p className="text-body uppercase text-primary/20">
            Scroll to see next project
          </p>
          <div
            ref={nextTextRef}
            className="absolute -inset-x-6 inset-y-0 bg-pistachio"
            style={{ clipPath: "inset(0 100% 0 0)" }}
          >
            <p className="px-6 text-body font-medium uppercase text-primary text-right">
              Scroll to see next project
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
