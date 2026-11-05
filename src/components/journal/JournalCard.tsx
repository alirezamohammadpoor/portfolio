import { Link } from "@/lib/viewTransitions";
import Image from "next/image";
import type { JOURNAL_POSTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl } from "@/sanity/lib/image";
import { formatPostDate } from "@/lib/dates";

interface JournalCardProps {
  post: JOURNAL_POSTS_QUERY_RESULT[number];
}

export default function JournalCard({ post }: JournalCardProps) {
  return (
    <Link href={`/journal/${post.slug?.current}`} className="flex h-full flex-col">
      {post.coverImage?.asset && (
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-tertiary">
          <Image
            src={imageUrl(post.coverImage, 800)}
            alt={post.coverImage.alt ?? ""}
            fill
            className="object-cover"
            sizes="(min-width: 75rem) 33vw, 100vw"
          />
        </div>
      )}
      <h2 className="mt-4 text-h2 text-primary">{post.title}</h2>
      <p className="mt-4 text-sub desktop:text-body text-primary">
        {post.excerpt}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-6">
        {post.publishedAt && (
          <span className="text-sub desktop:text-body text-primary">
            {formatPostDate(post.publishedAt)}
          </span>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="whitespace-nowrap rounded-full bg-pistachio px-3 py-1 text-sub text-primary uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
