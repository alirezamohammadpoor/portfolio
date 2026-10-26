"use client";

import { useRef } from "react";
import { Link } from "next-view-transitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

const ENGLISH_NAME = "Ali Reza Mohammad Poor";
const PERSIAN_NAME = "علیرضا محمدپور";
// One round trip on load (EN → FA → EN), then only on hover / focus. A
// loop in a persistent header is constant decorative motion on every page.
const INTRO_DELAY = 2;
const INTRO_HOLD = 3;
const SCRAMBLE_DURATION = 0.4;

export default function Header() {
  const nameRef = useRef<HTMLSpanElement>(null);
  const pendingCall = useRef<gsap.core.Tween | null>(null);
  const isPersian = useRef(false);
  const busy = useRef(false);
  const wanted = useRef(false);

  const { contextSafe } = useGSAP(() => {
    if (prefersReducedMotion()) return;
    wanted.current = true;
    pendingCall.current = gsap.delayedCall(INTRO_DELAY, () => {
      settle();
      pendingCall.current = gsap.delayedCall(INTRO_HOLD, () => {
        wanted.current = false;
        settle();
      });
    });
    return () => {
      pendingCall.current?.kill();
    };
  });

  // Drive the name toward `wanted`; one tween at a time, re-checked on completion.
  function settle() {
    const span = nameRef.current;
    if (!span || busy.current || isPersian.current === wanted.current) return;
    busy.current = true;
    const toPersian = wanted.current;
    if (toPersian) {
      span.setAttribute("dir", "rtl");
      span.setAttribute("lang", "fa");
    } else {
      span.className = "";
    }
    gsap.to(span, {
      duration: SCRAMBLE_DURATION,
      scrambleText: toPersian
        ? {
            text: PERSIAN_NAME,
            chars: "ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی",
            speed: 1,
            rightToLeft: false,
            tweenLength: false,
            newClass: "parastoo-font",
          }
        : {
            text: ENGLISH_NAME,
            chars: "upperAndLowerCase",
            speed: 1,
            rightToLeft: true,
            tweenLength: false,
          },
      onComplete: () => {
        if (toPersian) {
          span.textContent = PERSIAN_NAME;
          span.className = "parastoo-font";
        } else {
          span.textContent = ENGLISH_NAME;
          span.removeAttribute("dir");
          span.removeAttribute("lang");
        }
        isPersian.current = toPersian;
        busy.current = false;
        settle();
      },
    });
  }

  const show = contextSafe((persian: boolean) => {
    if (prefersReducedMotion()) return;
    pendingCall.current?.kill();
    wanted.current = persian;
    settle();
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[var(--header-height)] items-center justify-between bg-bg px-4 desktop:px-6">
      <Link
        href="/"
        className="text-sub text-primary py-5"
        onPointerEnter={(e) => e.pointerType === "mouse" && show(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && show(false)}
        onFocus={() => show(true)}
        onBlur={() => show(false)}
      >
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
