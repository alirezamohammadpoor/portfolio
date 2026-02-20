import Link from "next/link";
import type { Project } from "@/types";
import TechStack from "@/components/project/TechStack";

interface ProjectDetailsProps {
  project: Project;
  index: number;
}

export default function ProjectDetails({ project, index }: ProjectDetailsProps) {
  return (
    <section className="flex h-full flex-col justify-between px-6 py-8">
      <div />
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-display text-primary">{project.title}</h2>
          <span className="text-display text-primary">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <p className="mt-4 text-body text-primary">
          {project.fullDescription || project.shortDescription}
        </p>
        <p className="mt-8 text-body text-primary">Tech stack</p>
        <TechStack items={project.techStack} />
      </div>
      <div className="flex items-center justify-between">
        {project.caseStudySlug && (
          <Link href={`/journal/${project.caseStudySlug}`} className="text-body text-primary">
            Case study
          </Link>
        )}
        {project.siteUrl && (
          <Link href={project.siteUrl} target="_blank" rel="noopener noreferrer" className="text-body text-primary">
            Visit website
          </Link>
        )}
      </div>
    </section>
  );
}
