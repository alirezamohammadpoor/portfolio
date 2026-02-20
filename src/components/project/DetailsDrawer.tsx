"use client";

import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import TechStack from "./TechStack";

interface DetailsDrawerProps {
  project: NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
  isOpen: boolean;
}

export default function DetailsDrawer({ project, isOpen }: DetailsDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-10 z-30 bg-[rgba(233,243,226,0.95)] px-6 py-8 desktop:hidden">
      {project.fullDescription && (
        <p className="text-sub text-primary">{project.fullDescription}</p>
      )}
      {project.techStack && project.techStack.length > 0 && (
        <>
          <p className="mt-6 text-sub text-primary">Tech stack</p>
          <TechStack items={project.techStack} />
        </>
      )}
    </div>
  );
}
