import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import type { JOURNAL_POST_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

interface JournalPostProps {
  post: NonNullable<JOURNAL_POST_BY_SLUG_QUERY_RESULT>;
}

export default function JournalPost({ post }: JournalPostProps) {
  return (
    <article className="mx-auto max-w-[560px] px-6 py-16">
      <h1 className="text-display text-primary">{post.title}</h1>
      {post.body && (
        <div className="mt-4 text-body text-primary">
          <PortableText value={post.body as PortableTextBlock[]} />
        </div>
      )}
    </article>
  );
}
