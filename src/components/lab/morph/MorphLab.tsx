"use client";

import { useEffect, useRef, useState } from "react";
import TestMorph, { type TestMorphHandle } from "./TestMorph";
import { SCENES } from "./scenes";

/** Preview player: one frame per test, each with a frame-exact scrubber. */
function Player({ index }: { index: number }) {
  const scene = SCENES[index];
  const ref = useRef<TestMorphHandle>(null);
  const [t, setT] = useState(0);
  const [d, setD] = useState(1);

  return (
    <figure className="flex flex-col gap-3">
      <TestMorph
        ref={ref}
        scene={scene}
        autoplay
        className="w-full rounded-[4px]"
        onUpdate={(time, dur) => {
          setT(time);
          setD(dur);
        }}
      />
      <figcaption className="flex items-center gap-3 text-[12px] leading-4">
        <span className="min-w-0 flex-1 truncate">{scene.label}</span>
        <span className="tabular-nums text-[#8f8f8f]">
          {t.toFixed(2)} / {d.toFixed(2)} s
        </span>
        <button
          type="button"
          className="rounded-full border border-current px-3 py-1"
          onClick={() => ref.current?.replay()}
        >
          Replay
        </button>
      </figcaption>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round((t / d) * 1000) || 0}
        aria-label={`Scrub ${scene.label}`}
        onChange={(e) => {
          const tl = ref.current?.timeline();
          if (!tl) return;
          tl.pause();
          tl.progress(Number(e.target.value) / 1000);
        }}
      />
    </figure>
  );
}

/** `?solo=<key>`: one bare 390 x 844 stage with its timeline on
 * `window.__morph`, for frame-by-frame renders of a single test. */
function Solo({ sceneKey }: { sceneKey: string }) {
  const ref = useRef<TestMorphHandle>(null);
  const scene = SCENES.find((s) => s.key === sceneKey) ?? SCENES[0];
  useEffect(() => {
    (window as unknown as { __morph?: TestMorphHandle | null }).__morph = ref.current;
  });
  return (
    <div data-solo style={{ position: "fixed", left: 0, top: 0, width: 390, zIndex: 100 }}>
      <TestMorph ref={ref} scene={scene} />
    </div>
  );
}

export default function MorphLab({ solo }: { solo?: string }) {
  if (solo) return <Solo sceneKey={solo} />;
  return (
    <main className="px-4 pb-24 pt-24 desktop:px-6">
      <h1 className="mb-8 text-[32px] leading-10">Stronger tests: today to design</h1>
      <div className="grid grid-cols-2 gap-x-4 gap-y-12 desktop:grid-cols-6">
        {SCENES.map((s, i) => (
          <Player key={s.key} index={i} />
        ))}
      </div>
    </main>
  );
}
