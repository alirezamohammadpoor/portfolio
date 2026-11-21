"use client";

/**
 * Internship reel, CI/CD block (Ali, 21 Nov): every pipeline change as one
 * journey on one screen that never cuts, like the Stronger block. A merge
 * request is pushed, its pipeline runs as it used to, then each change reshapes
 * the same bar: the queue goes, the build caches, the tests open into the
 * package grid and keep only what changed, the deploy package shrinks, the
 * review app opens itself, and the old bar stays behind as a hairline.
 *
 * Facts (TRY wrap-up, 17 Nov): push to review 26 -> 18 min (estimate over 604
 * pipelines), test job 8.1 -> 5.2 min (proof run), affected tests only (3 of
 * 16 packages on a one-client MR), deploy packages about 44% smaller, review
 * deploy starts by itself. Segment lengths other than Tests are drawn to fit
 * those totals, as in the devops Pipeline film.
 *
 * Look: TRY brand, black on white, #999994 hairlines, no accent. Choreography
 * (Emil): one lead at a time; the bar is the one object and every change is a
 * move of it. Plays, scrubs and renders frame by frame (window.__reel).
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ease, registerMotion } from "@/lib/motion";

registerMotion();

const SQ = 1080;
const BG = "#efeeea";
const HAIR = "#999994";
const FONT = '"TWK Lausanne Pan", "Helvetica Neue", Helvetica, Arial, sans-serif';
const WIN = { x: 64, y: 250, w: 952, h: 766, r: 20 };
const TRACK = { x: 40, y: 580, w: 872, h: 72 };
const UNIT = TRACK.w / 28; // px per minute
const ROW_GAP = 0; // segments touch; a hairline divides them

type Seg = { key: "wait" | "build" | "tests" | "deploy"; label: string; before: number; after: number };
const SEGS: Seg[] = [
  { key: "wait", label: "Waiting", before: 5, after: 0.6 },
  { key: "build", label: "Build", before: 7, after: 6.4 },
  { key: "tests", label: "Tests", before: 8.1, after: 5.2 },
  { key: "deploy", label: "Deploy", before: 5.9, after: 5.8 },
];
const PKGS = ["ui", "pdp", "plp", "cart", "checkout", "search", "account", "header", "footer", "cms", "i18n", "api", "auth", "media", "utils", "config"];
const CHANGED = new Set(["ui", "pdp", "i18n"]);
const DIFF: [" " | "-" | "+", string][] = [
  [" ", "export function SizePicker({ sizes }) {"],
  ["-", "  <button disabled={soldOut}>"],
  ["+", "  <button aria-disabled={soldOut}"],
  ["+", "    onClick={() => notifyMe(size)}>"],
  [" ", "    {label}"],
];

const LINES = [
  "Made the team's pipeline faster.",
  "Every merge request gets its own runner. No queue.",
  "The build reuses its cache.",
  "Tests run only for the packages a change touches.",
  "Deploy packages are smaller.",
  "The review app deploys itself.",
  "Push to review in 18 minutes, not 26.",
];

const lefts = (k: "before" | "after") => {
  let x = 0;
  return SEGS.map((s) => {
    const l = x;
    x += s[k] * UNIT + ROW_GAP;
    return l;
  });
};

export default function CiReel() {
  const [scale, setScale] = useState(1);
  const root = useRef<HTMLDivElement>(null);

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
    const qa = (s: string) => [...el.querySelectorAll<HTMLElement>(s)];
    const line = (i: number) => q(`[data-line="${i}"]`);
    const seg = (k: string) => q(`[data-seg="${k}"]`);
    const fill = (k: string) => q(`[data-fill="${k}"]`);
    const clock = q("[data-clock]");
    const clockN = q("[data-clock-n]");
    const grid = q("[data-grid]");
    const tiles = qa("[data-pkg]");
    const idle = tiles.filter((t) => !CHANGED.has(t.dataset.pkg!));
    const box = q("[data-box]");
    const review = q("[data-review]");
    const ghost = q("[data-ghost]");
    const head = q("[data-head]");

    const tl = gsap.timeline({ paused: true, defaults: { ease: ease.inOut } });
    const B = lefts("before");

    // Known start state, so seeking backwards restores it.
    gsap.set(q("[data-win]"), { opacity: 0, y: 40 });
    LINES.forEach((_, i) => gsap.set(line(i), { opacity: 0, y: 16 }));
    SEGS.forEach((s, i) => {
      gsap.set(seg(s.key), { left: B[i], width: s.before * UNIT });
      gsap.set(fill(s.key), { clipPath: "inset(0% 100% 0% 0%)" });
    });
    gsap.set(clock, { x: 0, opacity: 0 });
    gsap.set(clockN, { textContent: "0" });
    gsap.set(grid, { opacity: 0, visibility: "hidden" });
    gsap.set(tiles, { backgroundColor: "#000", color: "#fff" });
    gsap.set(box, { opacity: 0, scale: 1, visibility: "hidden" });
    gsap.set(review, { opacity: 0, scale: 0.4, visibility: "hidden" });
    gsap.set(ghost, { opacity: 0, y: 0 });
    gsap.set(head, { opacity: 1 });
    gsap.set(q('[data-label="wait"]'), { opacity: 1 });
    gsap.set(q("[data-end]"), { opacity: 0 });

    const swap = (from: number, to: number, at: number) => {
      tl.to(line(from), { opacity: 0, y: -10, duration: 0.2, ease: ease.out }, at);
      tl.fromTo(line(to), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.32, ease: ease.out, immediateRender: false }, at + 0.12);
    };
    /** Move every segment to the "after" layout up to and including index i. */
    const reshape = (upTo: number, at: number, d = 0.6) => {
      SEGS.forEach((s, i) => {
        const w = (i <= upTo ? s.after : s.before) * UNIT;
        const leftNow = SEGS.slice(0, i).reduce((x, p, j) => x + (j <= upTo ? p.after : p.before) * UNIT, 0);
        tl.to(seg(s.key), { left: leftNow, width: w, duration: d }, at);
      });
    };

    // Opener: the line alone, then the merge request rises under it.
    tl.to(line(0), { opacity: 1, y: 0, duration: 0.4, ease: ease.out }, 0);
    tl.to(q("[data-win]"), { opacity: 1, y: 0, duration: 0.5, ease: ease.out }, 0.45);

    // The pipeline as it was: a clock runs along the bar, 0 -> 26 min.
    const T0 = 1.1;
    const RUN = 2.4;
    const total = SEGS.reduce((m, s) => m + s.before, 0);
    tl.to(clock, { opacity: 1, duration: 0.2, ease: ease.out }, T0);
    tl.to(clock, { x: total * UNIT, duration: RUN, ease: "none" }, T0);
    tl.to(clockN, { textContent: Math.round(total), snap: { textContent: 1 }, duration: RUN, ease: "none" }, T0);
    let t = T0;
    SEGS.forEach((s) => {
      const d = (s.before / total) * RUN;
      if (s.key !== "wait") tl.to(fill(s.key), { clipPath: "inset(0% 0% 0% 0%)", duration: d, ease: "none" }, t);
      t += d;
    });
    tl.to(clock, { opacity: 0, duration: 0.2, ease: ease.out }, T0 + RUN + 0.5);

    // 1. Own runner: the queue collapses, the bar closes up.
    const t1 = T0 + RUN + 0.6;
    swap(0, 1, t1);
    reshape(0, t1 + 0.4);
    tl.to(q('[data-label="wait"]'), { opacity: 0, duration: 0.2, ease: ease.out }, t1 + 0.4);

    // 2. Build cache: the build segment trims.
    const t2 = t1 + 1.5;
    swap(1, 2, t2);
    reshape(1, t2 + 0.4, 0.5);

    // 3. Tests open into the 16 packages, 13 empty in one move, then close shorter.
    const t3 = t2 + 1.4;
    swap(2, 3, t3);
    tl.to(head, { opacity: 0.15, duration: 0.3, ease: ease.out }, t3 + 0.2);
    tl.set(grid, { visibility: "inherit" }, t3 + 0.3);
    tl.fromTo(grid, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.45, ease: ease.out, immediateRender: false }, t3 + 0.3);
    tl.to(idle, { backgroundColor: "#fff", color: "#000", duration: 0.35, ease: ease.out }, t3 + 1.2);
    tl.to(grid, { opacity: 0, duration: 0.3, ease: ease.out }, t3 + 2.3);
    tl.set(grid, { visibility: "hidden" }, t3 + 2.6);
    tl.to(head, { opacity: 1, duration: 0.3, ease: ease.out }, t3 + 2.4);
    reshape(2, t3 + 2.5, 0.55);

    // 4. Deploy package shrinks above its segment.
    const t4 = t3 + 3.4;
    swap(3, 4, t4);
    tl.set(box, { visibility: "inherit" }, t4 + 0.3);
    tl.fromTo(box, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: ease.out, immediateRender: false }, t4 + 0.3);
    tl.to(box, { scale: 0.75, duration: 0.6 }, t4 + 0.9); // area x0.56: about 44% smaller
    tl.to(box, { opacity: 0, duration: 0.25, ease: ease.out }, t4 + 1.8);
    tl.set(box, { visibility: "hidden" }, t4 + 2.05);
    reshape(3, t4 + 1.8, 0.4);

    // 5. The review app opens from the end of the bar.
    const t5 = t4 + 2.4;
    swap(4, 5, t5);
    tl.set(review, { visibility: "inherit" }, t5 + 0.3);
    tl.to(review, { opacity: 1, scale: 1, duration: 0.55, ease: ease.out }, t5 + 0.3);

    // 6. The old bar returns as a hairline above the new one.
    const t6 = t5 + 1.9;
    swap(5, 6, t6);
    tl.fromTo(ghost, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: ease.out, immediateRender: false }, t6 + 0.3);
    tl.fromTo(q("[data-end]"), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.35, ease: ease.out, immediateRender: false }, t6 + 0.6);
    tl.to({}, { duration: 1.6 });

    const speed = Number(new URLSearchParams(window.location.search).get("speed") ?? "1") || 1;
    tl.timeScale(speed);
    (window as unknown as { __reel?: gsap.core.Timeline }).__reel = tl;
    if (!new URLSearchParams(window.location.search).has("render")) {
      const go = () => tl.play(0);
      const id = window.setTimeout(go, 400);
      el.addEventListener("click", go);
      return () => {
        window.clearTimeout(id);
        el.removeEventListener("click", go);
        tl.kill();
      };
    }
    return () => {
      tl.kill();
    };
  }, []);

  const afterTotal = SEGS.reduce((m, s) => m + s.after, 0);
  const beforeTotal = SEGS.reduce((m, s) => m + s.before, 0);
  const tile = 98;
  const gap = 12;
  const gridW = 8 * tile + 7 * gap;

  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", overflow: "hidden" }}>
      <style>{`
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-650.woff2) format("woff2");font-weight:650;font-display:block}
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-350.woff2) format("woff2");font-weight:350;font-display:block}
`}</style>
      <div
        ref={root}
        data-reel
        style={{ position: "relative", width: SQ, height: SQ, flex: "none", background: BG, color: "#000", fontFamily: FONT, transform: `scale(${scale})`, overflow: "hidden" }}
      >
        {LINES.map((s, i) => (
          <p
            key={s}
            data-line={i}
            style={{ position: "absolute", left: 64, top: 76, width: 952, margin: 0, fontSize: 50, fontWeight: 650, lineHeight: "58px", letterSpacing: "-0.01em", opacity: 0 }}
          >
            {s}
          </p>
        ))}

        <div
          data-win
          style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: WIN.r, background: "#fff", boxShadow: `inset 0 0 0 2px ${HAIR}`, overflow: "hidden" }}
        >
          {/* The merge request */}
          <div data-head style={{ position: "absolute", left: 40, top: 40, right: 40 }}>
            <div style={{ fontSize: 22, fontWeight: 350, color: HAIR }}>Merge request</div>
            <div style={{ fontSize: 40, fontWeight: 650, marginTop: 8 }}>Fix the size picker</div>
            <div style={{ display: "inline-block", marginTop: 16, padding: "6px 14px", borderRadius: 999, boxShadow: `inset 0 0 0 2px ${HAIR}`, fontSize: 20, fontWeight: 350 }}>
              size-picker → main
            </div>
            {/* The change itself, a few lines of diff */}
            <div style={{ marginTop: 36, width: 600, borderRadius: 10, boxShadow: `inset 0 0 0 2px ${HAIR}`, padding: "14px 0", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 19, lineHeight: "34px" }}>
              {DIFF.map(([k, code], i) => (
                <div key={i} style={{ display: "flex", gap: 14, paddingLeft: 16, background: k === "+" ? "#000" : "transparent", color: k === "+" ? "#fff" : k === "-" ? HAIR : "#000", textDecoration: k === "-" ? "line-through" : "none" }}>
                  <span style={{ width: 14 }}>{k}</span>
                  <span style={{ whiteSpace: "pre" }}>{code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* The old bar, as a hairline, for the last beat */}
          <div data-ghost style={{ position: "absolute", left: TRACK.x, top: TRACK.y - 72, width: TRACK.w, opacity: 0 }}>
            <div style={{ width: beforeTotal * UNIT, height: 44, borderRadius: 6, boxShadow: `inset 0 0 0 2px ${HAIR}` }} />
            <div style={{ position: "absolute", left: 12, top: 9, fontSize: 22, fontWeight: 350, color: HAIR, whiteSpace: "nowrap" }}>Before: 26 min</div>
          </div>

          {/* The pipeline bar */}
          <div style={{ position: "absolute", left: TRACK.x, top: TRACK.y, width: TRACK.w, height: TRACK.h }}>
            {SEGS.map((s) => (
              <div key={s.key} data-seg={s.key} style={{ position: "absolute", top: 0, height: TRACK.h }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 6, boxShadow: `inset 0 0 0 2px ${s.key === "wait" ? HAIR : "#000"}` }} />
                <div data-fill={s.key} style={{ position: "absolute", inset: 0, borderRadius: 6, background: "#000" }} />
                <div data-label={s.key} style={{ position: "absolute", left: 0, top: TRACK.h + 14, fontSize: 24, fontWeight: 350, whiteSpace: "nowrap", color: s.key === "wait" ? HAIR : "#000" }}>
                  {s.label}
                </div>
              </div>
            ))}
            <div data-end style={{ position: "absolute", left: afterTotal * UNIT + 16, top: 20, fontSize: 26, fontWeight: 650, whiteSpace: "nowrap" }}>18 min</div>
            <div data-clock style={{ position: "absolute", left: 0, top: -44, fontSize: 24, fontWeight: 650, whiteSpace: "nowrap", transform: "translateX(-50%)" }}>
              <span data-clock-n>0</span> min
            </div>
            {/* The deploy package, above the deploy segment */}
            <div
              data-box
              style={{
                position: "absolute",
                left: (afterTotal - 5.8 / 2) * UNIT - 60,
                top: -170,
                width: 120,
                height: 120,
                borderRadius: 10,
                background: "#000",
                color: "#fff",
                fontSize: 18,
                fontWeight: 650,
                display: "grid",
                placeItems: "center",
                transformOrigin: "50% 100%",
              }}
            >
              package
            </div>
          </div>

          {/* The 16 packages the tests used to cover */}
          <div
            data-grid
            style={{ position: "absolute", left: (WIN.w - gridW) / 2 - 16, top: 174, width: gridW + 32, padding: 16, background: "#fff", display: "grid", gridTemplateColumns: `repeat(8, ${tile}px)`, gap }}
          >
            {PKGS.map((p) => (
              <div
                key={p}
                data-pkg={p}
                style={{ height: tile, borderRadius: 10, boxShadow: "inset 0 0 0 2px #000", display: "grid", placeItems: "end start", padding: 12, fontSize: 20, fontWeight: 650 }}
              >
                {p}
              </div>
            ))}
          </div>

          {/* The review app, opening from the end of the bar */}
          <div
            data-review
            style={{
              position: "absolute",
              left: WIN.w - 40 - 200,
              top: 40,
              width: 200,
              height: 420,
              borderRadius: 26,
              overflow: "hidden",
              background: "#fff",
              boxShadow: `inset 0 0 0 2px ${HAIR}`,
              transformOrigin: "0% 100%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed film stage */}
            <img src="/lab/morph/t1-design.webp" alt="" style={{ position: "absolute", left: 2, top: 46, width: 196, height: "auto" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 44, display: "grid", placeItems: "center", fontSize: 16, fontWeight: 650, background: "#fff", boxShadow: `inset 0 -2px 0 ${HAIR}` }}>
              Review app
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
