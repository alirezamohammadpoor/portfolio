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
 * 2. Ring (Ali 11-26): the home's ring, same cards, but the projects trail
 * project 1 round the oval and the ring turns clockwise, slowly, carrying
 * project 1 from half past 3 down past 6 to 7, with 2 and 3 behind it along
 * the bottom. Then the projects whose slots are on screen morph into them,
 * 1, 2, 3; the rest drift off the screen and fade, like the dive's
 * neighbours.
 */
export const ringIntro: IntroBuilder = (tl, heroes, world, rects) => {
  const { slots, place, aspect, VW, VH } = setup(heroes, world, rects);
  const N = heroes.length;
  // The home ring's layout: the largest equal cards that clear each other
  // at every turn of an oval fitted to the field.
  const top = 72;
  const margin = 24;
  const gap = 20;
  const fw = VW - margin * 2;
  const fh = VH - top - margin;
  const ox = VW / 2;
  const oy = top + fh / 2;
  const layout = (cw: number) => {
    const ch = cw * aspect;
    return {
      ch,
      at: ovalPath(Math.max(fw / 2 - cw / 2, cw), Math.max(fh / 2 - ch / 2, ch)),
    };
  };
  const clears = (cw: number) => {
    const { ch, at } = layout(cw);
    for (const shift of [0, 0.25, 0.5, 0.75]) {
      const pts = Array.from({ length: N }, (_, i) => at((i + shift) / N));
      for (let i = 0; i < N; i++)
        for (let j = i + 1; j < N; j++)
          if (Math.abs(pts[i].x - pts[j].x) < cw + gap && Math.abs(pts[i].y - pts[j].y) < ch + gap)
            return false;
    }
    return true;
  };
  let lo = 8;
  let hi = fw * 0.24;
  if (clears(hi)) lo = hi;
  else
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (clears(mid)) lo = mid;
      else hi = mid;
    }
  const cw = lo;
  const { at } = layout(cw);

  // u is the turn, clockwise from 12 o'clock; 7/12 puts project 1 at 7.
  // Ali 11-26: a shorter turn, from half past 3 to 7, and slower.
  const SEVEN = 7 / 12;
  const ring = { u: 3.5 / 12 };
  const fly = heroes.map(() => ({ p: 0 }));
  const land = heroes.map(() => ({ p: 0 }));
  const away = { p: 0 };
  // Only the slots the screen shows take a card; the rest leave.
  const shown = slots.map((s) => s.x - s.w / 2 < VW);
  const push = Math.max(VW, VH) * 0.6;
  const ROW_GAP = 31.5;
  const poses: (Pose | null)[] = heroes.map(() => null);
  const render = () => {
    heroes.forEach((_, i) => {
      // Behind project 1 in the direction of the turn: anticlockwise.
      const spot = at(ring.u - i / N);
      const p = fly[i].p;
      let x = ox + spot.x * p;
      let y = VH / 2 + (oy + spot.y - VH / 2) * p;
      let a = Math.min(1, p * 1.4);
      if (!shown[i]) {
        poses[i] = null;
        const e = inOutE(away.p);
        const dx = x - VW / 2;
        const dy = y - VH / 2;
        const len = Math.hypot(dx, dy) || 1;
        x += (dx / len) * push * e;
        y += (dy / len) * push * e;
        a *= 1 - e;
        place(i, { x, y, w: cw * (0.35 + 0.65 * p), r: 0, a }, 1);
        return;
      }
      const onRing: Pose = { x, y, w: cw * (0.35 + 0.65 * p), r: 0, a };
      poses[i] = mix(onRing, slots[i], inOutE(land[i].p));
    });
    // Ali 11-26: a card growing into its slot must not slide over the one
    // before it. Walking the row in order, a card that would overlap its
    // left neighbour is held just to its right. The slots themselves never
    // overlap, so the last frame is untouched; it holds for any count.
    let prev: Pose | null = null;
    heroes.forEach((_, i) => {
      const q = poses[i];
      if (!q) return;
      if (prev) {
        // Ali 11-26: "much more room". Always fully to the right, at the
        // row's own spacing (32 px between recordings), whatever the height.
        const minX = prev.x + prev.w / 2 + ROW_GAP + q.w / 2;
        if (q.x < minX) q.x = minX;
      }
      prev = q;
      place(i, q, land[i].p > 0 ? 3 : 2);
    });
  };
  render();

  const at0 = SCATTER_BEAT.start;
  heroes.forEach((_, i) =>
    tl.to(
      fly[i],
      { p: 1, duration: SCATTER_BEAT.scatter, ease: ease.out, onUpdate: render },
      at0 + i * SCATTER_BEAT.stagger,
    ),
  );
  // A slow, even turn that starts as the cards leave the middle.
  const turnStart = at0 + SCATTER_BEAT.scatter * 0.4;
  const turnEnd = turnStart + 3.6;
  tl.to(
    ring,
    { u: SEVEN, duration: turnEnd - turnStart, ease: "power1.inOut", onUpdate: render },
    turnStart,
  );
  // The landing overlaps the turn's last moment so the ring never stops dead.
  const landAt = turnEnd - 0.3;
  const step = 0.18;
  const dur = 1.4;
  let k = 0;
  heroes.forEach((_, i) => {
    if (!shown[i]) return;
    tl.to(land[i], { p: 1, duration: dur, ease: "none", onUpdate: render }, landAt + k * step);
    k += 1;
  });
  tl.to(away, { p: 1, duration: dur, ease: "none", onUpdate: render }, landAt);
  barEntrance(tl, landAt + Math.max(0, k - 1) * step + dur);
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
