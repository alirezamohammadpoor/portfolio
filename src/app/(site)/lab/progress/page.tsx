import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject } from "@/sanity/lib/data";
import ProgressLab from "@/components/lab/progress/ProgressLab";

// Clip meter looks for a gallery that plays in order (Ali 11-25), on the
// real TRY Devops stage. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Clip meter",
  robots: { index: false, follow: false },
};

export default async function ProgressLabPage() {
  const project = await getProject("try-devops");
  if (!project) notFound();
  return <ProgressLab project={project} />;
}
