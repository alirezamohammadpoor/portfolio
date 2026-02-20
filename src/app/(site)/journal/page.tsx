import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { JOURNAL_POSTS_QUERY } from "@/sanity/lib/queries";
import JournalCard from "@/components/journal/JournalCard";

export const metadata: Metadata = {
  title: "Journal",
};

export default async function JournalPage() {
  const posts = await client.fetch(JOURNAL_POSTS_QUERY);

  return (
    <section className="py-6 px-6">
      <h1 className="text-h1 text-primary">Journal</h1>
      <p className="mt-4 max-w-[680px] text-sub text-primary">
        Where I share what I&apos;m thinking about — case studies from projects,
        technical decisions, and notes from the journey. Part reflection, part
        documentation.
      </p>

      <div className="mt-16 grid grid-cols-1 gap-8 desktop:grid-cols-3">
        {posts.length === 0 ? (
          <p className="text-body text-secondary">No posts yet.</p>
        ) : (
          posts.map((post) => <JournalCard key={post._id} post={post} />)
        )}
      </div>
    </section>
  );
}
