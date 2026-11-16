import type { PortableTextBlock } from "next-sanity";
import { getAbout, getJournalPosts, getProjects } from "./data";
import { cropImageUrl, fileUrl, imageUrl } from "./image";

// What the capsule bar needs on every page, flattened on the server: the
// Work index (names, cover still and clip, one line) and the About text.
// Each read is the cached, tagged one the pages use, so a publish in Studio
// refreshes the bar with them.

export type BarRow = {
  href: string;
  title: string;
  line: string;
  still: string | null;
  video: string | null;
};

export type BarData = {
  projects: BarRow[];
  posts: BarRow[];
  about: {
    bio: PortableTextBlock[];
    email: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
  } | null;
};

type Img = { asset?: { _ref?: string } } | null | undefined;
type Cover = { type?: string; image?: Img; poster?: Img; video?: { asset?: { _ref?: string } } | null } | null | undefined;

const still = (img: Img) => (img?.asset?._ref ? imageUrl(img as never, 1280) : null);

export async function getBarData(): Promise<BarData> {
  const [projects, posts, about] = await Promise.all([
    getProjects().catch(() => []),
    getJournalPosts().catch(() => []),
    getAbout().catch(() => null),
  ]);
  return {
    projects: projects
      .filter((p) => p.slug?.current)
      .map((p) => {
        const cover = p.coverMedia as Cover;
        const ref = cover?.type === "video" ? cover.video?.asset?._ref : undefined;
        return {
          href: `/project/${p.slug?.current}`,
          title: p.title ?? "",
          line: p.shortDescription ?? "",
          still: still(cover?.poster) ?? still(cover?.image),
          // The same clip the home plays for this project.
          video: ref ? fileUrl(ref) : null,
        };
      }),
    posts: posts
      .filter((p) => p.slug?.current)
      .map((p) => {
        const img = p.coverImage as Img;
        return {
          href: `/journal/${p.slug?.current}`,
          title: p.title ?? "",
          line: p.excerpt ?? "",
          // Covers are portraits: the 16:10 preview is cut around the
          // hotspot set in Studio, not the centre.
          still: img?.asset?._ref ? cropImageUrl(img as never, 1280, 800) : null,
          video: null,
        };
      }),
    about: about
      ? {
          bio: (about.bio ?? []) as PortableTextBlock[],
          email: about.email ?? null,
          linkedinUrl: about.linkedinUrl ?? null,
          githubUrl: about.githubUrl ?? null,
        }
      : null,
  };
}
