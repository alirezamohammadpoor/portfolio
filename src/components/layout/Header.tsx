"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { Link } from "@/lib/viewTransitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { getIntroState, useIntroState } from "@/lib/intro";
import { ENGLISH_NAME, PERSIAN_CHARS, PERSIAN_NAME } from "@/lib/name";
import HomeIntro from "./HomeIntro";
import { useModalFocus } from "@/hooks/useModalFocus";
import { EASE_OUT_CSS } from "@/lib/motion";
import type { BarData } from "@/sanity/lib/bar";
import WorkPanel from "./bar/WorkPanel";
import AboutBody from "./bar/AboutBody";

const SCRAMBLE_DURATION = 0.4;
const PERSIAN_CLASS = "parastoo-font intro-name intro-name-slot";
const ENGLISH_CLASS = "intro-name intro-name-slot";

type Panel = "work" | "about";

/** Laptop widths: compact at rest, as wide as the open panel needs. */
const WIDTH: Record<Panel | "none", string> = {
  none: "26rem",
  work: "min(64rem, calc(100vw - 48px))",
  about: "36rem",
};

const ITEM =
  "intro-nav relative flex h-10 items-center rounded-full transition-[color,scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] select-none touch-manipulation before:absolute before:-inset-x-2 before:-inset-y-1 before:content-['']";

/**
 * The site bar (Capsule, picked 11-16 from /lab/bar): one centred frost
 * capsule reading Work · name · About, spanning the margins on a phone and
 * compact on a laptop. Work and About open inside the capsule, under its
 * row, as tall as what they hold, and the capsule widens to them on a
 * laptop. The name is the way home and the home intro's landing slot.
 */
