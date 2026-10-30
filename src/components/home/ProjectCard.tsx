"use client";

import { useRef } from "react";
import { useTitleAnimation, useBodyAnimation } from "@/hooks/useTextAnimation";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";

interface ProjectCardProps {
  project: PROJECTS_QUERY_RESULT[number];
  /** Hold the text entrance (the home intro is still playing). */
  skip?: boolean;
}

export default function ProjectCard({ project, skip = false }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  // Runs on every snap (the card remounts), so it has to be quick enough to
  // finish before the next flick lands.
  useTitleAnimation(titleRef, cardRef, { duration: 0.45, skip });
  useBodyAnimation(descRef, cardRef, { duration: 0.4, delay: 0.08, skip });

  return (
    <div ref={cardRef}>
      <h2 ref={titleRef} className="text-h1 text-primary">
        {project.title}
      </h2>
      <p ref={descRef} className="mt-2 text-sub desktop:text-body text-primary">
        {project.shortDescription}
      </p>
    </div>
  );
}
