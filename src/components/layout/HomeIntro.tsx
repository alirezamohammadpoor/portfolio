"use client";

import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
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


/**
 * Candidate centre sequences for Ali to compare on localhost, picked with
 * `/?intro=scramble|mask|blur|flip` (default scramble). Each one takes the
 * timeline after the name has faded in and leaves it on the Persian name.
 */
type Variant = (tl: gsap.core.Timeline, name: HTMLSpanElement) => void;

function toPersianAttrs(name: HTMLSpanElement) {
  name.setAttribute("dir", "rtl");
  name.setAttribute("lang", "fa");
}

/** Latin noise → English, hold, Persian noise → Persian. */
const scramble: Variant = (tl, name) => {
  tl.add(() => {
    name.textContent = "";
  }, "<");
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
  tl.add(() => toPersianAttrs(name), `+=${HOLD_ENGLISH}`);
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
  tl.add(() => {}, `+=${HOLD}`);
};

/**
 * The site's own text motion: English letters drop in through char masks,
 * hold, leave upward; the Persian words rise in beneath. Persian is split by
 * words, not chars, because isolated Arabic-script letters lose their
 * joined forms.
 */
const mask: Variant = (tl, name) => {
  let split: SplitText | null = null;
  tl.add(() => {
    name.textContent = ENGLISH_NAME;
    split = SplitText.create(name, { type: "chars", mask: "chars", charsClass: "char", aria: "none" });
    gsap.from(split.chars, { yPercent: -120, duration: 0.9, stagger: 0.025, ease: "power4.out" });
  });
  tl.add(() => {
    if (!split) return;
    gsap.to(split.chars, { yPercent: 120, duration: dur.exit, stagger: 0.012, ease: ease.out });
  }, `+=${0.9 + 0.025 * ENGLISH_NAME.length + HOLD_ENGLISH}`);
  tl.add(() => {
    split?.revert();
    name.textContent = PERSIAN_NAME;
    name.classList.add("parastoo-font");
    toPersianAttrs(name);
    split = SplitText.create(name, { type: "words", mask: "words", wordsClass: "word", aria: "none" });
    gsap.from(split.words, { yPercent: 120, duration: 0.9, stagger: 0.08, ease: "power4.out" });
  }, `+=${dur.exit}`);
  tl.add(() => {}, `+=${1.0 + HOLD}`);
};

/** English blurs out in place, Persian blurs in. */
const blur: Variant = (tl, name) => {
  tl.add(() => {
    name.textContent = ENGLISH_NAME;
  }, "<");
  tl.to(name, { autoAlpha: 0, filter: "blur(10px)", duration: 0.5, ease: ease.inOut }, `+=${HOLD_ENGLISH + 0.6}`);
  tl.add(() => {
    name.textContent = PERSIAN_NAME;
    name.classList.add("parastoo-font");
    toPersianAttrs(name);
  });
  tl.fromTo(
    name,
    { autoAlpha: 0, filter: "blur(10px)" },
    { autoAlpha: 1, filter: "blur(0px)", duration: 0.7, ease: ease.out },
  );
  tl.add(() => {}, `+=${HOLD}`);
};

/** Split-flap: English letters flip away left to right, Persian words flip in. */
const flip: Variant = (tl, name) => {
  let split: SplitText | null = null;
  tl.add(() => {
    name.textContent = ENGLISH_NAME;
    gsap.set(name, { perspective: 600 });
    split = SplitText.create(name, { type: "chars", charsClass: "char", aria: "none" });
    gsap.set(split.chars, { display: "inline-block", transformOrigin: "50% 50% -0.2em" });
    gsap.from(split.chars, { rotateX: -90, autoAlpha: 0, duration: 0.5, stagger: 0.03, ease: ease.out });
  }, "<");
  tl.add(() => {
    if (!split) return;
    gsap.to(split.chars, { rotateX: 90, autoAlpha: 0, duration: 0.35, stagger: 0.025, ease: ease.inOut });
  }, `+=${0.5 + 0.03 * ENGLISH_NAME.length + HOLD_ENGLISH}`);
  tl.add(() => {
    split?.revert();
    name.textContent = PERSIAN_NAME;
    name.classList.add("parastoo-font");
    toPersianAttrs(name);
    split = SplitText.create(name, { type: "words", wordsClass: "word", aria: "none" });
    gsap.set(split.words, { display: "inline-block", transformOrigin: "50% 50% -0.2em" });
    gsap.from(split.words, { rotateX: -90, autoAlpha: 0, duration: 0.5, stagger: 0.1, ease: ease.out });
  }, `+=${0.35 + 0.025 * ENGLISH_NAME.length}`);
  tl.add(() => {}, `+=${0.7 + HOLD}`);
};

const VARIANTS: Record<string, Variant> = { scramble, mask, blur, flip };

function readVariant(): keyof typeof VARIANTS {
  const v = new URLSearchParams(window.location.search).get("intro") ?? "";
  return v in VARIANTS ? v : "scramble";
}

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
    tl.fromTo(
      name,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: dur.ui, ease: ease.out },
    );
    VARIANTS[readVariant()](tl, name);
    // Whatever the variant left behind, the move starts from the plain
    // Persian name in the Persian font.
    tl.add(() => {
      name.innerHTML = "";
      name.textContent = PERSIAN_NAME;
      name.className = `${BASE_CLASS} parastoo-font`;
      name.setAttribute("dir", "rtl");
      name.setAttribute("lang", "fa");
      gsap.set(name, { clearProps: "filter,perspective" });
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