export default function Header({ bar }: { bar: BarData }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const introState = useIntroState();
  const lenis = useLenis();
  // A panel belongs to the page it was opened on: a link taken from inside
  // it (a project, a post, the name) lands with it closed.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<{ panel: Panel; path: string } | null>(null);
  const open: Panel | null = openOn && openOn.path === pathname ? openOn.panel : null;
  // Mounted through the close, so the panel can fold away.
  const [shown, setShown] = useState<Panel | null>(open);
  if (open !== null && shown !== open) setShown(open);
  const close = useCallback(() => setOpenOn(null), []);
  const toggle = (panel: Panel) => setOpenOn((o) => (o && o.path === pathname && o.panel === panel ? null : { panel, path: pathname }));
  const showing = open ?? shown;

  useModalFocus(open !== null, rootRef, scrollRef, close);

  // Unmount after the fold even when its transitionend never comes (a
  // route change during a view transition, reduced motion).
  useEffect(() => {
    if (open !== null || shown === null) return;
    const t = setTimeout(() => setShown(null), 400);
    return () => clearTimeout(t);
  }, [open, shown]);

  // The page holds still under an open panel.
  useEffect(() => {
    if (open === null) return;
    lenis?.stop();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
      lenis?.start();
    };
  }, [open, lenis]);

  // The name stays Persian; a hover on a real pointer scrambles it to English
  // and back on leave (feedback on the link, nothing on touch). Attached
  // once: the handlers read the intro state when they run.
  useGSAP(
    () => {
      const link = linkRef.current;
      const span = nameRef.current;
      if (!link || !span) return;
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      let tween: gsap.core.Tween | null = null;

      function toEnglish() {
        if (!span || getIntroState() !== "done") return;
        tween?.kill();
        span.className = ENGLISH_CLASS;
        tween = gsap.to(span, {
          duration: SCRAMBLE_DURATION,
          scrambleText: {
            text: ENGLISH_NAME,
            chars: "upperAndLowerCase",
            speed: 1,
            rightToLeft: true,
            tweenLength: false,
          },
          onComplete: () => {
            span.textContent = ENGLISH_NAME;
            span.removeAttribute("dir");
            span.removeAttribute("lang");
          },
        });
      }

      function toPersian() {
        if (!span || getIntroState() !== "done") return;
        tween?.kill();
        span.setAttribute("dir", "rtl");
        span.setAttribute("lang", "fa");
        tween = gsap.to(span, {
          duration: SCRAMBLE_DURATION,
          scrambleText: {
            text: PERSIAN_NAME,
            chars: PERSIAN_CHARS,
            speed: 1,
            tweenLength: false,
            newClass: "parastoo-font",
          },
          onComplete: () => {
            span.textContent = PERSIAN_NAME;
            span.className = PERSIAN_CLASS;
          },
        });
      }

      link.addEventListener("mouseenter", toEnglish);
      link.addEventListener("mouseleave", toPersian);
      return () => {
        link.removeEventListener("mouseenter", toEnglish);
        link.removeEventListener("mouseleave", toPersian);
        tween?.kill();
        span.textContent = PERSIAN_NAME;
        span.className = PERSIAN_CLASS;
        span.setAttribute("dir", "rtl");
        span.setAttribute("lang", "fa");
      };
    },
    { scope: linkRef },
  );

  const tone = (me: Panel) => (open === null || open === me ? "text-primary" : "text-secondary");

  return (
    <>
      <div ref={rootRef}>
        <header
          className="fixed inset-x-[var(--grid-margin)] top-[calc(env(safe-area-inset-top)+12px)] z-50 flex flex-col overflow-hidden rounded-[20px] text-body shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.06)] motion-safe:transition-[width] desktop:top-[calc(env(safe-area-inset-top)+16px)] desktop:right-auto desktop:left-1/2 desktop:w-[var(--bar-w)] desktop:-translate-x-1/2"
          style={
            {
              "--bar-w": WIDTH[open ?? "none"],
              // An open panel may use the screen down to 12px above its
              // bottom edge: the bar row and the gaps come off it.
              "--panel-max": "calc(100dvh - 88px)",
              transitionDuration: "320ms",
              transitionTimingFunction: EASE_OUT_CSS,
            } as CSSProperties
          }
        >
          {/* The frost is its own layer so it arrives with the nav after the
              home intro, and the open panel shares it (never two blurs). */}
          <span
            aria-hidden
            className="intro-nav frost-strong pointer-events-none absolute inset-0 -z-10 rounded-[20px]"
          />
          <nav aria-label="Site" className="mx-auto grid h-10 w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-7 px-5 desktop:max-w-[26rem]">
            <button type="button" onClick={() => toggle("work")} aria-expanded={open === "work"} aria-controls="bar-panel" className={`${ITEM} justify-self-start ${tone("work")}`}>
              Work
            </button>
            <Link
              ref={linkRef}
              href="/"
              onClick={close}
              className={`relative flex h-10 items-center whitespace-nowrap text-[15px] ${open ? "text-secondary" : "text-primary"}`}
              aria-label={ENGLISH_NAME}
            >
              <span ref={nameRef} className={PERSIAN_CLASS} dir="rtl" lang="fa">
                {PERSIAN_NAME}
              </span>
            </Link>
            {/* /about stays a real page for a new tab or a shared link. */}
            <a
              href="/about"
              aria-expanded={open === "about"}
              aria-controls="bar-panel"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                toggle("about");
              }}
              className={`${ITEM} justify-self-end ${tone("about")}`}
            >
              About
            </a>
          </nav>

          {/* The panel opens inside the capsule, under its row, as tall as
              what it holds. */}
          <div
            className="grid motion-safe:transition-[grid-template-rows]"
            style={{ gridTemplateRows: open ? "1fr" : "0fr", transitionDuration: "320ms", transitionTimingFunction: EASE_OUT_CSS }}
            onTransitionEnd={(e) => {
              if (e.target === e.currentTarget && !open) setShown(null);
            }}
          >
            <div className="min-h-0 overflow-hidden">
              {showing && (
                <div
                  key={showing}
                  id="bar-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label={showing === "work" ? "Work" : "About"}
                  className="bar-panel-in pt-4 desktop:pt-6"
                  style={{ opacity: open ? 1 : 0, transition: `opacity ${open ? 200 : 100}ms ${EASE_OUT_CSS}` }}
                >
                  {showing === "work" ? (
                    <WorkPanel bar={bar} scrollRef={scrollRef} />
                  ) : bar.about ? (
                    <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className="max-h-[var(--panel-max)] overflow-y-auto overscroll-contain outline-none">
                      <AboutBody about={bar.about} />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </header>
        {/* A light scrim keeps the page from competing with the open capsule. */}
        <div
          aria-hidden
          onClick={close}
          className={`fixed inset-0 z-[49] bg-black/10 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
      </div>
      {introState !== "done" && <HomeIntro targetRef={nameRef} />}
    </>
  );
}
