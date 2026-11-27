"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { splitLead } from "@/lib/aboutLead";
import { EASE_OUT_CSS } from "@/lib/motion";
import { PANEL_H, panelSize } from "@/components/layout/bar/panelSize";
import type { BarData } from "@/sanity/lib/bar";
import {
  Column,
  Narrow,
  Now,
  Rail,
  type AboutCopy,
  type Size,
  type VariantProps,
} from "./variants";
import "../home-layouts/proto-picker.css";

interface Variant {
  name: string;
  Component: (props: VariantProps) => React.ReactNode;
  /** Laptop panel width when open, if not the live 64rem. */
  width?: string;
}

const VARIANTS: Variant[] = [
  { name: "Now", Component: Now },
  { name: "Rail", Component: Rail },
  { name: "Column", Component: Column },
  { name: "Narrow", Component: Narrow, width: "min(40rem, calc(100vw - 48px))" },
];

/** Intro rewrites to try in place of the bio's first sentence (I cycles them). */
const INTROS: (string | null)[] = [
  null, // the live sentence from Sanity
  "I'm Ali, a frontend developer in Stockholm building ecommerce for brands, where design meets development.",
  "I'm Ali, a frontend developer in Stockholm. I design and build ecommerce that starts from the brand.",
  "I'm Ali, a frontend developer in Stockholm building brand-first ecommerce, from design to code.",
];

/** Type sizes (T cycles them): today's, a heading-size intro, a bigger one. */
const SIZES: Size[] = ["live", "l", "xl"];
const SIZE_NAME: Record<Size, string> = { live: "Type live", l: "Type L", xl: "Type XL" };

/** The live capsule's open widths (Header.tsx). */
const LAPTOP_OPEN = "min(64rem, calc(100vw - 48px))";
const PHONE_OPEN = "calc(100vw - 2 * var(--grid-margin))";

function plain(block: { children?: unknown }): string {
  const children = (block.children ?? []) as { text?: string }[];
  return children
    .map((c) => c.text ?? "")
    .join("")
    .trim();
}

/**
 * About panel layouts, behind Emil Kowalski's prototype picker. The page
 * stands in for the site's capsule (hidden here) with a copy of it held
 * open on About, at the live window's size, so each layout is judged in
 * the box it would ship in. About toggles it shut and open again.
 */
