import { Link } from "next-view-transitions";
import Image from "next/image";
import type { JOURNAL_POSTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl } from "@/sanity/lib/image";

interface JournalCardProps {
  post: JOURNAL_POSTS_QUERY_RESULT[number];
  /** "row": editorial row on desktop (journal index). "card": stacked card (carousels). */
  layout?: "row" | "card";
}

export default function JournalCard({ post, layout = "card" }: JournalCardProps) {
  const row = layout === "row";
  return (
    <Link
      href={`/journal/${post.slug?.current}`}
      className={`flex h-full flex-col${row ? " desktop:grid-site desktop:border-t desktop:border-tertiary desktop:py-16" : ""}`}
    >
      {post.coverImage?.asset && (
        <div className={`relative aspect-[4/5] w-full overflow-hidden bg-tertiary${row ? " desktop:col-span-5" : ""}`}>
          <Image
            src={imageUrl(post.coverImage, 800)}
            alt={post.title ?? ""}
            fill
            className="object-cover"
            sizes={row ? "(min-width: 75rem) 42vw, 100vw" : "(min-width: 75rem) 33vw, 100vw"}
          />
        </div>
      )}
      <div className={`flex flex-col${row ? " desktop:col-span-6 desktop:col-start-7" : ""}`}>
      <h2 className={`mt-4 text-h2 text-primary${row ? " desktop:mt-0" : ""}`}>{post.title}</h2>
      <p className="mt-4 text-sub desktop:text-body text-primary">
        {post.excerpt}
      </p>
      <div className={`mt-auto flex items-center justify-between pt-6${row ? " desktop:mt-0 desktop:justify-start desktop:gap-6" : ""}`}>
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
      </div>
    </Link>
  );
}
