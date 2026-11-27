import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { draftMode } from "next/headers";
import { getProject, isKnownSlug } from "@/sanity/lib/data";
import { CHAPTER_PAGE, LANDING_SIZES, galleryClip } from "@/lib/landing";
import { imageUrl } from "@/sanity/lib/image";
import { preloadPlainStill, preloadStill } from "@/sanity/lib/preloadStill";
import { PROJECT_SLUGS_QUERY } from "@/sanity/lib/queries";
import ProjectPageClient from "@/components/project/ProjectPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { ogImageUrl } from "@/sanity/lib/image";
import { SITE_URL as siteUrl, OPEN_GRAPH_BASE } from "@/lib/site";

type Fetched = NonNullable<Awaited<ReturnType<typeof getProject>>>;

const DESKTOP = "(min-width: 75rem)";

/**
 * The stage mounts in the browser (ProjectPageClient), so its first card's
 * still would only be asked for after hydration. Preloading it here starts
 * it with the HTML, as the same file ProjectStage then shows: an image card
 * through the loader (sizes LANDING_SIZES.stage, 70vw at its smallest), a
 * clip card's poster as is (1600 wide on a laptop, 900 on a phone, the
 * phone cut's poster when it has one). A gallery that plays in order shows
 * no posters, and a row of phones is left alone.
 */
function preloadFirstCard(project: Fetched) {
  const item = project.gallery?.[0];
  if (!item) return;
  if (item._type === "galleryImage") {
    if (item.image?.asset) preloadStill(imageUrl(item.image, 1600), { sizes: LANDING_SIZES.stage, minVw: 0.7 });
    return;
  }
  if (item._type !== "galleryVideo" || project.playInOrder) return;
  const desk = galleryClip(item, true).poster;
  const phone = galleryClip(item, false).poster;
  if (desk?.asset) preloadPlainStill(imageUrl(desk, 1600), DESKTOP);
  if (phone?.asset) preloadPlainStill(imageUrl(phone, 900), `not all and ${DESKTOP}`);
}

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return client.fetch(PROJECT_SLUGS_QUERY);
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  // The preview tab shows the draft's title and description too.
  const { isEnabled: isDraft } = await draftMode();
  const perspective = isDraft ? "drafts" : "published";
  if (!(await isKnownSlug("project", slug, perspective))) return {};
  const project = await getProject(slug, perspective);

  if (!project) return {};

  const canonicalPath = `/project/${project.slug?.current ?? slug}`;
  const seoTitle = project.seo?.title ?? project.title ?? undefined;
  const seoDescription =
    project.seo?.description ?? project.shortDescription ?? undefined;
  // Sanity ogImage override — when set, replaces the auto-generated
  // opengraph-image.tsx output. When empty, omitting `images` lets Next.js
  // fall back to the route's opengraph-image generator.
  const seoOgImage = project.seo?.ogImage?.asset
    ? ogImageUrl(project.seo.ogImage)
    : undefined;
  const ogImages = seoOgImage
    ? [{ url: seoOgImage, width: 1200, height: 630, alt: seoTitle }]
    : undefined;

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: canonicalPath },
    ...(project.seo?.noIndex && {
      robots: { index: false, follow: false },
    }),
    openGraph: {
      ...OPEN_GRAPH_BASE,
      type: "article",
      title: seoTitle,
      description: seoDescription,
      url: canonicalPath,
      ...(ogImages && { images: ogImages }),
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      ...(ogImages && { images: ogImages }),
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const { isEnabled: isDraft } = await draftMode();
  const perspective = isDraft ? "drafts" : "published";
  if (!(await isKnownSlug("project", slug, perspective))) notFound();
  const fetched = await getProject(slug, perspective);

  if (!fetched) notFound();
  // The chapter page is parked (CHAPTER_PAGE): its chapters, with their
  // asset documents, stay on the server instead of riding in every payload.
  const project = CHAPTER_PAGE ? fetched : { ...fetched, chapters: null };
  preloadFirstCard(project);

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
      <ProjectPageClient key={slug} project={project} nextProject={project.nextProject} />
    </>
  );
}
