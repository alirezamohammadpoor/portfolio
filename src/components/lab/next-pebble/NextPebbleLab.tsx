"use client";

import Link from "next/link";
import { useEffect } from "react";
import { setNextInBar, useBarState, type NextInBar } from "@/lib/barProject";

const OPTIONS: { v: NextInBar; name: string; note: string }[] = [
  { v: "pill", name: "Now", note: "The Pebble keeps this project; the frost pill under the card." },
  {
    v: "swap",
    name: "A · Swap",
    note: "The Pebble names the next project, grey “Next project” under it, its cover and an arrow. The strip stays.",
  },
  {
    v: "carry",
    name: "B · Carry",
    note: "The Pebble keeps this project, grey “Next – name” under it, and an arrow.",
  },
  {
    v: "countdown",
    name: "C · Swap + countdown",
    note: "Like A; the arrow fills over the hold before the page moves on, and the strip steps aside.",
  },
  {
    v: "line",
    name: "D · One line",
    note: "The next project's name, then a grey “Next project” on the same line, and an arrow.",
  },
];

const isOption = (v: string | undefined): v is NextInBar => OPTIONS.some((o) => o.v === v);

/**
 * /lab/next-pebble (11-27): where the next project is offered once its
 * cover is centred at the end of a project. Pick an option, then open a
 * project and go to its last card; the choice holds while you move
 * between pages (a reload starts over at "Now").
 */
export default function NextPebbleLab({
  initial,
  projects,
}: {
  initial?: string;
  projects: { title: string | null; slug: string }[];
}) {
  const { nextInBar } = useBarState();
  useEffect(() => {
    setNextInBar(isOption(initial) ? initial : "countdown");
  }, [initial]);

  return (
    <main className="mx-auto max-w-[40rem] px-margin pt-40 pb-24 text-primary">
      <h1 className="text-body">Next project in the Pebble</h1>
      <p className="mt-2 text-sub text-secondary">
        Pick an option, open a project and go to its last card. The choice holds while you move
        between projects; a reload starts over.
      </p>
      <div role="radiogroup" aria-label="Option" className="mt-8 flex flex-col">
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={nextInBar === o.v}
            onClick={() => setNextInBar(o.v)}
            className="flex items-start gap-3 border-t border-black/[0.08] py-3 text-left"
          >
            <span
              aria-hidden
              className="mt-1.5 size-2.5 shrink-0 rounded-full"
              style={{
                background: nextInBar === o.v ? "var(--color-primary)" : "var(--color-tertiary)",
              }}
            />
            <span className="flex flex-col">
              <span>{o.name}</span>
              <span className="text-sub text-secondary">{o.note}</span>
            </span>
          </button>
        ))}
      </div>
      <h2 className="mt-12 text-sub text-secondary">Projects</h2>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {projects.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/project/${p.slug}`}
              className="underline decoration-black/20 underline-offset-4"
            >
              {p.title ?? p.slug}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
