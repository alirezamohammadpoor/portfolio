import type { Metadata } from "next";
import { getProjects } from "@/sanity/lib/data";
import ScatterField from "@/components/lab/ScatterField";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Scatter",
  robots: { index: false, follow: false },
};

export default async function ScatterLabPage() {
  const projects = await getProjects();
  return <ScatterField projects={projects} />;
}
