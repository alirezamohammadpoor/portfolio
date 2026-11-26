import gsap from "gsap";
import { SCATTER_BEAT } from "@/lib/reel";
import { ease } from "@/lib/motion";
import { barEntrance, ovalPath, type IntroBuilder, type Rect } from "@/components/home/HomeReel";

/**
 * Five entries for the carousel home (Ali 11-26), every one ending with each
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
 * 2. Oval: the ring flies out of the middle and turns, as on the home, then
 * every card leaves the oval for its slot, 1 first, a beat apart. The
 * biggest move after the dive; cards from the top of the oval cross the
 * screen to reach the row.
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
  const turn = Math.max(0.66 / N, 0.07);
  const ring = { u: -turn };
  const fly = heroes.map(() => ({ p: 0 }));
  const land = heroes.map(() => ({ p: 0 }));
  const render = () =>
    heroes.forEach((_, i) => {
      const spot = at(i / N + ring.u);
      const p = fly[i].p;
      const onRing: Pose = {
        x: cx + spot.x * p,
        y: VH / 2 + (cy + spot.y - VH / 2) * p,
        w: cw * (0.35 + 0.65 * p),
        r: 0,
        a: Math.min(1, p * 1.4),
      };
      const f = inOutE(land[i].p);
      // A card on its way down travels over the ones still on the ring.
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
  const landAt = at0 + SCATTER_BEAT.scatter + SCATTER_BEAT.stagger * (N - 1) + 0.5;
  tl.to(ring, { u: 0, duration: landAt - at0, ease: "power1.inOut", onUpdate: render }, at0);
  const dur = 1.1;
  heroes.forEach((_, i) =>
    tl.to(land[i], { p: 1, duration: dur, ease: "none", onUpdate: render }, landAt + i * 0.1),
  );
  barEntrance(tl, landAt + (N - 1) * 0.1 + dur);
};

/**
 * 3. Stack: the projects arrive as one loose deck in the middle, 1 on top,
 * and are dealt into the row in order. Each card leaves the top of the deck,
 * so nothing passes through another; a medium move, sideways and down.
 */
export const stackIntro: IntroBuilder = (tl, heroes, world, rects) => {
  const { slots, place, VW, VH } = setup(heroes, world, rects);
  const N = heroes.length;
  const dw = Math.min(slots[0].w * 0.55, VW * 0.3);
  // A hand-dealt look: small turns that don't repeat in step.
  const turns = [-2.5, 1.8, -1.2, 2.6, -0.6, 1.1, -2, 0.8];
  const deck: Pose[] = heroes.map((_, i) => ({
    x: VW / 2 + (i % 2 ? 4 : -3) * Math.min(i, 3),
    y: VH * 0.46 - Math.min(i, 4) * 3,
    w: dw,
    r: turns[i % turns.length],
    a: 1,
  }));
  const rise = { p: 0 };
  const deal = heroes.map(() => ({ p: 0 }));
  const render = () =>
    heroes.forEach((_, i) => {
      const r = outE(rise.p);
      const from: Pose = {
        ...deck[i],
        y: deck[i].y + 40 * (1 - r),
        w: dw * (0.92 + 0.08 * r),
        a: r,
      };
      const f = outE(deal[i].p);
      // 1 is on top of the deck; once dealt a card stays above the deck.
      place(i, mix(from, slots[i], f), deal[i].p > 0 ? N + 1 + i : N - i);
    });
  render();
  tl.to(rise, { p: 1, duration: 0.7, ease: "none", onUpdate: render }, 0.1);
  const dealAt = 1.0;
  const step = 0.16;
  const dur = 0.85;
  heroes.forEach((_, i) =>
    tl.to(deal[i], { p: 1, duration: dur, ease: "none", onUpdate: render }, dealAt + i * step),
  );
  barEntrance(tl, dealAt + (N - 1) * step + dur);
};

/**
 * 4. Line: the projects fly out of the middle into a thin line across the
 * screen, in order, then the whole line drops and grows into the row in one
 * move. Same order in both, so no card ever crosses another.
 */
export const lineIntro: IntroBuilder = (tl, heroes, world, rects) => {
  const { slots, place, VW, VH } = setup(heroes, world, rects);
  const N = heroes.length;
  const gap = 16;
  const lw = Math.min(slots[0].w * 0.32, (VW - 48 - gap * (N - 1)) / N);
  const x0 = VW / 2 - (N * lw + (N - 1) * gap) / 2 + lw / 2;
  const ly = VH * 0.42;
  const line: Pose[] = heroes.map((_, i) => ({ x: x0 + i * (lw + gap), y: ly, w: lw, r: 0, a: 1 }));
  const fly = heroes.map(() => ({ p: 0 }));
  const grow = { p: 0 };
  const render = () =>
    heroes.forEach((_, i) => {
      const p = fly[i].p;
      const from: Pose = {
        x: lerp(VW / 2, line[i].x, p),
        y: lerp(VH / 2, line[i].y, p),
        w: lw * (0.4 + 0.6 * p),
        r: 0,
        a: Math.min(1, p * 1.6),
      };
      place(i, mix(from, slots[i], inOutE(grow.p)));
    });
  render();
  const step = 0.07;
  heroes.forEach((_, i) =>
    tl.to(fly[i], { p: 1, duration: 0.9, ease: ease.out, onUpdate: render }, 0.1 + i * step),
  );
  const growAt = 0.1 + (N - 1) * step + 0.9 + 0.35;
  const dur = 1.1;
  tl.to(grow, { p: 1, duration: dur, ease: "none", onUpdate: render }, growAt);
  barEntrance(tl, growAt + dur);
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
