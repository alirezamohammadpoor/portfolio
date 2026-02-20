import Link from "next/link";
import type { JOURNAL_POSTS_QUERY_RESULT } from "@/sanity/types";

interface JournalCardProps {
  post: JOURNAL_POSTS_QUERY_RESULT[number];
}

export default function JournalCard({ post }: JournalCardProps) {
  return (
    <Link href={`/journal/${post.slug?.current}`} className="block">
      <div className="aspect-[444/594] w-full bg-tertiary" />
      <h3 className="mt-4 text-h2 text-primary">{post.title}</h3>
      <p className="mt-2 text-body text-primary">{post.excerpt}</p>
    </Link>
  );
}
