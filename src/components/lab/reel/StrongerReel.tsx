"use client";

/**
 * Highlights reel, Stronger section: five A/B tests as one shopping journey on
 * one screen that never cuts (list, product page, cart).
 *
 * What this cut changes against the first one (Ali's journey, 21 Nov):
 * - The screen is a close window on the page, not a whole phone: the page
 *   runs at 2x (the stills' own pixels), so each change is large enough to
 *   read in a feed.
 * - The hand-overs are real moves, not dissolves: the tapped card's photo
 *   grows into the product page's gallery (same photograph, measured on the
 *   stills), the colour row closes before the next panel opens, the cart is a
 *   sheet that rises over a dimmed page.
 * - One lead at a time: the camera only scrolls between tests, the line swaps
 *   with the hand-over, and during a test the only thing moving is the change.
 *
 * Built on the TestMorph scenes: each scene's paused timeline is driven by the
 * master (a tween on its time), so the master can play a part of a scene, hold
 * it, or run it backwards.
 *
 * Photos live in public/lab-media and fonts in public/lab-fonts, both
 * gitignored (client material, licensed type).
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ease, registerMotion } from "@/lib/motion";
import TestMorph, { type TestMorphHandle } from "@/components/lab/morph/TestMorph";
import { SCENES } from "@/components/lab/morph/scenes";
import { COL, ReelStage, runReel, SQ } from "./ReelStage";

registerMotion();
/** A move that carries a thing across the screen: quick away, long settle. */
CustomEase.create("reel-carry", "0.32, 0.72, 0, 1");
/** Laid over a scene's own timeline when a tap starts it: the scene's slow
 * start is run through quickly, so the page answers the finger at once. */
CustomEase.create("reel-answer", "0.25, 0.5, 0.6, 0.85");

/** The screen: a window on the 390 pt wide page. */
const WIN = { x: COL.x, y: 200, w: COL.w, h: 840, r: 32 };
const CAM = WIN.w / 390; // page points to pixels
const VIEW = WIN.h / CAM; // page points the window shows

/** The product page frames are Figma's 374 pt phone, scaled to the 390 stage. */
const K = 390 / 374;
/** Where the camera rests on the list: the count row and the first row of cards, down to their titles. */
const LIST = 90;
/** The product page opens where the camera already is. Its frame (breadcrumbs
 * and buy box) starts under the 272.5 pt of gallery the first scene shows. */
const FRAME = LIST + 272.5;
const frameY = (y: number) => FRAME + y * K;

/** The similar-model frame sets its sizes row 8 pt lower than the colour-row
 * frame (measured on the stills). Lifted by that, the two rows sit on each
 * other and the hand-over between them changes only what the test changes. */
const SIZES_DY = 8;

/** Each scene's top on the page, so the product page frames share one origin
 * (each Figma frame has its own height, see pdp() in scenes.ts). */
const TOP = { badge: 0, delivery: LIST, soldout: FRAME, similar: FRAME - 95.3 - SIZES_DY * K };
/** Where the camera looks (top of the window, page points). */
const FOCUS = { list: LIST, delivery: frameY(168), sizes: frameY(303) };

/** The cart is a sheet: its top bar is cut off and the sheet's own edge sits
 * at the window's top. Then the camera follows the kit block as it opens. */
const SHEET = 82;
const CART = FOCUS.sizes - SHEET;
const KIT = CART + 246;

/** The tapped card's photo on the list, and the same photo in the gallery. */
const CARD = { x: 196, y: 142.5, w: 194, h: 291.5 };
const GALLERY = { w: 325, h: 487, shown: 272.5 };

const MEDIA = "/lab-media/stronger";
const STILLS = "/lab/morph";

const LINES = [
  "Five A/B tests for Stronger.",
  "A bestseller badge.",
  "A delivery promise.",
  "Sold out? Other colours.",
  "Sold out? A similar model.",
  "A kit upgrade in the cart.",
];

const KEYS = ["badge", "delivery", "soldout", "similar", "kit"] as const;
type Key = (typeof KEYS)[number];

