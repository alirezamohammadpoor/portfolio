import gsap from "gsap";
import { ease } from "@/lib/motion";
import { DESKTOP_QUERY } from "@/hooks/useIsDesktop";
import { SCATTER_BEAT } from "@/lib/reel";
import { barEntrance, type IntroBuilder, type Rect } from "@/components/home/HomeReel";

/**
 * The ring entry (lab only since the home plays saturnIntro): moved out of
 * HomeReel so the home's bundle doesn't carry it.
 */
export function ringIntro(landing: "dive" | "settle" = "dive", fit = false): IntroBuilder {
  return (tl, heroes, world, rects) => ringTimeline(tl, heroes, world, rects, landing, fit);
}

/**
 * An oval through the middle of a w × h box: equal arc-length steps around
 * it, so the covers are evenly spaced on screen (equal angles bunch them at
 * the ends of the long axis). `at(u)` gives the point at fraction u of the
 * way round, clockwise from 12 o'clock.
 */
export function ovalPath(a: number, b: number) {
  const STEPS = 720;
  const ts: number[] = [];
  const lens: number[] = [0];
  for (let k = 0; k <= STEPS; k++) ts.push(-Math.PI / 2 + (k / STEPS) * Math.PI * 2);
  for (let k = 1; k <= STEPS; k++) {
    const dx = a * (Math.cos(ts[k]) - Math.cos(ts[k - 1]));
    const dy = b * (Math.sin(ts[k]) - Math.sin(ts[k - 1]));
    lens.push(lens[k - 1] + Math.hypot(dx, dy));
  }
  const total = lens[STEPS];
  return (u: number) => {
    const target = (((u % 1) + 1) % 1) * total;
    let lo = 0;
    let hi = STEPS;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lens[mid] < target) lo = mid;
      else hi = mid;
    }
    const f = (target - lens[lo]) / (lens[hi] - lens[lo] || 1);
    const t = ts[lo] + (ts[hi] - ts[lo]) * f;
    return { x: a * Math.cos(t), y: b * Math.sin(t) };
  };
}

/**
 * The ring (Ali 11-16): every cover the same size, evenly spaced on
 * an oval fitted to the field, so any number of projects fits without
 * overlap (the six hand-placed spots it replaced overlapped past six
 * projects); the cards shrink as the count grows. The middle stays open.
 * While the field holds the oval turns, cards upright, carrying
 * the first project up to 12 o'clock, and the view dives into it from there.
 */
/**
 * The oval's cards, sized for any screen (lab, Ali 11-26: on the phone the
 * cards were too big and ran off the sides). The old rule capped a card at
 * 46% of the phone's width and then forced the oval at least a card wide,
 * which pushed the side cards past the edge. Here the card is a share of the
 * field (a quarter on the laptop, under a third on the phone), the oval is
 * inset by half a card so every card stays whole, and the card shrinks
 * until N of them clear each other by `gap` at every turn.
 */
export function ringFit({
  fw,
  fh,
  N,
  aspect,
  gap,
  laptop,
}: {
  fw: number;
  fh: number;
  N: number;
  aspect: number;
  gap: number;
  laptop: boolean;
}) {
  const layout = (cw: number) => {
    const ch = cw * aspect;
    return { cw, ch, at: ovalPath(fw / 2 - cw / 2, fh / 2 - ch / 2) };
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
  let hi = fw * (laptop ? 0.24 : 0.3);
  if (clears(hi)) lo = hi;
  else
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (clears(mid)) lo = mid;
      else hi = mid;
    }
  return layout(lo);
}

