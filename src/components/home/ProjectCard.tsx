"use client";

import { useRef } from "react";
import { useTitleAnimation, useBodyAnimation } from "@/hooks/useTextAnimation";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";

interface ProjectCardProps {
  project: PROJECTS_QUERY_RESULT[number];
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useTitleAnimation(titleRef, cardRef, { duration: 2, delay: 1 });
  useBodyAnimation(descRef, cardRef, { duration: 2, delay: 1.3 });

  return (
    <div ref={cardRef}>
      <h2 ref={titleRef} className="text-h1 text-primary">
        {project.title}
      </h2>
      <p ref={descRef} className="mt-4 text-body text-primary">
        {project.shortDescription}
      </p>
    </div>
  );
}
