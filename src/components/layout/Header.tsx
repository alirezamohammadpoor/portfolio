"use client";

import { useRef } from "react";
import { Link } from "@/lib/viewTransitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useIntroState } from "@/lib/intro";
import { ENGLISH_NAME, PERSIAN_CHARS, PERSIAN_NAME } from "@/lib/name";
import HomeIntro from "./HomeIntro";

const SCRAMBLE_DURATION = 0.4;
const PERSIAN_CLASS = "parastoo-font intro-name intro-name-slot";
const ENGLISH_CLASS = "intro-name intro-name-slot";

export default function Header() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const introState = useIntroState();

  // The name stays Persian; a hover on a real pointer scrambles it to English
  // and back on leave (feedback on the link, nothing on touch).
  useGSAP(
    () => {
      const link = linkRef.current;
      const span = nameRef.current;
      if (!link || !span) return;
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      let tween: gsap.core.Tween | null = null;

      function toEnglish() {
        if (!span || introState !== "done") return;
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
        if (!span || introState !== "done") return;
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
    { scope: linkRef, dependencies: [introState] },
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
          <Link href="/about" className="link-underline text-sub text-primary">
            About
          </Link>
        </nav>
      </header>
      {introState !== "done" && <HomeIntro targetRef={nameRef} />}
    </>
  );
}

