import type { Metadata } from "next";
import { draftMode } from "next/headers";
import {
  getJournalPage,
  getJournalPageDraft,
  getJournalPosts,
  getJournalPostsDraft,
} from "@/sanity/lib/data";
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
  const { isEnabled: isDraft } = await draftMode();
  const [posts, page] = await Promise.all([
    isDraft ? getJournalPostsDraft() : getJournalPosts(),
    isDraft ? getJournalPageDraft() : getJournalPage(),
  ]);

  return <JournalContent posts={posts} description={page?.description} />;
}
