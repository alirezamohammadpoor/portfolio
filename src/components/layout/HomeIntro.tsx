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
 * `/?intro=scramble|mask|blur|flip|brush|hand` (default scramble). Each one takes the
 * timeline after the name has faded in and leaves it on the Persian name.
 */
interface VariantCtx {
  /** Register teardown for things a variant adds outside the GSAP context. */
  onCleanup: (fn: () => void) => void;
}
type Variant = (tl: gsap.core.Timeline, name: HTMLSpanElement, ctx: VariantCtx) => void;

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


const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * English in and out through the site's masks (as `mask`), then the Persian
 * name is painted on: an SVG copy of the text sits exactly over the hidden
 * span and is revealed through a mask of thick round-capped brush strokes
 * drawn right to left (the Little Plains matte trick, on type). When the
 * paint is dry the span takes over for the move.
 */
function englishInOut(tl: gsap.core.Timeline, name: HTMLSpanElement) {
  let split: SplitText | null = null;
  tl.add(() => {
    name.textContent = ENGLISH_NAME;
    split = SplitText.create(name, { type: "chars", mask: "chars", charsClass: "char", aria: "none" });
    gsap.from(split.chars, { yPercent: -120, duration: 0.9, stagger: 0.025, ease: "power4.out" });
  });
  tl.add(() => {
    if (split) gsap.to(split.chars, { yPercent: 120, duration: dur.exit, stagger: 0.012, ease: ease.out });
  }, `+=${0.9 + 0.025 * ENGLISH_NAME.length + HOLD_ENGLISH}`);
  tl.add(() => {
    split?.revert();
    split = null;
  }, `+=${dur.exit}`);
}

interface Canvas {
  svg: SVGSVGElement;
  maskPath: SVGPathElement;
  /** The painted text, for per-glyph extents. */
  text: SVGTextElement;
  /** Width and height of the painted text box inside the svg. */
  w: number;
  h: number;
  /** Offset of the text box inside the svg (the brush overshoots it). */
  ox: number;
  oy: number;
  remove: () => void;
}

/** Build the SVG twin of the (hidden) Persian span, masked by `maskPath`. */
function makeCanvas(name: HTMLSpanElement, outline: boolean): Canvas {
  name.textContent = PERSIAN_NAME;
  name.classList.add("parastoo-font");
  toPersianAttrs(name);
  gsap.set(name, { autoAlpha: 0 });
  const r = name.getBoundingClientRect();
  const cs = getComputedStyle(name);
  const ox = r.height * 0.6;
  const oy = r.height * 0.6;
  const W = r.width + ox * 2;
  const H = r.height + oy * 2;
  const id = `intro-brush-${Math.random().toString(36).slice(2, 8)}`;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", `${W}`);
  svg.setAttribute("height", `${H}`);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("aria-hidden", "true");
  Object.assign(svg.style, {
    position: "fixed",
    left: `${r.left - ox}px`,
    top: `${r.top - oy}px`,
    overflow: "visible",
    pointerEvents: "none",
  });

  const defs = document.createElementNS(SVG_NS, "defs");
  const mask = document.createElementNS(SVG_NS, "mask");
  mask.setAttribute("id", id);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", "0");
  mask.setAttribute("y", "0");
  mask.setAttribute("width", `${W}`);
  mask.setAttribute("height", `${H}`);
  const maskPath = document.createElementNS(SVG_NS, "path");
  maskPath.setAttribute("fill", "none");
  maskPath.setAttribute("stroke", "#fff");
  maskPath.setAttribute("stroke-linecap", "round");
  maskPath.setAttribute("stroke-linejoin", "round");
  maskPath.setAttribute("stroke-width", `${r.height * 0.5}`);
  mask.appendChild(maskPath);
  defs.appendChild(mask);
  svg.appendChild(defs);

  function text(fillColor: string, strokeColor: string, opacity: string) {
    const t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("x", `${ox + r.width}`);
    t.setAttribute("y", `${oy + r.height / 2}`);
    t.setAttribute("direction", "rtl");
    t.setAttribute("text-anchor", "start");
    t.setAttribute("dominant-baseline", "central");
    t.setAttribute("fill", fillColor);
    t.setAttribute("stroke", strokeColor);
    t.setAttribute("stroke-width", "1");
    t.setAttribute("opacity", opacity);
    t.setAttribute("lang", "fa");
    Object.assign(t.style, {
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
    });
    t.textContent = PERSIAN_NAME;
    return t;
  }
  if (outline) svg.appendChild(text("none", cs.color, "0.3"));
  const painted = text(cs.color, "none", "1");
  painted.setAttribute("mask", `url(#${id})`);
  svg.appendChild(painted);

  name.parentElement?.appendChild(svg);
  return {
    svg,
    maskPath,
    text: painted,
    w: r.width,
    h: r.height,
    ox,
    oy,
    remove: () => svg.remove(),
  };
}

