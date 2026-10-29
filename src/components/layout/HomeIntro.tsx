"use client";

import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { dur, ease } from "@/lib/motion";
import { getIntroState, setIntroState } from "@/lib/intro";
import { ENGLISH_NAME, PERSIAN_CHARS, PERSIAN_NAME } from "@/lib/name";

const SCRAMBLE = 0.6;
const HOLD = 0.3;

interface HomeIntroProps {
  /** The header's name span: the intro name shrinks onto its rect. */
  targetRef: RefObject<HTMLElement | null>;
}

/**
 * First-load intro: the name sits in the middle of an empty page, scrambles
 * from English into Persian, holds, then shrinks and slides in one move onto
 * the header's name slot (FLIP: transform only, the site's in-out curve).
 * When it lands the header takes over and the page content enters.
 */
export default function HomeIntro({ targetRef }: HomeIntroProps) {
  const nameRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const name = nameRef.current;
    if (!name || getIntroState() !== "pending") return;
    setIntroState("playing");

    const tl = gsap.timeline();
    tl.fromTo(
      name,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: dur.ui, ease: ease.out },
    );
    tl.add(() => {
      name.setAttribute("dir", "rtl");
      name.setAttribute("lang", "fa");
    }, "+=0.1");
    tl.to(name, {
      duration: SCRAMBLE,
      scrambleText: {
        text: PERSIAN_NAME,
        chars: PERSIAN_CHARS,
        speed: 1,
        tweenLength: false,
        newClass: "parastoo-font",
      },
    });
    tl.add(() => {
      name.textContent = PERSIAN_NAME;
      name.classList.add("parastoo-font");
    });
    tl.add(() => {
      const target = targetRef.current;
      if (!target) {
        setIntroState("done");
        return;
      }
      const from = name.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      gsap.to(name, {
        x: to.left - from.left,
        y: to.top - from.top,
        scale: to.width / from.width,
        transformOrigin: "0 0",
        duration: dur.page,
        ease: ease.inOut,
        onComplete: () => setIntroState("done"),
      });
    }, `+=${HOLD}`);
  }, { scope: nameRef });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bg px-4"
      aria-hidden="true"
    >
      <span
        ref={nameRef}
        className="intro-name invisible text-primary will-change-transform"
        style={{ fontSize: "clamp(1.5rem, 7.5vw, var(--text-display))" }}
      >
        {ENGLISH_NAME}
      </span>
    </div>
  );
}
