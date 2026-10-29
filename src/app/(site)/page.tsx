import { draftMode } from "next/headers";
import ScatterHome from "@/components/home/ScatterHome";
import { getProjects, getProjectsDraft } from "@/sanity/lib/data";

export default async function HomePage() {
  const { isEnabled: isDraft } = await draftMode();
  const projects = isDraft ? await getProjectsDraft() : await getProjects();

  return (
    <>
      <h1 className="sr-only">
        Ali Reza Mohammad Poor — Full-stack developer and creative technologist
      </h1>
      <ScatterHome projects={projects} />
    </>
  );
}