/**
 * علیرضا written by hand (spec: /mnt/project-files/home-intro/
 * alireza-handwriting-spec.md, Ali's calls 10-29: everyday handwriting,
 * visible pen lifts, dots after each connected piece, even brush). Four
 * pen-downs for علیرضا: علیر, the two dots under ی, ضا, the dot over ض; each is
 * its own mask path with its own draw-on tween, so the dash reveal never
 * restarts early. Eight pen-downs in all: the surname follows after the
 * long lift across the word space (محمد, پو, ر, then پ's three dots).
 * Glyph cells come from the SVG text; x runs 0 (right edge) → 1 (left edge)
 * in writing direction, vertical marks are fractions of the text box.
 */
function handwrite(c: Canvas, onDone: () => void) {
  const { oy, h } = c;
  const A = oy + 0.14 * h;
  const X = oy + 0.42 * h;
  const B = oy + 0.68 * h;
  const D = oy + 0.92 * h;
  const cell = (i: number) => {
    const e = c.text.getExtentOfChar(i);
    const right = e.x + e.width;
    return (u: number, y: number) => `${(right - u * e.width).toFixed(1)} ${y.toFixed(1)}`;
  };
  const [ain, lam, ye, re, zad, alef] = [0, 1, 2, 3, 4, 5].map(cell);
  const mask = c.maskPath.parentElement as Element;
  const width = `${(0.38 * h).toFixed(1)}`;

  function strokePath(d: string) {
    const el = document.createElementNS(SVG_NS, "path");
    el.setAttribute("d", d);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "#fff");
    el.setAttribute("stroke-linecap", "round");
    el.setAttribute("stroke-linejoin", "round");
    el.setAttribute("stroke-width", width);
    mask.appendChild(el);
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    return el;
  }
  function dot(at: string) {
    const [cx, cy] = at.split(" ");
    const el = document.createElementNS(SVG_NS, "circle");
    el.setAttribute("cx", cx);
    el.setAttribute("cy", cy);
    el.setAttribute("r", "0");
    el.setAttribute("fill", "#fff");
    mask.appendChild(el);
    return el;
  }

  // Stroke 1: علیر in one pull.
  const s1 = strokePath(
    [
      `M ${ain(0.1, X)}`,
      `C ${ain(0.45, X - 0.02 * h)} ${ain(0.7, X + 0.1 * h)} ${ain(0.4, B - 0.04 * h)}`,
      `L ${ain(0.9, B)}`,
      `L ${lam(0.15, B)} L ${lam(0.15, A)} L ${lam(0.18, B)} L ${lam(0.95, B)}`,
      `L ${ye(0.3, X + 0.1 * h)} L ${ye(0.6, B)} L ${ye(1, B)}`,
      `L ${re(0.15, B)} C ${re(0.35, B + 0.12 * h)} ${re(0.6, D)} ${re(0.95, D - 0.06 * h)}`,
    ].join(" "),
  );
  // Stroke 2: two dots under ی, right one first.
  const d1 = dot(ye(0.35, D - 0.02 * h));
  const d2 = dot(ye(0.65, D - 0.02 * h));
  // Stroke 3: ضا, the alef pulled upward.
  const s3 = strokePath(
    [
      `M ${zad(0.05, B)}`,
      `C ${zad(0.3, B - 0.3 * h)} ${zad(0.65, B - 0.3 * h)} ${zad(0.68, B - 0.02 * h)}`,
      `L ${zad(0.1, B)}`,
      `L ${zad(0.72, B)} L ${zad(0.82, X + 0.12 * h)} L ${zad(0.95, B)}`,
      `L ${alef(0.45, B)} L ${alef(0.45, A)}`,
    ].join(" "),
  );
  // Stroke 4: the dot over ض.
  const d3 = dot(zad(0.4, B - 0.4 * h));
  // Surname. Stroke 5: محمد in one pull.
  const [mim1, he, mim2, dal, pe, vav, re2] = [7, 8, 9, 10, 11, 12, 13].map(cell);
  const s5 = strokePath(
    [
      `M ${mim1(0.25, B - 0.18 * h)}`,
      `C ${mim1(0.05, B - 0.18 * h)} ${mim1(0.05, B)} ${mim1(0.35, B)} L ${mim1(0.95, B)}`,
      `L ${he(0.15, B)} L ${he(0.75, X + 0.02 * h)} L ${he(0.35, B - 0.02 * h)} L ${he(1, B)}`,
      `L ${mim2(0.2, B - 0.16 * h)} C ${mim2(0.02, B - 0.16 * h)} ${mim2(0.02, B)} ${mim2(0.35, B)} L ${mim2(0.95, B)}`,
      `L ${dal(0.2, B - 0.3 * h)} C ${dal(0.55, B - 0.28 * h)} ${dal(0.7, B - 0.06 * h)} ${dal(0.95, B)}`,
    ].join(" "),
  );
  // Stroke 6: پو.
  const s6 = strokePath(
    [
      `M ${pe(0.1, B)} L ${pe(0.45, X + 0.12 * h)} L ${pe(0.8, B)} L ${pe(1, B)}`,
      `L ${vav(0.25, B - 0.16 * h)} C ${vav(0.05, B - 0.16 * h)} ${vav(0.05, B + 0.02 * h)} ${vav(0.35, B)}`,
      `C ${vav(0.4, B + 0.14 * h)} ${vav(0.65, D)} ${vav(0.95, D - 0.04 * h)}`,
    ].join(" "),
  );
  // Stroke 7: the final ر.
  const s7 = strokePath(
    `M ${re2(0.15, B - 0.04 * h)} C ${re2(0.35, B + 0.12 * h)} ${re2(0.6, D)} ${re2(0.95, D - 0.06 * h)}`,
  );
  // Stroke 8: the three dots under پ, a triangle pointing down.
  const p1 = dot(pe(0.3, D - 0.04 * h));
  const p2 = dot(pe(0.6, D - 0.04 * h));
  const p3 = dot(pe(0.45, D + 0.06 * h));

  const r = (0.19 * h).toFixed(1);
  const tap = { duration: 0.05, ease: "back.out(2)" };
  const quick = { duration: 0.04, ease: "back.out(2)" };
  // Natural hand speed is ≈3.4 s; Ali picked "fluent, about 2.6 s", so the
  // whole thing runs at timeScale 1.3. The ratios carry the feel.
  const tl = gsap.timeline({ onComplete: onDone }).timeScale(1.3);
  tl.to(s1, { strokeDashoffset: 0, duration: 0.7, ease: "power1.inOut" }, 0);
  tl.to(d1, { attr: { r }, ...tap }, 0.82);
  tl.to(d2, { attr: { r }, ...tap }, 0.92);
  tl.to(s3, { strokeDashoffset: 0, duration: 0.48, ease: "power1.inOut" }, 1.09);
  tl.to(d3, { attr: { r }, ...tap }, 1.67);
  tl.to(s5, { strokeDashoffset: 0, duration: 0.55, ease: "power1.inOut" }, 1.93);
  tl.to(s6, { strokeDashoffset: 0, duration: 0.25, ease: "power1.inOut" }, 2.6);
  tl.to(s7, { strokeDashoffset: 0, duration: 0.14, ease: "power1.out" }, 2.95);
  tl.to(p1, { attr: { r }, ...quick }, 3.19);
  tl.to(p2, { attr: { r }, ...quick }, 3.26);
  tl.to(p3, { attr: { r }, ...quick }, 3.33);
  return tl;
}


