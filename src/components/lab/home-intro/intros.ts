import gsap from "gsap";
import { SCATTER_BEAT } from "@/lib/reel";
import { ease } from "@/lib/motion";
import { barEntrance, ovalPath, type IntroBuilder, type Rect } from "@/components/home/HomeReel";

/**
 * Entries for the carousel home (Ali 11-26), every one ending with each
 * project in its own slot of the row. They differ in how far the cards
 * travel: the ring's dive is the biggest move, the drop the smallest.
 */

/** A card's look at one moment: centre, on-screen width, turn, opacity. */
interface Pose {
  x: number;
  y: number;
  w: number;
  r: number;
  a: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (p: Pose, q: Pose, t: number): Pose => ({
  x: lerp(p.x, q.x, t),
  y: lerp(p.y, q.y, t),
  w: lerp(p.w, q.w, t),
  r: lerp(p.r, q.r, t),
  a: lerp(p.a, q.a, t),
});

/** Places every hero on its slot's box and returns the slot poses. */
function setup(heroes: HTMLElement[], world: HTMLElement, rects: Rect[]) {
  heroes.forEach((hero, i) => {
    const { x, y, w, h } = rects[i];
    gsap.set(hero, { left: x, top: y, width: w, height: h, transformOrigin: "50% 50%" });
  });
  gsap.set(world, { transformOrigin: "0 0", x: 0, y: 0, scale: 1, autoAlpha: 1 });
  const slots: Pose[] = rects.map((r) => ({
    x: r.x + r.w / 2,
    y: r.y + r.h / 2,
    w: r.w,
    r: 0,
    a: 1,
  }));
  const place = (i: number, p: Pose, z?: number) =>
    gsap.set(heroes[i], {
      x: p.x - slots[i].x,
      y: p.y - slots[i].y,
      scale: p.w / slots[i].w,
      rotation: p.r,
      autoAlpha: p.a,
      ...(z === undefined ? {} : { zIndex: z }),
    });
  return {
    slots,
    place,
    aspect: rects[0].h / rects[0].w,
    VW: window.innerWidth,
    VH: window.innerHeight,
  };
}

const outE = gsap.parseEase(ease.out);
const inOutE = gsap.parseEase(ease.inOut);

/**
 * 2. Oval (Ali 11-26): the ring flies out with project 1 at 12 o'clock and
 * the others following it anticlockwise, then turns anticlockwise until
 * project 1 sits at 7 o'clock, 2 just after it along the bottom, 3 after
 * that. From there each card morphs into its slot, 1 first: the cards that
 * land first are already the ones nearest the row's start.
 */
export const ovalIntro: IntroBuilder = (tl, heroes, world, rects) => {
  const { slots, place, aspect, VW, VH } = setup(heroes, world, rects);
  const N = heroes.length;
  const top = 72;
  const fw = VW - 48;
  const fh = VH - top - 24;
  const cw = Math.min(fw * 0.17, (fh * 0.3) / aspect);
  const ch = cw * aspect;
  const at = ovalPath(fw / 2 - cw / 2, fh / 2 - ch / 2);
  const cx = VW / 2;
  const cy = top + fh / 2;
  // 0 = project 1 at 12 o'clock; -5/12 = a turn anticlockwise to 7 o'clock.
  const SEVEN = -5 / 12;
  const ring = { u: 0 };
  const fly = heroes.map(() => ({ p: 0 }));
  const land = heroes.map(() => ({ p: 0 }));
  const render = () =>
    heroes.forEach((_, i) => {
      // Anticlockwise order: 2 trails 1 along the bottom towards the right.
      const spot = at(ring.u - i / N);
      const p = fly[i].p;
      const onRing: Pose = {
        x: cx + spot.x * p,
        y: VH / 2 + (cy + spot.y - VH / 2) * p,
        w: cw * (0.35 + 0.65 * p),
        r: 0,
        a: Math.min(1, p * 1.4),
      };
      const f = inOutE(land[i].p);
      // A card on its way to the row travels over the ones still turning.
      place(i, mix(onRing, slots[i], f), land[i].p > 0 ? 2 : 1);
    });
  render();
  const at0 = SCATTER_BEAT.start;
  heroes.forEach((_, i) =>
    tl.to(
      fly[i],
      { p: 1, duration: SCATTER_BEAT.scatter, ease: ease.out, onUpdate: render },
      at0 + i * SCATTER_BEAT.stagger,
    ),
  );
  // The turn starts as the cards leave the middle and eases out just as
  // project 1 reaches 7 o'clock; the landing overlaps its last moment so
  // the ring never stands still.
  const turnStart = at0 + SCATTER_BEAT.scatter * 0.4;
  const turnEnd = at0 + SCATTER_BEAT.scatter + SCATTER_BEAT.stagger * (N - 1) + 1.1;
  tl.to(
    ring,
    { u: SEVEN, duration: turnEnd - turnStart, ease: "power1.inOut", onUpdate: render },
    turnStart,
  );
  const landAt = turnEnd - 0.25;
  const step = 0.12;
  const dur = 1.1;
  heroes.forEach((_, i) =>
    tl.to(land[i], { p: 1, duration: dur, ease: "none", onUpdate: render }, landAt + i * step),
  );
  barEntrance(tl, landAt + (N - 1) * step + dur);
};

/**
 * 5. Drop: no field at all. Each project appears a short way above its own
 * slot and settles into it, 1, 2, 3, a beat apart. The smallest move and the
 * quickest entry.
 */
export const dropIntro: IntroBuilder = (tl, heroes, world, rects) => {
  const { slots, place } = setup(heroes, world, rects);
  const N = heroes.length;
  const drop = heroes.map(() => ({ p: 0 }));
  const render = () =>
    heroes.forEach((_, i) => {
      const s = slots[i];
      const p = drop[i].p;
      const e = outE(p);
      place(i, {
        x: s.x,
        y: s.y - s.w * 0.1 * (1 - e),
        w: s.w * (0.94 + 0.06 * e),
        r: 0,
        a: Math.min(1, p * 2.5),
      });
    });
  render();
  const at0 = 0.25;
  const step = 0.12;
  const dur = 0.9;
  heroes.forEach((_, i) =>
    tl.to(drop[i], { p: 1, duration: dur, ease: "none", onUpdate: render }, at0 + i * step),
  );
  barEntrance(tl, at0 + (N - 1) * step + dur);
};
