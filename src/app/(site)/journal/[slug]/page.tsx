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
  return { title: post.title };
}

export default async function JournalPostPage({
  params,
}: JournalPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return <JournalPost key={post._id} post={post} relatedPosts={post.relatedPosts ?? []} />;
}
