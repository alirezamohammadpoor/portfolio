import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject, getProjects } from "@/sanity/lib/data";
import ProjectPageClient from "@/components/project/ProjectPageClient";
import PebbleLab from "@/components/lab/pebble/PebbleLab";

// The project row in the Pebble (Ali, 11-17: Docked feels cramped and
// unstructured): three layouts on the real stage, behind the prototype
// picker. Not linked, not indexed; delete once one is promoted.
export const metadata: Metadata = {
  title: "Lab — Project row in the Pebble",
  robots: { index: false, follow: false },
};

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.filter((p) => p.slug?.current).map((p) => ({ slug: p.slug!.current! }));
}

type Params = Promise<{ slug: string }>;

async function Lab({ params }: { params: Params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();
  return (
    <PebbleLab>
      <ProjectPageClient key={slug} project={project} nextProject={project.nextProject} />
    </PebbleLab>
  );
}

export default function ProjectLabPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <Lab params={params} />
    </Suspense>
  );
}
