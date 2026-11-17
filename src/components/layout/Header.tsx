"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import WorkPanel, { PANEL_H, panelSize } from "./bar/WorkPanel";
import AboutBody from "./bar/AboutBody";
import { useBarState, type WorkOpen } from "@/lib/barProject";
import { usePageTransition } from "@/context/TransitionContext";

const SCRAMBLE_DURATION = 0.4;
const PERSIAN_CLASS = "parastoo-font intro-name intro-name-slot";
const ENGLISH_CLASS = "intro-name intro-name-slot";

type Panel = "work" | "about";
type Shown = Panel | "details";

/** Laptop widths: compact at rest, as wide as the open panel needs. */
const WIDTH: Record<Shown | "none", string> = {
  none: "30rem",
  work: "min(64rem, calc(100vw - 48px))",
  about: "min(64rem, calc(100vw - 48px))",
  details: "40rem",
};

/** Phone width open: the grid margins. */
const PHONE_OPEN = "calc(100vw - 2 * var(--grid-margin))";

const ITEM =
  "intro-nav relative flex h-11 items-center desktop:h-14 rounded-full transition-[color,scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] select-none touch-manipulation before:absolute before:-inset-x-2 before:-inset-y-1 before:content-['']";

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
  const userOpen: Panel | null = openOn && openOn.path === pathname ? openOn.panel : null;
  // A project page can dock its title in the capsule's second row
  // (/lab/project); "docked" and "title" open the details inside the
  // capsule too, "overlay" keeps the stage's own frost overlay.
  const { chrome, project: barProject, workOpen } = useBarState();
  // A project opened from Work flies its preview into card 1 (Fade, Ali 11-17);
  // `flight` is what the capsule does meanwhile, until the page is up.
  const router = useRouter();
  const { startTransition, isTransitioning, pageRevealed, id: transitionId } = usePageTransition();
  const [started, setStarted] = useState<{ mode: NonNullable<WorkOpen>; id: number } | null>(null);
  // Over once the page is up (or the transition gave up); a later morph
  // from elsewhere has another id.
  const flight = started && started.id === transitionId && isTransitioning && !pageRevealed ? { ...started, leaving: true } : null;
  const holding = flight?.mode === "hold";
  const docked = barProject !== null && chrome !== "pill";
  const detailsInBar = docked && (chrome === "docked" || chrome === "title");
  const open: Shown | null = holding ? "work" : userOpen ?? (detailsInBar && barProject?.detailsOpen ? "details" : null);
  // Mounted through the close, so the panel can fold away.
  const [shown, setShown] = useState<Shown | null>(open);
  if (open !== null && shown !== open) setShown(open);
  const closeDetails = barProject?.closeDetails;
  const close = useCallback(() => {
    setOpenOn(null);
    closeDetails?.();
  }, [closeDetails]);
  const toggle = (panel: Panel) => {
    if (barProject?.detailsOpen) barProject.closeDetails();
    setOpenOn((o) => (o && o.path === pathname && o.panel === panel ? null : { panel, path: pathname }));
  };
  const toggleDetails = () => {
    setOpenOn(null);
    barProject?.toggleDetails();
  };
  const showing = open ?? shown;

  const openProject = (href: string, preview: HTMLElement | null) => {
    if (!workOpen) return false;
    // The flight starts from what the preview paints: the lead's clip once
    // it has a frame, otherwise the lead's still (the others sit at 0).
    const video = preview?.querySelector("video");
    const still = preview?.querySelector<HTMLImageElement>("img[data-lead]");
    const r = (video && video.readyState >= 2 ? video : still)?.getBoundingClientRect();
    const rect = r && { top: r.top, left: r.left, width: r.width, height: r.height };
    const source =
      !rect || !rect.width
        ? null
        : video && video.readyState >= 2 && video.videoWidth
          ? { mediaType: "video" as const, sourceVideoElement: video, sourceRect: rect }
          : still && (still.currentSrc || still.src)
            ? { mediaType: "image" as const, imageUrl: still.currentSrc || still.src, sourceRect: rect }
            : null;
    if (!source) return false;
    startTransition(source);
    router.push(href);
    setStarted({ mode: workOpen, id: transitionId + 1 });
    return true;
  };
  // shrink: the list and text fade (120ms), then the window folds while the
  // video is still flying. fade: the capsule is out of sight by then, so it
  // closes underneath. hold: stays open until the page is up.
  const flightMode = flight?.mode;
  useEffect(() => {
    if (!flightMode || flightMode === "hold") return;
    const t = setTimeout(() => setOpenOn(null), flightMode === "shrink" ? 120 : 160);
    return () => clearTimeout(t);
  }, [flightMode]);

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
          className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+12px)] w-[var(--bar-w-m)] -translate-x-1/2 z-50 flex flex-col overflow-hidden text-sub desktop:text-body shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_1px_2px_rgb(0_0_0/0.06),0_10px_24px_-6px_rgb(0_0_0/0.14),0_28px_56px_-12px_rgb(0_0_0/0.16)] motion-safe:transition-[width,border-radius] desktop:top-[calc(env(safe-area-inset-top)+16px)] desktop:w-[var(--bar-w)]"
          style={
            {
              opacity: flight?.mode === "fade" ? 0 : 1,
              transitionProperty: flight || workOpen === "fade" ? "width, opacity, border-radius" : undefined,
              "--bar-w": WIDTH[open ?? "none"],
              // Phone (Ali 11-17, "more petite"): compact at rest, the margins
              // open or with a project row docked.
              "--bar-w-m": open || docked ? PHONE_OPEN : "16rem",
              // An open panel may use the screen down to 12px above its
              // bottom edge: the bar row and the gaps come off it.
              "--panel-max": docked ? "calc(100dvh - 156px)" : "calc(100dvh - 96px)",
              // Pebble (Ali picked A, 11-17): full round shut, rounder open.
              borderRadius: open ? "var(--bar-r-open)" : "var(--bar-r)",
              ...panelSize(bar),
              transitionDuration: flight || workOpen === "fade" ? `320ms, ${flight ? 160 : 200}ms, 320ms` : "320ms",
              transitionTimingFunction: EASE_OUT_CSS,
            } as CSSProperties
          }
        >
          {/* The frost is its own layer so it arrives with the nav after the
              home intro, and the open panel shares it (never two blurs). */}
          <span
            aria-hidden
            className="intro-nav frost-strong pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
          />
          {/* Open, the window covers a lot of page: a denser fill keeps what
              is behind from showing through as a soft grey block. */}
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-bg/70 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          />
          <nav aria-label="Site" className="mx-auto grid h-11 w-full max-w-[16rem] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-5 px-[18px] text-sub desktop:h-14 desktop:max-w-[30rem] desktop:gap-x-7 desktop:px-7 desktop:text-[18px] desktop:leading-6">
            <button type="button" onClick={() => toggle("work")} aria-expanded={open === "work"} aria-controls="bar-panel" className={`${ITEM} justify-self-start ${tone("work")}`}>
              Work
            </button>
            <Link
              ref={linkRef}
              href="/"
              onClick={close}
              className={`relative flex h-11 items-center whitespace-nowrap text-[12px] desktop:h-14 desktop:text-[20px] ${open ? "text-secondary" : "text-primary"}`}
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

          {/* Second row on a project page: the title and the centred clip's
              A/B test ("title" keeps only the title here). */}
          <div
            className="grid motion-safe:transition-[grid-template-rows]"
            style={{ gridTemplateRows: docked ? "1fr" : "0fr", transitionDuration: "320ms", transitionTimingFunction: EASE_OUT_CSS }}
          >
            <div className="min-h-0 overflow-hidden">
              {barProject && docked && (
                <div className="mx-auto flex w-full items-center justify-center gap-2 px-4 pb-2.5 desktop:max-w-[30rem]">
                  {chrome !== "title" && barProject.replay}
                  <button
                    type="button"
                    onClick={toggleDetails}
                    aria-expanded={barProject.detailsOpen}
                    aria-controls={chrome === "overlay" ? "project-details" : "bar-panel"}
                    className="flex min-w-0 flex-col items-center text-center transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]"
                  >
                    <span className={`flex max-w-full items-center gap-1.5 ${userOpen ? "text-secondary" : "text-primary"}`}>
                      <span className="truncate">{barProject.title}</span>
                      <span
                        aria-hidden
                        className="shrink-0 text-[0.5rem] motion-safe:transition-transform motion-safe:duration-200"
                        style={{ transform: barProject.detailsOpen ? "rotate(180deg)" : "none" }}
                      >
                        ▼
                      </span>
                    </span>
                    {chrome !== "title" && barProject.label && (
                      <span className="line-clamp-2 text-secondary [overflow-wrap:anywhere]">{barProject.label}</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

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
                  aria-label={showing === "work" ? "Work" : showing === "about" ? "About" : `${barProject?.title ?? "Project"} details`}
                  // Laid out at the open width from the first frame (Ali, 11-17):
                  // on a laptop the capsule widens around the panel and clips
                  // it, instead of the text reflowing as the width grows.
                  className="bar-panel-in relative left-1/2 w-[var(--panel-w-m)] -translate-x-1/2 pt-4 desktop:w-[var(--panel-w)] desktop:pt-6"
                  style={{
                    "--panel-w": WIDTH[showing],
                    "--panel-w-m": PHONE_OPEN,
                    opacity: open && !flight?.leaving ? 1 : 0,
                    transition: `opacity ${open && !flight ? 200 : 120}ms ${EASE_OUT_CSS}`,
                  } as CSSProperties}
                >
                  {showing === "work" ? (
                    <WorkPanel bar={bar} scrollRef={scrollRef} onOpenProject={openProject} />
                  ) : showing === "details" ? (
                    <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className="max-h-[var(--panel-max)] overflow-y-auto overscroll-contain outline-none">
                      {barProject?.details}
                    </div>
                  ) : bar.about ? (
                    <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className={`${PANEL_H} overflow-y-auto overscroll-contain outline-none`}>
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
          className={`fixed inset-0 z-[49] bg-black/10 transition-opacity duration-200 ${open && !flight ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
      </div>
      {introState !== "done" && <HomeIntro targetRef={nameRef} />}
    </>
  );
}
