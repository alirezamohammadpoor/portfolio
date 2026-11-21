"use client";

/**
 * Internship reel, Stronger block: the five A/B tests on ONE screen that never
 * cuts (Ali, 21 Nov). The phone page morphs from test to test: a product card
 * opens into the product page, the buy box stays put while each test changes
 * it, and the cart slides up over it. The line above the screen swaps with it.
 *
 * Choreography (Emil): one lead at a time. The window is a camera on the
 * 390 x 844 phone stage at 1.54x, so the change reads at feed size. The camera
 * only moves during a hand-over, never while a test plays its change.
 *
 * Built on the TestMorph scenes: each scene's own paused timeline is nested in
 * one master timeline, so the block plays, scrubs and renders frame by frame
 * (window.__reel) from the same code.
 *
 * Look: TRY house brand, black on white, #999994 hairline, TWK Lausanne Pan
 * from public/lab-fonts (gitignored, licensed; a fallback face otherwise).
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ease, registerMotion } from "@/lib/motion";
import TestMorph, { type TestMorphHandle } from "@/components/lab/morph/TestMorph";
import { SCENES } from "@/components/lab/morph/scenes";

registerMotion();

const SQ = 1080;
const WIN = { x: 240, y: 232, w: 600, h: 776, r: 20 };
const CAM = WIN.w / 390; // stage points to pixels
const VIEW = WIN.h / CAM; // stage points visible in the window (504)

/** PDP scenes are offset so their buy boxes share one top edge: the crossfade
 * between them changes only what the test changes (stage points). The page
 * tops differ because each Figma frame has a different height (see pdp()). */
const PDP_TOP = 272.5; // delivery's buy box top (it has the gallery photo above)
const OFFSET = { badge: 0, delivery: 0, soldout: PDP_TOP - 0, similar: PDP_TOP - 95.3, kit: 0 };

/** Where the camera looks (top of the visible band, stage points), per scene. */
const FOCUS = { badge: 40, delivery: 470, soldout: 600, similar: 560 };
/** The cart sheet sits so its kit block lands in the window without a pan. */
const KIT_Y = FOCUS.similar - 200;

const LINES = [
  "Five A/B tests for a sportswear shop.",
  "Added a bestseller badge.",
  "Showed when an order ships.",
  "Showed other colours when one sells out.",
  "Suggested a similar model when sold out.",
  "Offered a kit upgrade in the cart.",
];

const KEYS = ["badge", "delivery", "soldout", "similar", "kit"] as const;
type Key = (typeof KEYS)[number];

const FONT = '"TWK Lausanne Pan", "Helvetica Neue", Helvetica, Arial, sans-serif';