function ringTimeline(
  tl: gsap.core.Timeline,
  heroes: HTMLElement[],
  world: HTMLElement,
  rects: Rect[],
  landing: "dive" | "settle" = "dive",
  fit = false,
) {
  const settleAll = landing === "settle";
  // Settle (Ali 11-26: "fall into place", subtle): instead of the oval the
  // cards fly out into a loose row of small cards above the real row, in
  // project order, then each drops a short way into its slot, 1, 2, 3. Both
  // rows run in the same order, so no path crosses another.
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const laptop = window.matchMedia(DESKTOP_QUERY).matches;
  const N = heroes.length;
  const top = 72;
  const margin = laptop ? 24 : 16;
  const gap = laptop ? 20 : 12;
  const fw = VW - margin * 2;
  const fh = VH - top - margin;
  const ox = VW / 2;
  const oy = top + fh / 2;
  // Every cover is 16:10 on the page; the card keeps its own cover's shape.
  const aspect = rects[0].h / rects[0].w;
  let cw: number;
  let at: ReturnType<typeof ovalPath>;
  if (fit) ({ cw, at } = ringFit({ fw, fh, N, aspect, gap, laptop }));
  else {
    // The middle stays open: on the laptop the card is at most a quarter of
    // the field, on the phone just under half of it.
    const maxW = laptop ? fw * 0.24 : fw * 0.46;

    // The largest card for which N of them, evenly spaced, clear each other
    // by `gap` at every turn of the oval.
    const layout = (w: number) => {
      const ch = w * aspect;
      const a = Math.max(fw / 2 - w / 2, w);
      const b = Math.max(fh / 2 - ch / 2, ch);
      return { cw: w, ch, at: ovalPath(a, b) };
    };
    const clears = (w: number) => {
      const { ch, at: path } = layout(w);
      for (const shift of [0, 0.25, 0.5, 0.75]) {
        const pts = Array.from({ length: N }, (_, i) => path((i + shift) / N));
        for (let i = 0; i < N; i++) {
          for (let j = i + 1; j < N; j++) {
            if (Math.abs(pts[i].x - pts[j].x) < w + gap && Math.abs(pts[i].y - pts[j].y) < ch + gap)
              return false;
          }
        }
      }
      return true;
    };
    let lo = 8;
    let hi = maxW;
    if (clears(hi)) lo = hi;
    else
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        if (clears(mid)) lo = mid;
        else hi = mid;
      }
    ({ cw, at } = layout(lo));
  }

  // The turn: the oval starts a little short of home and ends with the first
  // project at 12 o'clock. About two thirds of a step, at least ~25°.
  const turn = Math.max(0.66 / N, 0.07);
  // Settle turns the other way (anticlockwise), so the cards reach the
  // release point in project order: 1, 2, 3...
  const ring = { u: settleAll ? turn : -turn };
  const fly = heroes.map(() => ({ p: 0 }));
  const dive = { p: 0 };
  const settle = heroes.map(() => ({ p: 0 }));
  // The hover row: N small cards across the field, centred in the band
  // between the Pebble and the top of the real row.
  const rowTop = Math.min(...rects.map((r) => r.y));
  const hoverGap = 16;
  const hoverW = Math.min(cw, (fw - hoverGap * (N - 1)) / N);
  const hoverY = (top + rowTop) / 2;
  const hoverX0 = VW / 2 - (N * hoverW + (N - 1) * hoverGap) / 2 + hoverW / 2;
  const hover = heroes.map((_, i) => ({ x: hoverX0 + i * (hoverW + hoverGap), y: hoverY }));
  const easeIn = gsap.parseEase("power2.in");
  const easeInOut = gsap.parseEase(ease.inOut);

  const base = heroes.map((_, i) => {
    const { x, y, w, h } = rects[i];
    return { cx0: x + w / 2, cy0: y + h / 2, scale: cw / w };
  });
  // Where the first cover sits when the dive starts: 12 o'clock.
  const home = at(0);
  const firstCx = ox + home.x;
  const firstCy = oy + home.y;
  const first = rects[0];
  const K = 1 / base[0].scale;
  const dx = first.x + first.w / 2 - K * firstCx;
  const dy = first.y + first.h / 2 - K * firstCy;
  const push = (0.5 * Math.max(VW, VH)) / K;

  heroes.forEach((hero, i) => {
    const { x, y, w, h } = rects[i];
    gsap.set(hero, { left: x, top: y, width: w, height: h, transformOrigin: "50% 50%" });
  });
  gsap.set(world, { transformOrigin: "0 0", x: 0, y: 0, scale: 1, autoAlpha: 1 });

  // One render from the shared state, so the fly-out, the turn and the dive
  // compose on the same transforms in any order the scrubber seeks.
  function render() {
    heroes.forEach((hero, i) => {
      const { cx0, cy0, scale } = base[i];
      const spot = at(i / N + ring.u);
      let cx = settleAll ? hover[i].x : ox + spot.x;
      let cy = settleAll ? hover[i].y : oy + spot.y;
      const p = fly[i].p;
      // Out of the middle of the screen.
      cx = VW / 2 + (cx - VW / 2) * p;
      cy = VH / 2 + (cy - VH / 2) * p;
      let alpha = Math.min(1, p * 1.4);
      if (settleAll) {
        const small = (hoverW / rects[i].w) * (0.35 + 0.65 * p);
        const f = settle[i].p;
        // Falls: the drop speeds up like a weight, the sideways move eases.
        const fx = easeInOut(f);
        const fy = easeIn(f);
        const fs = easeInOut(f);
        gsap.set(hero, {
          x: cx + (cx0 - cx) * fx - cx0,
          y: cy + (cy0 - cy) * fy - cy0,
          scale: small + (1 - small) * fs,
          autoAlpha: alpha + (1 - alpha) * f,
          // A card on its way down passes under the ones still waiting.
          zIndex: f > 0 ? 1 : 2,
        });
        return;
      }
      if (i > 0 && dive.p > 0) {
        // The rest drifts away from the first project and fades with the
        // camera (Ali 11-04: neighbours' edges at the hand-over, too sudden).
        const ax = cx - firstCx;
        const ay = cy - firstCy;
        const len = Math.hypot(ax, ay) || 1;
        cx += (ax / len) * push * dive.p;
        cy += (ay / len) * push * dive.p;
        alpha *= 1 - dive.p;
      }
      gsap.set(hero, {
        x: cx - cx0,
        y: cy - cy0,
        scale: scale * (0.35 + 0.65 * p),
        autoAlpha: alpha,
      });
    });
  }
  render();

  const at0 = SCATTER_BEAT.start;
  heroes.forEach((_, i) => {
    tl.to(
      fly[i],
      { p: 1, duration: SCATTER_BEAT.scatter, ease: ease.out, onUpdate: render },
      at0 + i * SCATTER_BEAT.stagger,
    );
  });
  const holdAt = at0 + SCATTER_BEAT.scatter + SCATTER_BEAT.stagger * (N - 1);
  const diveAt = holdAt + (settleAll ? SCATTER_BEAT.hold * 0.4 : SCATTER_BEAT.hold);
  // The oval turns from the moment the covers leave the middle and settles
  // just into the dive, so the hold never stands still and the first
  // project is home before the camera gets close.
  const turnStart = at0 + SCATTER_BEAT.scatter * 0.4;
  const turnEnd = settleAll ? diveAt : diveAt + SCATTER_BEAT.dive * 0.3;
  tl.to(
    ring,
    { u: 0, duration: turnEnd - turnStart, ease: "power1.inOut", onUpdate: render },
    turnStart,
  );
  if (settleAll) {
    heroes.forEach((_, i) => {
      tl.to(settle[i], { p: 1, duration: 0.9, ease: "none", onUpdate: render }, diveAt + i * 0.12);
    });
  } else {
    tl.to(world, { x: dx, y: dy, scale: K, duration: SCATTER_BEAT.dive, ease: ease.inOut }, diveAt);
    tl.to(dive, { p: 1, duration: SCATTER_BEAT.dive, ease: ease.inOut, onUpdate: render }, diveAt);
  }
  // The Pebble arrives with the first project (Ali 11-23): hidden over the
  // ring (globals.css), it settles in from just above as the dive lands.
  barEntrance(tl, diveAt + SCATTER_BEAT.dive);
}

