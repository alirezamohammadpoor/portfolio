import gsap from "gsap";
import { SCATTER_BEAT } from "@/lib/reel";
import { ease, registerMotion } from "@/lib/motion";
import { DESKTOP_QUERY } from "@/hooks/useIsDesktop";
import { barEntrance, ringFit, type IntroBuilder, type Rect } from "@/components/home/HomeReel";

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

// The site eases must exist before they are parsed here at module load.
registerMotion();
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
  // The fitted ring (ringFit): the same rule on the laptop and the phone.
  const laptop = window.matchMedia(DESKTOP_QUERY).matches;
  const top = 72;
  const margin = laptop ? 24 : 16;
  const gap = laptop ? 20 : 12;
  const fw = VW - margin * 2;
  const fh = VH - top - margin;
  const ox = VW / 2;
  const oy = top + fh / 2;
  const { cw, at } = ringFit({ fw, fh, N, aspect, gap, laptop });

  // u is the turn, clockwise from 12 o'clock; 7/12 puts project 1 at 7.
  // Ali 11-26: a shorter turn, from half past 3 to 7, and slower.
  const SEVEN = 7 / 12;
  const ring = { u: 3.5 / 12 };
  const fly = heroes.map(() => ({ p: 0 }));
  const land = heroes.map(() => ({ p: 0 }));
  const away = { p: 0 };
  // Only the slots the screen shows take a card; the rest leave.
  const shown = slots.map((s) => s.x - s.w / 2 < VW && s.y - s.w * aspect * 0.5 < VH);
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
      if (prev && laptop) {
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

/**
 * 3. Slideshow (Ali 11-26): the projects flick past one at a time, big in
 * the middle of the screen, last to first, so the show ends on project 1.
 * Project 1 then shrinks down into its slot while the rest of the row
 * slides in from the right behind it.
 */
export const slideshowIntro: IntroBuilder = (tl, heroes, world, rects) => {
  const { slots, place, VW, VH } = setup(heroes, world, rects);
  const N = heroes.length;
  const bigW = Math.min(VW * 0.62, slots[0].w * 1.5);
  const big: Pose = { x: VW / 2, y: VH / 2, w: bigW, r: 0, a: 1 };
  // Shown: which slide is up (N-1 down to 0); in: the shrink and slide.
  const show = { k: 0 };
  const settle = { p: 0 };
  const order = heroes.map((_, i) => N - 1 - i); // slide k shows project order[k]
  const shift = VW * 0.6;
  const render = () => {
    const e = inOutE(settle.p);
    const k = Math.min(N - 1, Math.floor(show.k));
    const up = order[k];
    heroes.forEach((_, i) => {
      if (i === 0 && (up === 0 || settle.p > 0)) {
        place(i, mix(big, slots[0], e), 3);
        return;
      }
      if (settle.p > 0) {
        place(i, { ...slots[i], x: slots[i].x + shift * (1 - e), a: e }, 1);
        return;
      }
      // A slide pops in a touch small and grows while it holds.
      const t = show.k - k;
      place(i, { ...big, w: bigW * (0.97 + 0.03 * Math.min(1, t)), a: i === up ? 1 : 0 }, 2);
    });
  };
  render();
  const step = 0.32;
  tl.to(show, { k: N, duration: N * step, ease: "none", onUpdate: render }, 0.15);
  const settleAt = 0.15 + N * step + 0.15;
  const dur = 1.3;
  tl.to(settle, { p: 1, duration: dur, ease: "none", onUpdate: render }, settleAt);
  barEntrance(tl, settleAt + dur);
};

/**
 * 4. Big to small (Ali 11-26): the row itself appears first, big and in the
 * middle of the screen, project 1 centred, then the whole row shrinks down
 * into its place at the bottom in one move. The row keeps its order and
 * spacing the whole way, so no card ever crosses another, at any count.
 */
export const bigRowIntro: IntroBuilder = (tl, heroes, world, rects) => {
  const { slots, place, VW, VH } = setup(heroes, world, rects);
  const s = Math.min(1.6, (VW * 0.66) / slots[0].w);
  const ax = slots[0].x;
  const bigPose = (i: number): Pose => ({
    x: VW / 2 + (slots[i].x - ax) * s,
    y: VH / 2,
    w: slots[i].w * s,
    r: 0,
    a: 1,
  });
  const enter = { p: 0 };
  const shrink = { p: 0 };
  const render = () => {
    const r = outE(enter.p);
    const e = inOutE(shrink.p);
    heroes.forEach((_, i) => {
      const b = bigPose(i);
      const from: Pose = { ...b, y: b.y + 32 * (1 - r), a: r };
      place(i, mix(from, slots[i], e));
    });
  };
  render();
  tl.to(enter, { p: 1, duration: 0.9, ease: "none", onUpdate: render }, 0.15);
  const shrinkAt = 0.15 + 0.9 + 0.7;
  const dur = 1.4;
  tl.to(shrink, { p: 1, duration: dur, ease: "none", onUpdate: render }, shrinkAt);
  barEntrance(tl, shrinkAt + dur);
};

/**
 * 5. Slide in: the row is already at its height and size and glides in
 * from the right, slowing into place, the cards a beat apart, like the
 * carousel arriving at its own drift.
 */
export const slideInIntro: IntroBuilder = (tl, heroes, world, rects) => {
  const { slots, place, VW } = setup(heroes, world, rects);
  const N = heroes.length;
  const go = heroes.map(() => ({ p: 0 }));
  const render = () =>
    heroes.forEach((_, i) => {
      const e = outE(go[i].p);
      place(i, { ...slots[i], x: slots[i].x + VW * (1 - e), a: Math.min(1, go[i].p * 3) });
    });
  render();
  const step = 0.08;
  const dur = 1.6;
  heroes.forEach((_, i) =>
    tl.to(go[i], { p: 1, duration: dur, ease: "none", onUpdate: render }, 0.15 + i * step),
  );
  barEntrance(tl, 0.15 + Math.min(2, N - 1) * step + dur);
};
