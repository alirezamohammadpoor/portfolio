import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import {
  JOURNAL_POST_SLUGS_QUERY,
  PROJECT_SLUGS_QUERY,
} from "@/sanity/lib/queries";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alirezamp.com";

type SlugOnly = { slug: string | null } | { slug: { current: string } | null };

function extractSlug(entry: SlugOnly): string | null {
  const raw = (entry as { slug: unknown }).slug;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "current" in raw) {
    return (raw as { current: string }).current;
  }
  return null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projectSlugs, journalSlugs] = await Promise.all([
    client.fetch(PROJECT_SLUGS_QUERY),
    client.fetch(JOURNAL_POST_SLUGS_QUERY),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, priority: 1 },
    { url: `${siteUrl}/about`, lastModified: now, priority: 0.8 },
    { url: `${siteUrl}/journal`, lastModified: now, priority: 0.8 },
  ];

  const projectRoutes: MetadataRoute.Sitemap = (projectSlugs ?? [])
    .map((entry: SlugOnly) => extractSlug(entry))
    .filter((slug: string | null): slug is string => Boolean(slug))
    .map((slug: string) => ({
      url: `${siteUrl}/project/${slug}`,
      lastModified: now,
      priority: 0.7,
    }));

  const journalRoutes: MetadataRoute.Sitemap = (journalSlugs ?? [])
    .map((entry: SlugOnly) => extractSlug(entry))
    .filter((slug: string | null): slug is string => Boolean(slug))
    .map((slug: string) => ({
      url: `${siteUrl}/journal/${slug}`,
      lastModified: now,
      priority: 0.7,
    }));

  return [...staticRoutes, ...projectRoutes, ...journalRoutes];
}
