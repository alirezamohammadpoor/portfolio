import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";

interface ProjectCardProps {
  project: PROJECTS_QUERY_RESULT[number];
  index: number;
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-h1 text-primary">{project.title}</h2>
        <span className="text-h1 text-primary">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <p className="mt-4 text-body text-primary">{project.shortDescription}</p>
    </div>
  );
}
