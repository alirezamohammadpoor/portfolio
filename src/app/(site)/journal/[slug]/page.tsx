import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import {
  JOURNAL_POST_BY_SLUG_QUERY,
  JOURNAL_POST_SLUGS_QUERY,
} from "@/sanity/lib/queries";

import JournalPost from "@/components/journal/JournalPost";
import JsonLd from "@/components/seo/JsonLd";
import { ogImageUrl } from "@/sanity/lib/image";
import { SITE_URL as siteUrl } from "@/lib/site";

interface JournalPostPageProps {
  params: Promise<{ slug: string }>;
}

const getPost = cache(async (slug: string) => {
  const { data } = await sanityFetch({
    query: JOURNAL_POST_BY_SLUG_QUERY,
    params: { slug },
  });
  return data;
});

export async function generateStaticParams() {
  return client.fetch(JOURNAL_POST_SLUGS_QUERY);
}

export async function generateMetadata({
  params,
}: JournalPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post Not Found" };

  const canonicalPath = `/journal/${post.slug?.current ?? slug}`;
  const seoTitle = post.seo?.title ?? post.title ?? undefined;
  const seoDescription = post.seo?.description ?? post.excerpt ?? undefined;
  // Sanity ogImage override — when set, replaces the auto-generated
  // opengraph-image.tsx output. When empty, falls back to the generator.
  const seoOgImage = post.seo?.ogImage?.asset
    ? ogImageUrl(post.seo.ogImage)
    : undefined;
  const ogImages = seoOgImage
    ? [{ url: seoOgImage, width: 1200, height: 630, alt: seoTitle }]
    : undefined;

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: canonicalPath },
    ...(post.seo?.noIndex && {
      robots: { index: false, follow: false },
    }),
    openGraph: {
      type: "article",
      title: seoTitle,
      description: seoDescription,
      url: canonicalPath,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post._updatedAt ?? undefined,
      authors: ["Ali Reza Mohammad Poor"],
      tags: post.tags ?? undefined,
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

export default async function JournalPostPage({
  params,
}: JournalPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const canonicalPath = `/journal/${post.slug?.current ?? slug}`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

  const blogPostingLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post._updatedAt ?? post.publishedAt ?? undefined,
    author: {
      "@type": "Person",
      name: "Ali Reza Mohammad Poor",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    url: canonicalUrl,
    keywords: Array.isArray(post.tags) ? post.tags.join(", ") : undefined,
  };

  return (
    <>
      <JsonLd data={blogPostingLd} />
      <JournalPost key={post._id} post={post} relatedPosts={post.relatedPosts ?? []} />
    </>
  );
}
