import { draftMode } from "next/headers";
import ScatterHome from "@/components/home/ScatterHome";
import { getProjects } from "@/sanity/lib/data";

export default async function HomePage() {
  const { isEnabled: isDraft } = await draftMode();
  const projects = await getProjects(isDraft ? "drafts" : "published");

  return (
    <>
      <h1 className="sr-only">
        Ali Reza Mohammad Poor — Full-stack developer and creative technologist
      </h1>
      <ScatterHome projects={projects} />
    </>
  );
}
