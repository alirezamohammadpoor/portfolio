import type { RefObject } from "react";

interface ScrollProgressProps {
  progress: number;
  nextProjectSlug: string | undefined;
  nextTextWrapperRef: RefObject<HTMLDivElement | null>;
  nextTextRef: RefObject<HTMLParagraphElement | null>;
}

export default function ScrollProgress({
  progress,
  nextProjectSlug,
  nextTextWrapperRef,
  nextTextRef,
}: ScrollProgressProps) {
  return (
    <div className="fixed bottom-0 left-0 hidden w-1/2 px-6 pb-6 desktop:block">
      <p className="text-h1 text-secondary tabular-nums">{progress}</p>
      {nextProjectSlug && (
        <div ref={nextTextWrapperRef} className="invisible relative mt-2">
          <p className="text-body font-bold uppercase text-secondary/30">
            Scroll to see next project
          </p>
          <p
            ref={nextTextRef}
            className="absolute inset-0 text-body font-bold uppercase text-pistachio"
            style={{ clipPath: "inset(0 100% 0 0)" }}
          >
            Scroll to see next project
          </p>
        </div>
      )}
    </div>
  );
}
