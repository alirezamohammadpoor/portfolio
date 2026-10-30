"use client";

import { useEffect, useState } from "react";
import ProjectPageClient from "@/components/project/ProjectPageClient";
import { SwitcherMotionContext, type MobileVariant, type SwitcherMotion } from "@/components/project/ProjectChapters";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

function variantFromHash(): MobileVariant {
  const h = typeof window === "undefined" ? "" : window.location.hash.replace("#", "");
  return h === "offset" || h === "stack" ? h : "default";
}

// The three phone motions for the test switcher (Figma pf 27:1055-27:1136).
const MOTIONS: [SwitcherMotion, string][] = [
  ["bar", "M1 bar"],
  ["swipe", "M2 swipe"],
  ["arrows", "M3 arrows"],
];

/**
 * Lab only: the phone layout variant comes from the URL hash (#offset,
 * #stack); the switcher's phone motion from the toggle pinned to the bottom.
 */
export default function ChaptersLabClient({
  project,
  nextProject,
  prevProject,
}: {
  project: Project;
  nextProject?: Project["nextProject"];
  prevProject?: Project["prevProject"];
}) {
  const [variant, setVariant] = useState<MobileVariant>("default");
  const [motion, setMotion] = useState<SwitcherMotion>("bar");
  useEffect(() => {
    const read = () => setVariant(variantFromHash());
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return (
    <SwitcherMotionContext.Provider value={motion}>
      <ProjectPageClient
        key={`lab-chapters-${variant}-${motion}`}
        project={project}
        nextProject={nextProject}
        prevProject={prevProject}
        mobileVariant={variant}
      />
      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center desktop:hidden">
        <div className="flex rounded-full bg-primary p-1 text-sub text-bg shadow-lg">
          {MOTIONS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={motion === key}
              onClick={() => setMotion(key)}
              className={`h-8 rounded-full px-3 ${motion === key ? "bg-pistachio text-primary" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </SwitcherMotionContext.Provider>
  );
}
