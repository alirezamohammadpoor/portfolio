import gsap from "gsap";
import { SCATTER_BEAT } from "@/lib/reel";
import { ease, registerMotion } from "@/lib/motion";
import { DESKTOP_QUERY } from "@/hooks/useIsDesktop";
import { barEntrance, type IntroBuilder } from "@/components/home/HomeReel";
import { mix, setup, type Pose } from "@/components/lab/home-intro/intros";
import { pebblePlanet } from "./planet";
import { RING, ringB } from "./ring";

registerMotion();
const inOutE = gsap.parseEase(ease.inOut);

/**
 * Crossing (ring brief 11-26, Ali picked it to prototype): a ring-plane
 * crossing. The Pebble holds still in the middle, the planet. The projects
 * come out onto a level ring opened 26.7° (Saturn's tilt) and go round it,
 * the front moving right to left like the carousel. The ring closes until it
 * is edge-on, a single line, as Saturn's rings look from Earth every 13 to
 * 16 years. That line is the carousel row: the projects open out into
 * their slots while the Pebble rises to its place at the top.
 *
 * Reduced motion never gets here: the site skips the intro (layout.tsx).
 */
export const crossingIntro: IntroBuilder = (tl, heroes, world, rects) => {
  const { slots, place, VW, VH } = setup(heroes, world, rects);
  const N = heroes.length;
  const laptop = window.matchMedia(DESKTOP_QUERY).matches;
  const top = 72;
  const margin = laptop ? 24 : 16;
  const fw = VW - margin * 2;
  const fh = VH - top - margin;
  // The front card: a fifth of the laptop's field, under a third of the phone's.
  const cw = fw * (laptop ? 0.2 : 0.3);
  const ox = VW / 2;
  const oy = top + fh / 2;
  // The laptop's ring fits the field; the phone's runs past the edges, so the
  // cards keep a readable size (Ali liked the wide Saturn ring there).
  const a = laptop ? fw / 2 - cw / 2 : VW * 0.6;
  const BACK = 0.5;
  const aspect = rects[0].h / rects[0].w;

  const open = { deg: RING.open.wide };
  // Whole turns; 0 puts project 1 at the front. Falling u moves the front
  // right to left.
  const spin = { u: 0.35 };
  const fly = heroes.map(() => ({ p: 0 }));
  const land = heroes.map(() => ({ p: 0 }));
  const away = { p: 0 };
  const shown = slots.map((s) => s.x - s.w / 2 < VW && s.y - s.w * aspect * 0.5 < VH);
  const push = Math.max(VW, VH) * 0.6;
  const ROW_GAP = 31.5;
  const poses: (Pose | null)[] = heroes.map(() => null);
  const depths = heroes.map(() => 0);

  const render = () => {
    const b = ringB(a, open.deg);
    heroes.forEach((_, i) => {
      const t = (i / N + spin.u) * Math.PI * 2;
      // depth: 1 at the front, -1 at the back.
      const d = Math.cos(t);
      const k = (d + 1) / 2;
      depths[i] = d;
      const p = fly[i].p;
      const w = cw * (BACK + (1 - BACK) * k) * (0.35 + 0.65 * p);
      let x = ox + a * Math.sin(t) * p;
      let y = oy + b * d * p;
      let alpha = Math.min(1, p * 1.4) * (0.5 + 0.5 * k);
      if (!shown[i]) {
        poses[i] = null;
        const e = inOutE(away.p);
        const dx = x - ox;
        const dy = y - oy;
        const len = Math.hypot(dx, dy) || 1;
        x += (dx / len) * push * e;
        y += (dy / len) * push * e;
        alpha *= 1 - e;
        place(i, { x, y, w, r: 0, a: alpha }, 1 + Math.round(k * 10));
        return;
      }
      poses[i] = mix({ x, y, w, r: 0, a: alpha }, slots[i], inOutE(land[i].p));
    });
    // A card opening into its slot never slides over the one before it.
    let prev: Pose | null = null;
    heroes.forEach((_, i) => {
      const q = poses[i];
      if (!q) return;
      if (prev && laptop && land[i].p > 0) {
        const minX = prev.x + prev.w / 2 + ROW_GAP + q.w / 2;
        if (q.x < minX) q.x = minX;
      }
      prev = q;
      // The back of the ring sits under the front.
      place(i, q, land[i].p > 0 ? 20 : 1 + Math.round(((depths[i] + 1) / 2) * 10));
    });
  };

  render();

  // 1. Out of the planet onto the open ring, the orbit drawn with them.
  const at0 = SCATTER_BEAT.start;
  heroes.forEach((_, i) =>
    tl.to(fly[i], { p: 1, duration: 1.0, ease: ease.out, onUpdate: render }, at0 + i * 0.05),
  );
  // 2. In orbit: an even turn that eases only to bring project 1 to the front.
  tl.to(spin, { u: 0, duration: 2.1, ease: "sine.out", onUpdate: render }, 0.3);
  // 3. The crossing: 26.7° down to edge-on.
  const closeAt = 1.0;
  const closeDur = 1.3;
  tl.to(open, { deg: RING.open.line, duration: closeDur, ease: inOutE, onUpdate: render }, closeAt);
  // 4. The line is the row: it glides down to the row and the projects open
  // into their slots, 1, 2, 3; the rest leave and fade.
  const landAt = closeAt + closeDur - 0.25;
  const step = 0.1;
  const dur = 1.0;
  let n = 0;
  heroes.forEach((_, i) => {
    if (!shown[i]) return;
    tl.to(land[i], { p: 1, duration: dur, ease: "none", onUpdate: render }, landAt + n * step);
    n += 1;
  });
  tl.to(away, { p: 1, duration: dur, ease: "none", onUpdate: render }, landAt);
  // 5. The planet goes home: as the ring closes the Pebble rises out of the
  // middle to its place at the top.
  if (!pebblePlanet(tl, world, { centreX: ox, centreY: oy, rise: closeAt + closeDur * 0.4 }))
    barEntrance(tl, landAt + 0.9);
};
