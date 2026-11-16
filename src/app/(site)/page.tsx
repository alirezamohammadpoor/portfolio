import type { Metadata } from "next";
import { draftMode } from "next/headers";
import ScatterHome from "@/components/home/ScatterHome";
import { getAbout, getProjects } from "@/sanity/lib/data";
import { OPEN_GRAPH_BASE, SITE_OG_IMAGE } from "@/lib/site";

const description =
  "Portfolio of Ali Reza Mohammad Poor, frontend developer at the intersection of product and design.";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    type: "website",
    url: "/",
    title: "Ali Reza Mohammad Poor | Developer",
    description,
    images: [SITE_OG_IMAGE],
  },
};

export default async function HomePage() {
  const { isEnabled: isDraft } = await draftMode();
  const [projects, about] = await Promise.all([
    getProjects(isDraft ? "drafts" : "published"),
    getAbout().catch(() => null),
  ]);

  return (
    <>
      <h1 className="sr-only">Ali Reza Mohammad Poor — Frontend developer at the intersection of product and design</h1>
      <ScatterHome projects={projects} contact={about} />
    </>
  );
}
