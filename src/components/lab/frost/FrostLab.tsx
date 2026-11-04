"use client";

import { useState, type CSSProperties } from "react";
import InlineClip from "@/components/project/InlineClip";

// Defaults mirror the tokens in globals.css; the sliders override them on the
// preview only, through the same CSS variables the frost utilities read.
const TINTS = [
  { name: "Pistachio", rgb: "190 220 170" },
  { name: "Light pistachio", rgb: "216 234 204" },
  { name: "Page grey", rgb: "247 247 247" },
  { name: "White", rgb: "255 255 255" },
] as const;

type Frost = { tint: number; opacity: number; blur: number };

function Controls({ label, value, onChange }: { label: string; value: Frost; onChange: (f: Frost) => void }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-body">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {TINTS.map((t, i) => (
          <button
            key={t.name}
            type="button"
            aria-pressed={value.tint === i}
            onClick={() => onChange({ ...value, tint: i })}
            className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sub ${value.tint === i ? "border-primary" : "border-tertiary"}`}
          >
            <span className="size-3 rounded-full" style={{ background: `rgb(${t.rgb})` }} />
            {t.name}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3 text-sub">
        <span className="w-16">Fill {Math.round(value.opacity * 100)}%</span>
        <input type="range" min={0} max={1} step={0.01} value={value.opacity} onChange={(e) => onChange({ ...value, opacity: +e.target.value })} className="flex-1" />
      </label>
      <label className="flex items-center gap-3 text-sub">
        <span className="w-16">Blur {value.blur}px</span>
        <input type="range" min={0} max={80} step={1} value={value.blur} onChange={(e) => onChange({ ...value, blur: +e.target.value })} className="flex-1" />
      </label>
    </fieldset>
  );
}

const css = (f: Frost) => `rgb(${TINTS[f.tint].rgb} / ${f.opacity})`;

export default function FrostLab({ clip }: { clip: string }) {
  const [strong, setStrong] = useState<Frost>({ tint: 2, opacity: 0.88, blur: 40 });
  const [soft, setSoft] = useState<Frost>({ tint: 0, opacity: 0.65, blur: 20 });
  const [open, setOpen] = useState(false);

  const vars = {
    "--color-frost-strong": css(strong),
    "--blur-frost-strong": `${strong.blur}px`,
    "--color-frost-soft": css(soft),
    "--blur-frost-soft": `${soft.blur}px`,
  } as CSSProperties;

  const tokens = Object.entries(vars as Record<string, string>)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n");

  return (
    <div className="px-margin pt-8 pb-24">
      <h1 className="text-h2">Frost</h1>
      <p className="mt-2 text-body text-secondary">The overlay and pill frost over a real clip. Values start at the live tokens.</p>

      <div className="mt-10 grid grid-cols-1 gap-10 desktop:grid-cols-[1fr_20rem]">
        <div className="relative aspect-[16/10] overflow-hidden bg-bg" style={vars}>
          <InlineClip src={clip} label="Stronger landing" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-3 z-50 flex justify-center">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="frost-soft inline-flex h-9 items-center gap-2 rounded-full px-4 text-body text-primary active:scale-[0.97]"
            >
              Stronger <span aria-hidden="true" className="text-[0.5rem]">{open ? "▲" : "▼"}</span>
            </button>
          </div>
          <span className="frost-soft absolute bottom-3 left-3 z-50 inline-flex h-9 items-center rounded-full px-4 text-body tabular-nums">
            2 / 5
          </span>
          <div
            className="frost-strong absolute inset-0 z-40 flex items-center justify-center p-8 transition-opacity duration-200"
            style={{ opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden" }}
          >
            <p className="max-w-[32rem] text-center text-h3 text-primary">
              The project summary sits here, over the gallery.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <Controls label="Strong (overlay)" value={strong} onChange={setStrong} />
          <Controls label="Soft (pills)" value={soft} onChange={setSoft} />
          <pre className="whitespace-pre-wrap rounded-[4px] bg-tertiary/50 p-3 text-sub">{tokens}</pre>
        </div>
      </div>
    </div>
  );
}
