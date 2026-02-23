import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { JOURNAL_POSTS_QUERY } from "@/sanity/lib/queries";
import JournalContent from "@/components/journal/JournalContent";

export const metadata: Metadata = {
  title: "Journal",
};

export default async function JournalPage() {
  const posts = await client.fetch(JOURNAL_POSTS_QUERY);

  return <JournalContent posts={posts} />;
}
