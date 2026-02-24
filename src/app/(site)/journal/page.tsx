import type { Metadata } from "next";
import { sanityFetch } from "@/sanity/lib/live";
import { JOURNAL_POSTS_QUERY } from "@/sanity/lib/queries";
import JournalContent from "@/components/journal/JournalContent";

export const metadata: Metadata = {
  title: "Journal",
};

export default async function JournalPage() {
  const { data: posts } = await sanityFetch({ query: JOURNAL_POSTS_QUERY });

  return <JournalContent posts={posts} />;
}
