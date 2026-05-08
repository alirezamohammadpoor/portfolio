import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import {
  JOURNAL_POST_SITEMAP_QUERY,
  PROJECT_SITEMAP_QUERY,
} from "@/sanity/lib/queries";
import { SITE_URL as siteUrl } from "@/lib/site";

type SitemapEntry = { slug: string | null; _updatedAt?: string | null };

function parseUpdatedAt(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projectEntries, journalEntries] = await Promise.all([
    client.fetch(PROJECT_SITEMAP_QUERY),
    client.fetch(JOURNAL_POST_SITEMAP_QUERY),
  ]);

  const now = new Date();
  const allUpdates = [...(projectEntries ?? []), ...(journalEntries ?? [])]
    .map((e: SitemapEntry) => parseUpdatedAt(e._updatedAt, now).getTime())
    .filter((t) => t > 0);
  // Static routes don't have their own _updatedAt; use the most recent
  // content update as a proxy so the homepage and listing pages reflect
  // when their content actually changed.
  const latestContentUpdate = allUpdates.length
    ? new Date(Math.max(...allUpdates))
    : now;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: latestContentUpdate, priority: 1 },
    { url: `${siteUrl}/about`, lastModified: latestContentUpdate, priority: 0.8 },
    { url: `${siteUrl}/journal`, lastModified: latestContentUpdate, priority: 0.8 },
  ];

  const projectRoutes: MetadataRoute.Sitemap = (projectEntries ?? [])
    .filter((entry: SitemapEntry): entry is SitemapEntry & { slug: string } =>
      Boolean(entry.slug),
    )
    .map((entry) => ({
      url: `${siteUrl}/project/${entry.slug}`,
      lastModified: parseUpdatedAt(entry._updatedAt, now),
      priority: 0.7,
    }));

  const journalRoutes: MetadataRoute.Sitemap = (journalEntries ?? [])
    .filter((entry: SitemapEntry): entry is SitemapEntry & { slug: string } =>
      Boolean(entry.slug),
    )
    .map((entry) => ({
      url: `${siteUrl}/journal/${entry.slug}`,
      lastModified: parseUpdatedAt(entry._updatedAt, now),
      priority: 0.7,
    }));

  return [...staticRoutes, ...projectRoutes, ...journalRoutes];
}
