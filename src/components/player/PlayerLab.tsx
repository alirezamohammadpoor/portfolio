"use client";

import { useState } from "react";
import VideoPlayer, {
  type ControlLanguage,
  type Layout,
  type Tracker,
} from "@/components/player/VideoPlayer";

interface Clip {
  src: string;
  label?: string | null;
}

/** The six Figma alternatives, as language × tracker pairs. */
const ALTS: { key: string; title: string; language: ControlLanguage; tracker: Tracker }[] = [
  { key: "A", title: "Line icons + edge line", language: "icons", tracker: "line" },
  { key: "B", title: "Line icons + ring", language: "icons", tracker: "ring" },
  { key: "C", title: "Text buttons + counter", language: "text", tracker: "counter" },
  { key: "D", title: "Pills + edge line", language: "pills", tracker: "line" },
  { key: "E", title: "Icon + word + edge line", language: "iconword", tracker: "line" },
  { key: "F", title: "Pills + ring", language: "pills", tracker: "ring" },
];

export default function PlayerLab({ masters, journal }: { masters: Clip[]; journal: Clip[] }) {
  const [alt, setAlt] = useState(0);
  const [layout, setLayout] = useState<Layout | "both">("both");
  const a = ALTS[alt];
  const master = masters[0];
  const master2 = masters[1] ?? masters[0];
  const clip = journal.find((c) => /tekken/i.test(c.src)) ?? journal[0];
  const longClip = journal.find((c) => c !== clip) ?? journal[0];

  const pill = "inline-flex h-9 items-center rounded-full px-4 text-sub uppercase font-medium text-primary transition-colors active:scale-[0.97]";

  return (
    <main className="px-margin pb-24 pt-[calc(var(--header-height)+24px)]">
      <header className="mb-8 flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-h3">Player lab</h1>
        {ALTS.map((x, i) => (
          <button key={x.key} type="button" onClick={() => setAlt(i)} className={`${pill} ${i === alt ? "bg-pistachio" : "bg-white border border-tertiary"}`} aria-pressed={i === alt}>
            {x.key} · {x.title}
          </button>
        ))}
        <span className="mx-2 text-secondary">|</span>
        {(["both", "strip", "overlay"] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLayout(l)} className={`${pill} ${l === layout ? "bg-pistachio" : "bg-white border border-tertiary"}`} aria-pressed={l === layout}>
            {l}
          </button>
        ))}
      </header>

      <p className="mb-10 max-w-[60ch] text-body text-secondary">
        Real files, real tokens. Masters are silent, so the sound control hides itself; the journal clips have audio and show it. Scroll to see in-view autoplay and pause.
      </p>

      {(layout === "both" || layout === "strip") && (
        <section className="mb-16">
          <h2 className="mb-4 text-sub font-medium uppercase text-secondary">Journal · strip · laptop 696 / mobile 366</h2>
          <div className="flex flex-wrap items-start gap-10">
            {master && (
              <VideoPlayer src={master.src} label={master.label ?? "Nelson Garden"} layout="strip" language={a.language} tracker={a.tracker} width={696} trackId="lab-master-strip" />
            )}
            {master2 && (
              <VideoPlayer src={master2.src} label="PLP → cart" layout="strip" language={a.language} tracker={a.tracker} width={366} trackId="lab-master-strip-m" />
            )}
          </div>
          <h2 className="mb-4 mt-12 text-sub font-medium uppercase text-secondary">Journal · strip · the clips that are actually in the journal today (audio, 9:16 and 16:9)</h2>
          <div className="flex flex-wrap items-start gap-10">
            {clip && (
              <VideoPlayer src={clip.src} label={clip.label ?? "Journal clip"} layout="strip" language={a.language} tracker={a.tracker} width={366} trackId="lab-journal-9x16" />
            )}
            {longClip && (
              <VideoPlayer src={longClip.src} label={longClip.label ?? "Journal clip"} layout="strip" language={a.language} tracker={a.tracker} width={696} trackId="lab-journal-16x9" />
            )}
          </div>
        </section>
      )}

      {(layout === "both" || layout === "overlay") && (
        <section className="mb-16">
          <h2 className="mb-4 text-sub font-medium uppercase text-secondary">Project page · overlay in the 4:3 box · caption by the block</h2>
          <div className="flex flex-wrap items-start gap-10">
            {master && (
              <figure className="flex w-[696px] max-w-full flex-col gap-2">
                <VideoPlayer src={master.src} aspect="4/3" layout="overlay" language={a.language} tracker={a.tracker} trackId="lab-master-overlay" />
                <figcaption className="text-sub text-secondary">Nelson Garden homepage on the .com gateway preview, 2560×1920 capture.</figcaption>
              </figure>
            )}
            {master2 && (
              <figure className="flex w-[366px] max-w-full flex-col gap-2">
                <VideoPlayer src={master2.src} aspect="4/3" layout="overlay" language={a.language} tracker={a.tracker} trackId="lab-master-overlay-m" />
                <figcaption className="text-sub text-secondary">Mobile menu → PLP.</figcaption>
              </figure>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
