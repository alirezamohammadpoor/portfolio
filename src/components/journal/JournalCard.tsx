import { Link } from "next-view-transitions";
import Image from "next/image";
import type { JOURNAL_POSTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl } from "@/sanity/lib/image";

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
            alt={post.title ?? ""}
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
      <div className="mt-auto flex items-center justify-between pt-6">
        {post.publishedAt && (
          <span className="text-sub desktop:text-body text-primary">
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex items-center gap-2">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-pistachio px-3 py-1 text-sub text-primary uppercase"
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
