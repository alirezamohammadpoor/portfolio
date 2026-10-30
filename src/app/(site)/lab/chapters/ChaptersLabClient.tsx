"use client";

import { useEffect, useState } from "react";
import ProjectPageClient from "@/components/project/ProjectPageClient";
import type { MobileVariant } from "@/components/project/ProjectChapters";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

function variantFromHash(): MobileVariant {
  const h = typeof window === "undefined" ? "" : window.location.hash.replace("#", "");
  return h === "offset" || h === "stack" ? h : "default";
}

/** Lab only: the phone layout variant comes from the URL hash (#offset, #stack). */
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
  useEffect(() => {
    const read = () => setVariant(variantFromHash());
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return (
    <ProjectPageClient
      key={`lab-chapters-${variant}`}
      project={project}
      nextProject={nextProject}
      prevProject={prevProject}
      mobileVariant={variant}
    />
  );
}
