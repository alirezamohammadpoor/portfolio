import HomeGallery from "@/components/home/HomeGallery";
import { sanityFetch } from "@/sanity/lib/live";
import { PROJECTS_QUERY } from "@/sanity/lib/queries";

export default async function HomePage() {
  const { data: projects } = await sanityFetch({ query: PROJECTS_QUERY });

  return (
    <>
      <h1 className="sr-only">
        Ali Reza Mohammad Poor — Full-stack developer and creative technologist
      </h1>
      <HomeGallery projects={projects} />
    </>
  );
}
