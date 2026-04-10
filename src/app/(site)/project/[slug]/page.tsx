import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import {
  PROJECT_BY_SLUG_QUERY,
  PROJECT_SLUGS_QUERY,
} from "@/sanity/lib/queries";
import ProjectPageClient from "@/components/project/ProjectPageClient";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

const getProject = cache(async (slug: string) => {
  const { data } = await sanityFetch({
    query: PROJECT_BY_SLUG_QUERY,
    params: { slug },
  });
  return data;
});

export async function generateStaticParams() {
  return client.fetch(PROJECT_SLUGS_QUERY);
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) return {};

  return {
    title: project.title,
    description: project.shortDescription,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  return <ProjectPageClient key={slug} project={project} nextProject={project.nextProject} />;
}
