"use client";

import { useRef } from "react";
import { useTitleAnimation, useBodyAnimation } from "@/hooks/useTextAnimation";

export default function Error({ reset }: { reset: () => void }) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useTitleAnimation(titleRef, scopeRef);
  useBodyAnimation(bodyRef, scopeRef, { delay: 0.3 });

  return (
    <div ref={scopeRef} className="flex min-h-screen flex-col items-center justify-center px-4 desktop:px-6">
      <h1 ref={titleRef} className="text-primary">Error</h1>
      <p ref={bodyRef} className="mt-4 text-body text-secondary">Something went wrong.</p>
      <button
        onClick={() => reset()}
        aria-label="Try again"
        className="mt-8 text-sub text-primary uppercase"
      >
        Try again
      </button>
    </div>
  );
}