const brush: Variant = (tl, name, ctx) => {
  englishInOut(tl, name);
  let canvas: Canvas | null = null;
  ctx.onCleanup(() => canvas?.remove());
  tl.add(() => {
    tl.pause();
    const c = makeCanvas(name, false);
    canvas = c;
    handwrite(c, () => {
      c.remove();
      canvas = null;
      gsap.set(name, { autoAlpha: 1 });
      tl.play();
    });
  });
  tl.add(() => {}, `+=${HOLD}`);
};

/**
 * The visitor paints the name in with the pointer: a faint outline shows
 * where, each pointer move adds to the brush mask. Once most of the width is
 * covered, or after a pause, the brush finishes the job. Keyboard and
 * reduced-motion visitors never reach this (the intro is skipped).
 */
const HAND_IDLE_MS = 2200;
const HAND_WAIT_MS = 5000;

const hand: Variant = (tl, name, ctx) => {
  englishInOut(tl, name);
  let canvas: Canvas | null = null;
  let teardown: (() => void) | null = null;
  ctx.onCleanup(() => {
    teardown?.();
    canvas?.remove();
  });
  tl.add(() => {
    tl.pause();
    const c = makeCanvas(name, true);
    canvas = c;
    const root = name.parentElement as HTMLElement;
    root.style.cursor = "crosshair";
    const svgRect = c.svg.getBoundingClientRect();
    const bins = new Set<number>();
    const BINS = 24;
    let d = "";
    let last: { x: number; y: number } | null = null;
    let finished = false;
    let timer = window.setTimeout(finish, HAND_WAIT_MS);

    function finish() {
      if (finished) return;
      finished = true;
      teardown?.();
      // The pen finishes the name for them.
      handwrite(c, () => {
        c.remove();
        canvas = null;
        gsap.set(name, { autoAlpha: 1 });
        tl.play();
      });
    }
    function onMove(e: PointerEvent) {
      if (finished) return;
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;
      const inside = y > 0 && y < svgRect.height;
      if (inside) {
        const p = last && Math.hypot(last.x - x, last.y - y) < 60 ? `L ${x} ${y}` : `M ${x} ${y} L ${x} ${y}`;
        d += ` ${p}`;
        c.maskPath.setAttribute("d", d);
        bins.add(Math.floor(((x - c.ox) / c.w) * BINS));
        window.clearTimeout(timer);
        timer = window.setTimeout(finish, HAND_IDLE_MS);
        if (bins.size >= BINS * 0.85) finish();
      }
      last = { x, y };
    }
    root.addEventListener("pointermove", onMove);
    teardown = () => {
      root.removeEventListener("pointermove", onMove);
      root.style.cursor = "";
      window.clearTimeout(timer);
      teardown = null;
    };
  });
  tl.add(() => {}, `+=${HOLD}`);
};

const VARIANTS: Record<string, Variant> = { scramble, mask, blur, flip, brush, hand };

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
    const cleanups: (() => void)[] = [];

    const tl = gsap.timeline();
    tl.fromTo(
      name,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: dur.ui, ease: ease.out },
    );
    VARIANTS[readVariant()](tl, name, { onCleanup: (fn) => cleanups.push(fn) });
    // Whatever the variant left behind, the move starts from the plain
    // Persian name in the Persian font.
    tl.add(() => {
      name.innerHTML = "";
      name.textContent = PERSIAN_NAME;
      name.className = `${BASE_CLASS} parastoo-font`;
      name.setAttribute("dir", "rtl");
      name.setAttribute("lang", "fa");
      gsap.set(name, { clearProps: "filter,perspective", autoAlpha: 1 });
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
      cleanups.forEach((fn) => fn());
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
