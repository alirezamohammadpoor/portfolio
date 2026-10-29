"use client";

import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { dur, ease } from "@/lib/motion";
import { getIntroState, setIntroState } from "@/lib/intro";
import { ENGLISH_NAME, PERSIAN_CHARS, PERSIAN_NAME } from "@/lib/name";

/** Seconds. Centre sequence: scramble in to the full English name, hold,
 *  scramble to the full Persian name, hold, then the move. About 3.5 s
 *  before the name travels (Ali: slower, 3–4 s). */
const SCRAMBLE_IN = 0.9;
const HOLD_ENGLISH = 0.6;
const SCRAMBLE = 0.9;
const HOLD = 0.5;
const BASE_CLASS = "intro-name invisible text-primary will-change-transform";

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

  // Resumable: React strict mode (dev) runs the effect, cleans up, runs it
  // again. The cleanup kills the move tween, the context reverts the
  // timeline, and the state goes back to "pending" so the second run plays
  // the intro from the start instead of finding it "playing" and bailing,
  // which left the page blank.
  useGSAP(() => {
    const name = nameRef.current;
    if (!name || getIntroState() === "done") return;
    setIntroState("playing");
    name.className = BASE_CLASS;
    name.removeAttribute("dir");
    name.removeAttribute("lang");
    name.textContent = ENGLISH_NAME;
    let move: gsap.core.Tween | null = null;

    const tl = gsap.timeline();
    // Scramble in from Latin noise to the full English name.
    name.textContent = "";
    tl.fromTo(
      name,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: dur.ui, ease: ease.out },
    );
    tl.to(
      name,
      {
        duration: SCRAMBLE_IN,
        scrambleText: {
          text: ENGLISH_NAME,
          // Lower case noise stays narrower than the name on a phone.
          chars: "lowerCase",
          speed: 0.6,
          revealDelay: 0.2,
          tweenLength: false,
        },
      },
      "<",
    );
    tl.add(() => {
      name.textContent = ENGLISH_NAME;
    });
    // Hold the English, then scramble through to the full Persian name.
    tl.add(() => {
      name.setAttribute("dir", "rtl");
      name.setAttribute("lang", "fa");
    }, `+=${HOLD_ENGLISH}`);
    tl.to(name, {
      duration: SCRAMBLE,
      scrambleText: {
        text: PERSIAN_NAME,
        chars: PERSIAN_CHARS,
        speed: 0.6,
        revealDelay: 0.15,
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
      move = gsap.to(name, {
        x: to.left - from.left,
        y: to.top - from.top,
        scale: to.width / from.width,
        transformOrigin: "0 0",
        duration: dur.page,
        ease: ease.inOut,
        onComplete: () => setIntroState("done"),
      });
    }, `+=${HOLD}`);

    return () => {
      move?.kill();
      if (getIntroState() === "playing") setIntroState("pending");
    };
  }, { scope: nameRef });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bg px-4"
      aria-hidden="true"
    >
      <span
        ref={nameRef}
        className={BASE_CLASS}
        style={{ fontSize: "clamp(1.5rem, 7.5vw, var(--text-display))" }}
      >
        {ENGLISH_NAME}
      </span>
    </div>
  );
}
