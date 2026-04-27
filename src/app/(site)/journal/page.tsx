import type { Metadata } from "next";
import { sanityFetch } from "@/sanity/lib/live";
import { JOURNAL_PAGE_QUERY, JOURNAL_POSTS_QUERY } from "@/sanity/lib/queries";
import JournalContent from "@/components/journal/JournalContent";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Insights and case studies from recent projects.",
  alternates: { canonical: "/journal" },
  openGraph: {
    type: "website",
    url: "/journal",
    title: "Journal",
    description:
      "Insights and case studies from recent projects.",
  },
};

export default async function JournalPage() {
  const [{ data: posts }, { data: page }] = await Promise.all([
    sanityFetch({ query: JOURNAL_POSTS_QUERY }),
    sanityFetch({ query: JOURNAL_PAGE_QUERY }),
  ]);

  return <JournalContent posts={posts} description={page?.description} />;
}
