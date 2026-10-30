"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Scroll indicator, desktop only. Three candidates live side by side while
 * Ali picks one on localhost: switch with the keys C, D and E, or load a page
 * with ?indicator=c|d|e. The choice sticks per browser (localStorage).
 *
 * c: one line from margin to margin at the foot of the page, filled to the
 *    progress, the number at its end and "Next, <title>" at its start.
 * d: a pistachio bar along the whole bottom edge, filled to the progress,
 *    the hint riding on the fill's end, the number above it.
 * e: a vertical rail on the right margin, filled from the top, the number
 *    at its foot and "Next, <title>" above the number.
 *
 * The number and the fill are driven by useGalleryScroll (textContent and the
 * --p custom property), the hint wrapper toggles at 90% and the pistachio
 * wipe follows the pull at the bottom edge, as before.
 */
export type IndicatorVariant = "c" | "d" | "e";

const STORAGE_KEY = "scroll-indicator";
const VARIANTS: IndicatorVariant[] = ["c", "d", "e"];

function isVariant(value: string | null): value is IndicatorVariant {
  return value !== null && (VARIANTS as string[]).includes(value);
}

export function useIndicatorVariant(): IndicatorVariant {
  const [variant, setVariant] = useState<IndicatorVariant>("c");

  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("indicator");
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const next = isVariant(fromUrl) ? fromUrl : isVariant(stored) ? stored : null;
      if (next) {
        setVariant(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      /* private mode: keep the default */
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = e.key.toLowerCase();
      if (!isVariant(key)) return;
      setVariant(key);
      try {
        window.localStorage.setItem(STORAGE_KEY, key);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return variant;
}

interface ScrollProgressProps {
  progressRef: RefObject<HTMLElement | null>;
  /** Receives --p (0..1) from the scroll hook; the fill reads it. */
  progressFillRef: RefObject<HTMLElement | null>;
  nextProjectSlug: string | undefined;
  nextProjectTitle?: string | null;
  nextTextWrapperRef: RefObject<HTMLDivElement | null>;
  nextTextRef: RefObject<HTMLDivElement | null>;
  variant?: IndicatorVariant;
}

const WIPE_START = { clipPath: "inset(0 100% 0 0)" } as const;

export default function ScrollProgress({
  progressRef,
  progressFillRef,
  nextProjectSlug,
  nextProjectTitle,
  nextTextWrapperRef,
  nextTextRef,
  variant = "c",
}: ScrollProgressProps) {
  const numberRef = progressRef as RefObject<HTMLParagraphElement | null>;
  const fillRef = progressFillRef as RefObject<HTMLDivElement | null>;
  const nextLabel = `Next, ${nextProjectTitle ?? "project"}`;

  if (variant === "d") {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 hidden desktop:block">
        <p
          ref={numberRef}
          className="absolute right-[var(--grid-margin)] bottom-10 text-h1 text-primary tabular-nums"
        >
          0
        </p>
        <div className="relative h-8">
          <div
            ref={fillRef}
            className="absolute inset-y-0 left-0 bg-pistachio"
            style={{ width: "calc(var(--p, 0) * 100%)" }}
          >
            {nextProjectSlug && (
              <div
                ref={nextTextWrapperRef}
                className="invisible absolute top-1 right-[var(--grid-margin)] whitespace-nowrap"
              >
                <p className="text-body font-medium uppercase text-primary">Scroll down to see next project</p>
                <div ref={nextTextRef} className="absolute -inset-x-2 inset-y-0 bg-primary" style={WIPE_START}>
                  <p className="px-2 text-body font-medium uppercase text-bg">Scroll down to see next project</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "e") {
    return (
      <div className="pointer-events-none fixed inset-y-0 right-0 z-10 hidden desktop:block">
        <div className="absolute top-16 right-[var(--grid-margin)] bottom-24 w-[2px] bg-tertiary">
          <div
            ref={fillRef}
            className="absolute inset-x-0 top-0 bg-primary"
            style={{ height: "calc(var(--p, 0) * 100%)" }}
          />
        </div>
        <div className="absolute right-[var(--grid-margin)] bottom-6 text-right">
          {nextProjectSlug && (
            <div ref={nextTextWrapperRef} className="invisible relative mb-1 whitespace-nowrap">
              <p className="text-body text-primary">{nextLabel}</p>
              <div ref={nextTextRef} className="absolute -inset-x-2 inset-y-0 bg-pistachio" style={WIPE_START}>
                <p className="px-2 text-body font-medium text-primary">{nextLabel}</p>
              </div>
            </div>
          )}
          <p ref={numberRef} className="text-h1 text-primary tabular-nums">
            0
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 hidden px-margin pb-6 desktop:block">
      <div className="flex items-end justify-between pb-2">
        {nextProjectSlug ? (
          <div ref={nextTextWrapperRef} className="invisible relative whitespace-nowrap">
            <p className="text-body text-primary">{nextLabel}</p>
            <div ref={nextTextRef} className="absolute -inset-x-2 inset-y-0 bg-pistachio" style={WIPE_START}>
              <p className="px-2 text-body font-medium text-primary">{nextLabel}</p>
            </div>
          </div>
        ) : (
          <span />
        )}
        <p ref={numberRef} className="text-h1 text-primary tabular-nums">
          0
        </p>
      </div>
      <div className="h-[2px] bg-tertiary">
        <div ref={fillRef} className="h-full bg-primary" style={{ width: "calc(var(--p, 0) * 100%)" }} />
      </div>
    </div>
  );
}
