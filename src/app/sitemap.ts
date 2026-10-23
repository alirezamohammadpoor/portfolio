import { cacheLife, cacheTag } from "next/cache";
import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import {
  JOURNAL_POST_SITEMAP_QUERY,
  PROJECT_SITEMAP_QUERY,
} from "@/sanity/lib/queries";
import { SITE_URL as siteUrl } from "@/lib/site";

type SitemapEntry = { slug: string | null; _updatedAt?: string | null };

// Returns undefined rather than "now" when the timestamp is missing or
// unparseable: lastModified is optional, and omitting it is more honest than
// claiming the document changed at build time.
function parseUpdatedAt(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("max");
  cacheTag("project");
  cacheTag("journalPost");

  const [projectEntries, journalEntries] = await Promise.all([
    client.fetch(PROJECT_SITEMAP_QUERY),
    client.fetch(JOURNAL_POST_SITEMAP_QUERY),
  ]);

  const allUpdates = [...(projectEntries ?? []), ...(journalEntries ?? [])]
    .map((e: SitemapEntry) => parseUpdatedAt(e._updatedAt)?.getTime())
    .filter((t): t is number => typeof t === "number");
  // Static routes don't have their own _updatedAt; use the most recent
  // content update as a proxy so the homepage and listing pages reflect
  // when their content actually changed.
  const latestContentUpdate = allUpdates.length
    ? new Date(Math.max(...allUpdates))
    : undefined;

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
      lastModified: parseUpdatedAt(entry._updatedAt),
      priority: 0.7,
    }));

  const journalRoutes: MetadataRoute.Sitemap = (journalEntries ?? [])
    .filter((entry: SitemapEntry): entry is SitemapEntry & { slug: string } =>
      Boolean(entry.slug),
    )
    .map((entry) => ({
      url: `${siteUrl}/journal/${entry.slug}`,
      lastModified: parseUpdatedAt(entry._updatedAt),
      priority: 0.7,
    }));

  return [...staticRoutes, ...projectRoutes, ...journalRoutes];
}