export default function AboutLab({ bar, initial }: { bar: BarData; initial: number }) {
  const about = bar.about!;
  const [intro, setIntro] = useState(0);
  const [size, setSize] = useState<Size>("l");
  const nextSize = useCallback(
    () => setSize((z) => SIZES[(SIZES.indexOf(z) + 1) % SIZES.length]),
    [],
  );
  const nextIntro = useCallback(() => setIntro((i) => (i + 1) % INTROS.length), []);
  const copy = useMemo<AboutCopy>(() => {
    const { lead, body } = splitLead(about.bio);
    return {
      lead: INTROS[intro] ?? lead ?? "",
      paras: body.map(plain).filter(Boolean),
      about,
    };
  }, [about, intro]);

  const [current, setCurrent] = useState(() =>
    initial >= 1 && initial <= VARIANTS.length ? initial - 1 : 0,
  );
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState(true);
  if (open && !shown) setShown(true);

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(history.state, "", url);
  }, []);

  // Replay: shut the capsule, then open it again on the same layout.
  const replay = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => setOpen(true), 420);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") select((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") replay();
      else if (e.key === "i" || e.key === "I") nextIntro();
      else if (e.key === "t" || e.key === "T") nextSize();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select, replay, nextIntro, nextSize]);

  const { Component } = VARIANTS[current];
  const laptopOpen = VARIANTS[current].width ?? LAPTOP_OPEN;

  return (
    <>
      {/* The site's own capsule steps aside for the copy below. */}
      <style>{"[data-site-bar]{display:none!important}"}</style>
      <main className="min-h-dvh px-margin pt-32">
        <p className="max-w-[48rem] text-h3 text-secondary">
          The About panel, held open at its live size. Flip layouts with the picker, 1 to 4 or the
          arrow keys; T changes the type size, I the intro, R closes and reopens it.
        </p>
      </main>
      <header
        className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+12px)] z-50 flex w-[var(--bar-w-m)] -translate-x-1/2 flex-col overflow-hidden text-sub shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_1px_2px_rgb(0_0_0/0.06),0_10px_24px_-6px_rgb(0_0_0/0.14),0_28px_56px_-12px_rgb(0_0_0/0.16)] motion-safe:transition-[width,border-radius] desktop:top-[calc(env(safe-area-inset-top)+16px)] desktop:w-[var(--bar-w)] desktop:text-body"
        style={
          {
            "--bar-w": open ? laptopOpen : "16rem",
            "--bar-w-m": open ? PHONE_OPEN : "16rem",
            "--panel-max": "calc(100dvh - 96px)",
            borderRadius: open ? "var(--bar-r-open)" : "var(--bar-r)",
            ...panelSize(bar),
            transitionDuration: "320ms",
            transitionTimingFunction: EASE_OUT_CSS,
          } as CSSProperties
        }
      >
        <span
          aria-hidden
          className="frost-strong pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-bg/90 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <nav
          aria-label="Site"
          className="mx-auto grid h-11 w-full max-w-[16rem] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-5 px-[18px] text-[14px] leading-5"
        >
          <span className={`justify-self-start ${open ? "text-secondary" : "text-primary"}`}>
            Work
          </span>
          <span className={open ? "text-secondary" : "text-primary"}>Ali Reza</span>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="lab-about-panel"
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 items-center justify-self-end text-primary"
          >
            About
          </button>
        </nav>
        <div
          className="grid motion-safe:transition-[grid-template-rows]"
          style={{
            gridTemplateRows: open ? "1fr" : "0fr",
            transitionDuration: "320ms",
            transitionTimingFunction: EASE_OUT_CSS,
          }}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && !open) setShown(false);
          }}
        >
          <div className="min-h-0 overflow-hidden">
            {shown && (
              <div
                id="lab-about-panel"
                role="dialog"
                aria-label="About"
                className="relative left-1/2 w-[var(--panel-w-m)] -translate-x-1/2 pt-4 desktop:w-[var(--panel-w)] desktop:pt-6"
                style={
                  {
                    "--panel-w": laptopOpen,
                    "--panel-w-m": PHONE_OPEN,
                    opacity: open ? 1 : 0,
                    transition: `opacity ${open ? 200 : 120}ms ${EASE_OUT_CSS}`,
                  } as CSSProperties
                }
              >
                <div data-lenis-prevent className={`${PANEL_H} overflow-y-auto overscroll-contain`}>
                  <Component key={current} copy={copy} size={size} />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[49] transition-colors duration-200 ${open ? "bg-black/10" : "pointer-events-none bg-transparent"}`}
      />
      <Picker
        current={current}
        onSelect={select}
        onReplay={replay}
        intro={intro}
        onIntro={nextIntro}
        size={size}
        onSize={nextSize}
      />
    </>
  );
}

/** The picker, verbatim from Emil Kowalski's prototype skill (PICKER.md). */
function Picker({
  current,
  onSelect,
  onReplay,
  intro,
  onIntro,
  size,
  onSize,
}: {
  current: number;
  onSelect: (i: number) => void;
  onReplay: () => void;
  intro: number;
  onIntro: () => void;
  size: Size;
  onSize: () => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const move = () => {
      const el = itemsRef.current[current];
      const hl = highlightRef.current;
      if (!el || !hl) return;
      hl.style.width = `${el.offsetWidth}px`;
      hl.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [current]);

  useEffect(() => {
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
            itemsRef.current[i] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={i === current ? "" : undefined}
          aria-current={i === current ? "true" : undefined}
          onClick={() => onSelect(i)}
        >
          {v.name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden="true" />
      {/* The type switch (T): today's sizes, or a heading-size intro over smaller paragraphs. */}
      <button
        type="button"
        className="proto-picker-item"
        aria-label="Type size (T)"
        onClick={onSize}
      >
        {SIZE_NAME[size]}
      </button>
      {/* The intro switch (I): the live sentence or a rewrite. */}
      <button
        type="button"
        className="proto-picker-item"
        aria-label="Intro: live or a rewrite (I)"
        onClick={onIntro}
      >
        {intro === 0 ? "Intro live" : `Intro ${String.fromCharCode(64 + intro)}`}
      </button>
      <span className="proto-picker-divider" aria-hidden="true" />
      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        aria-label="Replay animation (R)"
        onClick={onReplay}
      >
        ↻
      </button>
    </nav>
  );
}