export default function StrongerReel() {
  const root = useRef<HTMLDivElement>(null);
  const morphs = useRef<Partial<Record<Key, TestMorphHandle | null>>>({});

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = (s: string) => el.querySelector<HTMLElement>(s)!;
    const scene = (k: Key) => q(`[data-scene="${k}"]`);
    const line = (i: number) => q(`[data-line="${i}"]`);
    const cam = q("[data-cam]");
    const dot = q("[data-dot]");
    const hero = q("[data-hero]");
    const dim = q("[data-dim]");
    const photo = q("[data-photo]");
    const galleryPhoto = scene("delivery").querySelector<HTMLElement>('[data-layer="photo"]');
    const child = (k: Key) => morphs.current[k]?.timeline() ?? gsap.timeline({ paused: true });
    const label = (k: Key, name: string, fallback: number) => child(k).labels[name] ?? fallback;

    const tl = gsap.timeline({ paused: true, defaults: { ease: ease.inOut } });

    // Known start state, so seeking backwards restores it.
    const full = "inset(0px 0px 0px 0px round 0px)";
    const closed = `inset(${WIN.y}px ${SQ - WIN.x - WIN.w}px ${SQ - WIN.y - WIN.h}px ${WIN.x}px round ${WIN.r}px)`;
    // GSAP owns the whole transform (it folds a CSS scale into it), so the pan is in pixels.
    gsap.set(cam, { scale: CAM, transformOrigin: "0 0", y: -FOCUS.list * CAM });
    gsap.set(photo, { clipPath: full, opacity: 1 });
    gsap.set(q('[data-back="best"]'), { opacity: 1 });
    gsap.set(q('[data-back="cart"]'), { opacity: 0 });
    LINES.forEach((_, i) => gsap.set(line(i), { opacity: 0, y: 16 }));
    gsap.set(scene("badge"), { y: TOP.badge, opacity: 1 });
    (["delivery", "soldout", "similar"] as const).forEach((k) =>
      gsap.set(scene(k), { y: TOP[k], opacity: 0, visibility: "hidden" }),
    );
    gsap.set(scene("kit"), { y: CART + VIEW + 12, visibility: "hidden" });
    gsap.set(hero, { x: 0, y: 0, scale: 1, visibility: "hidden" });
    gsap.set(q("[data-hole]"), { visibility: "hidden" });
    gsap.set(q("[data-hero-card]"), { opacity: 1 });
    gsap.set(dim, { opacity: 0 });
    gsap.set(dot, { opacity: 0, visibility: "hidden" });
    if (galleryPhoto) gsap.set(galleryPhoto, { opacity: 0 });

    /** Play a part of a scene's own timeline. Returns when it ends. */
    const play = (k: Key, from: number, to: number, at: number, speed = 1, answer = false) => {
      const d = (to - from) / speed;
      tl.fromTo(
        child(k),
        { time: from },
        { time: to, duration: d, ease: answer ? "reel-answer" : "none", immediateRender: false },
        at,
      );
      return at + d;
    };
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
    /** A finger tap at a page point. Takes 0.3 s before the page answers. */
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
      return at + 0.3;
    };
    const pan = (focus: number, at: number, d = 0.55) =>
      tl.to(cam, { y: -focus * CAM, duration: d }, at);
    const show = (k: Key, at: number, d: number) => {
      tl.set(scene(k), { visibility: "inherit" }, at);
      tl.to(scene(k), { opacity: 1, duration: d, ease: ease.out }, at);
    };
    const hide = (k: Key, at: number) => tl.set(scene(k), { visibility: "hidden" }, at);

    // Opener: the shop's photo full bleed and the title. Then the photo's frame
    // closes into the screen (the photo stays put, only its frame moves) and
    // lets the product list through.
    let t = 0.15;
    tl.to(line(0), { opacity: 1, y: 0, duration: 0.45, ease: ease.out }, t);
    t = 0.95;
    tl.to(photo, { clipPath: closed, duration: 0.8 }, t);
    tl.to(photo, { opacity: 0, duration: 0.25, ease: ease.out }, t + 0.7);
    t += 0.9;

    // 1. The badge lands on the cards.
    swap(0, 1, t);
    t = play("badge", label("badge", "L0", 0.8), child("badge").duration(), t + 0.35) + 0.35;

    // Into the product page: the tapped card's photo grows into the gallery
    // (one photograph, so it only scales), the list gives way under it and the
    // page's own text rises in. Then the camera scrolls down to the buy box.
    t = tap(CARD.x + CARD.w / 2, CARD.y + 160, t);
    tl.set([hero, q("[data-hole]")], { visibility: "inherit" }, t);
    tl.to(
      hero,
      {
        x: -CARD.x,
        y: FRAME - GALLERY.h - CARD.y,
        scale: GALLERY.w / CARD.w,
        duration: 0.7,
        ease: "reel-carry",
      },
      t,
    );
    tl.to(q("[data-hero-card]"), { opacity: 0, duration: 0.3, ease: ease.out }, t + 0.05);
    tl.to(scene("badge"), { opacity: 0, duration: 0.3, ease: "power1.out" }, t);
    tl.set(scene("delivery"), { visibility: "inherit" }, t + 0.2);
    tl.fromTo(
      scene("delivery"),
      { opacity: 0, y: TOP.delivery + 20 },
      { opacity: 1, y: TOP.delivery, duration: 0.45, ease: ease.out, immediateRender: false },
      t + 0.2,
    );
    if (galleryPhoto) tl.to(galleryPhoto, { opacity: 1, duration: 0.15, ease: ease.out }, t + 0.55);
    tl.set(hero, { visibility: "hidden" }, t + 0.72);
    hide("badge", t + 0.32);
    t += 0.7 + 0.15;

    // 2. The delivery promise opens under the buy button.
    swap(1, 2, t);
    pan(FOCUS.delivery, t, 0.6);
    t = play("delivery", 0.8, child("delivery").duration() - 0.2, t + 0.6, 1, true) + 0.6;

    // 3. A sold-out size: the page becomes the sold-out colour where it stands,
    // the tap opens the other colours and the camera follows the row down.
    swap(2, 3, t);
    show("soldout", t, 0.3);
    hide("delivery", t + 0.3);
    const tapAt = label("soldout", "L0", 0.6);
    t = play("soldout", tapAt, tapAt + 0.3, t + 0.45);
    pan(FOCUS.sizes, t + 0.05, 0.85);
    t = play("soldout", tapAt + 0.3, child("soldout").duration() - 0.2, t, 1.1, true) + 0.7;

    // 4. The other answer to the same sold-out size: the colour row gives way
    // to the similar model in place (the scene is parked on its last frame).
    swap(3, 4, t);
    tl.set(child("similar"), { time: child("similar").duration() }, t);
    show("similar", t, 0.35);
    hide("soldout", t + 0.35);
    t += 0.35 + 0.9;

    // 5. Add to cart: the cart rises as a sheet over the dimmed page. The kit
    // block opens under the line and the camera follows it down; two sizes, one
    // tap, and the line becomes the kit as the sheet returns to its top.
    t = tap(227 * K, frameY(577 - SIZES_DY), t);
    tl.set(scene("kit"), { visibility: "inherit" }, t);
    tl.to(scene("kit"), { y: CART, duration: 0.55, ease: ease.out }, t);
    tl.to(dim, { opacity: 1, duration: 0.4, ease: ease.out }, t);
    tl.to(q('[data-back="cart"]'), { opacity: 1, duration: 0.5, ease: ease.out }, t);
    swap(4, 5, t);
    t += 0.55 + 0.15;
    const settled = label("kit", "L1", 2.15) + 0.02;
    pan(KIT, t + 0.2, 0.75);
    t = play("kit", 0.8, settled, t, 1.35, true) + 0.2;
    t = play("kit", label("kit", "L2", 2.76), label("kit", "L5", 3.77) + 0.02, t, 1.35) + 0.25;
    const upgrade = label("kit", "L6", 4.18);
    const swapped = label("kit", "L7", 4.51);
    pan(FOCUS.sizes, t + (swapped - upgrade) / 1.35, 0.5);
    t = play("kit", upgrade, child("kit").duration(), t, 1.35);
    tl.to({}, { duration: 0.9 }, t);

    return runReel(tl, el);
  }, []);

  return (
    <ReelStage ref={root}>
      {(["best", "cart"] as const).map((b) => (
        // eslint-disable-next-line @next/next/no-img-element -- fixed 1080 film stage, local media
        <img
          key={b}
          data-back={b}
          src={`${MEDIA}/${b}-smear.jpg`}
          alt=""
          style={{ position: "absolute", inset: 0, width: SQ, height: SQ }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          left: WIN.x,
          top: WIN.y,
          width: WIN.w,
          height: WIN.h,
          borderRadius: WIN.r,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div data-cam style={{ position: "absolute", left: 0, top: 0, width: 390, height: 1600 }}>
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
                zIndex: k === "kit" ? 4 : 1,
                // The cart's top bar is cut away: what rises is the sheet itself.
                clipPath:
                  k === "kit" ? `inset(${SHEET}px 0px 0px 0px round 20px 20px 0px 0px)` : undefined,
                willChange: "transform, opacity",
              }}
            >
              <TestMorph
                ref={(h) => {
                  morphs.current[k] = h;
                }}
                scene={SCENES.find((s) => s.key === k)!}
              />
              {/* The similar-model scene cuts its top slice through the old
                  sizes label; in the film that sliver sits at the window's edge. */}
              {k === "similar" && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 95.3 + 304 * K,
                    width: 220,
                    height: 13 * K,
                    background: "#fff",
                  }}
                />
              )}
              {/* The card's photo leaves its place when it is picked up. */}
              {k === "badge" && (
                <div
                  data-hole
                  style={{
                    position: "absolute",
                    left: CARD.x,
                    top: CARD.y,
                    width: CARD.w,
                    height: CARD.h,
                    background: "#fff",
                  }}
                />
              )}
            </div>
          ))}
          {/* The tapped card's photo. It carries the badge and the plus button
              at first and sheds them as it becomes the gallery photo. */}
          <div
            data-hero
            style={{
              position: "absolute",
              left: CARD.x,
              top: CARD.y,
              width: CARD.w,
              height: CARD.h,
              zIndex: 2,
              transformOrigin: "0 0",
              overflow: "hidden",
              willChange: "transform",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${STILLS}/pdp-gallery.webp)`,
                backgroundSize: `${(390 * CARD.w) / GALLERY.w}px auto`,
                backgroundRepeat: "no-repeat",
              }}
            />
            <div
              data-hero-card
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${STILLS}/t1-design.webp)`,
                backgroundSize: "390px 844px",
                backgroundPosition: `${-CARD.x}px ${-CARD.y}px`,
                backgroundRepeat: "no-repeat",
              }}
            />
          </div>
          <div
            data-dim
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 390,
              height: 1600,
              zIndex: 3,
              background: "rgba(0, 0, 0, 0.36)",
            }}
          />
          <div
            data-dot
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 44,
              height: 44,
              zIndex: 5,
              borderRadius: "50%",
              background: "rgba(26, 26, 26, 0.16)",
              boxShadow: "inset 0 0 0 1.5px rgba(26, 26, 26, 0.28)",
            }}
          />
        </div>
      </div>

      {/* The opening photo, full bleed; its clip closes into the screen. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed 1080 film stage, local media */}
      <img
        data-photo
        src={`${MEDIA}/best.jpg`}
        alt=""
        style={{ position: "absolute", inset: 0, width: SQ, height: SQ }}
      />

      {/* The line sits above the screen on the photo's studio grey. */}
      {LINES.map((s, i) => (
        <p
          key={s}
          data-line={i}
          style={{
            position: "absolute",
            left: COL.x,
            top: 72,
            width: COL.w,
            margin: 0,
            fontSize: 56,
            fontWeight: 650,
            lineHeight: "62px",
            letterSpacing: "-0.015em",
          }}
        >
          {s}
        </p>
      ))}
    </ReelStage>
  );
}
