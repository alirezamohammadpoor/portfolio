"use client";

import { useEffect, useState } from "react";
import ProjectPageClient from "@/components/project/ProjectPageClient";
import {
  SwitcherMotionContext,
  SwitcherStageContext,
  type MobileVariant,
  type SwitcherMotion,
  type SwitcherStage,
} from "@/components/project/ProjectChapters";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

function variantFromHash(): MobileVariant {
  const h = typeof window === "undefined" ? "" : window.location.hash.replace("#", "");
  return h === "offset" || h === "stack" ? h : "default";
}

// The three phone motions for the test switcher (Figma pf 27:1055-27:1136).
const MOTIONS: [SwitcherMotion, string][] = [
  ["bar", "M1"],
  ["swipe", "M2"],
  ["arrows", "M3"],
];
const STAGES: [SwitcherStage, string][] = [
  ["flow", "In page"],
  ["sticky", "Sticky"],
];

/**
 * Lab only: the phone layout variant comes from the URL hash (#offset,
 * #stack); the switcher's phone motion and stage from the toggle pinned to
 * the bottom.
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
  const [stage, setStage] = useState<SwitcherStage>("sticky");
  useEffect(() => {
    const read = () => setVariant(variantFromHash());
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return (
    <SwitcherMotionContext.Provider value={motion}>
    <SwitcherStageContext.Provider value={stage}>
      <ProjectPageClient
        key={`lab-chapters-${variant}-${motion}-${stage}`}
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
          <span className="mx-1 w-px self-stretch bg-bg/30" aria-hidden />
          {STAGES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={stage === key}
              onClick={() => setStage(key)}
              className={`h-8 rounded-full px-3 ${stage === key ? "bg-pistachio text-primary" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </SwitcherStageContext.Provider>
    </SwitcherMotionContext.Provider>
  );
}
