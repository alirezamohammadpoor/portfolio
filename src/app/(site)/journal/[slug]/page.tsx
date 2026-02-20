import JournalPostComponent from "@/components/journal/JournalPost";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { JOURNAL_POST_BY_SLUG_QUERY } from "@/sanity/lib/queries";

interface JournalPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: JournalPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await client.fetch(JOURNAL_POST_BY_SLUG_QUERY, { slug });
  if (!post) return { title: "Post Not Found" };
  return { title: post.title };
}

export default async function JournalPostPage({
  params,
}: JournalPostPageProps) {
  const { slug } = await params;
  const post = await client.fetch(JOURNAL_POST_BY_SLUG_QUERY, { slug });

  if (!post) {
    notFound();
  }

  return <JournalPostComponent post={post} />;
}
