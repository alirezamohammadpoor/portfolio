import { Suspense } from "react";
import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import NextPebbleLab from "@/components/lab/next-pebble/NextPebbleLab";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Next project in the Pebble",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ v?: string }>;

const QUERY = `*[_type == "project" && defined(slug.current)] | order(order asc, _id asc) { title, "slug": slug.current }`;

async function Lab({ searchParams }: { searchParams: SearchParams }) {
  const [{ v }, projects] = await Promise.all([
    searchParams,
    client.fetch<{ title: string | null; slug: string }[]>(QUERY),
  ]);
  return <NextPebbleLab initial={v} projects={projects} />;
}

export default function NextPebbleLabPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}
