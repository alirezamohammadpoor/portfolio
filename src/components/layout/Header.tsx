"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/lib/viewTransitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { getIntroState, useIntroState } from "@/lib/intro";
import { ENGLISH_NAME, PERSIAN_CHARS, PERSIAN_NAME } from "@/lib/name";
import HomeIntro from "./HomeIntro";
import AboutPanel, { type AboutData } from "@/components/about/AboutPanel";

const SCRAMBLE_DURATION = 0.4;
const PERSIAN_CLASS = "parastoo-font intro-name intro-name-slot";
const ENGLISH_CLASS = "intro-name intro-name-slot";

export default function Header({ about }: { about: AboutData | null }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const introState = useIntroState();
  // The panel belongs to the page it was opened on: a link taken from
  // under it (Journal, the name) lands with it closed.
  const pathname = usePathname();
  const [aboutOpenOn, setAboutOpenOn] = useState<string | null>(null);
  const aboutOpen = aboutOpenOn === pathname;
  const closeAbout = useCallback(() => setAboutOpenOn(null), []);

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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex h-[var(--header-height)] items-center justify-between bg-bg px-4 desktop:px-6">
        <Link ref={linkRef} href="/" className="text-sub text-primary py-5" aria-label={ENGLISH_NAME}>
          <span ref={nameRef} className={PERSIAN_CLASS} dir="rtl" lang="fa">
            {PERSIAN_NAME}
          </span>
        </Link>
        <nav className="intro-nav flex items-center gap-4">
          <Link href="/journal" className="link-underline text-sub text-primary">
            Journal
          </Link>
          {/* About opens the panel over the current page (Figma "About panel
              · 11-16", option A); /about stays a real link for a new tab. */}
          <a
            href="/about"
            aria-expanded={aboutOpen}
            aria-controls="about-panel"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              setAboutOpenOn((on) => (on === pathname ? null : pathname));
            }}
            className="link-underline text-sub text-primary"
          >
            About
          </a>
        </nav>
      </header>
      <AboutPanel about={about} open={aboutOpen} onClose={closeAbout} />
      {introState !== "done" && <HomeIntro targetRef={nameRef} />}
    </>
  );
}

