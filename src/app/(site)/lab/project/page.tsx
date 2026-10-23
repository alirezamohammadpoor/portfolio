import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { PROJECT_BY_SLUG_QUERY } from "@/sanity/lib/queries";
import ProjectStage from "@/components/lab/ProjectStage";

// Prototype route for the mobile project stage. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Project stage",
  robots: { index: false, follow: false },
};

export default async function ProjectLabPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug = "zone-2" } = await searchParams;
  const project = await client.fetch(PROJECT_BY_SLUG_QUERY, { slug });
  if (!project) notFound();
  return <ProjectStage project={project} />;
}
