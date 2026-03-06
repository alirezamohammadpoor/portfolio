import { Link } from "next-view-transitions";
import Image from "next/image";
import type { JOURNAL_POSTS_QUERY_RESULT } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";

interface JournalCardProps {
  post: JOURNAL_POSTS_QUERY_RESULT[number];
}

export default function JournalCard({ post }: JournalCardProps) {
  return (
    <Link href={`/journal/${post.slug?.current}`} className="block">
      {post.coverImage?.asset && (
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-tertiary">
          <Image
            src={urlFor(post.coverImage).width(800).quality(85).url()}
            alt={post.title ?? ""}
            fill
            className="object-cover"
            sizes="(min-width: 75rem) 33vw, 100vw"
          />
        </div>
      )}
      <h3 className="mt-4 text-h2 text-primary">{post.title}</h3>
      <p className="mt-4 text-sub desktop:text-body text-primary">
        {post.excerpt}
      </p>
      {post.publishedAt && (
        <p className="mt-4 text-sub desktop:text-body text-secondary">
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
    </Link>
  );
}
