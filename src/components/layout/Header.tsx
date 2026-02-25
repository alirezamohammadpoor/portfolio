"use client";

import { useRef } from "react";
import { Link } from "next-view-transitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const ENGLISH_NAME = "Ali Reza Mohammad Poor";
const PERSIAN_NAME = "علیرضا محمدپور";
const HOLD_DURATION = 8;
const SCRAMBLE_DURATION = 0.4;

export default function Header() {
  const nameRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = nameRef.current;
    if (!el) return;

    function scrambleToPersian() {
      const span = nameRef.current;
      if (!span) return;
      span.textContent = ENGLISH_NAME;
      span.setAttribute("dir", "rtl");
      span.setAttribute("lang", "fa");
      gsap.to(span, {
        duration: SCRAMBLE_DURATION,
        scrambleText: {
          text: PERSIAN_NAME,
          chars: "ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی",
          speed: 1,
          rightToLeft: false,
          tweenLength: false,
          newClass: "nastaliq-font",
        },
        onComplete: () => {
          span.textContent = PERSIAN_NAME;
          span.className = "nastaliq-font";
          gsap.delayedCall(HOLD_DURATION, scrambleToEnglish);
        },
      });
    }

    function scrambleToEnglish() {
      const span = nameRef.current;
      if (!span) return;
      span.className = "";
      span.textContent = PERSIAN_NAME;
      gsap.to(span, {
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
          gsap.delayedCall(HOLD_DURATION, scrambleToPersian);
        },
      });
    }

    gsap.delayedCall(HOLD_DURATION, scrambleToPersian);
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[var(--header-height)] items-center justify-between bg-bg px-6">
      <Link href="/" className="text-sub text-primary py-5">
        <span ref={nameRef}>{ENGLISH_NAME}</span>
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/journal" className="link-underline text-sub text-primary">
          Journal
        </Link>
        <Link href="/about" className="link-underline text-sub text-primary">
          About
        </Link>
      </nav>
    </header>
  );
}
