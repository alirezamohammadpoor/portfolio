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
import JsonLd from "@/components/seo/JsonLd";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alirezamp.com";

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

  const canonicalPath = `/project/${project.slug?.current ?? slug}`;

  return {
    title: project.title,
    description: project.shortDescription ?? undefined,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      title: project.title ?? undefined,
      description: project.shortDescription ?? undefined,
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title ?? undefined,
      description: project.shortDescription ?? undefined,
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  const canonicalPath = `/project/${project.slug?.current ?? slug}`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

  const creativeWorkLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.shortDescription ?? undefined,
    url: canonicalUrl,
    dateModified: project._updatedAt ?? undefined,
    author: {
      "@type": "Person",
      name: "Ali Reza Mohammad Poor",
      url: siteUrl,
    },
    ...(project.siteUrl && {
      sameAs: [project.siteUrl],
      workExample: { "@type": "WebSite", url: project.siteUrl },
    }),
    ...(Array.isArray(project.techStack) &&
      project.techStack.length > 0 && {
        keywords: project.techStack.join(", "),
      }),
  };

  return (
    <>
      <JsonLd data={creativeWorkLd} />
      <ProjectPageClient key={slug} project={project} nextProject={project.nextProject} prevProject={project.prevProject} />
    </>
  );
}
