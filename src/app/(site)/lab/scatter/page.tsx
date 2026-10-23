import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { PROJECTS_QUERY } from "@/sanity/lib/queries";
import ScatterField from "@/components/lab/ScatterField";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Scatter",
  robots: { index: false, follow: false },
};

export default async function ScatterLabPage() {
  const projects = await client.fetch(PROJECTS_QUERY);
  return <ScatterField projects={projects} />;
}
