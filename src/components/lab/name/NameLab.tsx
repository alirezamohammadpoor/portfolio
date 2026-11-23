"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import gsap from "gsap";
import InlineClip from "@/components/project/InlineClip";
import { dur, ease } from "@/lib/motion";
import { ENGLISH_NAME, PERSIAN_NAME } from "@/lib/name";

const LATIN_FIRST = "Ali Reza";
const PERSIAN_FIRST = "علیرضا";

/**
 * One name mark per variant. Sizes are in em, so the same mark set at
 * display size in the intro shrinks exactly onto the bar's 14px slot.
 */
interface Variant {
  name: string;
  /** Capsule width at rest, laptop and phone. 16rem is the live bar. */
  width: string;
  widthPhone: string;
  mark: ReactNode;
}

const persian = (text: string, className = "") => (
  <span className={`parastoo-font ${className}`} dir="rtl" lang="fa">
    {text}
  </span>
);

const VARIANTS: Variant[] = [
  {
    // Today's mark without the scramble: Persian at rest and on hover.
    name: "Persian",
    width: "16rem",
    widthPhone: "16rem",
    mark: persian(PERSIAN_NAME),
  },
  {
    // Latin only, the first name: as quiet as Work and About.
    name: "Latin",
    width: "16rem",
    widthPhone: "16rem",
    mark: <span>{LATIN_FIRST}</span>,
  },
  {
    // Latin only, the whole name: the capsule grows to hold it.
    name: "Full",
    width: "20rem",
    widthPhone: "20rem",
    mark: <span>{ENGLISH_NAME}</span>,
  },
  {
    // Both scripts, still: the Latin leads, the Persian follows in grey.
    name: "Pair",
    width: "17.5rem",
    widthPhone: "17.5rem",
    mark: (
      <span className="inline-flex items-baseline gap-[0.4em]">
        <span>{LATIN_FIRST}</span>
        {persian(PERSIAN_FIRST, "text-secondary")}
      </span>
    ),
  },
  {
    // Latin at rest; a hover rolls the Persian up in its place. Touch
    // never sees it.
    name: "Reveal",
    width: "16rem",
    widthPhone: "16rem",
    mark: (
      <span className="name-reveal relative -my-[0.25em] inline-grid overflow-hidden py-[0.25em]">
        <span className="name-reveal-a col-start-1 row-start-1 justify-self-center">
          {LATIN_FIRST}
        </span>
        <span
          aria-hidden="true"
          className="name-reveal-b col-start-1 row-start-1 justify-self-center"
        >
          {persian(PERSIAN_FIRST)}
        </span>
      </span>
    ),
  },
];

const ITEM =
  "name-lab-fade relative flex h-11 items-center rounded-full transition-[color,scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] select-none touch-manipulation before:absolute before:-inset-x-2 before:-inset-y-1 before:content-['']";

/** Lab-only styles: hide the site bar, the Reveal roll, the picker chrome. */
const STYLES = `
html:has(#name-lab) header:not([data-name-lab]) { display: none !important; }

.name-reveal > span {
  transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1), opacity 240ms cubic-bezier(0.23, 1, 0.32, 1);
}
.name-reveal-b { transform: translateY(100%); opacity: 0; }
@media (hover: hover) and (pointer: fine) {
  .name-link:hover .name-reveal-a { transform: translateY(-100%); opacity: 0; }
  .name-link:hover .name-reveal-b { transform: none; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .name-reveal > span { transition: opacity 160ms ease-out; transform: none !important; }
}

/* Picker: Emil Kowalski's /prototype spec, verbatim. */
.proto-picker {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.82);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 8px 24px rgba(0, 0, 0, 0.24),
    0 2px 6px rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  user-select: none;
  -webkit-user-select: none;
}
.proto-picker-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}
.proto-picker[data-ready] .proto-picker-highlight {
  transition:
    transform 250ms cubic-bezier(0.23, 1, 0.32, 1),
    width 250ms cubic-bezier(0.23, 1, 0.32, 1);
}
@media (prefers-reduced-motion: reduce) {
  .proto-picker[data-ready] .proto-picker-highlight { transition: none; }
}
.proto-picker-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font: inherit;
  cursor: pointer;
  transition:
    color 150ms ease-out,
    transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}
@media (hover: hover) and (pointer: fine) {
  .proto-picker-item:hover { color: rgba(255, 255, 255, 0.85); }
}
.proto-picker-item:active { transform: scale(0.97); }
.proto-picker-item:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.4);
  outline-offset: 2px;
}
.proto-picker-item[data-active] { color: #fff; }
.proto-picker-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.12);
}
.proto-picker-replay { padding: 0 10px; font-size: 14px; }
`;

