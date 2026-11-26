import gsap from "gsap";
import { SCATTER_BEAT } from "@/lib/reel";
import { ease, registerMotion } from "@/lib/motion";
import { DESKTOP_QUERY } from "@/hooks/useIsDesktop";
import { barEntrance, type IntroBuilder, type Rect } from "@/components/home/HomeReel";

/**
 * The carousel home's intro (Ali 11-26 picked Saturn and cleared the other
 * prototypes): the projects go round a level ring, almost edge-on, round
 * the middle of the screen, then land in their slots of the row.
 */

/** A card's look at one moment: centre, on-screen width, turn, opacity. */
export interface Pose {
  x: number;
  y: number;
  w: number;
  r: number;
  a: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = (p: Pose, q: Pose, t: number): Pose => ({
  x: lerp(p.x, q.x, t),
  y: lerp(p.y, q.y, t),
  w: lerp(p.w, q.w, t),
  r: lerp(p.r, q.r, t),
  a: lerp(p.a, q.a, t),
});

/** Places every hero on its slot's box and returns the slot poses. */
export function setup(heroes: HTMLElement[], world: HTMLElement, rects: Rect[]) {
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
const inOutE = gsap.parseEase(ease.inOut);

/**
 * A ring laid on
 * its side, a carousel seen from a little above. The cards go round a flat,
 * wide oval across the middle of the screen; the ones at the front are big
 * and on top, the ones at the back small and faint. The front moves right to
 * left, the way the carousel drifts, and slows to put project 1 at the front
 * with 2 and 3 to its right. Then the cards whose slots are on screen land
 * in them, 1, 2, 3, as in Ring; the rest drift off and fade.
 */
interface FlatRingOpts {
  /** Front card width as a share of the field, laptop and phone. */
  card: [laptop: number, phone: number];
  /** Half the oval's height as a share of the field, laptop and phone. */
  flat: [laptop: number, phone: number];
  /** Half the oval's width as a share of the screen's; 0 fits it inside. */
  wide?: number;
  /** Tilt of the whole ring, degrees (negative: right side up). */
  tilt?: number;
  /** Back cards' size against the front ones. */
  back?: number;
}

const flatRing =
  (o: FlatRingOpts): IntroBuilder =>
  (tl, heroes, world, rects) => {
    const { slots, place, VW, VH } = setup(heroes, world, rects);
    const N = heroes.length;
    const laptop = window.matchMedia(DESKTOP_QUERY).matches;
    const top = 72;
    const margin = laptop ? 24 : 16;
    const fw = VW - margin * 2;
    const fh = VH - top - margin;
    // The front card: a fifth of the laptop's width, over a third of the phone's.
    const cw = fw * (laptop ? o.card[0] : o.card[1]);
    const ox = VW / 2;
    const oy = top + fh / 2;
    const a = o.wide ? VW * o.wide : fw / 2 - cw / 2;
    // How flat the oval is: the back row sits a little above the front one.
    const b = fh * (laptop ? o.flat[0] : o.flat[1]);
    const BACK = o.back ?? 0.55;
    const tilt = ((o.tilt ?? 0) * Math.PI) / 180;

    // spin is the turn in whole turns; at 0 project 1 is at the front.
    const spin = { u: 0.8 };
    const fly = heroes.map(() => ({ p: 0 }));
    const land = heroes.map(() => ({ p: 0 }));
    const away = { p: 0 };
    const aspect = rects[0].h / rects[0].w;
    const shown = slots.map((s) => s.x - s.w / 2 < VW && s.y - s.w * aspect * 0.5 < VH);
    const push = Math.max(VW, VH) * 0.6;
    // The row's own gap, read off the slots, keeps landing cards apart.
    const ROW_GAP = rects.length > 1 ? Math.max(0, rects[1].x - rects[0].x - rects[0].w) : 0;
    const poses: (Pose | null)[] = heroes.map(() => null);
    const depths = heroes.map(() => 0);
    const render = () => {
      heroes.forEach((_, i) => {
        const t = (i / N + spin.u) * Math.PI * 2;
        // depth: 1 at the front, -1 at the back.
        const d = Math.cos(t);
        const k = (d + 1) / 2;
        depths[i] = d;
        const p = fly[i].p;
        const w = cw * (BACK + (1 - BACK) * k) * (0.35 + 0.65 * p);
        // On the ring, then tilted round its centre like Saturn's.
        const rx = a * Math.sin(t);
        const ry = b * d;
        const tx = rx * Math.cos(tilt) - ry * Math.sin(tilt);
        const ty = rx * Math.sin(tilt) + ry * Math.cos(tilt);
        let x = ox + tx * p;
        let y = VH / 2 + (oy + ty - VH / 2) * p;
        let alpha = Math.min(1, p * 1.4) * (0.45 + 0.55 * k);
        if (!shown[i]) {
          poses[i] = null;
          const e = inOutE(away.p);
          const dx = x - VW / 2;
          const dy = y - VH / 2;
          const len = Math.hypot(dx, dy) || 1;
          x += (dx / len) * push * e;
          y += (dy / len) * push * e;
          alpha *= 1 - e;
          place(i, { x, y, w, r: o.tilt ?? 0, a: alpha }, 1 + Math.round(k * 10));
          return;
        }
        poses[i] = mix({ x, y, w, r: o.tilt ?? 0, a: alpha }, slots[i], inOutE(land[i].p));
      });
      let prev: Pose | null = null;
      heroes.forEach((_, i) => {
        const q = poses[i];
        if (!q) return;
        if (prev && laptop && land[i].p > 0) {
          const minX = prev.x + prev.w / 2 + ROW_GAP + q.w / 2;
          if (q.x < minX) q.x = minX;
        }
        prev = q;
        place(i, q, land[i].p > 0 ? 20 : 1 + Math.round(((depths[i] + 1) / 2) * 10));
      });
    };
    render();

    // Ali 11-26 18:07: "slow it down a bit": every beat a quarter longer.
    const SLOW = 1.25;
    const at0 = SCATTER_BEAT.start;
    const scatter = SCATTER_BEAT.scatter * SLOW;
    heroes.forEach((_, i) =>
      tl.to(
        fly[i],
        { p: 1, duration: scatter, ease: ease.out, onUpdate: render },
        at0 + i * SCATTER_BEAT.stagger * SLOW,
      ),
    );
    // A slow, even turn that brings project 1 to the front.
    const turnStart = at0 + scatter * 0.4;
    const turnEnd = turnStart + 3.6 * SLOW;
    tl.to(
      spin,
      { u: 0, duration: turnEnd - turnStart, ease: "power1.inOut", onUpdate: render },
      turnStart,
    );
    const landAt = turnEnd - 0.3 * SLOW;
    const step = 0.18 * SLOW;
    const dur = 1.4 * SLOW;
    let n = 0;
    heroes.forEach((_, i) => {
      if (!shown[i]) return;
      tl.to(land[i], { p: 1, duration: dur, ease: "none", onUpdate: render }, landAt + n * step);
      n += 1;
    });
    tl.to(away, { p: 1, duration: dur, ease: "none", onUpdate: render }, landAt);
    barEntrance(tl, landAt + Math.max(0, n - 1) * step + dur);
  };

/**
 * Saturn (Ali 11-26: "even more horizontal, like a slideshow but
 * rotating, Saturn ring"; level, not tilted): the ring almost edge-on and wider than the
 * screen. Big cards slide across the front like a
 * slideshow and leave past the edges; the back of the ring is a thin line
 * of small cards just above them.
 */
export const saturnIntro = flatRing({
  card: [0.3, 0.62],
  flat: [0.06, 0.05],
  wide: 0.62,
  tilt: 0,
  back: 0.4,
});
