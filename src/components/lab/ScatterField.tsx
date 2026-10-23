"use client";

/**
 * /lab/scatter — a pannable field of project tiles with three proximity cues
 * to compare: reveal, paint trail, magnetic. Prototype only: no SEO, no a11y
 * polish, no mobile tuning yet. Toggle cues top-right; drag or wheel to pan.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";

type Cue = "reveal" | "paint" | "magnetic";

// Positions in grid units on a 24-column × 18-row field (field = 2× viewport
// wide, 2.4× tall). Spans 6–8 of 24 = 720–960 px wide at 1440 (Ali: bigger).
const LAYOUT = [
  { c: 1, r: 1, span: 7 },
  { c: 15, r: 2, span: 8 },
  { c: 4, r: 7, span: 6 },
  { c: 16, r: 8, span: 7 },
  { c: 1, r: 13, span: 8 },
  { c: 13, r: 14, span: 6 },
];

const NEAR = 320; // px radius where cues react

export default function ScatterField({
  projects,
}: {
  projects: PROJECTS_QUERY_RESULT;
}) {
  const [cue, setCue] = useState<Cue>("reveal");
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const labelRef = useRef<HTMLDivElement>(null);
  const chevronRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pan = useRef({ x: 0, y: 0, dragging: false, lastX: 0, lastY: 0, vx: 0, vy: 0 });
  const pointer = useRef({ x: -9999, y: -9999, active: false });

  // Six tiles: real projects first, then repeats marked as placeholders.
  const tiles = useMemo(() => {
    const out: { p: PROJECTS_QUERY_RESULT[number]; placeholder: boolean }[] = [];
    for (let i = 0; i < LAYOUT.length; i++) {
      const p = projects[i % Math.max(projects.length, 1)];
      if (!p) break;
      out.push({ p, placeholder: i >= projects.length });
    }
    return out;
  }, [projects]);

  // Field size, pan clamp, drag + wheel.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const W = () => window.innerWidth * 2;
    const H = () => window.innerHeight * 2.4;
    const apply = () => {
      const maxX = 0, minX = window.innerWidth - W();
      const maxY = 0, minY = window.innerHeight - H();
      pan.current.x = Math.min(maxX, Math.max(minX, pan.current.x));
      pan.current.y = Math.min(maxY, Math.max(minY, pan.current.y));
      field.style.transform = `translate3d(${pan.current.x}px, ${pan.current.y}px, 0)`;
    };
    // start centred
    pan.current.x = -(W() - window.innerWidth) / 2;
    pan.current.y = -(H() - window.innerHeight) / 2;
    apply();

    const onDown = (e: PointerEvent) => {
      pan.current.dragging = true;
      pan.current.lastX = e.clientX;
      pan.current.lastY = e.clientY;
      pan.current.vx = pan.current.vy = 0;
      document.body.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      pointer.current.active = true;
      if (!pan.current.dragging) return;
      const dx = e.clientX - pan.current.lastX;
      const dy = e.clientY - pan.current.lastY;
      pan.current.vx = dx; pan.current.vy = dy;
      pan.current.x += dx; pan.current.y += dy;
      pan.current.lastX = e.clientX; pan.current.lastY = e.clientY;
      apply();
    };
    const onUp = () => {
      pan.current.dragging = false;
      document.body.style.cursor = "";
      // inertia
      let { vx, vy } = pan.current;
      const step = () => {
        vx *= 0.92; vy *= 0.92;
        if (Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) return;
        pan.current.x += vx; pan.current.y += vy; apply();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      pan.current.x -= e.deltaX; pan.current.y -= e.deltaY; apply();
    };
    const onLeave = () => { pointer.current.active = false; };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", apply);
    };
  }, []);

  // Per-frame cue update.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    let raf = 0;
    const paintColors = ["190,220,170", "216,234,204", "192,57,43"];
    let paintIdx = 0;

    const tick = () => {
      const px = pointer.current.x, py = pointer.current.y;
      let nearest = { d: Infinity, i: -1, cx: 0, cy: 0 };
      const edges = { left: Infinity, right: Infinity, top: Infinity, bottom: Infinity };

      tileRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const d = Math.hypot(px - cx, py - cy);
        if (d < nearest.d) nearest = { d, i, cx, cy };
        const t = Math.max(0, 1 - d / NEAR); // 0 far → 1 near
        const video = el.querySelector("video");

        if (cue === "reveal") {
          el.style.opacity = String(0.35 + 0.65 * t);
          el.style.filter = `grayscale(${1 - t})`;
          el.style.transform = `scale(${0.96 + 0.04 * t})`;
          if (video) { if (t > 0.5 && video.paused) video.play().catch(() => {}); else if (t <= 0.5 && !video.paused) video.pause(); }
        } else if (cue === "magnetic") {
          el.style.opacity = "1"; el.style.filter = "none";
          const pull = d < 150 ? (1 - d / 150) * 16 : 0;
          const ang = Math.atan2(py - cy, px - cx);
          el.style.transform = `translate(${Math.cos(ang) * pull}px, ${Math.sin(ang) * pull}px)`;
          if (video) { if (d < 150 && video.paused) video.play().catch(() => {}); else if (d >= 150 && !video.paused) video.pause(); }
        } else {
          el.style.opacity = "1"; el.style.filter = "none"; el.style.transform = "none";
          if (video) { if (t > 0.3 && video.paused) video.play().catch(() => {}); else if (t <= 0.3 && !video.paused) video.pause(); }
        }

        // off-screen distance per edge, for chevrons
        if (r.right < 0) edges.left = Math.min(edges.left, -r.right);
        if (r.left > window.innerWidth) edges.right = Math.min(edges.right, r.left - window.innerWidth);
        if (r.bottom < 0) edges.top = Math.min(edges.top, -r.bottom);
        if (r.top > window.innerHeight) edges.bottom = Math.min(edges.bottom, r.top - window.innerHeight);
      });

      // chevrons brighten as the nearest off-screen tile gets closer (reveal + magnetic)
      (Object.keys(edges) as (keyof typeof edges)[]).forEach((k) => {
        const el = chevronRefs.current[k]; if (!el) return;
        const dist = edges[k];
        const show = cue !== "paint" && dist !== Infinity;
        el.style.opacity = show ? String(Math.max(0.15, 1 - dist / 900)) : "0";
      });

      // cursor label (magnetic)
      const label = labelRef.current;
      if (label) {
        const show = cue === "magnetic" && nearest.i >= 0 && nearest.d < 150;
        label.style.opacity = show ? "1" : "0";
        label.style.transform = `translate(${px + 16}px, ${py + 16}px)`;
        if (show) label.textContent = tiles[nearest.i]?.p.title ?? "";
      }

      // paint trail
      if (ctx && canvas) {
        if (cue === "paint") {
          ctx.fillStyle = "rgba(247,247,247,0.035)"; // slow fade to bg
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (pointer.current.active && !pan.current.dragging) {
            const near = Math.max(0, 1 - nearest.d / NEAR);
            const radius = 40 + near * 90;
            const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
            const col = paintColors[paintIdx % paintColors.length];
            g.addColorStop(0, `rgba(${col},${0.18 + near * 0.25})`);
            g.addColorStop(1, `rgba(${col},0)`);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill();
            if (Math.random() < 0.02) paintIdx++;
          }
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [cue, tiles]);

  return (
    <div className="fixed inset-0 top-[var(--header-height)] overflow-hidden bg-bg select-none cursor-grab">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
      <div
        ref={fieldRef}
        className="absolute left-0 top-0 grid will-change-transform"
        style={{
          width: "200vw",
          height: "240vh",
          gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
          gridTemplateRows: "repeat(18, minmax(0, 1fr))",
          columnGap: "var(--grid-gutter)",
          padding: "var(--grid-margin)",
        }}
      >
        {tiles.map(({ p, placeholder }, i) => {
          const L = LAYOUT[i];
          const cm = p.coverMedia;
          return (
            <a
              key={`${p._id}-${i}`}
              ref={(el) => { tileRefs.current[i] = el; }}
              href={placeholder ? "#" : `/project/${p.slug?.current}`}
              draggable={false}
              className="relative block overflow-hidden bg-black transition-[opacity,filter,transform] duration-300 ease-out"
              style={{ gridColumn: `${L.c} / span ${L.span}`, gridRow: `${L.r} / span 5`, aspectRatio: "16 / 10", alignSelf: "start" }}
            >
              {cm?.type === "video" && cm.video?.asset?._ref ? (
                <video src={fileUrl(cm.video.asset._ref)} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : cm?.image?.asset ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(cm.image, 1200)} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : null}
              <span className="absolute bottom-2 left-2 text-sub uppercase text-white mix-blend-difference">
                {String(i + 1).padStart(2, "0")} · {p.title}{placeholder ? " · placeholder" : ""}
              </span>
            </a>
          );
        })}
        <div className="col-start-9 col-span-8 row-start-10 self-center text-center text-primary pointer-events-none" style={{ fontSize: "clamp(32px,3vw,48px)", lineHeight: 1.15 }}>
          Ali Reza Mohammad Poor — Design engineer, Stockholm
        </div>
      </div>

      {(["left", "right", "top", "bottom"] as const).map((k) => (
        <div
          key={k}
          ref={(el) => { chevronRefs.current[k] = el; }}
          className="pointer-events-none absolute text-sub uppercase text-primary transition-opacity duration-300"
          style={{
            opacity: 0,
            left: k === "left" ? 16 : k === "right" ? undefined : "50%",
            right: k === "right" ? 16 : undefined,
            top: k === "top" ? 16 : k === "bottom" ? undefined : "50%",
            bottom: k === "bottom" ? 16 : undefined,
            transform: k === "left" || k === "right" ? "translateY(-50%)" : "translateX(-50%)",
          }}
        >
          {k === "left" ? "←" : k === "right" ? "→" : k === "top" ? "↑" : "↓"}
        </div>
      ))}

      <div ref={labelRef} className="pointer-events-none fixed left-0 top-0 rounded-full bg-pistachio px-3 py-1 text-sub uppercase text-primary opacity-0" />

      <div className="absolute right-4 top-4 flex gap-1 rounded-full bg-white p-1 text-sub uppercase">
        {(["reveal", "paint", "magnetic"] as Cue[]).map((c) => (
          <button
            key={c}
            onClick={() => setCue(c)}
            className={`rounded-full px-3 py-1 ${cue === c ? "bg-pistachio" : "hover:bg-tertiary"}`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
