"use client";

/**
 * Internship reel, devops block v3 (Ali, 21 Nov): only the numbers. Four
 * scenes, six beats each at 120 BPM, hard cut on the beat. Each scene cuts in
 * on its before state, then on beat two one move: the bar shrinks (or a third
 * of the dots empty) while the number counts down. The old size stays behind
 * as a hairline with its number. No reasons, no captions.
 *
 * Facts from the devops films: push to review app 26 -> 18 min, API requests
 * 100 -> 67 (about a third fewer), one response 3650 -> 160 KB, cloud bill
 * 100% -> 48% (found in a cost review, not applied yet: the one line kept).
 *
 * Look: TRY brand, black on white, #999994 hairlines. Plays, scrubs and
 * renders frame by frame (window.__reel, ?render, ?speed=).
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ease, registerMotion } from "@/lib/motion";

registerMotion();

const SQ = 1080;
const HAIR = "#999994";
const FONT = '"TWK Lausanne Pan", "Helvetica Neue", Helvetica, Arial, sans-serif';
const BEAT = 0.5;
const SCENE_BEATS = 6;
const MOVE_AT = 1 * BEAT;
const MOVE = 0.7;
const BAR = { x: 64, y: 470, w: 952, h: 88 };
const DOT = 36;
const DOT_GAP = 14;

type Scene = {
  key: string;
  label: string;
  kind: "bar" | "dots";
  from: number;
  to: number;
  unit: string;
  note?: string;
};
const SCENES: Scene[] = [
  { key: "time", label: "Push to review app", kind: "bar", from: 26, to: 18, unit: " min" },
  { key: "requests", label: "API requests", kind: "dots", from: 100, to: 67, unit: "" },
  { key: "bytes", label: "One API response", kind: "bar", from: 3650, to: 160, unit: " KB" },
  {
    key: "cost",
    label: "Monthly cloud bill",
    kind: "bar",
    from: 100,
    to: 48,
    unit: "%",
    note: "Found in a cost review, not applied yet.",
  },
];

const fmt = (v: number, unit: string) => `${Math.round(v).toLocaleString("en-US")}${unit}`;

export default function NumbersReel() {
  const root = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth, window.innerHeight) / SQ);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline({ paused: true, defaults: { ease: ease.out } });
    const len = SCENE_BEATS * BEAT;

    SCENES.forEach((s, i) => {
      const t = i * len;
      const scene = q(`[data-scene="${s.key}"]`);
      const num = q(`[data-num="${s.key}"]`)[0] as HTMLElement;
      const ghost = q(`[data-ghost="${s.key}"]`);
      gsap.set(scene, { autoAlpha: i === 0 ? 1 : 0 });
      gsap.set(ghost, { autoAlpha: 0 });
      tl.set(scene, { autoAlpha: 1 }, t);
      if (i < SCENES.length - 1) tl.set(scene, { autoAlpha: 0 }, t + len);

      const counter = { v: s.from };
      tl.to(
        counter,
        {
          v: s.to,
          duration: MOVE,
          onUpdate: () => {
            num.textContent = fmt(counter.v, s.unit);
          },
        },
        t + MOVE_AT,
      );

      if (s.kind === "bar") {
        tl.fromTo(
          q(`[data-fill="${s.key}"]`),
          { scaleX: 1 },
          { scaleX: s.to / s.from, duration: MOVE, immediateRender: false },
          t + MOVE_AT,
        );
      } else {
        tl.fromTo(
          q(`[data-drop="${s.key}"]`),
          { backgroundColor: "#000" },
          { backgroundColor: "rgba(0,0,0,0)", duration: 0.3, ease: "none", immediateRender: false },
          t + MOVE_AT,
        );
      }
      tl.to(ghost, { autoAlpha: 1, duration: 0.3 }, t + MOVE_AT + MOVE);
    });
    tl.set({}, {}, SCENES.length * len);

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

  const gridW = 10 * DOT + 9 * DOT_GAP;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <style>{`
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-650.woff2) format("woff2");font-weight:650;font-display:block}
@font-face{font-family:"TWK Lausanne Pan";src:url(/lab-fonts/TWKLausannePan-350.woff2) format("woff2");font-weight:350;font-display:block}
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
        {SCENES.map((s) => (
          <div key={s.key} data-scene={s.key} style={{ position: "absolute", inset: 0 }}>
            <p
              style={{
                position: "absolute",
                left: 64,
                top: 76,
                margin: 0,
                fontSize: 50,
                fontWeight: 650,
                lineHeight: "58px",
                letterSpacing: "-0.01em",
              }}
            >
              {s.label}
            </p>

            {s.kind === "bar" ? (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: BAR.x,
                    top: BAR.y,
                    width: BAR.w,
                    height: BAR.h,
                    boxShadow: `inset 0 0 0 1.5px ${HAIR}`,
                  }}
                />
                <div
                  data-fill={s.key}
                  style={{
                    position: "absolute",
                    left: BAR.x,
                    top: BAR.y,
                    width: BAR.w,
                    height: BAR.h,
                    background: "#000",
                    transformOrigin: "0 50%",
                  }}
                />
                <p
                  data-ghost={s.key}
                  style={{
                    position: "absolute",
                    right: SQ - BAR.x - BAR.w,
                    top: BAR.y + BAR.h + 20,
                    margin: 0,
                    fontSize: 32,
                    fontWeight: 350,
                    color: HAIR,
                  }}
                >
                  {fmt(s.from, s.unit)}
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: 64,
                    top: 236,
                    width: gridW,
                    display: "grid",
                    gridTemplateColumns: `repeat(10, ${DOT}px)`,
                    gap: DOT_GAP,
                  }}
                >
                  {Array.from({ length: s.from }, (_, d) => (
                    <span
                      key={d}
                      data-drop={d >= s.to ? s.key : undefined}
                      style={{
                        width: DOT,
                        height: DOT,
                        borderRadius: "50%",
                        background: "#000",
                        boxShadow: `inset 0 0 0 1.5px ${d >= s.to ? HAIR : "#000"}`,
                      }}
                    />
                  ))}
                </div>
                <p
                  data-ghost={s.key}
                  style={{
                    position: "absolute",
                    left: 64 + gridW + 32,
                    top: 236 + 9 * (DOT + DOT_GAP) + 4,
                    margin: 0,
                    fontSize: 32,
                    fontWeight: 350,
                    color: HAIR,
                  }}
                >
                  {fmt(s.from, s.unit)}
                </p>
              </>
            )}

            <p
              data-num={s.key}
              style={{
                position: "absolute",
                left: 58,
                bottom: 48,
                margin: 0,
                fontSize: 240,
                fontWeight: 650,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(s.from, s.unit)}
            </p>
            {s.note ? (
              <p
                data-ghost={s.key}
                style={{
                  position: "absolute",
                  left: 64,
                  top: BAR.y + BAR.h + 20,
                  margin: 0,
                  fontSize: 32,
                  fontWeight: 350,
                  color: HAIR,
                }}
              >
                {s.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