function Picker({
  current,
  onPick,
  onReplay,
}: {
  current: number;
  onPick: (i: number) => void;
  onReplay: () => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = useCallback(() => {
    const el = itemRefs.current[current];
    const hl = highlightRef.current;
    if (!el || !hl) return;
    hl.style.width = `${el.offsetWidth}px`;
    hl.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  useLayoutEffect(move, [move]);
  useEffect(() => {
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [move]);
  useEffect(() => {
    // The slide only after first paint, so load doesn't animate.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => navRef.current?.setAttribute("data-ready", "")),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav ref={navRef} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {VARIANTS.map((v, i) => (
        <button
          key={v.name}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={i === current ? "" : undefined}
          aria-current={i === current ? "true" : undefined}
          onClick={() => onPick(i)}
        >
          {v.name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden="true" />
      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        aria-label="Replay intro (R)"
        onClick={onReplay}
      >
        ↻
      </button>
    </nav>
  );
}

/**
 * The capsule bar as it is live (Header.tsx), with the variant's mark in the
 * name slot. Work and About are inert here.
 */
function Bar({
  variant,
  slotRef,
}: {
  variant: Variant;
  slotRef: RefObject<HTMLSpanElement | null>;
}) {
  return (
    <header
      data-name-lab
      className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+12px)] z-[70] isolate w-[var(--bar-w-m)] -translate-x-1/2 text-sub desktop:top-[calc(env(safe-area-inset-top)+16px)] desktop:w-[var(--bar-w)] desktop:text-body"
      style={
        {
          "--bar-w": variant.width,
          "--bar-w-m": variant.widthPhone,
          borderRadius: "var(--bar-r)",
        } as CSSProperties
      }
    >
      <span
        aria-hidden
        className="name-lab-fade frost-strong shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_1px_2px_rgb(0_0_0/0.06),0_10px_24px_-6px_rgb(0_0_0/0.14),0_28px_56px_-12px_rgb(0_0_0/0.16)] pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
      />
      <nav
        aria-label="Site"
        className="grid h-11 w-full grid-cols-[1fr_auto_1fr] items-center gap-x-5 px-[18px] text-[14px] leading-5"
      >
        <button type="button" className={`${ITEM} justify-self-start text-primary`}>
          Work
        </button>
        <Link
          href="/"
          className="name-link relative flex h-11 items-center whitespace-nowrap text-[14px] text-primary"
          aria-label={ENGLISH_NAME}
        >
          <span ref={slotRef} className="inline-block leading-none whitespace-nowrap">
            {variant.mark}
          </span>
        </Link>
        <button type="button" className={`${ITEM} justify-self-end text-primary`}>
          About
        </button>
      </nav>
    </header>
  );
}

export default function NameLab({ clip, initial }: { clip: string; initial: number }) {
  const [current, setCurrent] = useState(initial);
  // The intro plays on load and on R; flipping variants shows the settled
  // bar straight away, so the marks can be compared quickly.
  const [intro, setIntro] = useState(1);
  const slotRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLSpanElement>(null);
  const variant = VARIANTS[current];

  const pick = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(null, "", url);
  }, []);
  const replay = useCallback(() => setIntro((n) => n + 1), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) pick(n - 1);
      else if (e.key === "ArrowRight") pick((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") pick((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") replay();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, pick, replay]);

  // The intro, simplified to compare marks: the name enters at display size
  // in the middle of an empty page, holds, then moves onto the bar slot in
  // one FLIP (the live curve and duration); the bar and page arrive as it
  // lands. Every variant enters the same way, so only the mark differs. The
  // live Persian brush writing would replace the entrance for Persian marks.
  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const overlay = overlayRef.current;
    const display = displayRef.current;
    const slot = slotRef.current;
    if (!overlay || !display || !slot) return;
    const ctx = gsap.context(() => {
      const fades = document.querySelectorAll(".name-lab-fade");
      gsap.set(overlay, { autoAlpha: 1 });
      gsap.set(display, { autoAlpha: 1, x: 0, y: 0, scale: 1 });
      gsap.set(slot, { visibility: "hidden" });
      gsap.set(fades, { opacity: 0 });
      const tl = gsap.timeline();
      tl.fromTo(
        display,
        { opacity: 0, y: 12, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: dur.text,
          ease: ease.out,
          clearProps: "filter",
        },
      );
      tl.to(display, {
        x: () => slot.getBoundingClientRect().left - display.getBoundingClientRect().left,
        y: () => slot.getBoundingClientRect().top - display.getBoundingClientRect().top,
        scale: () => slot.getBoundingClientRect().width / display.getBoundingClientRect().width,
        transformOrigin: "0 0",
        duration: dur.page,
        ease: ease.inOut,
        delay: 0.5,
      });
      tl.set(slot, { visibility: "visible" });
      tl.set(display, { autoAlpha: 0 });
      tl.to(overlay, { autoAlpha: 0, duration: dur.ui, ease: ease.out });
      tl.to(fades, { opacity: 1, duration: dur.ui, ease: ease.out }, "<");
    });
    return () => {
      ctx.revert();
      gsap.set(overlay, { autoAlpha: 0 });
      gsap.set(slot, { visibility: "visible" });
    };
  }, [intro]);

  return (
    <div id="name-lab" className="px-margin pt-[60px] pb-32 desktop:pt-[110px]">
      <style>{STYLES}</style>
      <Bar variant={variant} slotRef={slotRef} />

      <div className="mx-auto aspect-[16/10] w-full max-w-[64rem] overflow-hidden bg-bg">
        <InlineClip src={clip} label="Stronger landing" className="h-full w-full object-cover" />
      </div>

      <div
        ref={overlayRef}
        className="invisible fixed inset-0 z-[60] flex items-center justify-center bg-bg px-4 opacity-0"
        aria-hidden="true"
      >
        <span
          ref={displayRef}
          className="inline-block leading-none whitespace-nowrap text-primary will-change-transform"
          style={{ fontSize: "clamp(1.5rem, 7.5vw, var(--text-display))" }}
        >
          {variant.mark}
        </span>
      </div>

      <Picker current={current} onPick={pick} onReplay={replay} />
    </div>
  );
}