export default function StrongerReel() {
  const [scale, setScale] = useState(1);
  const root = useRef<HTMLDivElement>(null);
  const morphs = useRef<Partial<Record<Key, TestMorphHandle | null>>>({});

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth, window.innerHeight) / SQ);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = (s: string) => el.querySelector<HTMLElement>(s)!;
    const scene = (k: Key) => q(`[data-scene="${k}"]`);
    const line = (i: number) => q(`[data-line="${i}"]`);
    const cam = q("[data-cam]");
    const dot = q("[data-dot]");
    const child = (k: Key, speed = 1) => {
      const tl = morphs.current[k]?.timeline();
      if (!tl) return gsap.timeline();
      return tl.paused(false).timeScale(speed).progress(0);
    };

    const tl = gsap.timeline({ paused: true, defaults: { ease: ease.inOut } });

    // Known start state, so seeking backwards restores it.
    gsap.set(cam, { y: -FOCUS.badge }); // the CSS scale applies after the translate, so y is in stage points
    gsap.set(q("[data-win]"), { opacity: 0, y: 40 });
    LINES.forEach((_, i) => gsap.set(line(i), { opacity: 0, y: 16 }));
    KEYS.forEach((k) =>
      gsap.set(scene(k), { opacity: k === "badge" ? 1 : 0, scale: 1, y: OFFSET[k] }),
    );
    gsap.set(scene("kit"), { y: KIT_Y + VIEW + 40, opacity: 1, visibility: "hidden" });
    gsap.set(dot, { opacity: 0, visibility: "hidden" });

    /** The line above the screen: the old one leaves up, the new one rises in,
     * overlapping slightly so the swap reads as one move. */
    const swap = (from: number, to: number, at: number) => {
      tl.to(line(from), { opacity: 0, y: -10, duration: 0.2, ease: ease.out }, at);
      tl.fromTo(
        line(to),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.32, ease: ease.out, immediateRender: false },
        at + 0.12,
      );
    };
    /** A finger tap at a stage point (in the camera's space). */
    const tap = (x: number, y: number, at: number) => {
      tl.set(dot, { x: x - 22, y: y - 22, visibility: "inherit" }, at);
      tl.fromTo(
        dot,
        { opacity: 0, scale: 1.25 },
        { opacity: 1, scale: 1, duration: 0.18, ease: ease.out, immediateRender: false },
        at,
      );
      tl.to(dot, { scale: 0.86, duration: 0.1, ease: ease.out }, at + 0.2);
      tl.to(dot, { opacity: 0, scale: 1, duration: 0.18, ease: ease.out }, at + 0.3);
      tl.set(dot, { visibility: "hidden" }, at + 0.48);
    };
    const pan = (focus: number, at: number, d = 0.55) => tl.to(cam, { y: -focus, duration: d }, at);

    // Opener: the line alone, then the screen rises under it.
    tl.to(line(0), { opacity: 1, y: 0, duration: 0.4, ease: ease.out }, 0);
    tl.to(q("[data-win]"), { opacity: 1, y: 0, duration: 0.5, ease: ease.out }, 0.45);

    // 1. Badge: the scene's own hold covers the window entrance.
    swap(0, 1, 1.1);
    tl.add(child("badge"), 0.6);
    const t1 = 2.3;

    // 2. Card opens into the product page: the list gives way to the page in
    // place (a short crossfade with a slight push), THEN the camera scrolls
    // down to the buy box. Sequenced, so only one thing moves at a time.
    tap(293, 330, t1);
    const t1b = t1 + 0.3;
    tl.to(
      scene("badge"),
      { scale: 1.08, transformOrigin: "293px 330px", opacity: 0, duration: 0.28, ease: ease.out },
      t1b,
    );
    tl.fromTo(
      scene("delivery"),
      { opacity: 0 },
      { opacity: 1, duration: 0.28, ease: ease.out, immediateRender: false },
      t1b + 0.06,
    );
    swap(1, 2, t1b);
    pan(FOCUS.delivery, t1b + 0.36, 0.5);
    tl.add(child("delivery"), t1b + 0.15);

    // 3. Same buy box, next test: an in-place crossfade, then a short pan.
    const t2 = t1b + 2.0;
    tl.to(scene("soldout"), { opacity: 1, duration: 0.24, ease: ease.out }, t2);
    tl.set(scene("delivery"), { opacity: 0 }, t2 + 0.24);
    pan(FOCUS.soldout, t2);
    swap(2, 3, t2);
    tl.add(child("soldout"), t2);

    // 4. Similar model, same buy box again.
    const t3 = t2 + 2.3;
    tl.to(scene("similar"), { opacity: 1, duration: 0.24, ease: ease.out }, t3);
    tl.set(scene("soldout"), { opacity: 0 }, t3 + 0.24);
    pan(FOCUS.similar, t3);
    swap(3, 4, t3);
    tl.add(child("similar"), t3);

    // 5. Add to cart: the cart slides up over the page, no pan.
    const t4 = t3 + 2.4;
    tap(195, OFFSET.similar + 95.3 + 600 * (390 / 374), t4);
    tl.set(scene("kit"), { visibility: "inherit" }, t4 + 0.3);
    tl.to(scene("kit"), { y: KIT_Y, duration: 0.5, ease: ease.out }, t4 + 0.3);
    swap(4, 5, t4 + 0.3);
    tl.add(child("kit", 1.5), t4 + 0.45);
    tl.to({}, { duration: 0.6 });

    const speed = Number(new URLSearchParams(window.location.search).get("speed") ?? "1") || 1;
    tl.timeScale(speed);
    (window as unknown as { __reel?: gsap.core.Timeline }).__reel = tl;
    if (!new URLSearchParams(window.location.search).has("render")) {
      const go = () => tl.play(0);
      const t = window.setTimeout(go, 400);
      el.addEventListener("click", go);
      return () => {
        window.clearTimeout(t);
        el.removeEventListener("click", go);
        tl.kill();
      };
    }
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      <style>{`
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-650.woff2) format("woff2");font-weight:650;font-display:block}
`}</style>
      <div
        ref={root}
        data-reel
        style={{
          position: "relative",
          width: SQ,
          height: SQ,
          flex: "none",
          background: "#fff",
          color: "#000",
          fontFamily: FONT,
          transform: `scale(${scale})`,
          overflow: "hidden",
        }}
      >
        {/* The line: inside the 9:16 safe column so the same edit crops to a story. */}
        {LINES.map((s, i) => (
          <p
            key={s}
            data-line={i}
            style={{
              position: "absolute",
              left: (SQ - 620) / 2,
              width: 620,
              bottom: SQ - WIN.y + 44,
              margin: 0,
              textAlign: "center",
              fontSize: 54,
              fontWeight: 650,
              lineHeight: "62px",
              letterSpacing: "-0.01em",
              opacity: 0,
            }}
          >
            {s}
          </p>
        ))}

        <div
          data-win
          style={{
            position: "absolute",
            left: WIN.x,
            top: WIN.y,
            width: WIN.w,
            height: WIN.h,
            borderRadius: WIN.r,
            overflow: "hidden",
            background: "#fff",
            opacity: 0,
          }}
        >
          <div
            data-cam
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 390,
              height: 1200,
              transformOrigin: "0 0",
              scale: CAM,
            }}
          >
            {KEYS.map((k) => (
              <div
                key={k}
                data-scene={k}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 390,
                  height: 844,
                  willChange: "transform, opacity",
                }}
              >
                <TestMorph
                  ref={(h) => {
                    morphs.current[k] = h;
                  }}
                  scene={SCENES.find((s) => s.key === k)!}
                  className="w-[390px]"
                />
              </div>
            ))}
            <div
              data-dot
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(26, 26, 26, 0.16)",
                boxShadow: "inset 0 0 0 1.5px rgba(26, 26, 26, 0.28)",
              }}
            />
          </div>
          {/* Hairline on top of the content, so nothing paints over it. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: WIN.r,
              boxShadow: "inset 0 0 0 2px #999994",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
